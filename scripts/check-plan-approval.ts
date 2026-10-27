// Checks that a ticket's plan-approved label still applies: the latest plan comment, posted by the repo owner, must
// hash to its marker against the ticket's current acceptance criteria. Run before writing tests. With --apply, a stale
// approval is withdrawn: plan-approved comes off, plan-review goes back on, and a comment lists the current criteria.
// Exits 1 unless the approval is valid.
// Usage: tsx scripts/check-plan-approval.ts --issue <n> [--apply true]
import { parseArgs } from './history/records';
import { parsePlanComment, planHash } from './planner/plan';
import { LABELS, fetchIssue, gh } from './planner/ticket';

export type Approval = { valid: true; hash: string } | { valid: false; reason: string; withdraw: boolean };

export function checkApproval(issue: number): Approval {
  const ticket = fetchIssue(issue);
  // Plan comments are trusted only from the owner, because anyone can comment on a public Issue.
  const owner = gh(['repo', 'view', '--json', 'owner', '--jq', '.owner.login']).trim();
  const plans = ticket.comments
    .filter((c) => c.author === owner)
    .map((c) => parsePlanComment(c.body.replace(/\r\n/g, '\n')))
    .filter((p) => p !== null);
  const latest = plans.at(-1);
  if (!latest) return { valid: false, reason: `${ticket.id} has no plan comment from ${owner}`, withdraw: false };
  if (!ticket.labels.includes(LABELS.approved)) return { valid: false, reason: `${ticket.id} isn't labelled ${LABELS.approved}`, withdraw: false };
  if (planHash(ticket.criteria, latest.rendered) !== latest.hash) {
    return { valid: false, reason: `${ticket.id}'s acceptance criteria or plan changed after the plan was approved`, withdraw: true };
  }
  return { valid: true, hash: latest.hash };
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.issue) throw new Error('Usage: check-plan-approval.ts --issue <n> [--apply true]');
  const issue = Number(args.issue.replace('#', ''));
  const approval = checkApproval(issue);
  if (approval.valid) {
    console.log(`#${issue}: plan ${approval.hash} is approved.`);
  } else {
    console.log(`#${issue}: not approved. ${approval.reason}.`);
    if (approval.withdraw && args.apply === 'true') {
      const criteria = fetchIssue(issue).criteria.map((c, i) => `${i + 1}. ${c}`).join('\n');
      gh(['issue', 'edit', String(issue), '--remove-label', LABELS.approved, '--add-label', LABELS.review]);
      gh(['issue', 'comment', String(issue), '--body',
        `The ticket changed after its plan was approved, so the approval is withdrawn. The plan must be redone against the current criteria:\n\n${criteria || '_None_'}`]);
      console.log(`Withdrew ${LABELS.approved} and added ${LABELS.review}.`);
    }
    process.exitCode = 1;
  }
}
