// Draws the trend page published next to the HTML report: weekly pass rate, flaky rate and test duration, plus the
// flakiest and slowest tests. It's plain HTML with inline SVG, so it needs no build step or CDN.
// Usage: tsx scripts/render-trend-page.ts --history <ci-history checkout> --out playwright-report/trends/index.html
import fs from 'fs';
import path from 'path';
import { TEST_RUNS_DIR, type TestRecord, parseArgs, readJsonl } from './history/records';
import { type TestSummary, percentile, summarise, trendRecords, windowStats } from './summarise-test-history';

const WEEKS_SHOWN = 12;
const TOP_TESTS = 10;

interface Week {
  start: string;
  runs: number;
  results: number;
  passRate: number;
  flakyRate: number;
  failed: number;
  p50Ms: number;
  p95Ms: number;
}

interface Point {
  label: string;
  value: number;
  display: string;
}

const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
const pct = (value: number | null): string => (value === null ? '–' : `${(value * 100).toFixed(1)}%`);
const secs = (ms: number | null): string => (ms === null ? '–' : `${(ms / 1000).toFixed(1)}s`);

function weekStart(iso: string): string {
  const date = new Date(iso);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

function weeks(records: TestRecord[]): Week[] {
  const byWeek = new Map<string, TestRecord[]>();
  for (const record of records) {
    const key = weekStart(record.recordedAt);
    byWeek.set(key, [...(byWeek.get(key) ?? []), record]);
  }
  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-WEEKS_SHOWN)
    .map(([start, week]) => {
      const stats = windowStats(week);
      return {
        start,
        runs: new Set(week.map((r) => `${r.runId}-${r.runAttempt}`)).size,
        results: stats.runs,
        passRate: stats.passRate ?? 0,
        flakyRate: stats.flakyRate ?? 0,
        failed: stats.failed,
        p50Ms: stats.p50DurationMs ?? 0,
        p95Ms: percentile(week.map((r) => r.durationMs), 95) ?? 0,
      };
    });
}

// The smallest step from 1, 2, 2.5 or 5 × 10^n that covers the range in four ticks, so every tick is a round number.
function niceMax(min: number, max: number): number {
  const raw = (max - min) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * magnitude >= raw) as number) * magnitude;
  return min + step * 4;
}

const W = 640;
const H = 220;
const PAD = { top: 20, right: 56, bottom: 28, left: 48 };
const plotW = W - PAD.left - PAD.right;
const plotH = H - PAD.top - PAD.bottom;

function chart(points: Point[], kind: 'line' | 'column', yMin: number, yMax: number, tick: (v: number) => string): string {
  const y = (v: number): number => PAD.top + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;
  const band = plotW / points.length;
  const x = (i: number): number => PAD.left + band * i + band / 2;

  const ticks = [0, 1, 2, 3, 4].map((i) => yMin + ((yMax - yMin) * i) / 4);
  const grid = ticks
    .map((v) => `<line class="grid" x1="${PAD.left}" x2="${W - PAD.right}" y1="${y(v)}" y2="${y(v)}"/>` +
      `<text class="tick" x="${PAD.left - 8}" y="${y(v) + 4}" text-anchor="end">${tick(v)}</text>`)
    .join('');
  const xLabels = points
    .map((p, i) => `<text class="tick" x="${x(i)}" y="${H - 8}" text-anchor="middle">${p.label.slice(5)}</text>`)
    .join('');

  const barW = Math.min(24, band * 0.6);
  let marks: string;
  if (kind === 'line') {
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join('');
    marks = `<path class="line" d="${d}"/>` + points
      .map((p, i) => `<g><title>Week of ${p.label}: ${p.display}</title>` +
        `<rect class="hit" x="${x(i) - band / 2}" y="${PAD.top}" width="${band}" height="${plotH}"/>` +
        `<circle class="dot" cx="${x(i)}" cy="${y(p.value)}" r="4"/></g>`)
      .join('');
  } else {
    marks = points
      .map((p, i) => {
        const top = y(p.value);
        const base = y(yMin);
        const r = Math.min(4, (base - top) / 2);
        const left = x(i) - barW / 2;
        // Rounded at the data end, square at the baseline.
        const d = `M${left},${base}V${top + r}Q${left},${top} ${left + r},${top}H${left + barW - r}` +
          `Q${left + barW},${top} ${left + barW},${top + r}V${base}Z`;
        return `<g><title>Week of ${p.label}: ${p.display}</title>` +
          `<rect class="hit" x="${x(i) - band / 2}" y="${PAD.top}" width="${band}" height="${plotH}"/>` +
          `<path class="bar" d="${d}"/></g>`;
      })
      .join('');
  }
  const last = points[points.length - 1];
  const endLabel = `<text class="end" x="${x(points.length - 1) + (kind === 'line' ? 10 : barW / 2 + 6)}" y="${y(last.value) + 4}">${last.display}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${kind} chart">${grid}${xLabels}${marks}${endLabel}</svg>`;
}

function trendBadge(test: TestSummary): string {
  return `<span class="trend trend-${test.trend}">${test.trend}</span>`;
}

function render(records: TestRecord[], now: Date): string {
  const relevant = trendRecords(records);
  const summary = summarise(records, now);
  const series = weeks(relevant);
  const week = summary.tests.reduce(
    (total, t) => ({
      runs: total.runs + t.last7Days.runs,
      passed: total.passed + t.last7Days.passed,
      flaky: total.flaky + t.last7Days.flaky,
      failed: total.failed + t.last7Days.failed,
    }),
    { runs: 0, passed: 0, flaky: 0, failed: 0 },
  );

  const tiles = [
    ['Pass rate, 7 days', pct(week.runs ? week.passed / week.runs : null)],
    ['Flaky rate, 7 days', pct(week.runs ? week.flaky / week.runs : null)],
    ['Failures, 7 days', String(week.failed)],
    ['CI runs, 7 days', String(summary.runs7Days)],
  ].map(([label, value]) => `<div class="tile"><div class="label">${label}</div><div class="value">${value}</div></div>`)
    .join('');

  let charts = '<p class="empty">No runs recorded yet. The first push to <code>main</code> or nightly run starts the history.</p>';
  if (series.length > 0) {
    const passFloor = Math.min(0.9, Math.floor(Math.min(...series.map((w) => w.passRate)) * 10) / 10);
    const flakyMax = niceMax(0, Math.max(0.04, ...series.map((w) => w.flakyRate)));
    const durationMax = niceMax(0, Math.max(4000, ...series.map((w) => w.p50Ms)));
    const pctTick = (v: number): string => `${+(v * 100).toFixed(1)}%`;
    charts = `
      <figure><figcaption>Pass rate per week<span>first-attempt passes over all results</span></figcaption>
        ${chart(series.map((w) => ({ label: w.start, value: w.passRate, display: pct(w.passRate) })), 'line', passFloor, 1, pctTick)}</figure>
      <figure><figcaption>Flaky rate per week<span>results that passed only on retry</span></figcaption>
        ${chart(series.map((w) => ({ label: w.start, value: w.flakyRate, display: pct(w.flakyRate) })), 'column', 0, flakyMax, pctTick)}</figure>
      <figure><figcaption>Median test duration per week<span>including retries</span></figcaption>
        ${chart(series.map((w) => ({ label: w.start, value: w.p50Ms, display: secs(w.p50Ms) })), 'column', 0, durationMax, (v) => `${+(v / 1000).toFixed(1)}s`)}</figure>
      <details><summary>Weekly figures as a table</summary><table>
        <thead><tr><th>Week of</th><th>CI runs</th><th>Results</th><th>Pass rate</th><th>Flaky rate</th><th>Failures</th><th>p50</th><th>p95</th></tr></thead>
        <tbody>${series.map((w) => `<tr><td>${w.start}</td><td>${w.runs}</td><td>${w.results}</td><td>${pct(w.passRate)}</td>` +
          `<td>${pct(w.flakyRate)}</td><td>${w.failed}</td><td>${secs(w.p50Ms)}</td><td>${secs(w.p95Ms)}</td></tr>`).join('')}</tbody>
      </table></details>`;
  }

  const unstable = summary.tests
    .filter((t) => t.last30Days.flaky + t.last30Days.failed > 0)
    .sort((a, b) => b.last30Days.flaky + b.last30Days.failed - (a.last30Days.flaky + a.last30Days.failed))
    .slice(0, TOP_TESTS);
  const slowest = [...summary.tests]
    .sort((a, b) => (b.last30Days.p95DurationMs ?? 0) - (a.last30Days.p95DurationMs ?? 0))
    .slice(0, TOP_TESTS);
  const testCell = (t: TestSummary): string =>
    `<td><div>${escapeHtml(t.title)}</div><div class="muted">${escapeHtml(t.file)} · ${escapeHtml(t.project)}</div></td>`;

  const unstableTable = unstable.length === 0 ? '<p class="empty">No flaky or failed tests in the last 30 days.</p>' : `
    <table><thead><tr><th>Test</th><th>Flaky</th><th>Failed</th><th>Results</th><th>Trend</th><th>Last error</th></tr></thead><tbody>
    ${unstable.map((t) => `<tr>${testCell(t)}<td>${t.last30Days.flaky}</td><td>${t.last30Days.failed}</td><td>${t.last30Days.runs}</td>` +
      `<td>${trendBadge(t)}</td><td class="error">${t.lastFailedRunUrl ? `<a href="${escapeHtml(t.lastFailedRunUrl)}">run</a> ` : ''}` +
      `${escapeHtml((t.lastError ?? '').split('\n')[0])}</td></tr>`).join('')}
    </tbody></table>`;
  const slowTable = slowest.length === 0 ? '' : `
    <table><thead><tr><th>Test</th><th>p50</th><th>p95</th><th>Results</th></tr></thead><tbody>
    ${slowest.map((t) => `<tr>${testCell(t)}<td>${secs(t.last30Days.p50DurationMs)}</td><td>${secs(t.last30Days.p95DurationMs)}</td>` +
      `<td>${t.last30Days.runs}</td></tr>`).join('')}
    </tbody></table>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Test Trends</title>
<style>
  :root {
    color-scheme: light;
    --surface: #fcfcfb; --surface-2: #f2f1ee; --grid: #e4e2dc;
    --text: #0b0b0b; --text-2: #52514e; --muted: #77756f;
    --series: #2a78d6; --good: #008300; --bad: #c43534; --warn: #a46a00;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      color-scheme: dark;
      --surface: #1a1a19; --surface-2: #252523; --grid: #353532;
      --text: #f0efec; --text-2: #c3c2b7; --muted: #95938a;
      --series: #3987e5; --good: #4caf50; --bad: #e66767; --warn: #e0a83a;
    }
  }
  :root[data-theme="dark"] {
    color-scheme: dark;
    --surface: #1a1a19; --surface-2: #252523; --grid: #353532;
    --text: #f0efec; --text-2: #c3c2b7; --muted: #95938a;
    --series: #3987e5; --good: #4caf50; --bad: #e66767; --warn: #e0a83a;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--surface); color: var(--text); font: 15px/1.5 system-ui, -apple-system, sans-serif; }
  main { max-width: 960px; margin: 0 auto; padding: 32px 16px 64px; }
  h1 { font-size: 28px; margin: 0 0 4px; }
  h2 { font-size: 18px; margin: 40px 0 12px; }
  a { color: var(--series); }
  .muted, .sub { color: var(--text-2); }
  .sub { margin: 0 0 24px; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
  .tile { background: var(--surface-2); border-radius: 8px; padding: 12px 16px; }
  .tile .label { color: var(--text-2); font-size: 13px; }
  .tile .value { font-size: 28px; font-weight: 600; }
  figure { margin: 24px 0 0; }
  figcaption { font-weight: 600; }
  figcaption span { display: block; font-weight: 400; font-size: 13px; color: var(--text-2); }
  svg { width: 100%; height: auto; display: block; }
  .grid { stroke: var(--grid); stroke-width: 1; }
  .tick { fill: var(--muted); font-size: 11px; }
  .end { fill: var(--text); font-size: 12px; font-weight: 600; }
  .line { fill: none; stroke: var(--series); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
  .dot { fill: var(--series); stroke: var(--surface); stroke-width: 2; }
  .bar { fill: var(--series); }
  .hit { fill: transparent; }
  g:hover .hit { fill: var(--grid); fill-opacity: 0.4; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { text-align: left; vertical-align: top; padding: 8px; border-bottom: 1px solid var(--grid); }
  th { color: var(--text-2); font-weight: 600; }
  td.error { font-family: ui-monospace, monospace; font-size: 12px; color: var(--text-2); max-width: 280px; overflow-wrap: anywhere; }
  details { margin-top: 16px; }
  summary { cursor: pointer; color: var(--text-2); }
  .trend { font-size: 12px; font-weight: 600; }
  .trend-worse { color: var(--bad); }
  .trend-better { color: var(--good); }
  .trend-new, .trend-inactive { color: var(--warn); }
  .trend-stable { color: var(--text-2); }
  .empty { color: var(--text-2); }
</style>
</head>
<body>
<main>
  <h1>Test trends</h1>
  <p class="sub">Push, nightly and manual CI runs recorded on the <code>ci-history</code> branch, up to ${summary.windowEnd.slice(0, 10)}.
    Pull-request runs are left out because they test unmerged code. <a href="../">Latest report</a></p>
  <div class="tiles">${tiles}</div>
  <h2>Weekly</h2>
  ${charts}
  <h2>Flakiest and failing tests, 30 days</h2>
  <div class="table-wrap">${unstableTable}</div>
  <h2>Slowest tests, 30 days</h2>
  <div class="table-wrap">${slowTable}</div>
</main>
</body>
</html>
`;
}

const args = parseArgs(process.argv.slice(2));
if (!args.history || !args.out) throw new Error('Usage: render-trend-page --history <dir> --out <file> [--now <ISO date>]');
const records = readJsonl<TestRecord>(path.join(args.history, TEST_RUNS_DIR));
fs.mkdirSync(path.dirname(args.out), { recursive: true });
fs.writeFileSync(args.out, render(records, args.now ? new Date(args.now) : new Date()));
console.log(`Rendered trends from ${records.length} records to ${args.out}`);
