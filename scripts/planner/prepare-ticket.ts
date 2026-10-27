// Collects what /test-from-ticket hands to test-planner: .plans/<target>/ticket.json, read from a demo-story Issue or a
// Markdown ticket. Prints the target directory.
// Usage: tsx scripts/planner/prepare-ticket.ts --issue <n>
//        tsx scripts/planner/prepare-ticket.ts --file agents/evals/test-planner/tickets/<name>.md
import fs from 'fs';
import path from 'path';
import { parseArgs } from '../history/records';
import { fetchIssue, readTicketFile } from './ticket';

export const PLANS_DIR = '.plans';

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.issue && !args.file) throw new Error('Usage: prepare-ticket.ts --issue <n> | --file <ticket.md>');
  const ticket = args.issue ? fetchIssue(Number(args.issue.replace('#', ''))) : readTicketFile(args.file);
  const target = args.issue ? `issue-${ticket.id.slice(1)}` : `file-${path.basename(args.file, '.md')}`;
  const dir = path.join(PLANS_DIR, target);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'ticket.json'), JSON.stringify(ticket, null, 2) + '\n');
  console.log(dir);
}
