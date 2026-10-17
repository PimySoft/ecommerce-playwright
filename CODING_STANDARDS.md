# Coding Standards

These rules are mandatory. ESLint and the TypeScript compiler enforce most of them, and the PR template checks the rest.

## 1. Locators are getters

Declare locators as getters, never as `readonly` fields or constants, so they are built fresh on each use. A locator that takes a parameter is a method returning `Locator`.

```ts
get loginButton(): Locator {
  return this.page.getByRole('button', { name: 'Login', exact: true });
}

cartItemRow(productName: string): Locator {
  return this.page.getByRole('row').filter({ has: this.page.getByRole('heading', { name: productName, exact: true }) });
}
```

## 2. Selectors, then actions

Every page object extends `BasePage`, inheriting its constructor, and groups its getters under `// ========== SELECTORS ==========`, before its methods under `// ========== ACTIONS ==========`. Every method declares its return type.

## 3. One deterministic locator per element

Use the first strategy that works, in this order:

1. `getByRole`
2. `getByLabel`
3. `getByText`
4. `getByPlaceholder`
5. `getByTestId` (the site's `data-qa` hooks), `getByTitle` or `getByAltText`
6. `page.locator()` with CSS, scoped under a semantic locator where possible, with a comment saying why nothing better works

Each locator must match exactly one element through one strategy:
- No `.or()` fallback chains. Inspect the element and keep the locator that works.
- No `.first()` or `.nth()` to silence strict mode. Scope or filter instead.
- Exact names (`{ name: 'Login', exact: true }`), not loose regexes, unless the name contains noise such as an icon glyph.
- No XPath.

```ts
// Wrong: nobody checked which branch matches.
get addToCartButton(): Locator {
  return this.page.getByRole('button', { name: /add to cart/i }).or(this.page.locator('.add-to-cart')).first();
}

// Right: an <a> without href has no link role, so it is found by text inside its product card.
addToCartButton(productName: string): Locator {
  return this.productCardByName(productName).locator('.productinfo').getByText('Add to cart', { exact: true });
}
```

## 4. Tests are grouped, stepped and web-first

- Group tests with `test.describe()`.
- Split multi-phase tests into `test.step()`.
- Assert with web-first `expect(locator)`, never `expect(await locator.isVisible()).toBe(true)`.
- Assert the outcome the test name promises: values, text and counts, not just visibility.
- Name tests as behaviour: `'should <outcome> [when <condition>]'`.
- Keep tests independent of each other and of order.
- Data-drive with a `for` loop over `test()` only when each case checks something distinct.

```ts
test.describe('User Authentication', () => {
  test('should return to the login page when the user logs out', { tag: '@regression' }, async ({ loginPage, testUser }) => {
    const homePage = await test.step('Log in', async () => loginPage.loginAs(testUser));
    const loggedOutPage = await test.step('Log out', async () => homePage.logout());

    await expect(loggedOutPage.loginHeading).toBeVisible();
  });
});
```

## 5. Fixtures, not `new`

- Specs import `test` and `expect` from `./fixtures`, never from `@playwright/test`.
- Tests never instantiate a page object or call `page.goto` for a page that has a fixture.
- Every page fixture shares one `page` and navigates on setup, so a test requests only the fixture of the page it starts on.
- Journeys continue through navigation methods that return the next page object.
- Pages reached only through a journey (signup, product details, checkout, payment, confirmation) have no fixture.
- UI shared across pages lives in `pages/components/`, exposed through a getter such as `productsPage.cartModal`.

## 6. Always await, never swallow

- Await every promise. ESLint rejects floating promises.
- Never write `.catch(() => {})`. A swallowed error hides the real failure.
- Check optional UI explicitly (`if (await x.count() > 0)`) or handle it with `addLocatorHandler`.

## 7. No hard waits

No `page.waitForTimeout()`, and no ad-hoc `{ timeout }` options to hide flakiness. Rely on auto-waiting, or wait on a real condition with `waitForURL`, `waitFor({ state })` or `expect`.

## 8. Test data comes from the factory

- Every input comes from `TestDataFactory`. Add a method rather than writing a literal in a spec.
- Generated data (users, addresses, cards, contact details) uses faker and is unique per call.
- Only the fixed catalogue (products, prices, search terms, listings) is hard-coded.
- Accounts come only from the `testUser`, `newUser` and `authenticatedTest` fixtures, which always delete them.
- The API is for setup and teardown. Tests never assert on API responses.

## 9. Every test has one tier

Tag every test with exactly one of `@smoke` or `@regression`. Extra tags such as `@a11y` and `@visual` are fine. The `requireTierTag` fixture fails a test that breaks this rule. Smoke runs on every pull request, so adding to it needs a reason.

## 10. Accessibility fails only on new violations

Wait for a known element, then assert that the scan finds nothing beyond the baseline:

```ts
await expect(loginPage.loginHeading).toBeVisible();
expect(await accessibilityScanner.findNewViolations(ACCESSIBILITY_BASELINE.login)).toEqual([]);
```

Each baseline entry names the rule, the exact `targets` and a `reason`. Leave out `targets` only when the count follows the catalogue. Remove an entry when the report says it no longer occurs.

## 11. Visual checks cover stable regions

Screenshot a region, not a page, and only regions without products, prices or user data. Mask anything that moves. Generate baselines only with `npm run test:visual:update`, which renders them in Docker like CI, and look at the PNGs before committing.

```ts
await expect(homePage.footer).toHaveScreenshot('footer.png', { mask: [homePage.scrollUpButton] });
```

## 12. Comments explain why

Comment only what the code can't say: a site quirk, a non-obvious constraint or the reason for a CSS locator. Never restate the code, and don't write JSDoc that repeats a name.

## 13. Skips and quarantine have reasons

Every `test.skip()` or `test.fixme()` carries a reason, and a quarantine links its Issue. Never commit `test.only`.
