#!/usr/bin/env bash
# Creates the labels the ticket workflow uses, or updates them. Safe to run again.
set -euo pipefail

label() { gh label create "$1" --color "$2" --description "$3" --force; }

label demo-story           5319e7 "A user story the agents may read (owner-applied only)"
label ready-for-automation 0e8a16 "Plan tests for this story"
label needs-clarification  fbca04 "The planner has questions for the product owner"
label plan-review          1d76db "A test plan is waiting for QA approval"
label plan-approved        0e8a16 "QA approved the latest plan comment"
label agent-stuck          b60205 "An agent stopped and commented why"
