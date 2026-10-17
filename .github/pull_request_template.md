## What and why

<!-- What changes and why. Link the Issue if there is one. -->

## How it was verified

<!-- Commands and results, e.g. `npx playwright test tests/cart.spec.ts --project=chrome --repeat-each=3`: 12 passed. -->

## Checklist

See [CODING_STANDARDS.md](../CODING_STANDARDS.md).

- [ ] Locators are getters (or methods returning `Locator`), under `SELECTORS` before `ACTIONS`.
- [ ] One deterministic locator per element, with a reason for any CSS. No `.or()`, `.first()` or loose regexes.
- [ ] Specs import from `./fixtures` and request only the fixture of the page they start on.
- [ ] Inputs come from `TestDataFactory`; accounts come only from the account fixtures.
- [ ] Each new test has one tier tag and a name of the form "should … [when …]".
- [ ] Assertions are web-first and check the business outcome.
- [ ] No hard waits, ad-hoc timeouts, floating promises or swallowed errors.
- [ ] Every skip or `fixme` has a reason, and quarantine links an Issue.
- [ ] Changed visual baselines were rendered in Docker and reviewed.
- [ ] New accessibility baseline entries name exact targets and a reason.
- [ ] `npm run typecheck` and `npm run lint` pass, and new or changed tests pass with `--repeat-each=3`.
