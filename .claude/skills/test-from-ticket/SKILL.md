---
name: test-from-ticket
description: Turn a demo-story Issue (or a Markdown eval ticket) into tests for this repo. Plans with the test-planner agent, asks the product owner when the ticket is ambiguous, posts the plan for QA approval, and once approved writes the tests, proves each one can fail, and has them reviewed.
argument-hint: "<issue number> | <path to ticket.md>"
---

Take one ticket from plan to reviewed tests. Arguments: `$ARGUMENTS`. The planner only reads; scripts validate, hash, post and prove; QA's approval is the `plan-approved` label, which only a person adds.

## 1. Read the ticket

- An Issue number: `npx tsx scripts/planner/prepare-ticket.ts --issue <n>`. It refuses Issues without the `demo-story` label.
- A file: `npx tsx scripts/planner/prepare-ticket.ts --file <path>`. File tickets are for evals: run steps 2–3 only, and never post anything.

It prints the target directory, `.plans/<target>/`.

For an Issue labelled `plan-approved`, go to step 5. Otherwise plan it.

## 2. Plan

Start the `test-planner` agent (`subagent_type: "test-planner"`) with a prompt that gives only the target directory. Don't add your own view of the ticket.

Write its JSON, exactly as returned, to `.plans/<target>/plan.json`, then run:

```bash
npx tsx scripts/report-test-plan.ts --plan .plans/<target>/plan.json
```

It validates the plan against the ticket and prints the plan comment. If validation fails, send the errors back to the same agent once (SendMessage) and ask for corrected JSON. If it fails again, stop and report the errors; for an Issue, add `agent-stuck` with a comment saying why.

## 3. The clarification gate

If the plan has questions, it's blocked.
- **File ticket:** show the plan and stop.
- **Issue, user present:** ask the questions with AskUserQuestion, using the plan's options and marking the recommendation. Post the answers to the Issue as one comment (`gh issue comment <n>`), so the ticket stays the record, then go back to step 1. If the user won't answer now, post the plan as below and stop.

## 4. Post the plan

```bash
npx tsx scripts/report-test-plan.ts --plan .plans/<target>/plan.json --post true
```

It posts the plan comment with its approval hash, and labels the Issue `needs-clarification` or `plan-review`. Stop here. Tell the user that QA approves by adding `plan-approved`, after replying with the IDs of any suggestions to include, and that `/test-from-ticket <n>` then continues.

## 5. Check the approval

```bash
npx tsx scripts/check-plan-approval.ts --issue <n> --apply true
```

If it exits non-zero, stop and report its reason. When the ticket changed after approval, it has already withdrawn the approval; the next run plans again.

Run step 1 again so `ticket.json` is current. The approved plan is the latest plan comment on the Issue, and `.plans/<target>/plan.json` if it matches; if that file is missing, plan again (step 2) and stop if the new plan's hash differs from the approved one. Include the suggestions the owner picked in comments after the plan, and nothing else beyond it.

## 6. Write the tests

Branch off `main` as `test/issue-<n>-<slug>`. Write each planned test as CONTRIBUTING.md describes, with the name, tier, spec, starting fixture and new members the plan gives, and the ticket as an annotation:

```ts
test('should …', { tag: '@regression', annotation: { type: 'issue', description: '#<n>' } }, async ({ cartPage }) => { … });
```

Then run `npm run typecheck`, `npm run lint` and `npx playwright test <specs> --project=chrome --repeat-each=3 --workers=2`. Fix only the code you wrote. Failures that TEST_STRATEGY's flakiness policy calls environmental (queue-full pages, Cloudflare 520s, hung POSTs) are retried later, never fixed in the test. After two failed attempts, stop, add `agent-stuck` and comment with the reason.

## 7. Prove each test can fail

For each new test, write a sabotage in `.proof/issue-<n>/<test id>.ts` that breaks the behaviour in its "fails if" line:

```ts
import type { Page } from '@playwright/test';

export async function sabotage(page: Page): Promise<void> {
  await page.route('**/view_cart', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('Rs. 500', 'Rs. 499') });
  });
}
```

Change a value, never remove an element. Then write `.proof/issue-<n>/proof.json`, one entry per test (see `agents/evals/failure-proof/proof.json`): `id`, `test` as `<spec>:<line of its test( call>`, `failsIf`, a one-line `sabotage`, `sabotageFile`, and `assertion` as `<spec>:<line>` of the assertion that must fail. Run:

```bash
npx tsx scripts/verify-failure-proof.ts --proof .proof/issue-<n>/proof.json
```

The script decides; don't overrule it. If a proof failed because the sabotage was wrong, you may fix the sabotage once. Never change a test to make its proof pass: a test that passes its sabotage is flagged for QA in the PR, not rewritten. Sabotages are never committed.

## 8. Review and open the PR

Run `/review-tests` on the branch, giving the ticket's acceptance criteria and the proof table. Fix nothing the user hasn't asked you to.

Ask the user before pushing and opening the PR. Its description follows `.github/pull_request_template.md` and adds:
- `Refs #<n>` and a link to the approved plan comment;
- the failure-proof table, with a line naming any test whose proof failed for a full QA review;
- the plan's assumptions, for QA to check.

Then delete `.proof/issue-<n>/`.
