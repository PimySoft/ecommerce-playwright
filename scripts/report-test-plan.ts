// Validates a test-planner plan against its ticket and prints the plan comment. With --post, posts it to the ticket's
// Issue with its approval hash and moves the labels: needs-clarification when the gate blocks, plan-review otherwise.
// Posting the same plan again does nothing.
// Usage: tsx scripts/report-test-plan.ts --plan .plans/<target>/plan.json [--post true]
import fs from 'fs';
import path from 'path';
import { parseArgs } from './history/records';
import { isBlocked, loadPlan, parsePlanComment, planHash, planMarker, plannerVersion, renderPlan } from './planner/plan';
import { LABELS, type Ticket, fetchIssue, gh } from './planner/ticket';

function post(ticket: Ticket, body: string, hash: string, blocked: boolean): void {
  const issue = ticket.id.slice(1);
  // Fetched again rather than trusting ticket.json, which may predate an edit.
  const current = fetchIssue(Number(issue));
  if (JSON.stringify(current.criteria) !== JSON.stringify(ticket.criteria)) {
    throw new Error(`${ticket.id}'s acceptance criteria changed since it was read. Run /test-from-ticket again.`);
  }
  const posted = current.comments.map((c) => parsePlanComment(c.body)).filter(Boolean);
  if (posted.at(-1)?.hash === hash) {
    console.log(`\nThis plan is already the latest on ${ticket.id}; not posted again.`);
    return;
  }
  gh(['issue', 'comment', issue, '--body', body]);
  const [add, remove] = blocked
    ? [LABELS.clarify, [LABELS.review, LABELS.approved]]
    : [LABELS.review, [LABELS.clarify, LABELS.approved]];
  gh(['issue', 'edit', issue, '--add-label', add, ...remove.flatMap((label) => ['--remove-label', label])]);
  console.log(`\nPosted to ${ticket.url} and labelled ${add}.`);
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.plan) throw new Error('Usage: report-test-plan.ts --plan <dir>/plan.json [--post true]');
  const ticket = JSON.parse(fs.readFileSync(path.join(path.dirname(args.plan), 'ticket.json'), 'utf8')) as Ticket;
  const plan = loadPlan(args.plan, ticket);
  const rendered = renderPlan(plan, ticket);
  const hash = planHash(ticket.criteria, rendered);
  const body = `${rendered}\n\n${planMarker(hash, plannerVersion(process.cwd()))}`;
  fs.writeFileSync(path.join(path.dirname(args.plan), 'plan.md'), body + '\n');
  console.log(rendered);
  console.log(`\nplan-hash ${hash}`);

  if (args.post === 'true') {
    if (!ticket.id.startsWith('#')) throw new Error(`${ticket.id} is a file ticket; only Issues can be posted to`);
    post(ticket, body, hash, isBlocked(plan));
  }
}
