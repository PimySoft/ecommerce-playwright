## What and why

<!-- What changes, and the reason for it. Link the Issue if there is one. -->

## How it was verified

<!-- Commands run and their result, e.g. `npx playwright test tests/cart.spec.ts --project=chrome --repeat-each=3`: 9 passed. -->

## Checklist

See [CONTRIBUTING.md](../CONTRIBUTING.md) and [CODING_STANDARDS.md](../CODING_STANDARDS.md).

- [ ] Locators are getters (or methods returning `Locator`), grouped under `SELECTORS` before `ACTIONS`.
- [ ] One deterministic locator per element: role → label → text → placeholder → test id → scoped CSS with a reason. No `.or()`, `.first()` or loose regexes.
- [ ] Specs import from `./fixtures` and request only the fixture of the page they start on.
- [ ] Inputs come from `TestDataFactory`; accounts come only from `testUser`, `newUser` or `authenticatedTest`.
- [ ] Each new test has exactly one of `@smoke` / `@regression`, and its name says "should … [when …]".
- [ ] Assertions check the business outcome, using web-first `expect`.
- [ ] No hard waits, ad-hoc timeouts, floating promises or swallowed errors.
- [ ] Every skip or `fixme` has a reason and, for quarantine, a linked Issue.
- [ ] Visual baselines (if changed) were regenerated with `npm run test:visual:update` and reviewed.
- [ ] Accessibility baseline entries (if added) name exact targets and a reason.
- [ ] `npm run typecheck` and `npm run lint` pass; new or changed tests pass with `--repeat-each=3`.
