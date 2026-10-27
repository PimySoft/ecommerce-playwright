// Reads every test-reviewer finding posted on this repo's pull requests and the QA reviewer's 👍/👎 on each, and reports
// acceptance per rule and per prompt version. GitHub holds the reactions, so nothing is stored.
// Usage: tsx scripts/review-feedback.ts [--reviewer <login>] [--out <file.json>]
import { execFileSync } from 'child_process';
import fs from 'fs';
import { parseArgs } from './history/records';
import { FINDING_MARKER, parseFindingMarker } from './review/findings';

// Style fixes move to L3 (AgentsPlan "Autonomy levels") once enough findings are rated and nearly all accepted.
const L3_MIN_RATED = 20;
const L3_MIN_ACCEPTANCE = 0.95;

type Verdict = 'accepted' | 'rejected' | 'conflicting' | 'unrated';

interface PostedFinding {
  id: string;
  rule: string;
  version: string;
  url: string;
  verdict: Verdict;
}

interface Tally {
  accepted: number;
  rejected: number;
  conflicting: number;
  unrated: number;
  acceptance: number | null;
}

interface CommentRef {
  id: number;
  kind: 'pulls' | 'issues';
  body: string;
  url: string;
  reactions: number;
}

function gh(args: string[]): string {
  return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function jsonLines<T>(output: string): T[] {
  return output.split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line) as T);
}

function postedComments(): CommentRef[] {
  const comments: CommentRef[] = [];
  for (const kind of ['pulls', 'issues'] as const) {
    const jq = `.[] | select(.body | contains("${FINDING_MARKER}")) | ` +
      `{id, kind: "${kind}", body, url: .html_url, reactions: .reactions.total_count}`;
    comments.push(...jsonLines<CommentRef>(gh(['api', '--paginate', `repos/{owner}/{repo}/${kind}/comments`, '--jq', jq])));
  }
  return comments;
}

// Only the reviewer's reactions count; on a public repo anyone else could react too.
function verdict(comment: CommentRef, reviewer: string): Verdict {
  if (comment.reactions === 0) return 'unrated';
  const jq = `.[] | select(.user.login == "${reviewer}") | .content`;
  const reactions = gh(['api', '--paginate', `repos/{owner}/{repo}/${comment.kind}/comments/${comment.id}/reactions`, '--jq', jq])
    .split('\n');
  const up = reactions.includes('+1');
  const down = reactions.includes('-1');
  if (up && down) return 'conflicting';
  if (up) return 'accepted';
  if (down) return 'rejected';
  return 'unrated';
}

function tally(findings: PostedFinding[]): Tally {
  const count = (v: Verdict): number => findings.filter((finding) => finding.verdict === v).length;
  const accepted = count('accepted');
  const rejected = count('rejected');
  return {
    accepted,
    rejected,
    conflicting: count('conflicting'),
    unrated: count('unrated'),
    acceptance: accepted + rejected > 0 ? accepted / (accepted + rejected) : null,
  };
}

function groupTally(findings: PostedFinding[], key: 'rule' | 'version'): Record<string, Tally> {
  const groups: Record<string, PostedFinding[]> = {};
  for (const finding of findings) (groups[finding[key]] ??= []).push(finding);
  return Object.fromEntries(Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, tally(v)]));
}

function row(label: string, t: Tally): string {
  const acceptance = t.acceptance === null ? '-' : `${Math.round(t.acceptance * 100)}%`;
  return `| ${label} | ${t.accepted} | ${t.rejected} | ${t.conflicting} | ${t.unrated} | ${acceptance} |`;
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const reviewer = args.reviewer ?? gh(['repo', 'view', '--json', 'owner', '--jq', '.owner.login']).trim();

  const findings: PostedFinding[] = [];
  for (const comment of postedComments()) {
    const marker = parseFindingMarker(comment.body);
    if (marker) findings.push({ ...marker, url: comment.url, verdict: verdict(comment, reviewer) });
  }
  const overall = tally(findings);
  const byRule = groupTally(findings, 'rule');
  const byVersion = groupTally(findings, 'version');
  const rated = overall.accepted + overall.rejected;
  const meetsL3 = rated >= L3_MIN_RATED && (overall.acceptance ?? 0) >= L3_MIN_ACCEPTANCE;

  console.log(`test-reviewer findings rated by ${reviewer}: ${findings.length} posted, ${rated} rated\n`);
  console.log('| Rule | 👍 | 👎 | Both | Unrated | Acceptance |\n|---|---|---|---|---|---|');
  for (const [rule, t] of Object.entries(byRule)) console.log(row(rule, t));
  console.log(row('**All**', overall));
  console.log('\n| Prompt version | 👍 | 👎 | Both | Unrated | Acceptance |\n|---|---|---|---|---|---|');
  for (const [version, t] of Object.entries(byVersion)) console.log(row(version, t));
  console.log(`\nL3 for style fixes needs ${L3_MIN_RATED}+ rated findings at ${L3_MIN_ACCEPTANCE * 100}%+ accepted: ` +
    (meetsL3 ? 'met.' : 'not met yet.'));

  if (args.out) {
    fs.writeFileSync(args.out, JSON.stringify({ generatedAt: new Date().toISOString(), reviewer, overall, byRule, byVersion, meetsL3, findings }, null, 2) + '\n');
  }
}
