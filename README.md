# E-Commerce Playwright Automation

[![Playwright Tests](https://github.com/PimySoft/ecommerce-playwright/actions/workflows/playwright.yml/badge.svg?branch=main)](https://github.com/PimySoft/ecommerce-playwright/actions/workflows/playwright.yml)
[![Test report](https://img.shields.io/badge/report-latest-2ea44f?logo=playwright)](https://pimysoft.github.io/ecommerce-playwright/)

A Playwright E2E testing framework showcasing best practices for web application automation, featuring Page Object Model (POM) architecture and modern testing patterns.

## 🎯 Project Purpose

This repository demonstrates **Playwright E2E testing** capabilities:

- **End-to-End Testing** - Complete user journey testing through browser automation
- **Page Object Model** - Maintainable and scalable test architecture
- **Cross-Browser Testing** - Chrome, Firefox, and Safari (WebKit) projects
- **Visual Regression Testing** - Percy AI-powered visual comparison
- **TypeScript & Fixtures** - Type-safe tests with custom fixtures for clean code

## 🚀 Test Coverage

Every test is tagged `@smoke` or `@regression`: `npm run test:smoke` runs the journeys that prove the site works, `npm run test:regression` runs the rest.

| Journey | What is verified | Spec | Tag |
|---|---|---|---|
| Registration | Sign up with a generated user, "Logged in as", delete the account through the UI | `registration.spec.ts` | `@smoke` |
| Registration validation | Already-registered email is rejected; each required field blocks account creation (data-driven, one test per field) | `registration.spec.ts` | `@regression` |
| Login | Valid login with an API-created user | `authentication.spec.ts` | `@smoke` |
| Login and logout | Login form, invalid credentials, invalid email format, logout | `authentication.spec.ts` | `@regression` |
| Authenticated session | Reused `storageState` shows the user as logged in without a UI login | `session.spec.ts` | `@smoke` |
| Checkout | Log in, add several products, verify delivery/billing address and order review, pay, order confirmation | `checkout.spec.ts` | `@smoke` |
| Invoice download | Download after payment; file name and contents (buyer and total) | `checkout.spec.ts` | `@regression` |
| Product details | Name, category, price, availability, condition and brand; add to cart with a custom quantity | `product-details.spec.ts` | `@regression` |
| Search and add to cart | Every result matches the term; add-to-cart confirmation | `products.spec.ts` | `@smoke` |
| Search edge cases | Empty search lists everything; no-match search lists nothing | `products.spec.ts` | `@regression` |
| Category and brand filters | Filtered listing shows exactly the catalogue's products for that category or brand | `products.spec.ts` | `@regression` |
| Cart | Remove a product; empty cart blocks checkout; guest is asked to log in at checkout and keeps the cart after logging in | `cart.spec.ts` | `@regression` |
| Guest purchase path | Home → products → add to cart → price, quantity and total in the cart | `e2e-workflow.spec.ts` | `@regression` |
| Home page | Navigation links and heading | `homepage.spec.ts` | `@smoke` |
| Subscription | Footer newsletter subscription shows the success message | `subscription.spec.ts` | `@regression` |
| Contact | Contact form submission | `contact.spec.ts` | `@regression` |
| Visual (Percy) | Snapshots of key pages; skipped unless `PERCY_TOKEN` is set | `percy-visual.spec.ts` | `@regression` `@visual` |

## 📦 Installation & Usage

```bash
# Install dependencies
npm install

# Run all tests headlessly
npm test

# Run in headed mode
npm run test:headed

# Run in specific browser
npm run test:chrome
npm run test:firefox
npm run test:safari

# Static checks (also run in CI)
npm run typecheck
npm run lint

# Visual regression tests (requires Percy credentials)
npm run test:percy               # Percy AI-powered visual tests
npm run test:percy:all           # All tests with Percy

# View test reports
npx playwright show-report
```

## 🏗️ Architecture

### Page Object Model

All pages follow a consistent structure with selectors (getters) at the top and actions (methods) at the bottom.

```
pages/
├── BasePage.ts         # Base page with common functionality
├── HomePage.ts
├── LoginPage.ts
├── ProductsPage.ts
├── CartPage.ts
└── ContactPage.ts
```

### Custom Fixtures

Tests use fixtures for clean, fast execution:

```typescript
test('should display login form', async ({ loginPage }) => {
  await expect(loginPage.emailInput).toBeVisible();
});
```

## 📋 Coding Standards

See `CODING_STANDARDS.md` for details. Key principles:

- Getters for locators (lazy evaluation)
- Role-based locators prioritized (`getByRole()`)
- Selectors and actions separated
- Custom fixtures for page objects
- No useless comments
- Playwright community standards

## 📊 API Testing Philosophy

**API testing is intentionally excluded** from this Playwright project. API endpoints should be tested with more efficient tools:

- **Jest + Supertest** - Fast, lightweight API testing
- **Postman/Newman** - Contract and integration testing
- **REST Assured** - For Java-based API testing

**Why?** API tests run faster without browser overhead, and separation of concerns allows E2E tests to focus on user journeys while API tests validate backend contracts independently.

**Testing Strategy:**
```
E2E Tests (Playwright) - 10%       ← This Project
Integration Tests (Jest) - 20%
API Tests (Jest/Supertest) - 30%   ← Use separate tools
Unit Tests (Jest) - 40%
```

## 🎨 Visual Testing

The project uses **Percy** for AI-powered visual regression testing. **⚠️ Requires `PERCY_TOKEN` credentials.**

### Quick Setup

1. Sign up at [percy.io](https://percy.io) and create a project
2. Get `PERCY_TOKEN` from Project Settings → API Tokens
3. Add to `.env`: `PERCY_TOKEN=your_token_here`
4. Run: `npm run test:percy` or `npm run test:percy:all`

### How It Works

- **First run**: Creates baseline snapshots in Percy dashboard
- **Subsequent runs**: AI compares new snapshots against baselines
- **Differences**: Shown in dashboard with approval workflow
- **Benefits**: Ignores insignificant differences (fonts, shadows), cross-browser testing, visual dashboard

### Configuration

Customize snapshots in `tests/percy-visual.spec.ts`:
```typescript
await percySnapshot(page, 'Snapshot Name', {
  widths: [1280, 375],  // Viewport widths
  percyCSS: '.hide { display: none; }',  // Hide elements
});
```

### CI/CD

Add `PERCY_TOKEN` as secret environment variable. Example (GitHub Actions):
```yaml
- run: npm run test:percy
  env:
    PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
```

**Test File:** `tests/percy-visual.spec.ts` | **Docs:** [Percy Documentation](https://docs.percy.io/docs/playwright)

## 🔄 CI/CD Integration

[playwright.yml](.github/workflows/playwright.yml) type-checks and lints first, then runs the tests as a matrix of browser projects and shards.

| Trigger | Browsers | Tests | Shards per browser |
|---|---|---|---|
| Pull request to `main` | Chrome | `@smoke` | 1 |
| Push to `main` | Chrome, Firefox, WebKit | all | 2 |
| Nightly (03:00 UTC) | Chrome, Firefox, WebKit | all | 2 |
| Manual (`workflow_dispatch`) | chosen browser or all | chosen tag or all | 1 for `@smoke`, otherwise 2 |

- Each shard writes a `blob` report. A merge job combines them into one HTML report, uploads it as the `playwright-report` artifact and, for runs on `main`, publishes it to [GitHub Pages](https://pimysoft.github.io/ecommerce-playwright/).
- Failed shards also upload `test-results/` (traces and screenshots). Traces are recorded on the first retry.
- A failed nightly run opens an Issue labelled `nightly-failure`, or comments on the one already open.
- npm packages and the Firefox and WebKit downloads are cached. The `chrome` project uses the Google Chrome build that the runner image ships.
- At most four test jobs run at once, and each uses one worker, because the target is a shared public site.
- On CI, failed tests are retried twice and `test.only` fails the run.

## 🍪 Cookie Consent Popup Handling

The site uses cookie consent popups that can block interactions. 

1. **localStorage injection** - Attempts to set consent before page loads (in `fixtures.ts`)
2. **Popup clicking fallback** - Clicks accept button if popup appears (in `BasePage.ts`)
3. **Retry mechanisms** - 2 retries on CI handle transient failures

**In production:** Identify the exact cookie/storage key via browser DevTools, then inject it via `context.addCookies()` or global setup for maximum reliability.

## 📁 Project Structure

```
├── pages/              # Page Object Models
├── tests/              # Test specifications
│   ├── fixtures.ts     # Custom Playwright fixtures
│   └── *.spec.ts       # Test suites
├── test-data/          # Test data files
├── playwright.config.ts
└── CODING_STANDARDS.md
```

## 🎓 Best Practices

- Page Object Model for maintainability
- Custom fixtures for clean test code
- Role-based locators for accessibility
- TypeScript for type safety
- Cross-browser testing
- Visual regression testing
- Proper error handling and retries

## 📄 License

MIT

---

**Note**: This project focuses on E2E testing with Playwright. For API testing, unit testing, and component testing, use appropriate specialized tools (Jest, Supertest, React Testing Library, etc.) that complement this E2E test suite.
