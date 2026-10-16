#!/usr/bin/env bash
# Runs the visual project in the same Playwright image CI uses, so screenshots match pixel for pixel.
# amd64 is forced because CI runners are amd64 and Chromium renders text slightly differently on arm64.
# Extra arguments are passed to `playwright test`, e.g. --update-snapshots.
set -euo pipefail

version=$(node -p "require('@playwright/test/package.json').version")

docker run --rm --platform linux/amd64 --ipc=host \
  -e PLAYWRIGHT_DOCKER=1 \
  -v "$PWD":/work -v /work/node_modules -w /work \
  "mcr.microsoft.com/playwright:v${version}-noble" \
  /bin/bash -c 'npm ci --no-audit --no-fund && npx playwright test --project=visual "$@"' -- "$@"
