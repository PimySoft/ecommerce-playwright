# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

A portfolio project showcasing **Playwright E2E testing done to professional standards**. It uses TypeScript with `@playwright/test` and tests the public demo shop https://automationexercise.com, using the Page Object Model and custom fixtures.

Scope is browser E2E only. API, unit and contract testing are intentionally excluded (see README "Design decisions"). The site's API is used for **test setup only** (creating and deleting accounts through `api/`). Don't add tests that assert on API responses.

## Commands

```bash
npm ci
npx playwright install                 # add --with-deps on Linux/CI

npm test                               # all projects, headless
npm run test:chrome                    # --project=chrome  (what PR CI runs, with --grep @smoke)
npm run test:firefox                   # --project=firefox
npm run test:safari                    # --project=safari  (WebKit)
npm run test:mobile                    # --project=mobile-chrome (Pixel 7, @smoke only)
npm run test:a11y                      # --grep @a11y
npm run test:visual                    # visual project in the Playwright Docker image (needs Docker)
npm run test:visual:update             # re-render visual baselines in Docker
npm run test:headed                    # watch it run
npm run test:smoke                     # --grep @smoke
npm run test:regression                # --grep @regression

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
```

## Configuration (`playwright.config.ts`)

- `baseURL` is `https://automationexercise.com`, so always navigate with relative paths (`goto('/products')`).
- Projects:
  - `chrome` (Desktop Chrome, `channel: 'chrome'`), `firefox` and `safari` (WebKit) run everything except `@visual`.
  - `mobile-chrome` (Pixel 7, bundled Chromium) runs `@smoke` only.
  - `visual` (Desktop Chrome viewport, bundled Chromium) runs `@visual` only. Its tests skip unless `PLAYWRIGHT_DOCKER` is set, which `scripts/run-visual-in-docker.sh` and the CI visual job do.
- `@playwright/test` is pinned to an exact version because the visual baselines depend on the browser build. CI's static checks fail if the visual job's image tag doesn't match it.
- `snapshotPathTemplate` puts baselines in `tests/__screenshots__/<spec>/<name>.png`, without an OS suffix, since they're only ever rendered on Linux.
- `fullyParallel: true`. On CI: `retries: 2`, `workers: 1`, and `forbidOnly`.
- `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`. HTML reporter locally; `list` + `github` + `blob` on CI, where the workflow merges the shards' blob reports into one HTML report. The merge passes `--config` because the containerised visual job records a different test directory.
- `.env` is loaded through `dotenv` if present.

`eslint.config.mjs` enforces many of the standards below mechanically, including `no-floating-promises`, `no-wait-for-timeout`, `prefer-web-first-assertions`, `no-useless-not` and `no-focused-test`. CI runs `typecheck` and `lint` before the tests.

## Layout

```
playwright.config.ts
api/
  AccountApiClient.ts    # typed client for createAccount / verifyLogin / deleteAccount (setup only)
accessibility/
  AccessibilityScanner.ts  # axe-core WCAG 2.1 A/AA scan; returns violations not in the baseline
scripts/
  run-visual-in-docker.sh  # runs the visual project in mcr.microsoft.com/playwright (amd64), like CI
tests/
  fixtures.ts            # `test`, `authenticatedTest`, `expect`; page setup, page-object, account and a11y fixtures
  <feature>.spec.ts      # one spec per feature area
  accessibility.spec.ts  # @a11y: one test per key page
  visual.spec.ts         # @visual: toHaveScreenshot of stable regions
  __screenshots__/       # visual baselines, rendered only in Docker
pages/
  BasePage.ts            # goto(), cookie-consent handling, waitForImageHeavyPage()
  HomePage.ts  ProductsPage.ts  CartPage.ts  LoginPage.ts  ContactPage.ts      # have fixtures
  SignupPage.ts  AccountCreatedPage.ts  AccountDeletedPage.ts  ProductDetailsPage.ts
  CheckoutPage.ts  PaymentPage.ts  OrderConfirmationPage.ts                    # reached through journeys only
  components/
    CartModal.ts         # add-to-cart confirmation shared by listing and details pages
test-data/
  TestDataFactory.ts     # every test input comes from here; users, addresses and cards are generated with faker
  accessibilityBaseline.ts  # known site violations per page, each with a reason
.github/
  workflows/playwright.yml   # CI: PR → @smoke on chrome; main + nightly → all projects (desktop 2 shards each) + visual job in Docker; report → GitHub Pages
  pull_request_template.md   # review checklist
  CODEOWNERS
TEST_STRATEGY.md         # scope, risks, levels, environments, pipeline, entry/exit criteria, flakiness policy
CONTRIBUTING.md          # how to add a test, page object, a11y or visual check
```

### How a test gets its page

`tests/fixtures.ts` extends Playwright's `test`:
- It overrides `page` to:
  - block ad-network requests with `page.route`;
  - seed cookie-consent keys in localStorage through `addInitScript`;
  - register an `addLocatorHandler` that dismisses the Google survey dialog whenever it appears.
- It adds one fixture per page object (`homePage`, `productsPage`, `cartPage`, `loginPage`, `contactPage`). Each fixture builds the page object and navigates to its URL.
- `testUser` creates a fresh account through the API before the test and deletes it afterwards, even when the test fails. Use it for anything that logs in through the UI or changes account state.
- `newUser` generates a user without creating it, for tests that register through the UI. Its teardown deletes the account through the API only if it still exists, so a test may delete it through the UI itself.
- `accessibilityScanner` wraps axe-core. `findNewViolations(ACCESSIBILITY_BASELINE.<page>)` returns only violations the baseline doesn't cover, and adds a report annotation when a baseline entry no longer occurs.
- `requireTierTag` is an auto fixture that fails any test without exactly one of `@smoke` / `@regression`.
- `authenticatedTest` is `test` with a logged-in `storageState`. Each worker creates one account (`sessionUser`), logs in through the UI once, and reuses that session for its tests, then deletes the account. Accounts are per worker because the cart belongs to the account. Tests on this session must not log out, delete the account, or leave the cart changed; use `testUser` for those. Import it as `import { authenticatedTest as test, expect } from './fixtures';` so the ESLint Playwright rules recognise it. The session fixture has its own `timeout`, because a worker-scoped fixture otherwise shares the first test's budget, and it sets `testIdAttribute` itself, because Playwright applies that option only to test-scoped contexts.

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
2. **Selectors, then actions.** Page objects group getters under `// ========== SELECTORS ==========` and methods under `// ========== ACTIONS ==========`. Every page extends `BasePage` and inherits its constructor.
3. **Locator priority:** `getByRole` → `getByLabel` → `getByText` → `getByPlaceholder` → `getByTestId` / `getByTitle` / `getByAltText` → `page.locator()` CSS as a last resort, scoped under a semantic locator where possible, with a comment saying why. One deterministic locator per element: **no `.or()` fallback chains, no `.first()`/`.nth()` to hide ambiguity**, and exact names (`{ name: 'Login', exact: true }`) instead of loose regexes. `testIdAttribute` is set to the site's `data-qa` hooks. No XPath.
4. **Community standards:**
   - Group tests with `test.describe()`.
   - Break multi-phase tests into `test.step()`.
   - Use web-first `expect(locator)` assertions, never `expect(await locator.isVisible()).toBe(true)`.
5. **Fixtures, not `new`.** Tests never instantiate page objects or call `page.goto` for a page that has a fixture. To add a page, create `pages/XPage.ts`, add a fixture in `tests/fixtures.ts`, then use the fixture in tests.
   - All page-object fixtures share one `page` and each navigates on setup, so a test requests **only the fixture of the page it starts on**. Requesting `productsPage` and `cartPage` together leaves the test on the cart page.
   - Multi-page journeys continue through navigation methods that return the next page object (`const cartPage = await productsPage.cartModal.viewCart();`).
   - Pages only reachable through a journey (signup, checkout, payment, order confirmation, product details) have no fixture.
   - UI shared across pages lives in `pages/components/` and is exposed through a page getter (`productsPage.cartModal`).
6. **Always `await`, never swallow.**
   - No floating promises and no `.catch(() => {})`.
   - Check optional UI explicitly (`if (await x.count() > 0)`) or handle it with `addLocatorHandler`.
7. **No useless comments.** Comments explain *why*, never *what*. No JSDoc that restates a name.

Also enforced:
- **No hard waits.** No `page.waitForTimeout()` and no ad-hoc `{ timeout }` options to hide flakiness. Rely on auto-waiting, or wait on a real condition (`waitForURL`, `waitFor({ state })`, `expect`). The git history includes a deliberate cleanup that removed these.
- **Test data comes from `TestDataFactory`.** Never inline literals in specs. Add a factory method if one is missing. Generated data (users, addresses, cards, contact details) uses faker and must be unique per call. Only the fixed site catalogue (products, search terms) is hard-coded.
- **Test names read as behaviour:** `'should <outcome> [when <condition>]'`. Keep tests independent and order-agnostic.
- **Every test is tagged** `{ tag: '@smoke' }` or `{ tag: '@regression' }` (exactly one; extra tags such as `@a11y` and `@visual` are fine). Smoke is the handful of journeys that prove the site works; everything else is regression.
- **Accessibility:** assert `expect(await accessibilityScanner.findNewViolations(baseline)).toEqual([])` after waiting for a known element. Baseline entries in `test-data/accessibilityBaseline.ts` name exact `targets` and a `reason`; omit `targets` only when the count follows the catalogue. Never baseline a new violation to make a test pass.
- **Visual:** screenshot regions, not whole pages, and only regions without products, prices or user data; mask anything that moves. Generate baselines only with `npm run test:visual:update` (Docker, amd64), never on the host, and look at the PNGs before committing. After bumping Playwright, update the image tag in the workflow and regenerate all baselines.
- **Flakiness:** follow the policy in `TEST_STRATEGY.md`. Quarantine with `test.fixme()` and a reason linking an Issue, never by loosening an assertion or adding a wait.
- **Skips need reasons.** Use `test.skip()` / `describe.skip` only with a comment or reason explaining why. Never commit `test.only`.
- **Strict TypeScript** (`strict: true`). Type every page-object method's return value (`Promise<void>`, `Locator`).

## Site-specific gotchas (automationexercise.com)

- **Cookie consent** (`.fc-consent-root`): pre-empted through localStorage in the `page` fixture, with `BasePage.handleCookieConsent()` as the fallback. Call it after navigations that may re-show the banner.
- **Third-party ads** (full-screen interstitials, `#google_vignette` URL fragments) caused most of the suite's flakiness. They're now blocked through `AD_NETWORK_URLS` in `fixtures.ts`. If a new ad source appears, extend that regex rather than adding waits. Keep matching on `url.pathname` in `waitForURL` predicates.
- **The ad script also rewrites words in product titles into links.** Don't locate products by a nested `getByText` on the title. Filter the `.product-image-wrapper` card by `hasText` (see `ProductsPage.productCardByName`).
- **Google survey dialog** is handled automatically by the locator handler in `fixtures.ts`. Don't add manual dismissal in tests.
- **Weak semantics to know about:** the nav is a `ul` in `<header>` (role `banner`, there's no `navigation`), and nav-link names include icon-font glyphs, so exact names fail there. "Add to cart", "Proceed To Checkout", the header's "Logged in as <name>" and the cart's remove icon are `<a>` tags without `href`, so they have no `link` role. The add-to-cart modal (`#cartModal`) has no `dialog` role.
- **Search** only submits on the search button's click handler. Pressing Enter in the field does nothing.
- **"Under heavy load (queue full)"** pages and hung form POSTs come from the shared server, not the suite. Locally, use `--workers=2` for repeat runs.
- **Contact form** submits through a JS `confirm()`. `ContactPage` registers the dialog handler.
- **Cart quantity is read-only** on this site, so don't write quantity-update tests. Set a quantity on the product details page before adding instead.
- **`/delete_account` deletes the logged-in account on a plain GET.** Never navigate there except in a test that means to delete its own account.
- **Product images hold back `load`.** The home and listing pages serve ~34 product images and one can take 30s+, so navigations that land there use `BasePage.waitForImageHeavyPage()` or `goto(path, 'domcontentloaded')`. The cart keeps `load`.
- **A guest's cart survives login**, and logging out empties it. A guest who proceeds to checkout gets `#checkoutModal` (no `dialog` role) asking them to register or log in.
- **Cloudflare 520 pages** ("Web server is returning an unknown error") also come from the shared server. They're absorbed by CI retries; check the failure snapshot before debugging the test.
- **The newsletter success alert** is only shown for about 1.5s. A web-first `toBeVisible()` catches it; don't add waits.
- **Mobile layout:** at Pixel 7 width the header nav doesn't collapse (there's no toggle), so the desktop page objects work unchanged on `mobile-chrome`.
- **The floating scroll-up button** (`#scrollUp`) fades in on scroll and overlaps the footer, so footer screenshots mask it (`homePage.scrollUpButton`).
- **Known accessibility violations** are identical in Chrome, Firefox and WebKit, so the `@a11y` tests run on every desktop project.
- It's a shared public site. Test accounts may be created **only** through the `testUser` / `authenticatedTest` fixtures, which always delete them. Never create accounts any other way or post beyond the demo forms. Occasional slowness is normal, and it's not a reason to add waits.
- **The API answers HTTP 200 for everything.** The real status is `responseCode` in the body, and JSON comes back as `text/html`. `AccountApiClient` handles both.

## Secrets

`.env` is git-ignored and loaded if present. Never commit it or print its values. No test needs stored credentials, because every account is generated per run, so never hard-code or commit any.

## Workflow expectations

- Before saying a change is done, run `npm run typecheck`, `npm run lint`, and the affected spec on the `chrome` project. For flakiness fixes, prove stability with `--repeat-each=3`. Run the full suite before a PR.
- Branch off `main`. Use conventional commit prefixes (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `ci:`).
