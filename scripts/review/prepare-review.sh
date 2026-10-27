#!/usr/bin/env bash
# Collects what /review-tests hands to test-reviewer, in .review/<target>/:
#   files.txt   the files to review, relative to the repo root
#   diff.patch  their changes, empty when whole files are reviewed
#   root        the directory to read them from: this checkout, or a worktree of the pull request's head
# Usage: prepare-review.sh              this branch against origin/main, committed or not
#        prepare-review.sh --pr <n>     a pull request, checked out into a worktree so this checkout isn't switched
#        prepare-review.sh <path>...    whole files or directories
# Prints the target directory.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
# Test code only. Seeded eval files are deliberately bad, so they're reviewed only when named as paths.
REVIEWABLE='^(tests|pages|test-data|accessibility|api)/.*\.ts$'

reviewable() {
  local root=$1
  { grep -E "$REVIEWABLE" || true; } | sort -u | while read -r file; do
    if [ -f "$root/$file" ]; then echo "$file"; fi
  done
}

if [ "${1:-}" = "--pr" ]; then
  pr=${2:?usage: prepare-review.sh --pr <n>}
  dir=.review/pr-$pr
  mkdir -p "$dir"
  git worktree remove --force "$dir/tree" 2> /dev/null || true
  git fetch --quiet origin "pull/$pr/head"
  git worktree add --quiet --detach "$dir/tree" FETCH_HEAD
  gh pr diff "$pr" --name-only | reviewable "$dir/tree" > "$dir/files.txt"
  gh pr diff "$pr" > "$dir/diff.patch"
  echo "$PWD/$dir/tree" > "$dir/root"
elif [ $# -gt 0 ]; then
  dir=.review/paths-$(printf '%s\n' "$@" | shasum | cut -c1-8)
  mkdir -p "$dir"
  git ls-files --cached --others --exclude-standard -- "$@" | { grep -E '\.ts$' || true; } > "$dir/files.txt"
  : > "$dir/diff.patch"
  echo "$PWD" > "$dir/root"
else
  base=$(git merge-base origin/main HEAD)
  dir=.review/branch-$(git rev-parse --abbrev-ref HEAD | tr '/' '-')
  mkdir -p "$dir"
  { git diff --name-only "$base"; git ls-files --others --exclude-standard; } | reviewable . > "$dir/files.txt"
  : > "$dir/diff.patch"
  while read -r file; do
    if git ls-files --error-unmatch "$file" > /dev/null 2>&1; then
      git diff "$base" -- "$file" >> "$dir/diff.patch"
    else
      # An untracked file is all new, so its diff is every line added.
      git diff --no-index -- /dev/null "$file" >> "$dir/diff.patch" || true
    fi
  done < "$dir/files.txt"
  echo "$PWD" > "$dir/root"
fi

if [ ! -s "$dir/files.txt" ]; then
  echo "No test code to review in this target" >&2
fi
echo "$dir"
