#!/usr/bin/env bash
# Publishes the agent-run records the SessionEnd hook left in .agent-runs/ to the ci-history branch, then clears them.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
outbox=.agent-runs
if [ -z "$(find "$outbox" -name '*.jsonl' 2> /dev/null)" ]; then
  echo "No agent runs to push"
  exit 0
fi

worktree=$(mktemp -d)/ci-history
trap 'git worktree remove --force "$worktree" 2> /dev/null || true' EXIT
bash scripts/history-branch.sh checkout "$worktree"
cp -R "$outbox"/. "$worktree"/
bash scripts/history-branch.sh push "$worktree" "Record agent runs"
rm -rf "$outbox"
