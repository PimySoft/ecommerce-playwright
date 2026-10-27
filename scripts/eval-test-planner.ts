// Scores test-planner runs on the golden tickets. Each ticket's plan must be valid, block (or not) as expected, ask a
// question for every expected gate reason, give each criterion an allowed status, and propose a bounded number of tests.
// Run `/test-from-ticket agents/evals/test-planner/tickets/<name>.md` for each ticket first; it stops before posting.
// Usage: tsx scripts/eval-test-planner.ts [--plans .plans]
import fs from 'fs';
import path from 'path';
import { parseArgs } from './history/records';
import { isBlocked, plannerVersion, validatePlan, type TestPlan } from './planner/plan';
import type { Ticket } from './planner/ticket';

const EVAL_DIR = 'agents/evals/test-planner';

interface Expectation {
  file: string;
  blocked: boolean;
  reasons: string[];
  coverage: Record<string, string[]>;
  minTests: number;
  maxTests: number;
}

function score(expectation: Expectation, plansDir: string): string[] {
  const dir = path.join(plansDir, `file-${path.basename(expectation.file, '.md')}`);
  if (!fs.existsSync(path.join(dir, 'plan.json'))) return [`no plan in ${dir}`];
  const ticket = JSON.parse(fs.readFileSync(path.join(dir, 'ticket.json'), 'utf8')) as Ticket;
  const plan = JSON.parse(fs.readFileSync(path.join(dir, 'plan.json'), 'utf8')) as TestPlan;
  const problems = validatePlan(plan, ticket);
  if (problems.length > 0) return problems.map((p) => `invalid: ${p}`);

  const misses: string[] = [];
  if (isBlocked(plan) !== expectation.blocked) misses.push(expectation.blocked ? "didn't block" : `blocked: ${plan.questions.map((q) => q.reason).join(', ')}`);
  for (const reason of expectation.reasons) {
    if (!plan.questions.some((q) => q.reason === reason)) misses.push(`no ${reason} question`);
  }
  for (const [criterion, allowed] of Object.entries(expectation.coverage)) {
    const status = plan.coverage.find((c) => c.criterion === Number(criterion))?.status;
    if (!status || !allowed.includes(status)) misses.push(`criterion ${criterion} is ${status ?? 'absent'}, expected ${allowed.join(' or ')}`);
  }
  if (plan.tests.length < expectation.minTests || plan.tests.length > expectation.maxTests) {
    misses.push(`${plan.tests.length} tests, expected ${expectation.minTests}–${expectation.maxTests}`);
  }
  return misses;
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const plansDir = args.plans ?? '.plans';
  const { tickets } = JSON.parse(fs.readFileSync(path.join(EVAL_DIR, 'expected.json'), 'utf8')) as { tickets: Expectation[] };
  const results = tickets.map((expectation) => ({ expectation, misses: score(expectation, plansDir) }));

  console.log(`test-planner ${plannerVersion(process.cwd())}\n\n| Ticket | Result |\n|---|---|`);
  for (const { expectation, misses } of results) {
    console.log(`| ${expectation.file} | ${misses.length === 0 ? 'pass' : `**fail:** ${misses.join('; ')}`} |`);
  }
  const passed = results.filter((r) => r.misses.length === 0).length;
  console.log(`\n${passed} of ${results.length} tickets passed.`);
  if (passed < results.length) process.exitCode = 1;
}
