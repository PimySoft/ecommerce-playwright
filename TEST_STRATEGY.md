# Test Strategy

This document explains what the suite tests, what it leaves out, and why it is shaped this way. The rules for writing tests are in [CODING_STANDARDS.md](CODING_STANDARDS.md), and the steps for adding them are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Scope

**In scope:** user journeys on [automationexercise.com](https://automationexercise.com) that only a browser can verify. That covers what a shopper sees and does, from browsing and search to the cart, account and checkout, plus two checks that aren't functional: accessibility (WCAG 2.1 A/AA) and visual regressions of stable page regions. Coverage spans Chrome, Firefox and WebKit on desktop, and Chrome on a phone for the core journeys.

**Out of scope:**

| Not tested | Why |
| --- | --- |
| API behaviour and contracts | Belongs at a lower level, where it runs faster and fails more precisely. The API is used only to create and delete accounts. |
| Unit tests | There is no access to the site's source code. |
| Performance and load | The target is a shared public server; load testing it would be abusive and the results meaningless. |
| Security testing | The site isn't ours to probe. |
| Third-party content (ads, consent banner, Google survey) | Not the site's own behaviour. It is blocked or neutralised so it can't cause failures (see Environments). |
| Cart quantity updates | The site's cart quantity is read-only. Quantity is covered on the product details page instead. |

## Risk-based priorities

Effort and the `@smoke` tier follow business impact: what loses revenue or locks users out matters most.

| Priority | Area | Risk if broken | Coverage |
| --- | --- | --- | --- |
| 1 | Checkout and payment | No orders, so no revenue | Full journey in `@smoke`; invoice download in `@regression` |
| 1 | Login and registration | Users locked out | Happy paths in `@smoke`; validation, logout and invalid input in `@regression` |
| 2 | Cart | Orders lost or wrong | Add to cart in `@smoke`; removal, empty cart and guest-to-login persistence in `@regression` |
| 2 | Search and browse | Products can't be found | Search in `@smoke`; category, brand and edge cases in `@regression` |
| 3 | Product details | Wrong information shown | `@regression` |
| 3 | Accessibility | Users with disabilities excluded; legal exposure | `@regression` `@a11y` on five key pages |
| 3 | Visual layout | Broken styling | `@regression` `@visual` on four stable regions |
| 4 | Contact form, newsletter | Low business impact | `@regression` |

## Test levels

In a real team the pyramid would have unit and API tests below this suite. Here only the browser level is available, so the suite stays thin and covers journeys, not every rule.

| Level | Tool | Purpose |
| --- | --- | --- |
| Static checks | `tsc --strict`, ESLint with `eslint-plugin-playwright` | Catch floating promises, hard waits, focused tests and weak assertions before anything runs. |
| End-to-end | `@playwright/test`, Page Object Model | Prove the user journeys work across browsers. |
| Accessibility | `@axe-core/playwright` | Fail on any WCAG violation that isn't in the documented baseline of known site issues (`test-data/accessibilityBaseline.ts`). |
| Visual | `toHaveScreenshot()` | Catch unintended styling changes in regions that only change with a redesign. |

## Environments and test data

There is one environment: the public production demo site. It is shared, it isn't ours, and it can change without notice, which shapes the suite:

- **No control over data or deploys.** The product catalogue is fixed, so products, prices and search terms are hard-coded in `TestDataFactory`. Everything else (users, addresses, cards, contact details) is generated with faker and is unique per test.
- **Accounts are created and deleted per test.** The `testUser` fixture creates an account through the API and deletes it in teardown, even if the test fails. `authenticatedTest` keeps one account per worker. No account outlives a run, and no credentials are stored anywhere.
- **Third-party noise is removed, not waited out.** Ad networks are blocked at the network layer, cookie consent is pre-seeded and the Google survey is dismissed by a locator handler.
- **The server is sometimes slow or unavailable.** It shows "queue full" pages, Cloudflare 520 errors and dropped connections. CI absorbs these with retries and limits load to one worker per job and four concurrent jobs. These are environment failures, not test bugs (see the flakiness policy).
- **Visual baselines need a fixed renderer.** Screenshots differ between operating systems, CPU architectures and browser builds, so baselines are rendered and compared only in the `mcr.microsoft.com/playwright` Linux image (amd64), locally through `npm run test:visual` and in CI.

## Tagging and pipeline strategy

Every test has exactly one tier tag, which a fixture enforces at runtime:

- `@smoke` covers the few journeys that prove the site is usable: home page, login, session, registration, search, add to cart and checkout. It must stay fast enough for pull-request feedback.
- `@regression` covers everything else.

Extra tags group non-functional checks: `@a11y` and `@visual`.

| Project | Runs | Why |
| --- | --- | --- |
| `chrome`, `firefox`, `safari` | Everything except `@visual` | Cross-browser coverage of all behaviour |
| `mobile-chrome` (Pixel 7) | `@smoke` only | A phone needs to complete the core journeys; the rest is browser logic, not layout |
| `visual` | `@visual` only, in Docker | Screenshots are only comparable on one fixed renderer |

| Trigger | What runs | Purpose |
| --- | --- | --- |
| Pull request | `@smoke` on Chrome | Fast feedback before review |
| Push to `main` | Every project, sharded, plus the visual job | Full confidence in what's merged; the report is published to GitHub Pages |
| Nightly | Same as `main` | Catch site changes and flakiness; a failure opens or updates an Issue |
| Manual | Chosen project and tier | Investigation and re-runs |

## Entry and exit criteria

**Entry**, before tests run:

- `npm run typecheck` and `npm run lint` pass. CI runs them first and skips the tests if they fail.
- The visual job's Docker image matches the pinned `@playwright/test` version. CI checks this too.

**Exit for a pull request:**

- Static checks and `@smoke` on Chrome are green.
- New or changed tests pass locally with `--repeat-each=3` on Chrome, as the PR template asks.
- Changed visual baselines were regenerated with `npm run test:visual:update` and the diff was reviewed.

**Exit for `main`, the "release" bar:**

- The full matrix and the visual job are green.
- No `@smoke` test is quarantined.
- There is no open `nightly-failure` Issue older than the flakiness time limit below.

## Flakiness policy

A flaky test is one that fails and then passes without a code change. Flakiness is treated as a defect, because a suite people learn to re-run is a suite nobody trusts.

**Detection**
- CI retries a failed test twice. A test that passes on retry is marked **flaky** in the merged HTML report, which has a filter for that, and its trace is recorded on the first retry.
- The nightly run tracks trends: each failure opens an Issue labelled `nightly-failure` or comments on the open one, so repeats show up as a history.
- Locally, `--repeat-each=5` on the suspect test confirms it.

**Triage.** Check the failure screenshot first. "Queue full", a Cloudflare 520 or a dropped connection is the environment (see above): note it on the Issue and move on unless it becomes a pattern. Anything else is a test or site defect.

**Ownership and time limits**
- The test's code owner (see [CODEOWNERS](.github/CODEOWNERS)) owns the fix.
- Triage within **1 working day** of detection.
- Fix within **3 working days**, or quarantine it.
- A quarantined test is fixed or deleted within **2 weeks**. Quarantine is not a place to keep tests.

**Quarantine**
- Mark the test with `test.fixme()` and a reason that links the Issue: `test.fixme(true, 'Flaky: survey dialog races the click, see #42')`. Label the Issue `flaky`.
- Quarantine a `@smoke` test only together with an Issue that blocks release: losing smoke coverage is a release risk.
- Never delete the assertion or loosen it to make a test pass.

**Fixing: no new waits.** `waitForTimeout`, ad-hoc `{ timeout }` options and retry loops are not fixes; ESLint rejects the first. Find the real cause and wait on a real condition: a URL, a visible element, a response. Remove a third-party cause at the network layer, as the suite does for ads. Every flaky test fixed so far had a concrete cause, among them ad interstitials, the consent banner, the survey dialog and slow product images holding back `load`. The fix is recorded in the commit that removed it.
