# Playwright Automation Coding Standards

This document defines the coding standards for Playwright automation projects. All code must adhere to these rules to ensure consistency, maintainability, and reliability across test suites.

## 1. Getters Over Readonly or Const

**Rule**: Always use getters for locators in Page Object Models. Never use `readonly` or `const` for locator properties.

**Rationale**: Getters ensure locators are always fresh and evaluated lazily, which is the recommended Playwright pattern.

### ✅ Correct
```typescript
export class LoginPage extends BasePage {
  get emailInput(): Locator {
    return this.page.getByRole('textbox', { name: /email/i });
  }

  get submitButton(): Locator {
    return this.page.getByRole('button', { name: /submit|login/i });
  }
}
```

### ❌ Incorrect
```typescript
export class LoginPage extends BasePage {
  readonly emailInput = this.page.getByRole('textbox', { name: /email/i });
  
  // OR
  
  const submitButton = page.getByRole('button', { name: /submit/i });
}
```

## 2. No Useless Comments

**Rule**: Remove all JSDoc comments that simply restate what the code does. Remove comments that describe obvious functionality. Keep only comments that explain "why" not "what".

**Rationale**: Code should be self-documenting. Comments that restate the code add noise and maintenance burden.

### ✅ Correct
```typescript
get emailInput(): Locator {
  return this.page.getByRole('textbox', { name: /email/i });
}

async login(email: string, password: string): Promise<void> {
  await this.emailInput.fill(email);
  await this.passwordInput.fill(password);
  await this.submitButton.click();
}
```

### ❌ Incorrect
```typescript
/**
 * Email input field locator using role
 */
get emailInput(): Locator {
  return this.page.getByRole('textbox', { name: /email/i });
}

/**
 * Perform login with credentials
 */
async login(email: string, password: string): Promise<void> {
  await this.emailInput.fill(email);
  await this.passwordInput.fill(password);
  await this.submitButton.click();
}
```

## 3. Actions and Selectors Must Be Separate

**Rule**: Organize Page Object classes with clear separation: all selectors (getters) grouped together at the top, all actions (methods) grouped together at the bottom. Never mix selectors and actions randomly.

**Rationale**: Clear organization improves readability and maintainability. It makes it easy to find selectors or actions.

### ✅ Correct
```typescript
export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // SELECTORS
  get emailInput(): Locator {
    return this.page.getByRole('textbox', { name: /email/i });
  }

  get passwordInput(): Locator {
    return this.page.getByLabel(/password/i);
  }

  get submitButton(): Locator {
    return this.page.getByRole('button', { name: /submit|login/i });
  }

  // ACTIONS
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async goToForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
  }
}
```

### ❌ Incorrect
```typescript
export class LoginPage extends BasePage {
  get emailInput(): Locator { ... }
  
  async login(email: string, password: string): Promise<void> { ... }
  
  get passwordInput(): Locator { ... }
  
  async goToForgotPassword(): Promise<void> { ... }
}
```

## 4. Always Use Playwright Locator Methods

**Rule**: Always use Playwright's built-in locator methods (`getByRole()`, `getByLabel()`, `getByText()`, `getByPlaceholder()`, `getByTestId()`, etc.) instead of `page.locator()` with CSS selectors or XPath. Never use `page.locator()` with CSS/XPath unless absolutely necessary.

**Rationale**: Playwright's locator methods are more reliable, accessible, and maintainable. They align with accessibility standards and are less brittle than CSS selectors. Using `page.locator()` with CSS selectors should be a last resort only when no Playwright locator method can find the element.

### Locator Priority Order:
1. `getByRole()` - **Highest priority** - Use for buttons, links, textboxes, headings, etc.
2. `getByLabel()` - For form labels and labeled inputs
3. `getByText()` - For text content matching
4. `getByPlaceholder()` - For input placeholders
5. `getByTestId()` - For test IDs (if available in the application)
6. `getByTitle()` - For elements with title attributes
7. `getByAltText()` - For images with alt text
8. `page.locator()` with CSS/XPath - **Last resort only** - Use only when no Playwright method works

### ✅ Correct
```typescript
get submitButton(): Locator {
  return this.page.getByRole('button', { name: 'Submit', exact: true });
}

get cartLink(): Locator {
  return this.page.getByRole('banner').getByRole('link', { name: 'Cart' });
}

get emailInput(): Locator {
  return this.page.getByRole('textbox', { name: 'Email', exact: true });
}

get loginEmailInput(): Locator {
  return this.page.getByTestId('login-email');
}

get errorMessage(): Locator {
  return this.page.getByText('Your email or password is incorrect!', { exact: true });
}

get heading(): Locator {
  return this.page.getByRole('heading', { level: 1 });
}
```

### ❌ Incorrect
```typescript
get submitButton(): Locator {
  return this.page.locator('button.submit-btn');
}

get navigationLink(): Locator {
  return this.page.locator('a[href="/dashboard"]');
}

get emailInput(): Locator {
  return this.page.locator('#email-input');
}

get passwordField(): Locator {
  return this.page.locator('input[type="password"]');
}

get errorMessage(): Locator {
  return this.page.locator('.error-message');
}

get heading(): Locator {
  return this.page.locator('h1.title');
}
```

### When `page.locator()` is Acceptable:
Only use `page.locator()` when:
- No Playwright locator method can reliably find the element
- You need complex CSS selectors that cannot be expressed with Playwright methods
- The element has no accessible properties (role, label, text, etc.)
- You're working with legacy code that lacks semantic HTML

Even in these cases, prefer combining Playwright locators (e.g., `page.getByRole('region').locator('.specific-class')`) over pure CSS selectors, and add a comment saying *why* no semantic locator works (e.g. "icon-only `<a>` with no href, text or label").

### One deterministic locator per element

Each getter must resolve to exactly one element through one strategy:

- **No `.or()` fallback chains.** A chain like `getByRole(...).or(locator('.x')).or(locator('[class*=x]'))` means nobody checked which one matches. Inspect the element (`npx playwright codegen`, UI mode's locator picker, or `locator.ariaSnapshot()`) and keep the single locator that works.
- **No `.first()` / `.nth()` to silence strict mode.** If a locator matches several elements, scope it (to a row, card, dialog or `banner`) or filter it (`filter({ has })`) until it matches one.
- **Exact names over regexes.** Use `{ name: 'Login', exact: true }`, not `/login/i`. A loose regex matches more than you intended (e.g. `/consent/i` also matches "Do not consent"). Where the accessible name includes noise you can't control, such as icon-font glyphs in the nav links, use a plain-string (substring) name scoped to a small region.
- **Use the app's test hooks** (`data-qa`, configured as `testIdAttribute`) when roles and labels are ambiguous, e.g. two "Email Address" fields on one page.

```typescript
// ❌ Fallback chain hiding an unverified locator
get addToCartButton(): Locator {
  return this.page.getByRole('button', { name: /add to cart/i })
    .or(this.page.locator('a, button').filter({ hasText: /add to cart/i }))
    .first();
}

// ✅ Verified: the element is an <a> without href (no link role), scoped to its product card
addToCartButton(productName: string): Locator {
  return this.productCardByName(productName).locator('.productinfo').getByText('Add to cart', { exact: true });
}
```

## 5. Follow Playwright Community Standards

**Rule**: Always follow official Playwright documentation and best practices. Use recommended patterns from the Playwright community.

**Rationale**: Following community standards ensures consistency, maintainability, and alignment with best practices. It also makes the codebase easier for other Playwright developers to understand.

### Key Playwright Community Standards:
- Use `test.describe()` for grouping related tests
- Use `test.beforeEach()` and `test.afterEach()` for setup/teardown
- Use proper assertions with `expect()` API
- Use `page.waitForLoadState()` when waiting for page loads
- Use `test.step()` for better test reporting and organization
- Follow naming conventions (descriptive test names, clear describe blocks)
- Use `test.info()` for test metadata when needed
- Prefer `page.getByRole()` over CSS selectors
- Use `test.setTimeout()` for tests that need longer timeouts
- Use `test.use()` for test-specific configuration
- Tag every test with exactly one pipeline tier, `@smoke` or `@regression`, using the `tag` option: `test('should ...', { tag: '@smoke' }, async (...) => {})`. Smoke covers the few journeys that prove the site is usable (home page, login, registration, search, add to cart, checkout); everything else is regression. The `requireTierTag` auto fixture fails any test without exactly one tier
- Data-drive a test with a `for` loop over `test()` only when each case checks something distinct (e.g. one test per required signup field), never just to add volume

### ✅ Correct
```typescript
import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should submit login form', async ({ page }) => {
    await test.step('Enter credentials', async () => {
      await page.getByRole('textbox', { name: /email/i }).fill('user@example.com');
      await page.getByLabel(/password/i).fill('password123');
    });

    await test.step('Click submit button', async () => {
      await page.getByRole('button', { name: /submit|login/i }).click();
    });
  });
});
```

### ❌ Incorrect
```typescript
// Not using describe blocks
test('login form', async ({ page }) => {
  // Not using proper assertions
  const element = page.locator('.login-input');
  if (await element.isVisible()) {
    // ...
  }
  
  // Using CSS selectors instead of role-based
  await page.locator('button.submit-btn').click();
});
```

## 6. Use Fixtures to Speed Up Tests and for Clean Coding

**Rule**: Always use custom fixtures for Page Object Models. Create fixtures that inject page objects into tests instead of instantiating them in each test.

**Rationale**: Fixtures provide several benefits:
- **Speed**: Shared setup/teardown reduces test execution time
- **Clean Code**: Tests focus on behavior, not setup
- **Reusability**: Fixtures can be shared across multiple test files
- **Automatic Cleanup**: Playwright handles cleanup automatically
- **Type Safety**: TypeScript provides autocomplete and type checking

### ✅ Correct
```typescript
// tests/fixtures.ts
import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

type TestFixtures = {
  loginPage: LoginPage;
};

export const test = base.extend<TestFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto('/login');
    await use(loginPage);
  },
});

// tests/login.spec.ts
import { test, expect } from './fixtures';

test('should display login form elements', async ({ loginPage }) => {
  await expect(loginPage.emailInput).toBeVisible();
  await expect(loginPage.passwordInput).toBeVisible();
  await expect(loginPage.submitButton).toBeVisible();
});
```

### ❌ Incorrect
```typescript
// Instantiating page objects in each test
test('should display login form elements', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto('/login');
  await expect(loginPage.emailInput).toBeVisible();
});

test('should login with valid credentials', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto('/login');
  await loginPage.login('user@example.com', 'password123');
});
```

### Fixture Best Practices:
- Create fixtures in a dedicated `fixtures.ts` file
- Export extended `test` object from fixtures
- Use TypeScript types for fixture definitions
- Initialize page objects in fixtures, not in tests
- Use `use()` callback for proper cleanup
- Share common setup across fixtures when possible
- Create test accounts through the API in a fixture (`testUser`), never through the UI in a test's setup, and delete them in the fixture's teardown so cleanup runs even when the test fails
- Reuse a logged-in session with `authenticatedTest` instead of logging in through the UI in every test
- For tests that register through the UI, use `newUser`: a generated user that is not created up front, deleted afterwards only if it exists
- Pages that can only be reached through a journey (signup, checkout, payment, order confirmation, product details) have no fixture; tests reach them through navigation methods that return the next page object
- UI shared by several pages (e.g. the add-to-cart modal) is a component class in `pages/components/`, exposed through a getter on each page that shows it (`productsPage.cartModal.viewCart()`). Components take a `Page` but don't extend `BasePage`, because they aren't navigable

```typescript
test('should show the user as logged in when credentials are valid', async ({ loginPage, testUser }) => {
  const homePage = await loginPage.loginAs(testUser);
  await expect(homePage.loggedInAsText(testUser.name)).toBeVisible();
});
```

## 7. Always Use Await, Never Silently Catch Errors

**Rule**: Always use `await` for async operations. Never use `.catch(() => {})` to silently swallow errors. Ensure operations complete before proceeding to the next step.

**Rationale**: Silently catching errors with `.catch(() => {})` hides failures and can cause timing issues in CI environments. Using `await` ensures:
- Operations complete before proceeding
- Errors are properly surfaced for debugging
- Better reliability in CI/CD environments
- Proper sequencing of async operations

### ✅ Correct
```typescript
async navigateToProducts(): Promise<ProductsPage> {
  await this.productsLink.click();
  await this.page.waitForURL((url) => url.pathname === '/products');
  await this.handleCookieConsent();
  return new ProductsPage(this.page);
}

// Playwright waits for the dialog to be hidden after the handler runs.
await page.addLocatorHandler(getGoogleSurveyDialog(page), async (dialog) => {
  await dialog.getByRole('button', { name: 'Close' }).click();
});
```

### ❌ Incorrect
```typescript
async navigateToProducts(): Promise<void> {
  await this.productsLink.click();
  this.handleCookieConsent().catch(() => {});
  await this.page.waitForURL('**/products**');
}

async handleGoogleSurveyPopup(): Promise<void> {
  const closeButton = getGoogleSurveyCloseButton(page);
  await closeButton.first().click({ timeout: 2000 }).catch(() => {});
  // No wait for popup to be hidden - may cause timing issues
}
```

### Key Points:
- Always `await` async operations to ensure they complete
- Never use `.catch(() => {})` to silently ignore errors
- Wait for operations to complete before proceeding (e.g., wait for popup to be hidden after clicking close)
- Proper error handling improves CI reliability and debugging

## Summary Checklist

When writing or reviewing code, ensure:
- [ ] All locators use getters (not readonly/const)
- [ ] No useless comments that restate the code
- [ ] Selectors and actions are clearly separated with section comments (`// SELECTORS` and `// ACTIONS`)
- [ ] Playwright locator methods (`getByRole()`, `getByLabel()`, `getByText()`, etc.) are used instead of `page.locator()` with CSS selectors
- [ ] One deterministic locator per element: no `.or()` fallback chains, no `.first()` hiding ambiguity, exact names
- [ ] Assertions check the business outcome the test name promises (values, text, counts), not just visibility
- [ ] Code follows Playwright community standards (`test.describe()`, `test.step()`, proper assertions)
- [ ] Custom fixtures are used for Page Object Models
- [ ] Tests use fixtures instead of instantiating page objects in each test
- [ ] TypeScript types are properly used for fixtures and page objects
- [ ] All page objects extend `BasePage` with consistent constructor pattern
- [ ] Every test has exactly one of `@smoke` / `@regression`
- [ ] All async operations use `await` (no silent error catching with `.catch(() => {})`)

