---
name: review-tests
description: Review this repo's new or changed Playwright tests and page objects against CODING_STANDARDS.md with the test-reviewer agent. Use on the current branch, on a pull request (--pr <n>, which also posts the findings for 👍/👎), on given paths, or automatically after writing tests.
argument-hint: "[--pr <n>] [path...]"
---

Review test code with the `test-reviewer` agent. The agent only reads; you prepare its input, then save, check, show and (for a PR) post its findings with scripts. Arguments: `$ARGUMENTS`.

## 1. Prepare the target

Run the script with the same arguments:
- no arguments: `bash scripts/review/prepare-review.sh` (this branch against `origin/main`, committed or not; run `git fetch origin main` first if `origin/main` may be stale);
- `--pr <n>`: `bash scripts/review/prepare-review.sh --pr <n>`;
- paths: `bash scripts/review/prepare-review.sh <path>...`.

It prints the target directory, `.review/<target>/`. If `files.txt` is empty, say there's no test code to review and stop.

## 2. Run the reviewer

Start the `test-reviewer` agent (Agent tool, `subagent_type: "test-reviewer"`) with a prompt that gives only:
- the target directory;
- the acceptance criteria or failure-proof table, if this review follows writing tests from a ticket and you have them.

Don't add your own view of the code, and don't review it yourself: the reviewer works in a fresh context so the author never reviews its own work.

## 3. Save and check the findings

Write the agent's JSON, exactly as returned, to `.review/<target>/findings.json`. Then run:

```bash
npx tsx scripts/report-review-findings.ts --findings .review/<target>/findings.json
```

It validates the file (every rule must be a `CODING_STANDARDS.md` heading or one of the extra rules) and prints the findings. If validation fails, send the errors back to the same agent once (SendMessage) and ask for corrected JSON. If it fails again, stop and report the errors.

## 4. Report

Show the user the printed findings. Findings are advisory: don't fix anything unless the user asks. If the user asks you to fix them, fix only what the findings name, then run `npm run typecheck`, `npm run lint` and the affected specs as CLAUDE.md requires.

## 5. With `--pr <n>`: post, then clean up

Post the findings to the pull request:

```bash
npx tsx scripts/report-review-findings.ts --findings .review/pr-<n>/findings.json --pr <n>
```

Each finding becomes its own comment, inline when its line is in the diff, so QA can react 👍 or 👎 to each one. Posting twice skips findings already on the PR. Then remove the worktree with `git worktree remove --force .review/pr-<n>/tree`.

`npm run review:feedback` reports those reactions as acceptance per rule and per prompt version.
