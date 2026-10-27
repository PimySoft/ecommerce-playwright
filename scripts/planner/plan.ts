import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Ticket } from './ticket';

// The output test-planner returns. /test-from-ticket saves it as plan.json next to ticket.json; scripts validate it,
// render it as the plan comment and tie QA's approval to it through a hash.
export const GATE_REASONS = {
  'no-criteria': 'The ticket has no acceptance criteria',
  'no-observable-outcome': 'A criterion has no observable outcome',
  'test-data': "Test data isn't specified or in the catalogue",
  'site-conflict': 'Conflicts with known site behaviour',
  'out-of-scope': 'Asks for something out of scope',
  overlap: 'Overlaps an existing test',
  tier: 'Unclear whether smoke or regression',
} as const;
export type GateReason = keyof typeof GATE_REASONS;

export const COVERAGE_STATUSES = ['covered', 'missing', 'out-of-scope', 'conflicts-with-site', 'unclear'] as const;
export type CoverageStatus = (typeof COVERAGE_STATUSES)[number];

export const SUGGESTION_KINDS = ['implied', 'knock-on', 'other-check', 'site-gotcha'] as const;
const MAX_SUGGESTIONS = 5;

export interface Question {
  reason: GateReason;
  // 1-based, or null when the question is about the whole ticket.
  criterion: number | null;
  question: string;
  options: string[];
  recommendation: string;
}

export interface Coverage {
  criterion: number;
  status: CoverageStatus;
  // The existing test that covers it, or why it's out of scope or conflicts with the site.
  evidence: string;
}

export interface PlannedTest {
  // Absent on a suggestion's test, which is identified by the suggestion's own ID.
  id?: string;
  criteria: number[];
  spec: string;
  name: string;
  tier: '@smoke' | '@regression';
  fixture: string;
  newMembers: string[];
  failsIf: string;
}

export interface Suggestion {
  id: string;
  kind: (typeof SUGGESTION_KINDS)[number];
  proposal: string;
  reason: string;
  test: PlannedTest | null;
}

export interface TestPlan {
  schema: 1;
  ticket: string;
  questions: Question[];
  coverage: Coverage[];
  tests: PlannedTest[];
  suggestions: Suggestion[];
  considered: string[];
  assumptions: string[];
}

export const AGENT_FILE = path.join('.claude', 'agents', 'test-planner.md');
export const PLAN_MARKER = 'test-plan';

export function isBlocked(plan: TestPlan): boolean {
  return plan.questions.length > 0;
}

function checkTest(test: PlannedTest, where: string, criteriaCount: number, problems: string[]): void {
  if (!/^tests\/[\w-]+\.spec\.ts$/.test(test.spec ?? '')) problems.push(`${where}.spec must be tests/<feature>.spec.ts`);
  if (!/^should /.test(test.name ?? '')) problems.push(`${where}.name must start with "should "`);
  if (test.tier !== '@smoke' && test.tier !== '@regression') problems.push(`${where}.tier must be @smoke or @regression`);
  if (!test.fixture?.trim()) problems.push(`${where}.fixture is empty`);
  if (!Array.isArray(test.newMembers)) problems.push(`${where}.newMembers must be an array`);
  // The fails-if line becomes the failure proof's sabotage, so a test without one can't be proved.
  if (!test.failsIf?.trim()) problems.push(`${where}.failsIf is empty`);
  for (const criterion of test.criteria ?? []) {
    if (!Number.isInteger(criterion) || criterion < 1 || criterion > criteriaCount) problems.push(`${where}.criteria has ${criterion}, but the ticket has ${criteriaCount}`);
  }
}

export function validatePlan(plan: TestPlan, ticket: Ticket): string[] {
  const problems: string[] = [];
  if (plan.schema !== 1) problems.push(`schema must be 1, got ${String(plan.schema)}`);
  if (plan.ticket !== ticket.id) problems.push(`ticket must be "${ticket.id}", got "${plan.ticket}"`);
  for (const key of ['questions', 'coverage', 'tests', 'suggestions', 'considered', 'assumptions'] as const) {
    if (!Array.isArray(plan[key])) problems.push(`${key} must be an array`);
  }
  if (problems.length > 0) return problems;

  const count = ticket.criteria.length;
  for (const [i, question] of plan.questions.entries()) {
    const where = `questions[${i}]`;
    if (!(question.reason in GATE_REASONS)) problems.push(`${where}.reason "${question.reason}" is not one of ${Object.keys(GATE_REASONS).join(', ')}`);
    if (question.criterion !== null && (question.criterion < 1 || question.criterion > count)) problems.push(`${where}.criterion is out of range`);
    if (!question.question?.trim()) problems.push(`${where}.question is empty`);
    if (!Array.isArray(question.options) || question.options.length < 2) problems.push(`${where}.options needs at least two`);
    if (!question.recommendation?.trim()) problems.push(`${where}.recommendation is empty`);
  }
  if (count === 0 && !plan.questions.some((q) => q.reason === 'no-criteria')) problems.push('the ticket has no criteria, so a no-criteria question is required');

  for (let criterion = 1; criterion <= count; criterion++) {
    const entries = plan.coverage.filter((c) => c.criterion === criterion);
    if (entries.length !== 1) problems.push(`criterion ${criterion} needs exactly one coverage entry, got ${entries.length}`);
  }
  for (const [i, entry] of plan.coverage.entries()) {
    const where = `coverage[${i}]`;
    if (!COVERAGE_STATUSES.includes(entry.status)) problems.push(`${where}.status "${entry.status}" is not one of ${COVERAGE_STATUSES.join(', ')}`);
    if (entry.status !== 'missing' && !entry.evidence?.trim()) problems.push(`${where}.evidence is empty`);
    if (entry.status === 'unclear' && !plan.questions.some((q) => q.criterion === entry.criterion)) problems.push(`${where} is unclear but has no question`);
    if (entry.status === 'missing' && !isBlocked(plan) && !plan.tests.some((t) => t.criteria.includes(entry.criterion))) {
      problems.push(`criterion ${entry.criterion} is missing, but no test covers it`);
    }
  }

  const ids = new Set<string>();
  for (const [i, test] of plan.tests.entries()) {
    checkTest(test, `tests[${i}]`, count, problems);
    if (!test.id?.trim()) problems.push(`tests[${i}].id is empty`);
    else if (ids.has(test.id)) problems.push(`test id ${test.id} is used twice`);
    else ids.add(test.id);
  }
  if (plan.suggestions.length > MAX_SUGGESTIONS) problems.push(`at most ${MAX_SUGGESTIONS} suggestions; list the rest under considered`);
  for (const [i, suggestion] of plan.suggestions.entries()) {
    const where = `suggestions[${i}]`;
    if (!SUGGESTION_KINDS.includes(suggestion.kind)) problems.push(`${where}.kind "${suggestion.kind}" is not one of ${SUGGESTION_KINDS.join(', ')}`);
    if (!suggestion.proposal?.trim() || !suggestion.reason?.trim()) problems.push(`${where} needs a proposal and a reason`);
    if (ids.has(suggestion.id)) problems.push(`id ${suggestion.id} is used twice`);
    ids.add(suggestion.id);
    if (suggestion.test) checkTest(suggestion.test, `${where}.test`, count, problems);
  }
  return problems;
}

export function loadPlan(file: string, ticket: Ticket): TestPlan {
  const plan = JSON.parse(fs.readFileSync(file, 'utf8')) as TestPlan;
  const problems = validatePlan(plan, ticket);
  if (problems.length > 0) throw new Error(`${file} is not a valid plan:\n- ${problems.join('\n- ')}`);
  return plan;
}

function cell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function testRow(test: PlannedTest): string {
  const members = test.newMembers.length > 0 ? test.newMembers.map((m) => `\`${m}\``).join(', ') : '—';
  return `| ${test.id} | \`${test.spec}\` | ${cell(test.name)} | \`${test.tier}\` | \`${test.fixture}\` | ${members} | ${cell(test.failsIf)} |`;
}

const TEST_HEADER = '| ID | Spec | Test | Tier | Starts on | New members | Fails if |\n|---|---|---|---|---|---|---|';

// The plan comment, without its marker. It quotes each criterion, so the approval hash covers what QA read.
export function renderPlan(plan: TestPlan, ticket: Ticket): string {
  const out: string[] = ['## Test plan', ''];
  out.push(isBlocked(plan)
    ? `**Blocked:** ${plan.questions.length} question(s) for the product owner. Nothing is written until they're answered.`
    : '**Ready for QA.** Add `plan-approved` to approve. To add suggestions, reply with their IDs first.');

  if (isBlocked(plan)) {
    out.push('', '### Questions');
    for (const [i, q] of plan.questions.entries()) {
      const about = q.criterion ? ` (criterion ${q.criterion})` : '';
      out.push(`${i + 1}. **${GATE_REASONS[q.reason]}${about}.** ${q.question}`);
      for (const [j, option] of q.options.entries()) out.push(`   ${String.fromCharCode(97 + j)}) ${option}`);
      out.push(`   _Recommended:_ ${q.recommendation}`);
    }
  }

  if (ticket.criteria.length > 0) {
    out.push('', '### Coverage map', '', '| # | Criterion | Status | Evidence |', '|---|---|---|---|');
    for (const entry of [...plan.coverage].sort((a, b) => a.criterion - b.criterion)) {
      out.push(`| ${entry.criterion} | ${cell(ticket.criteria[entry.criterion - 1])} | ${entry.status} | ${cell(entry.evidence || '—')} |`);
    }
  }

  if (plan.tests.length > 0) out.push('', '### Tests to write', '', TEST_HEADER, ...plan.tests.map(testRow));

  if (plan.suggestions.length > 0) {
    out.push('', '### Suggestions beyond the ticket', '', 'Not written unless QA picks them.', '');
    for (const s of plan.suggestions) {
      out.push(`- **${s.id}** (${s.kind}): ${s.proposal} _Why:_ ${s.reason}`);
      if (s.test) out.push(`  - \`${s.test.spec}\` "${s.test.name}", \`${s.test.tier}\`, fails if ${s.test.failsIf}`);
    }
  }
  if (plan.considered.length > 0) out.push('', '<details><summary>Considered, not proposed</summary>', '', ...plan.considered.map((c) => `- ${c}`), '', '</details>');
  if (plan.assumptions.length > 0) out.push('', '### Assumptions', '', ...plan.assumptions.map((a) => `- ${a}`));
  return out.join('\n');
}

// QA approves this exact text against these exact criteria. If either changes, the approval no longer applies.
export function planHash(criteria: string[], rendered: string): string {
  return crypto.createHash('sha256').update(JSON.stringify(criteria)).update('\n').update(rendered.trim()).digest('hex').slice(0, 16);
}

export function planMarker(hash: string, version: string): string {
  return `<!-- ${PLAN_MARKER} hash=${hash} version=${version} -->`;
}

export function parsePlanComment(body: string): { hash: string; version: string; rendered: string } | null {
  const match = new RegExp(`\\n*<!-- ${PLAN_MARKER} hash=(\\w+) version=(\\w+) -->\\s*$`).exec(body);
  if (!match) return null;
  return { hash: match[1], version: match[2], rendered: body.slice(0, match.index) };
}

export function plannerVersion(root: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, AGENT_FILE))).digest('hex').slice(0, 12);
}
