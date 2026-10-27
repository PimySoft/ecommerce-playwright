// Validates a test-reviewer findings file and prints it as Markdown. With --pr it posts each finding to the pull request
// as its own comment instead, so QA can react 👍 or 👎 to each one. Posting again skips findings already on the PR.
// Usage: tsx scripts/report-review-findings.ts --findings <file> [--pr <n>]
import { execFileSync } from 'child_process';
import { parseArgs } from './history/records';
import {
  type Finding,
  SUMMARY_MARKER,
  findingId,
  findingMarker,
  loadReview,
  reviewerVersion,
  ruleTitles,
} from './review/findings';

function gh(args: string[], input?: object): string {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    input: input ? JSON.stringify(input) : undefined,
    maxBuffer: 64 * 1024 * 1024,
  });
}

// A review comment can only anchor to a line the diff shows on the new side: an added or a context line.
export function commentableLines(diff: string): Map<string, Set<number>> {
  const lines = new Map<string, Set<number>>();
  let current: Set<number> | null = null;
  let inHeader = false;
  let line = 0;
  for (const text of diff.split('\n')) {
    if (text.startsWith('diff --git ')) {
      inHeader = true;
      current = null;
      continue;
    }
    // Content lines start with "+", "-" or a space, so only a hunk header can start with "@@".
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(text);
    if (hunk) {
      inHeader = false;
      line = Number(hunk[1]);
      continue;
    }
    if (inHeader) {
      if (text.startsWith('+++ b/')) {
        current = new Set<number>();
        lines.set(text.slice('+++ b/'.length), current);
      }
      continue;
    }
    if (current && (text.startsWith('+') || text.startsWith(' '))) current.add(line++);
  }
  return lines;
}

function renderFinding(finding: Finding, titles: Map<string, string>, version: string, located: boolean): string {
  return [
    `${located ? '' : `\`${finding.file}:${finding.line}\` · `}**${finding.rule} · ${titles.get(finding.rule)}**`,
    '',
    finding.summary,
    '',
    `**Suggestion:** ${finding.suggestion}`,
    '',
    "<sub>From test-reviewer, advisory only. React 👍 if this finding is right or 👎 if it isn't.</sub>",
    findingMarker(finding, version),
  ].join('\n');
}

function printMarkdown(findings: Finding[], titles: Map<string, string>): void {
  if (findings.length === 0) {
    console.log('No findings.');
    return;
  }
  console.log(`${findings.length} finding${findings.length === 1 ? '' : 's'}:\n`);
  const sorted = [...findings].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  for (const finding of sorted) {
    console.log(`- \`${finding.file}:${finding.line}\` **${finding.rule} · ${titles.get(finding.rule)}**: ${finding.summary}`);
    console.log(`  Suggestion: ${finding.suggestion}`);
  }
}

function postToPullRequest(pr: string, findings: Finding[], titles: Map<string, string>, version: string): void {
  const headSha = gh(['pr', 'view', pr, '--json', 'headRefOid', '--jq', '.headRefOid']).trim();
  const existing = [
    gh(['api', '--paginate', `repos/{owner}/{repo}/pulls/${pr}/comments`, '--jq', '.[].body']),
    gh(['api', '--paginate', `repos/{owner}/{repo}/issues/${pr}/comments`, '--jq', '.[].body']),
    gh(['api', '--paginate', `repos/{owner}/{repo}/pulls/${pr}/reviews`, '--jq', '.[].body']),
  ].join('\n');
  const summaryMarker = `<!-- ${SUMMARY_MARKER} sha=${headSha} -->`;
  const fresh = findings.filter((finding) => !existing.includes(`id=${findingId(finding)} `));
  if (fresh.length === 0 && existing.includes(summaryMarker)) {
    console.log(`PR #${pr} already has this review for ${headSha.slice(0, 7)}`);
    return;
  }

  const diff = commentableLines(gh(['pr', 'diff', pr]));
  const inline = fresh.filter((finding) => diff.get(finding.file)?.has(finding.line));
  const elsewhere = fresh.filter((finding) => !inline.includes(finding));
  const skipped = findings.length - fresh.length;
  const summary = [
    fresh.length === 0
      ? `test-reviewer found no new issues in ${headSha.slice(0, 7)}.`
      : `test-reviewer found ${fresh.length} issue${fresh.length === 1 ? '' : 's'} in ${headSha.slice(0, 7)}: ` +
        `${inline.length} on the diff and ${elsewhere.length} as comments on the PR, outside the changed lines.`,
    skipped > 0 ? `${skipped} already posted earlier ${skipped === 1 ? 'was' : 'were'} skipped.` : '',
    fresh.length > 0 ? "They're advisory and don't block the merge. React 👍 or 👎 on each one; that decides when style fixes may run unreviewed." : '',
    summaryMarker,
  ].filter(Boolean).join('\n\n');

  gh(['api', `repos/{owner}/{repo}/pulls/${pr}/reviews`, '--method', 'POST', '--input', '-'], {
    commit_id: headSha,
    event: 'COMMENT',
    body: summary,
    comments: inline.map((finding) => ({
      path: finding.file,
      line: finding.line,
      side: 'RIGHT',
      body: renderFinding(finding, titles, version, true),
    })),
  });
  for (const finding of elsewhere) {
    gh(['api', `repos/{owner}/{repo}/issues/${pr}/comments`, '--method', 'POST', '--input', '-'], {
      body: renderFinding(finding, titles, version, false),
    });
  }
  console.log(`Posted ${fresh.length} finding${fresh.length === 1 ? '' : 's'} to PR #${pr} (${inline.length} inline)`);
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.findings) throw new Error('Usage: report-review-findings.ts --findings <file> [--pr <n>]');
  const root = process.cwd();
  const review = loadReview(args.findings, root);
  const titles = ruleTitles(root);
  if (args.pr) {
    postToPullRequest(args.pr, review.findings, titles, reviewerVersion(root));
  } else {
    printMarkdown(review.findings, titles);
  }
}
