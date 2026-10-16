# Contributing

This guide shows how to add to the suite. The rules behind each step, with examples, are in [CODING_STANDARDS.md](CODING_STANDARDS.md). The reasons the suite is shaped this way are in [TEST_STRATEGY.md](TEST_STRATEGY.md).

## Setup

```bash
npm ci
npx playwright install          # add --with-deps on Linux
npm run typecheck && npm run lint
npm run test:chrome
```

Docker is only needed for visual tests (`npm run test:visual`).

## Workflow

1. Branch off `main` with a conventional prefix: `feat/`, `fix/`, `test/`, `refactor/`, `docs/` or `ci/`.
2. Make the change. Find locators with `npx playwright codegen https://automationexercise.com` or the locator picker in UI mode (`npx playwright test --ui`).
3. Run `npm run typecheck`, `npm run lint` and the affected spec on Chrome with `--repeat-each=3`.
4. Commit with a conventional message (`test: cover guest checkout prompt`) and open a PR. The template holds the review checklist.

## Add a test

1. Pick the spec for the feature area in `tests/`, or create `tests/<feature>.spec.ts`.
2. Import from the fixtures, never from `@playwright/test`:
   ```ts
   import { test, expect } from './fixtures';
   // or, for a logged-in session that the test won't change:
   import { authenticatedTest as test, expect } from './fixtures';
   ```
3. Request **only** the fixture of the page the test starts on, plus any data fixtures:
   - `testUser`: an account that exists, created through the API.
   - `newUser`: generated details for registering through the UI.
   - `sessionUser`: the logged-in user, with `authenticatedTest`.
4. Take inputs from `TestDataFactory`. If it lacks a method, add one; don't put literals in the spec.
5. Name the test as behaviour and give it exactly one tier tag:
   ```ts
   test('should <outcome> when <condition>', { tag: '@regression' }, async ({ cartPage }) => { … });
   ```
6. Break multi-phase tests into `test.step()`, and assert the business outcome (values, text, counts), not just visibility.

## Add a page object

1. Create `pages/XPage.ts`:
   ```ts
   export class XPage extends BasePage {
     constructor(page: Page) {
       super(page);
     }

     // ========== SELECTORS ==========
     get submitButton(): Locator {
       return this.page.getByRole('button', { name: 'Submit', exact: true });
     }

     // ========== ACTIONS ==========
     async submit(): Promise<NextPage> {
       await this.submitButton.click();
       await this.page.waitForURL((url) => url.pathname === '/next');
       return new NextPage(this.page);
     }
   }
   ```
2. If tests can open the page directly by URL, add a fixture (step 3). If it is only reached through a journey (checkout, payment), don't: return it from the navigation method of the page before it.
3. Add the fixture in `tests/fixtures.ts`. Add its type to `TestFixtures`, then add:
   ```ts
   xPage: async ({ page }, use) => {
     const xPage = new XPage(page);
     await xPage.goto('/x');
     await use(xPage);
   },
   ```
   Use `goto('/x', 'domcontentloaded')` if the page is full of product images.
4. UI that appears on several pages goes in `pages/components/` as a class that takes a `Page` (it does not extend `BasePage`). Expose it through a getter on each page that shows it.

## Add an accessibility check

1. Add a test to `tests/accessibility.spec.ts` tagged `['@regression', '@a11y']`, using the page's fixture and `accessibilityScanner`.
2. Wait for a known element, then assert `expect(await accessibilityScanner.findNewViolations(baseline)).toEqual([])`.
3. Run it. For each existing violation the site can't fix, add an entry to `test-data/accessibilityBaseline.ts` with the rule, the exact `targets` and a `reason`. Leave `targets` out only when the count depends on the catalogue. Never add a baseline entry to hide a regression.

## Add or update a visual check

1. Add a test to `tests/visual.spec.ts` tagged `['@regression', '@visual']` that screenshots a **region** (header, form, sidebar), not a whole page. Choose regions without products, prices or user data. Mask anything that still moves with `mask: [locator]`.
2. Run `npm run test:visual:update` to render the baseline in Docker. Never generate baselines on your machine directly: macOS and arm64 rendering won't match CI.
3. Open the new or changed PNGs in `tests/__screenshots__/` and check them before committing.
4. After a Playwright upgrade, update the image tag in `.github/workflows/playwright.yml` and regenerate every baseline. CI fails if the tag and the version disagree.

## Checklist

The PR template repeats this list. It mirrors [CODING_STANDARDS.md](CODING_STANDARDS.md).

- [ ] Locators are getters (or methods returning `Locator` when they take a parameter), never fields.
- [ ] Page objects group `SELECTORS` then `ACTIONS`, extend `BasePage`, and type every return value.
- [ ] One deterministic locator per element, following the priority role → label → text → placeholder → test id → scoped CSS, with a comment when CSS is used. No `.or()` chains, no `.first()`/`.nth()`, exact names.
- [ ] Specs import from `./fixtures` and use fixtures, not `new XPage()` or `page.goto`.
- [ ] Each test requests only the fixture of the page it starts on.
- [ ] Inputs come from `TestDataFactory`; generated data uses faker.
- [ ] Accounts come only from `testUser`, `newUser` or `authenticatedTest`.
- [ ] Every test has exactly one of `@smoke` or `@regression`, and a name of the form "should … [when …]".
- [ ] Tests use `test.describe` and `test.step`, and web-first assertions on the business outcome.
- [ ] No hard waits, ad-hoc timeouts, floating promises or `.catch(() => {})`.
- [ ] Comments explain *why*; no comment restates the code.
- [ ] Every skip or `fixme` has a reason (and, for quarantine, a linked Issue).
- [ ] `npm run typecheck`, `npm run lint` and the affected spec with `--repeat-each=3` pass.
