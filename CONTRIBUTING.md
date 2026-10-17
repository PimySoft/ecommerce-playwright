# Contributing

How to add to the suite. The rules are in [CODING_STANDARDS.md](CODING_STANDARDS.md), and the reasoning is in [TEST_STRATEGY.md](TEST_STRATEGY.md).

## Workflow

1. Run `npm ci` and `npx playwright install`. Docker is needed only for visual tests.
2. Branch off `main` with a conventional prefix: `feat/`, `fix/`, `test/`, `refactor/`, `docs/` or `ci/`.
3. Find locators with `npx playwright codegen https://automationexercise.com` or the picker in UI mode (`npx playwright test --ui`).
4. Run `npm run typecheck`, `npm run lint` and the affected spec on Chrome with `--repeat-each=3`.
5. Commit with a conventional message, such as `test: cover guest checkout prompt`, and open a PR. The template holds the review checklist.

## Add a test

1. Use the spec for the feature area in `tests/`, or create `tests/<feature>.spec.ts`.
2. Import from the fixtures, not `@playwright/test`:
   ```ts
   import { test, expect } from './fixtures';
   // or, for a logged-in session the test won't change:
   import { authenticatedTest as test, expect } from './fixtures';
   ```
3. Request only the fixture of the page the test starts on, plus any account it needs:
   - `testUser` for an account that already exists;
   - `newUser` for details to register through the UI;
   - `sessionUser` for the logged-in user under `authenticatedTest`.
4. Take every input from `TestDataFactory`, adding a method if one is missing.
5. Name the test as behaviour and give it one tier tag:
   ```ts
   test('should <outcome> when <condition>', { tag: '@regression' }, async ({ cartPage }) => { … });
   ```
6. Split multi-phase tests with `test.step()`, and assert the business outcome, not just visibility.

## Add a page object

1. Create `pages/XPage.ts`, extending `BasePage`, with getters under `SELECTORS` and methods under `ACTIONS`. A navigation method waits for the new URL and returns the next page object.
2. If tests can open the page by URL, add a fixture to `tests/fixtures.ts`:
   ```ts
   xPage: async ({ page }, use) => {
     const xPage = new XPage(page);
     await xPage.goto('/x');
     await use(xPage);
   },
   ```
   Use `goto('/x', 'domcontentloaded')` for pages full of product images.
3. If the page is reached only through a journey, such as checkout, don't add a fixture. Return it from the previous page's navigation method.
4. UI shared by several pages goes in `pages/components/` as a class that takes a `Page`, exposed through a getter on each page that shows it.

## Add an accessibility check

1. Add a test to `tests/accessibility.spec.ts`, tagged `['@regression', '@a11y']`.
2. Wait for a known element, then assert `expect(await accessibilityScanner.findNewViolations(baseline)).toEqual([])`.
3. For each existing violation the site won't fix, add an entry to `test-data/accessibilityBaseline.ts` with the rule, the exact `targets` and a `reason`. Never baseline a new regression.

## Add a visual check

1. Add a test to `tests/visual.spec.ts`, tagged `['@regression', '@visual']`, that captures a region without products, prices or user data. Mask anything that moves.
2. Render the baseline with `npm run test:visual:update`, never on your own machine.
3. Look at the PNGs in `tests/__screenshots__/` before committing.
4. After a Playwright upgrade, update the image tag in the workflow and regenerate every baseline.
