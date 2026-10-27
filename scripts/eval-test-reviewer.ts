// Scores a test-reviewer run on the seeded bad test. Every planted issue must be caught by a finding in its file, with
// one of its rules, on or near its lines. Findings that match nothing are listed for a hand check: some may be real.
// Usage: tsx scripts/eval-test-reviewer.ts --findings <file> [--planted agents/evals/test-reviewer/planted.json]
import fs from 'fs';
import path from 'path';
import { parseArgs } from './history/records';
import { type Finding, loadReview } from './review/findings';

const DEFAULT_PLANTED = 'agents/evals/test-reviewer/planted.json';
// Reviewers reasonably point at the line above or below, such as a test's title rather than its tag.
const LINE_SLACK = 2;

interface PlantedIssue {
  id: string;
  rules: string[];
  file: string;
  anchor: string;
  through?: string;
  planted: string;
}

function lineOf(lines: string[], snippet: string, from: number, issue: PlantedIssue): number {
  const index = lines.findIndex((line, i) => i >= from && line.includes(snippet));
  if (index === -1) throw new Error(`planted issue "${issue.id}": "${snippet}" not found in ${issue.file}`);
  return index + 1;
}

function span(issue: PlantedIssue, root: string): [number, number] {
  const lines = fs.readFileSync(path.join(root, issue.file), 'utf8').split('\n');
  const start = lineOf(lines, issue.anchor, 0, issue);
  const end = issue.through ? lineOf(lines, issue.through, start - 1, issue) : start;
  return [start - LINE_SLACK, end + LINE_SLACK];
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.findings) throw new Error('Usage: eval-test-reviewer.ts --findings <file> [--planted <file>]');
  const root = process.cwd();
  const review = loadReview(args.findings, root);
  const planted = (JSON.parse(fs.readFileSync(args.planted ?? DEFAULT_PLANTED, 'utf8')) as { issues: PlantedIssue[] }).issues;

  const unmatched = new Set<Finding>(review.findings);
  const results = planted.map((issue) => {
    const [from, to] = span(issue, root);
    const match = [...unmatched].find((finding) =>
      path.normalize(finding.file) === path.normalize(issue.file) &&
      issue.rules.includes(finding.rule) &&
      finding.line >= from && finding.line <= to);
    if (match) unmatched.delete(match);
    return { issue, match };
  });

  console.log('| Planted issue | Rule | Caught by |\n|---|---|---|');
  for (const { issue, match } of results) {
    console.log(`| ${issue.id} | ${issue.rules.join(' / ')} | ${match ? `${match.rule} at line ${match.line}` : '**missed**'} |`);
  }
  const caught = results.filter((result) => result.match).length;
  console.log(`\nCaught ${caught} of ${planted.length} planted issues.`);
  if (unmatched.size > 0) {
    console.log(`\n${unmatched.size} finding(s) match no planted issue. Check each by hand: a real issue or a false positive?`);
    for (const finding of unmatched) console.log(`- ${finding.file}:${finding.line} ${finding.rule}: ${finding.summary}`);
  }
  if (caught < planted.length) process.exitCode = 1;
}
