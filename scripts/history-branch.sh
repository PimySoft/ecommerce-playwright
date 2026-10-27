#!/usr/bin/env bash
# Works with the ci-history branch through a separate worktree, so the main checkout is never switched.
#   history-branch.sh checkout <dir>         check the branch out into <dir>, creating it as an orphan if it doesn't exist
#   history-branch.sh push <dir> <message>   commit everything in <dir> and push, rebasing onto concurrent pushes
set -euo pipefail

BRANCH=ci-history
command=${1:?usage: history-branch.sh checkout|push <dir> [message]}
dir=${2:?missing <dir>}

case "$command" in
  checkout)
    if git ls-remote --exit-code --heads origin "$BRANCH" > /dev/null; then
      git fetch --quiet origin "$BRANCH"
      git worktree add --quiet --detach "$dir" FETCH_HEAD
    else
      git worktree add --quiet --detach "$dir"
      git -C "$dir" switch --quiet --orphan "$BRANCH-new"
      cat > "$dir/README.md" <<'EOF'
# ci-history

Data only, written by CI and the agents; never merged into `main`.

- `test-runs/`: one JSONL file per CI run, one record per test per project (`scripts/collect-test-history.ts`).
- `agent-runs/`: one JSONL file per agent session (`scripts/record-agent-run.ts`).

Record types are in `scripts/history/records.ts` on `main`.
EOF
    fi
    ;;
  push)
    message=${3:?missing <message>}
    git -C "$dir" add --all
    if git -C "$dir" diff --cached --quiet; then
      echo "Nothing new to record"
      exit 0
    fi
    git -C "$dir" commit --quiet -m "$message"
    # Every writer adds new files only, so a rebase onto a concurrent push can't conflict.
    for attempt in 1 2 3 4 5; do
      if git -C "$dir" push --quiet origin "HEAD:refs/heads/$BRANCH"; then
        echo "Pushed to $BRANCH"
        exit 0
      fi
      echo "Push rejected (attempt $attempt), rebasing onto the latest $BRANCH"
      git -C "$dir" fetch --quiet origin "$BRANCH"
      git -C "$dir" rebase --quiet FETCH_HEAD
    done
    echo "Could not push to $BRANCH after 5 attempts" >&2
    exit 1
    ;;
  *)
    echo "Unknown command: $command" >&2
    exit 2
    ;;
esac
