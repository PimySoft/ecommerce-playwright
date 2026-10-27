# Test Strategy

What the suite tests, what it leaves out, and why.

## Scope

The suite tests what only a browser can verify on [automationexercise.com](https://automationexercise.com): browsing, search, cart, account and checkout, plus accessibility and visual layout. It runs on Chrome, Firefox and WebKit, and runs the core journeys on a phone.

Out of scope, and why:
- **API and contract behaviour** belongs at a lower level, where it is faster and fails more precisely. The API is used only to create and delete accounts.
- **Unit tests** need the site's source, which we don't have.
- **Performance, load and security testing** would abuse a shared public site we don't own.
- **Ads, the consent banner and the Google survey** aren't the site's behaviour, so they are blocked or neutralised.
- **Cart quantity updates** don't exist, because the cart's quantity is read-only. Quantity is tested on the product details page.

## Priorities

Effort follows business impact, highest first:

1. **Checkout and payment** lose revenue when broken. The full journey is smoke, and the invoice is regression.
2. **Login and registration** lock users out. Happy paths are smoke, and validation is regression.
3. **Cart, search and browse** lose or misdirect orders. Add to cart and search are smoke, and the rest is regression.
4. **Product details, accessibility and visual layout** show wrong or exclusionary content. All regression.
5. **Contact form and newsletter** have low impact. Regression.

## Levels

In a real team, unit and API tests would sit below this suite. Here only the browser is available, so the suite stays thin and covers journeys rather than every rule.

- **Static checks:** `tsc --strict` and ESLint catch floating promises, hard waits, focused tests and weak assertions before anything runs.
- **End-to-end:** Playwright with page objects proves the journeys work.
- **Accessibility:** axe-core fails on any WCAG violation that isn't in the documented baseline.
- **Visual:** `toHaveScreenshot()` catches styling changes in stable regions.

## Environment and data

There is one environment, the public production site. It is shared and can change without notice.

- The catalogue is fixed, so products and search terms are hard-coded in `TestDataFactory`. Everything else is generated with faker and is unique per test.
- Accounts are created through the API per test, or per worker for logged-in sessions, and always deleted.
- Third-party noise is removed at the network layer rather than waited out.
- The server sometimes returns "queue full" pages, Cloudflare 520 errors or dropped connections. CI absorbs these with retries and a low worker count.
- Visual baselines are rendered and compared only in the `mcr.microsoft.com/playwright` image on amd64, because rendering differs across machines.

## Pipeline

Every test has exactly one tier tag. `@smoke` covers the few journeys that prove the site is usable and must stay fast. `@regression` is everything else. `@a11y` and `@visual` group the non-functional checks.

- **Pull request:** static checks, then `@smoke` on Chrome.
- **Push to `main`:** every project, sharded, plus the visual job. The report is published to GitHub Pages, with a trend page built from every recorded run on the `ci-history` branch.
- **Nightly:** the same as `main`. A failure opens or updates an Issue.
- **Manual:** a chosen project and tag, for investigation.

The desktop browsers run everything except `@visual`. The Pixel 7 runs `@smoke` only, because the regression detail is browser logic, not layout. The visual project runs only `@visual`, in Docker.

## Entry and exit criteria

Before tests run, the type check and lint must pass, and the visual job's image must match the pinned Playwright version. CI checks both.

A pull request can merge when:
- static checks and `@smoke` on Chrome are green;
- new or changed tests pass locally with `--repeat-each=3`;
- any changed visual baselines were regenerated in Docker and reviewed.

`main` is releasable when:
- the full matrix and the visual job are green;
- no `@smoke` test is quarantined;
- no `nightly-failure` Issue is older than the time limits below.

## Flakiness policy

A flaky test fails and then passes with no code change. It is a defect, because a suite people learn to re-run is a suite nobody trusts.

1. **Detect.** A test that passes on retry is marked flaky in the merged report, with a trace. Nightly failures accumulate on one Issue, so repeats show as a history. Locally, `--repeat-each=5` confirms a suspect.
2. **Triage within 1 working day.** Check the failure screenshot first. A queue-full page, a 520 or a dropped connection is the environment: note it on the Issue. Anything else is a test or site defect.
3. **Fix within 3 working days, or quarantine.** The code owner in [CODEOWNERS](.github/CODEOWNERS) owns it.
4. **Quarantine** with `test.fixme()` and a reason that links the Issue, for example `test.fixme(true, 'Flaky: survey dialog races the click, see #42')`. Label the Issue `flaky`. Quarantining a `@smoke` test also needs an Issue that blocks release.
5. **Fix or delete within 2 weeks** of quarantine.

A fix finds the real cause and waits on a real condition: a URL, an element or a response. Hard waits, ad-hoc timeouts, retry loops and loosened assertions are not fixes. Every flaky test fixed so far had a concrete cause, such as ad interstitials, the consent banner, the survey dialog or slow product images holding back `load`.
