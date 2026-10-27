import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// The output test-reviewer returns. The skill saves it as findings.json; scripts validate, post and score it.
export interface Finding {
  rule: string;
  file: string;
  line: number;
  summary: string;
  suggestion: string;
}

export interface Review {
  schema: 1;
  target: string;
  reviewedFiles: string[];
  findings: Finding[];
}

// Checks that come from the plan rather than a CODING_STANDARDS.md section.
export const EXTRA_RULES: Record<string, string> = {
  SITE: 'Site-specific gotcha (CLAUDE.md)',
  DUPLICATE: 'Repeats setup or an assertion an existing test already makes',
  PROOF: "Failure-proof sabotage doesn't match its fails-if line",
  CRITERION: "Doesn't check the acceptance criterion it claims",
};

export const AGENT_FILE = path.join('.claude', 'agents', 'test-reviewer.md');
export const FINDING_MARKER = 'test-reviewer:finding';
export const SUMMARY_MARKER = 'test-reviewer:summary';

// The checklist is the numbered headings of CODING_STANDARDS.md, so adding a standard adds a rule without editing this.
export function ruleTitles(root: string): Map<string, string> {
  const rules = new Map<string, string>();
  const standards = fs.readFileSync(path.join(root, 'CODING_STANDARDS.md'), 'utf8');
  for (const [, number, title] of standards.matchAll(/^## (\d+)\. (.+)$/gm)) rules.set(`CS-${number}`, title);
  for (const [rule, title] of Object.entries(EXTRA_RULES)) rules.set(rule, title);
  return rules;
}

export function loadReview(file: string, root: string): Review {
  const review = JSON.parse(fs.readFileSync(file, 'utf8')) as Review;
  const rules = ruleTitles(root);
  const problems: string[] = [];
  if (review.schema !== 1) problems.push(`schema must be 1, got ${String(review.schema)}`);
  if (!Array.isArray(review.findings)) problems.push('findings must be an array');
  for (const [i, finding] of (review.findings ?? []).entries()) {
    const where = `findings[${i}]`;
    if (!rules.has(finding.rule)) problems.push(`${where}.rule "${finding.rule}" is not one of ${[...rules.keys()].join(', ')}`);
    if (!Number.isInteger(finding.line) || finding.line < 1) problems.push(`${where}.line must be a positive integer`);
    if (!finding.file || path.isAbsolute(finding.file)) problems.push(`${where}.file must be relative to the repo root`);
    if (!finding.summary?.trim()) problems.push(`${where}.summary is empty`);
    if (!finding.suggestion?.trim()) problems.push(`${where}.suggestion is empty`);
  }
  if (problems.length > 0) throw new Error(`${file} is not a valid review:\n- ${problems.join('\n- ')}`);
  return review;
}

// Stable across re-runs of the same review, so posting twice doesn't duplicate a comment. The line is left out
// because unrelated edits above a finding move it.
export function findingId(finding: Finding): string {
  return crypto.createHash('sha256').update(`${finding.rule}|${finding.file}|${finding.summary}`).digest('hex').slice(0, 10);
}

// Ties each posted finding, and so its 👍/👎, to the prompt that produced it.
export function reviewerVersion(root: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, AGENT_FILE))).digest('hex').slice(0, 12);
}

export function findingMarker(finding: Finding, version: string): string {
  return `<!-- ${FINDING_MARKER} id=${findingId(finding)} rule=${finding.rule} version=${version} -->`;
}

export function parseFindingMarker(body: string): { id: string; rule: string; version: string } | null {
  const match = new RegExp(`<!-- ${FINDING_MARKER} id=(\\w+) rule=([\\w-]+) version=(\\w+) -->`).exec(body);
  return match ? { id: match[1], rule: match[2], version: match[3] } : null;
}
