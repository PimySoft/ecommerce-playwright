// Turns a Playwright JSON report into one TestRecord per test per project, written as one JSONL file for the run.
// Usage: tsx scripts/collect-test-history.ts --report results.json --out <ci-history checkout>
import fs from 'fs';
import path from 'path';
import type { JSONReport, JSONReportSuite, JSONReportTest } from '@playwright/test/reporter';
import { TEST_RUNS_DIR, type TestOutcome, type TestRecord, datedPath, parseArgs, writeJsonl } from './history/records';

const MAX_ERROR_LENGTH = 600;
const ANSI = new RegExp(String.fromCharCode(27) + String.raw`\[[0-9;]*m`, 'g');

const STATUS: Record<JSONReportTest['status'], TestOutcome> = {
  expected: 'passed',
  flaky: 'flaky',
  unexpected: 'failed',
  skipped: 'skipped',
};

type RunInfo = Pick<TestRecord, 'runId' | 'runAttempt' | 'runUrl' | 'trigger' | 'branch' | 'commit' | 'recordedAt'>;

function runInfo(report: JSONReport): RunInfo {
  const env = process.env;
  const runId = env.GITHUB_RUN_ID ?? `local-${Date.now()}`;
  return {
    runId,
    runAttempt: Number(env.GITHUB_RUN_ATTEMPT ?? 1),
    runUrl: env.GITHUB_RUN_ID ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${runId}` : null,
    trigger: env.GITHUB_EVENT_NAME ?? 'local',
    branch: env.GITHUB_HEAD_REF || env.GITHUB_REF_NAME || 'local',
    // GITHUB_SHA is the temporary merge commit on pull requests, so the workflow passes the head commit instead.
    commit: env.HISTORY_COMMIT ?? env.GITHUB_SHA ?? 'local',
    recordedAt: new Date(report.stats.startTime).toISOString(),
  };
}

function lastError(test: JSONReportTest): string | null {
  const failed = test.results.filter((result) => result.errors.length > 0).at(-1);
  if (!failed) return null;
  const message = failed.errors[0].message.replace(ANSI, '').trim();
  return message.length > MAX_ERROR_LENGTH ? `${message.slice(0, MAX_ERROR_LENGTH)}…` : message;
}

function collect(suite: JSONReportSuite, titlePath: string[], run: RunInfo, records: TestRecord[]): void {
  for (const spec of suite.specs) {
    for (const test of spec.tests) {
      records.push({
        schema: 1,
        ...run,
        testId: spec.id,
        title: [...titlePath, spec.title].join(' › '),
        file: spec.file,
        line: spec.line,
        project: test.projectName,
        tags: spec.tags.map((tag) => (tag.startsWith('@') ? tag : `@${tag}`)),
        issues: test.annotations.filter((a) => a.type === 'issue' && a.description).map((a) => a.description as string),
        status: STATUS[test.status],
        retries: Math.max(test.results.length - 1, 0),
        durationMs: test.results.reduce((total, result) => total + result.duration, 0),
        error: lastError(test),
      });
    }
  }
  for (const child of suite.suites ?? []) {
    collect(child, [...titlePath, child.title], run, records);
  }
}

const args = parseArgs(process.argv.slice(2));
if (!args.report || !args.out) throw new Error('Usage: collect-test-history --report <results.json> --out <dir>');

const report = JSON.parse(fs.readFileSync(args.report, 'utf8')) as JSONReport;
const run = runInfo(report);
const records: TestRecord[] = [];
// File-level suites are titled with the file path, which each record already carries in `file`.
for (const fileSuite of report.suites) collect(fileSuite, [], run, records);

const file = path.join(args.out, TEST_RUNS_DIR, `${datedPath(run.recordedAt)}-${run.runId}-${run.runAttempt}.jsonl`);
writeJsonl(file, records);
console.log(`Recorded ${records.length} test results to ${file}`);
