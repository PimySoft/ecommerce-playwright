# Showcase Upgrade Plan

Goal: raise this repository from a solid mid-level example to a portfolio piece for **Senior Automation QA / QA Lead / QA Automation Lead** roles.

Phases are ordered by impact. Phases 0–3 matter most for Senior roles; phases 4–6 add the Lead-level signals. Each phase should land as its own PR into `main` so the git history tells the story.

Every phase finishes with the same gate: `npm run typecheck` and `npm run lint` pass, the full suite passes on all projects, and new or changed tests pass with `--repeat-each=3`.

---

## Phase 0 — Land current work and fix presentation basics

The public `main` branch is three commits behind the working branch, so visitors see older code.

- [ ] Commit the current changes (CLAUDE.md, ESLint, Firefox project, ad blocking, locator fixes, `.cursorrules` removal).
- [ ] Open a PR from `refactor/remove-unnecessary-timeouts` into `main`, then squash-merge it with a clear summary.
- [ ] Delete merged branches and make `main` the only long-lived branch. Remove `develop` from the CI triggers unless it will be used.
- [ ] Rename the repository to `ecommerce-playwright` (fixes the "PLayWright" typo) and update local remotes.
- [ ] Set the GitHub description, topics (`playwright`, `typescript`, `e2e-testing`, `test-automation`, `page-object-model`) and pin the repo on the profile.
- [ ] Turn on branch protection for `main`: require PRs and require CI to pass.

**Done when:** `main` contains all current work, CI is green on `main`, and the repo name and description are accurate.

---

## Phase 1 — Make the README accurate and concise

The README is the first thing a reviewer reads. Today it makes claims the code doesn't back up.

- [ ] Remove the inaccurate claims: "uses official Playwright GitHub Action", "separate API test jobs", and Percy described as active.
- [ ] Remove the emoji headings and the "Future Plans" list; the roadmap belongs in this plan or in GitHub Issues.
- [ ] Rewrite it into these sections: one-paragraph overview → CI badge and live-report link → tech stack → quick start → project structure → design decisions (why POM + fixtures, locator strategy, ad blocking, API for setup but not for testing) → test coverage table.
- [ ] Keep the test-pyramid rationale, shortened to a few lines.
- [ ] Add an architecture diagram (Mermaid) showing tests → fixtures → page objects → site, plus the API setup path.
- [ ] Link to `CODING_STANDARDS.md` and `TEST_STRATEGY.md` (from Phase 6).

**Done when:** every statement in the README can be verified in the code or CI, and it reads in under three minutes.

---

## Phase 2 — Harden locators and assertions

Senior reviewers judge locator and assertion quality first.

- [x] Audit every page object and replace the stacked `.or()` fallback chains with one deterministic locator per element. Use `playwright codegen` and the UI mode locator picker to confirm each one.
  - *Confirmed against the live accessibility tree. The site's `data-qa` hooks are now the `testIdAttribute`.*
- [x] Replace loose regexes (`/cart/i`, `/products/i`, `/home/i`) with exact accessible names scoped to the navigation region, e.g. `page.getByRole('navigation').getByRole('link', { name: 'Cart' })`.
  - *The site has no `navigation` landmark, so links are scoped to `banner`. Their names include icon-font glyphs, so they use plain-string (substring) names instead of `exact`.*
- [x] Remove the `.first()` calls that only hide ambiguous locators.
- [x] Strengthen the weak assertions:
  - **E2E workflow:** assert the chosen product's name, price, quantity and total in the cart, not just "the empty-cart message is hidden".
  - **Search:** assert that every result contains the search term, and that the "Searched Products" heading is shown.
  - **Add to cart:** assert the modal's confirmation text, not only that it's visible.
  - *The audit also found that search never submitted (Enter does nothing; only the button's click handler searches), and that the checkout button's "hidden" assertion always passed because of a wrong role.*
- [x] Remove `pageInstance` from `BasePage` if `page` can be exposed in a cleaner way, and drop the leftover "what" comments in `fixtures.ts`.
  - *Percy specs use the `page` fixture directly.*
- [x] Turn on stricter ESLint rules where they now pass, e.g. `playwright/no-nth-methods` as a warning.
  - *Specs: `no-nth-methods`, `no-raw-locators`, `no-conditional-in-test`, `prefer-to-have-count` and `prefer-locator` are errors. Pages: `no-nth-methods` is a warning.*

**Done when:** no page object contains a CSS fallback chain, every test asserts the business outcome it names, and the suite is stable at `--repeat-each=5`.

---

## Phase 3 — API-backed test data and authenticated sessions

This is the clearest Senior signal: use the API for **setup** and keep the browser for **behaviour**.

The site exposes a public API (https://automationexercise.com/api_list), including `POST /api/createAccount`, `POST /api/verifyLogin` and `DELETE /api/deleteAccount`.

- [x] Add `@faker-js/faker` and turn `TestDataFactory` into a real factory that generates unique users, addresses and card details per test.
  - *Products and search terms stay fixed because the catalogue is fixed. `getValidCredentials` is gone; invalid-login tests use freshly generated, unregistered credentials.*
- [x] Add an `api/` layer: a small typed client around Playwright's `request` fixture for the account endpoints.
  - *`api/AccountApiClient.ts`. The API always returns HTTP 200 with the real status in `responseCode`, so the client checks that.*
- [x] Add a `testUser` fixture that creates an account through the API before the test and deletes it afterwards, even when the test fails.
- [x] Add an `auth.setup.ts` project that logs in once through the UI and saves `storageState`. Add a `loggedInPage` fixture or an authenticated project that reuses it.
  - *Implemented as a worker-scoped `authenticatedTest` instead of a setup project. One account shared by all workers would share one cart, so each worker creates its own account, logs in through the UI once, and reuses the `storageState`.*
- [x] Use `.env` / CI secrets for anything that must stay stable. Never hard-code credentials.
  - *Nothing needs to stay stable any more: every account is generated per run, so no credentials are stored at all.*
- [x] Update the CLAUDE.md "don't create real accounts" rule: test accounts may be created **only** through the `testUser` fixture, which always cleans up.

**Done when:** no test depends on a pre-existing account, logged-in tests skip the UI login, and no test accounts are left behind after a run.

---

## Phase 4 — Cover the core e-commerce journeys

The suite has 12 real tests, and the most important journey is missing.

- [x] **Registration:** sign up through the UI with a generated user, verify "Logged in as", and delete the account through the UI.
  - *`newUser` fixture: generated but not created; its teardown deletes the account through the API only if it still exists. `/delete_account` deletes on a plain GET.*
- [x] **Login:** valid login (through the API-created user), invalid login, and logout.
- [x] **Checkout, end to end:** log in → add several products → cart → checkout → verify the address and order review → pay → order confirmation.
  - *Navigations to the home and listing pages wait for `domcontentloaded`: a single slow product image could hold back `load` for 30s+.*
- [x] **Invoice download:** handle the download with `page.waitForEvent('download')` and assert the file name and contents.
- [x] **Product details:** name, category, price, availability and brand on the details page; add to cart with a custom quantity.
- [x] **Category and brand filters:** the filtered listing shows only matching products.
  - *Asserted against the exact catalogue lists in `TestDataFactory`, not just a heading.*
- [x] **Cart:** contents persist after login, removing products, and an empty cart blocks checkout.
  - *A guest's cart survives login; the test goes through the real "Register / Login" checkout prompt.*
- [x] **Subscription footer:** the success message is shown.
- [x] Data-driven tests where they add value (e.g. a loop of `test()` over invalid-registration cases), not just for volume.
  - *One test per required signup field. Each proves the browser blocked the submit (focus moves to the empty field, which is the only `:invalid` one).*
- [x] Tag every test `@smoke` or `@regression` using Playwright's `tag` option.
  - *Enforced at runtime by the `requireTierTag` auto fixture (eslint-plugin-playwright 2.12 has no tag rule). `npm run test:smoke` / `test:regression`.*

**Done when:** the coverage table in the README lists each journey with its tag, and the checkout test runs green in CI.

---

## Phase 5 — CI/CD

- [x] Run Chrome, Firefox and WebKit in parallel as a CI matrix. Use the `mcr.microsoft.com/playwright` Docker image or `--with-deps` so WebKit works on Linux.
  - *`--with-deps`, not the Docker image: the image has no Google Chrome, which the `chrome` project's channel needs. A `plan` job builds the matrix per trigger.*
- [x] Shard the suite (`--shard=1/N`) and merge the results with the `blob` reporter and `merge-reports`.
- [x] Publish the merged HTML report to GitHub Pages for every run on `main`, and link it from the README.
  - *Needs Pages enabled with "GitHub Actions" as the source (Settings → Pages).*
- [x] Upload traces and screenshots on failure, and keep `trace: 'on-first-retry'`.
- [x] Pipeline strategy: pull requests run `@smoke` on Chrome; `main` runs the full suite on all browsers; a nightly scheduled run (`cron`) runs everything and opens or updates an Issue on failure.
- [x] Cache the npm and Playwright browser downloads.
- [x] Add a `workflow_dispatch` trigger with browser and tag inputs.
- [x] Add CI status and report badges to the README.

**Done when:** a PR gets smoke feedback in under 5 minutes, the full matrix runs green on `main`, and the latest report is publicly viewable.

---

## Phase 6 — Broader quality checks and Lead-level documentation

### Wider quality coverage
- [ ] **Accessibility:** add `@axe-core/playwright` checks on key pages with a documented baseline of known site violations, so new violations fail the test.
- [ ] **Mobile:** add a `mobile-chrome` project (e.g. `devices['Pixel 7']`) that runs `@smoke`, and handle the responsive navigation in the page objects.
- [ ] **Visual:** add `toHaveScreenshot()` tests for stable regions such as the header, footer and an empty cart, with ads blocked and dynamic content masked. Generate the baselines in the Linux Docker image so they match CI.
- [ ] **Percy:** decide between keeping it as an optional integration with clear docs, or removing it in favour of `toHaveScreenshot`. Don't leave it half-configured.

### Lead-level documents
- [ ] `TEST_STRATEGY.md` (one or two pages):
  - scope and what's out of scope;
  - risk-based priorities;
  - test levels and why each exists;
  - environments and test data;
  - tagging and pipeline strategy;
  - entry and exit criteria.
- [ ] **Flakiness policy** (in the strategy or separate):
  - how flaky tests are detected (retries in the report, nightly trends);
  - who fixes them and the time limit for doing so;
  - when to quarantine with `test.fixme` and a linked Issue;
  - "no new waits" as the rule.
- [ ] `CONTRIBUTING.md` covering how to add a page object, fixture or test, with a checklist that mirrors `CODING_STANDARDS.md`.
- [ ] `.github/pull_request_template.md` with the review checklist, and a `CODEOWNERS` file.
- [ ] Update `CLAUDE.md` and `CODING_STANDARDS.md` to cover the API layer, tags, accessibility and visual testing.

**Done when:** a new team member could add a well-structured test using only the docs, and the strategy explains *why* the suite is shaped as it is.

---

## Phase 7 — Final review

- [ ] Do a fresh-clone dry run: follow the README from scratch on a clean machine or in a Codespace.
- [ ] Run `--repeat-each=5` across all projects to confirm stability, and record the run time and pass rate in the README.
- [ ] Review the git history on `main`: phase PRs with clear titles and descriptions that read as a story.
- [ ] Prepare interview talking points: three design decisions, one hard bug and how it was diagnosed (e.g. the ad script rewriting product titles), and what you'd do with a real team and app.
- [ ] Decide whether `Plan.md` stays in the repo as a roadmap or is replaced by GitHub Issues and Milestones. Issues are a better Lead signal.
