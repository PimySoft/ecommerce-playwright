// Computes per-test pass rate, flaky rate, failures, duration percentiles and trend over 7 and 30 days.
// Usage: tsx scripts/summarise-test-history.ts --history <ci-history checkout> [--out summary.json] [--now <ISO date>]
import fs from 'fs';
import path from 'path';
import { TEST_RUNS_DIR, type TestRecord, parseArgs, readJsonl } from './history/records';

const DAY_MS = 24 * 60 * 60 * 1000;
// The 7-day unstable rate must move this far from the preceding 23 days to count as a change, and the earlier period
// needs enough runs to compare against. With about one run a night, a single flake moves the rate by 20 points, so
// "worse" also needs a repeat.
const TREND_THRESHOLD = 0.1;
const MIN_BASELINE_RUNS = 3;
const MIN_UNSTABLE_FOR_WORSE = 2;

export type Trend = 'new' | 'worse' | 'better' | 'stable' | 'inactive';

export interface WindowStats {
  runs: number;
  passed: number;
  flaky: number;
  failed: number;
  passRate: number | null;
  flakyRate: number | null;
  p50DurationMs: number | null;
  p95DurationMs: number | null;
}

export interface TestSummary {
  testId: string;
  title: string;
  file: string;
  project: string;
  tags: string[];
  issues: string[];
  last7Days: WindowStats;
  last30Days: WindowStats;
  trend: Trend;
  lastError: string | null;
  lastFailedRunUrl: string | null;
}

export interface HistorySummary {
  generatedAt: string;
  windowEnd: string;
  runs7Days: number;
  runs30Days: number;
  tests: TestSummary[];
}

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

export function windowStats(records: TestRecord[]): WindowStats {
  const count = (status: TestRecord['status']): number => records.filter((r) => r.status === status).length;
  const runs = records.length;
  const durations = records.map((r) => r.durationMs);
  return {
    runs,
    passed: count('passed'),
    flaky: count('flaky'),
    failed: count('failed'),
    passRate: runs ? count('passed') / runs : null,
    flakyRate: runs ? count('flaky') / runs : null,
    p50DurationMs: percentile(durations, 50),
    p95DurationMs: percentile(durations, 95),
  };
}

function unstableRate(records: TestRecord[]): number {
  return records.filter((r) => r.status !== 'passed').length / records.length;
}

function trend(last7: TestRecord[], earlier: TestRecord[]): Trend {
  if (last7.length === 0) return 'inactive';
  if (earlier.length < MIN_BASELINE_RUNS) return 'new';
  const change = unstableRate(last7) - unstableRate(earlier);
  const unstable = last7.filter((r) => r.status !== 'passed').length;
  if (change > TREND_THRESHOLD && unstable >= MIN_UNSTABLE_FOR_WORSE) return 'worse';
  if (change < -TREND_THRESHOLD) return 'better';
  return 'stable';
}

// Pull-request runs test unmerged code, so their failures say more about the PR than about the suite's health.
// Skipped results carry no signal either way.
export function trendRecords(records: TestRecord[]): TestRecord[] {
  return records.filter((r) => r.trigger !== 'pull_request' && r.status !== 'skipped');
}

export function summarise(allRecords: TestRecord[], now: Date): HistorySummary {
  const end = now.getTime();
  const since = (days: number) => (r: TestRecord): boolean => end - Date.parse(r.recordedAt) <= days * DAY_MS;
  const records = trendRecords(allRecords).filter((r) => Date.parse(r.recordedAt) <= end && since(30)(r));

  const byTest = new Map<string, TestRecord[]>();
  for (const record of records) {
    const key = `${record.testId}|${record.project}`;
    byTest.set(key, [...(byTest.get(key) ?? []), record]);
  }

  const tests = [...byTest.values()].map((history): TestSummary => {
    history.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    const latest = history[history.length - 1];
    const last7 = history.filter(since(7));
    const earlier = history.filter((r) => !since(7)(r));
    const lastFailure = history.filter((r) => r.error).at(-1);
    return {
      testId: latest.testId,
      title: latest.title,
      file: latest.file,
      project: latest.project,
      tags: latest.tags,
      issues: latest.issues,
      last7Days: windowStats(last7),
      last30Days: windowStats(history),
      trend: trend(last7, earlier),
      lastError: lastFailure?.error ?? null,
      lastFailedRunUrl: lastFailure?.runUrl ?? null,
    };
  });
  tests.sort((a, b) => a.file.localeCompare(b.file) || a.title.localeCompare(b.title) || a.project.localeCompare(b.project));

  const runCount = (days: number): number =>
    new Set(records.filter(since(days)).map((r) => `${r.runId}-${r.runAttempt}`)).size;
  return {
    generatedAt: new Date().toISOString(),
    windowEnd: now.toISOString(),
    runs7Days: runCount(7),
    runs30Days: runCount(30),
    tests,
  };
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.history) throw new Error('Usage: summarise-test-history --history <dir> [--out <file>] [--now <ISO date>]');
  const records = readJsonl<TestRecord>(path.join(args.history, TEST_RUNS_DIR));
  const summary = JSON.stringify(summarise(records, args.now ? new Date(args.now) : new Date()), null, 2);
  if (args.out) {
    fs.writeFileSync(args.out, summary + '\n');
    console.log(`Summarised ${records.length} records to ${args.out}`);
  } else {
    console.log(summary);
  }
}
