# ci-history

Data only, written by CI and the agents; never merged into `main`.

- `test-runs/`: one JSONL file per CI run, one record per test per project (`scripts/collect-test-history.ts`).
- `agent-runs/`: one JSONL file per agent session (`scripts/record-agent-run.ts`).

Record types are in `scripts/history/records.ts` on `main`.
