# Agent autonomy

The current level of each agent action, and the evidence for it. Levels are defined in [AgentsPlan.md](../AgentsPlan.md#autonomy-levels): **L1** suggest, **L2** act with approval, **L3** act, then spot check. An action moves up only when its threshold is met, and down on a failed spot check. Change this file in a PR, with the evidence linked.

| Agent | Action | Level | Threshold to move up | Evidence |
|---|---|---|---|---|
| `test-reviewer` | Style and standards findings | L2: advisory PR comments | L3 (pushes style-only fixes) at 95% of 20+ rated findings accepted | `npm run review:feedback` |
| `test-planner` | Clarification questions to the product owner | L3 | None: questions change nothing | — |
| `test-planner` | Test plan | L2: posted for QA approval | Capped: plan approval stays with QA | `plan-approved` label on the Issue |
| `/test-from-ticket` | Writing tests from an approved plan | L2: a PR that QA reviews and merges | Capped: merging stays with QA | The PR and its failure-proof table |
| `/test-from-ticket` | Failure proof | L3: a script decides, QA reads the table | — | `npm run eval:failure-proof` |
| Any | Deleting, quarantining, re-tiering a test, loosening an assertion, adding a baseline entry | L1: proposals only | Capped | — |
| Any | Resuming an `agent-stuck` run | L1: a person re-adds the label | — | — |

## Evals

Rerun after changing an agent's prompt, and attach the result to the PR.

| Agent | Command | Last result |
|---|---|---|
| `test-reviewer` | `/review-tests agents/evals/test-reviewer/seeded`, then `npm run eval:test-reviewer -- --findings …` | — |
| `test-planner` | `/test-from-ticket agents/evals/test-planner/tickets/<name>.md` for each ticket, then `npm run eval:test-planner` | 6 of 6 (2026-10-27, run before the agent type was registered: same prompt, read-only tools) |
| Failure proof | `npm run eval:failure-proof` | 3 of 3 verdicts (2026-10-27) |
