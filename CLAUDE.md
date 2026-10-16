# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

A portfolio project showcasing **Playwright E2E testing done to professional standards**. It uses TypeScript with `@playwright/test` and tests the public demo shop https://automationexercise.com, using the Page Object Model and custom fixtures.

Scope is browser E2E only. API, unit and contract testing are intentionally excluded (see README "API Testing Philosophy"). Don't add `request`-fixture API tests here.

## Commands

```bash
npm ci
npx playwright install                 # add --with-deps on Linux/CI

npm test                               # all projects, headless
npm run test:chrome                    # --project=chrome  (what CI runs)
npm run test:firefox                   # --project=firefox
npm run test:safari                    # --project=safari  (WebKit)
npm run test:headed                    # watch it run

npx playwright test tests/cart.spec.ts             # one file
npx playwright test tests/cart.spec.ts:10          # one test by line
npx playwright test -g "remove product"            # by title
npx playwright test --project=chrome --ui          # UI mode: best for debugging
npx playwright test --debug                        # Playwright Inspector
npx playwright show-report                         # open last HTML report
npx playwright show-trace test-results/<dir>/trace.zip
npx playwright codegen https://automationexercise.com   # discover locators

npm run typecheck                      # tsc --noEmit
npm run lint                           # ESLint: typescript-eslint + eslint-plugin-playwright
npm run lint:fix

npm run test:percy                     # Percy visual tests, needs PERCY_TOKEN
```

## Configuration (`playwright.config.ts`)

- `baseURL` is `https://automationexercise.com`, so always navigate with relative paths (`goto('/products')`).
- Projects: `chrome` (Desktop Chrome, `channel: 'chrome'`), `firefox` and `safari` (WebKit).
- `fullyParallel: true`. On CI: `retries: 2`, `workers: 1`, and `forbidOnly`.
- `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`, HTML reporter.
- `.env` is loaded through `dotenv` if present.

`eslint.config.mjs` enforces many of the standards below mechanically, including `no-floating-promises`, `no-wait-for-timeout`, `prefer-web-first-assertions`, `no-useless-not` and `no-focused-test`. CI runs `typecheck` and `lint` before the tests.

## Layout

```
playwright.config.ts
tests/
  fixtures.ts            # extended `test` + `expect`, page setup, page-object fixtures
  <feature>.spec.ts      # one spec per feature area
pages/
  BasePage.ts            # goto(), cookie-consent handling
  HomePage.ts  ProductsPage.ts  CartPage.ts  LoginPage.ts  ContactPage.ts
test-data/
  TestDataFactory.ts     # every test input comes from here
.github/workflows/playwright.yml   # CI: chrome project on push/PR to main
```

### How a test gets its page

`tests/fixtures.ts` extends Playwright's `test`:
- It overrides `page` to:
  - block ad-network requests with `page.route`;
  - seed cookie-consent keys in localStorage through `addInitScript`;
  - register an `addLocatorHandler` that dismisses the Google survey dialog whenever it appears.
- It adds one fixture per page object (`homePage`, `productsPage`, `cartPage`, `loginPage`, `contactPage`). Each fixture builds the page object and navigates to its URL.

Specs **must** import from `./fixtures`, not `@playwright/test`:

```ts
import { test, expect } from './fixtures';

test('should display login form', async ({ loginPage }) => {
  await expect(loginPage.emailInput).toBeVisible();
});
```

## Coding standards

Full rules with examples are in [CODING_STANDARDS.md](CODING_STANDARDS.md). They are mandatory, because they are what this project showcases. In short:

1. **Locators are getters.** Use `get x(): Locator`, never `readonly` fields or `const`. Locators that take a parameter are methods returning `Locator` (e.g. `cartItemRow(name)`).
2. **Selectors, then actions.** Page objects group getters under `// ========== SELECTORS ==========` and methods under `// ========== ACTIONS ==========`. Every page extends `BasePage` with `constructor(page: Page) { super(page); }`.
3. **Locator priority:** `getByRole` → `getByLabel` → `getByText` → `getByPlaceholder` → `getByTestId` / `getByTitle` / `getByAltText` → `page.locator()` CSS as a last resort, scoped under a semantic locator where possible. The site has weak semantics, so chaining `.or()` from a role locator to a CSS fallback is the accepted pattern (see `ProductsPage.addToCartButtons`). No XPath.
4. **Community standards:**
   - Group tests with `test.describe()`.
   - Break multi-phase tests into `test.step()`.
   - Use web-first `expect(locator)` assertions, never `expect(await locator.isVisible()).toBe(true)`.
5. **Fixtures, not `new`.** Tests never instantiate page objects or call `page.goto` for a page that has a fixture. To add a page, create `pages/XPage.ts`, add a fixture in `tests/fixtures.ts`, then use the fixture in tests.
6. **Always `await`, never swallow.**
   - No floating promises and no `.catch(() => {})`.
   - Check optional UI explicitly (`if (await x.count() > 0)`) or handle it with `addLocatorHandler`.
7. **No useless comments.** Comments explain *why*, never *what*. No JSDoc that restates a name.

Also enforced:
- **No hard waits.** No `page.waitForTimeout()` and no ad-hoc `{ timeout }` options to hide flakiness. Rely on auto-waiting, or wait on a real condition (`waitForURL`, `waitFor({ state })`, `expect`). The git history includes a deliberate cleanup that removed these.
- **Test data comes from `TestDataFactory`.** Never inline literals in specs. Add a factory method if one is missing.
- **Test names read as behaviour:** `'should <outcome> [when <condition>]'`. Keep tests independent and order-agnostic.
- **Skips need reasons.** Use `test.skip()` / `describe.skip` only with a comment or reason explaining why. Never commit `test.only`.
- **Strict TypeScript** (`strict: true`). Type every page-object method's return value (`Promise<void>`, `Locator`).

## Site-specific gotchas (automationexercise.com)

- **Cookie consent** (`.fc-consent-root`): pre-empted through localStorage in the `page` fixture, with `BasePage.handleCookieConsent()` as the fallback. Call it after navigations that may re-show the banner.
- **Third-party ads** (full-screen interstitials, `#google_vignette` URL fragments) caused most of the suite's flakiness. They're now blocked through `AD_NETWORK_URLS` in `fixtures.ts`. If a new ad source appears, extend that regex rather than adding waits. Keep matching on `url.pathname` in `waitForURL` predicates.
- **The ad script also rewrites words in product titles into links.** Don't locate products by a nested `getByText` on the title. Filter the `.product-image-wrapper` card by `hasText` (see `ProductsPage.productCardByName`).
- **Google survey dialog** is handled automatically by the locator handler in `fixtures.ts`. Don't add manual dismissal in tests.
- **Contact form** submits through a JS `confirm()`. `ContactPage` registers the dialog handler.
- **Cart quantity is read-only** on this site, so don't write quantity-update tests.
- **Percy tests** skip themselves unless `PERCY_TOKEN` is set.
- It's a shared public site. Don't create real accounts or post beyond the demo forms. Occasional slowness is normal, and it's not a reason to add waits.

## Secrets

`.env` is git-ignored and may hold `USER_EMAIL`, `USER_PASSWORD` and `PERCY_TOKEN`. Never commit it or print its values. In CI, Percy needs `PERCY_TOKEN` as a repo secret.

## Workflow expectations

- Before saying a change is done, run `npm run typecheck`, `npm run lint`, and the affected spec on the `chrome` project. For flakiness fixes, prove stability with `--repeat-each=3`. Run the full suite before a PR.
- Branch off `main`. Use conventional commit prefixes (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `ci:`).
