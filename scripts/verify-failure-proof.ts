// The failure proof: runs each new test once with its sabotage applied and passes it only if the test failed at the
// assertion its "fails if" line names. Prints the table for the PR description, and exits 1 if any proof fails.
// The sabotage is a module exporting `sabotage(page)`, applied by the page fixture before the test acts, so the test
// file runs unchanged and its line numbers hold.
// Usage: tsx scripts/verify-failure-proof.ts --proof .proof/<target>/proof.json
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { parseArgs } from './history/records';

export interface Proof {
  id: string;
  // "<spec>:<line of its test( call>", relative to the repo root.
  test: string;
  failsIf: string;
  sabotage: string;
  sabotageFile: string;
  // "<spec>:<line>" of the assertion that must fail.
  assertion: string;
}

export interface ProofManifest {
  schema: 1;
  config?: string;
  project?: string;
  proofs: Proof[];
}

export interface ProofResult {
  proof: Proof;
  passed: boolean;
  failedAt: string;
  why: string;
}

interface ReportError {
  message?: string;
  location?: { file: string; line: number };
}

interface ReportSuite {
  suites?: ReportSuite[];
  specs?: { tests: { results: { status: string; errors: ReportError[] }[] }[] }[];
}

function results(suite: ReportSuite): { status: string; errors: ReportError[] }[] {
  const own = (suite.specs ?? []).flatMap((spec) => spec.tests.flatMap((test) => test.results));
  return [...own, ...(suite.suites ?? []).flatMap(results)];
}

// eslint-disable-next-line no-control-regex
const stripAnsi = (text: string): string => text.replace(/\u001b\[[0-9;]*m/g, '');

export function judge(proof: Proof, status: string | undefined, error: ReportError | undefined, root: string): ProofResult {
  const at = error?.location ? `${path.relative(root, error.location.file)}:${error.location.line}` : '—';
  const message = stripAnsi(error?.message ?? '');
  const firstLine = message.split('\n').find((line) => line.trim())?.trim() ?? '';
  const fail = (why: string): ProofResult => ({ proof, passed: false, failedAt: at, why });
  if (status === undefined) return fail('the test was not found or did not run');
  if (status === 'passed') return fail("passed with the sabotage, so it can't catch this break");
  if (status === 'skipped') return fail('skipped');
  if (at !== path.normalize(proof.assertion)) return fail(`failed at ${at}, not at the named assertion: ${firstLine}`);
  // A value assertion that fails only because its element is gone proves the element exists, not the value.
  if (/element\(s\) not found/.test(message)) return fail('the assertion found no element: the sabotage removed it instead of changing a value');
  return { proof, passed: true, failedAt: at, why: firstLine };
}

export function runProof(proof: Proof, manifest: ProofManifest, outDir: string, root: string): ProofResult {
  const report = path.join(outDir, `${proof.id}.report.json`);
  fs.rmSync(report, { force: true });
  const args = ['playwright', 'test', proof.test, `--project=${manifest.project ?? 'chrome'}`, '--retries=0', '--workers=1', '--reporter=json'];
  if (manifest.config) args.push(`--config=${manifest.config}`);
  spawnSync('npx', args, {
    cwd: root,
    stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, FAILURE_PROOF_SABOTAGE: path.resolve(root, proof.sabotageFile), PLAYWRIGHT_JSON_OUTPUT_FILE: report },
  });
  if (!fs.existsSync(report)) return judge(proof, undefined, undefined, root);
  const ran = results(JSON.parse(fs.readFileSync(report, 'utf8')) as ReportSuite);
  if (ran.length !== 1) return { proof, passed: false, failedAt: '—', why: `${proof.test} selected ${ran.length} tests, not one` };
  return judge(proof, ran[0].status, ran[0].errors[0], root);
}

export function proofTable(outcomes: ProofResult[]): string {
  const rows = outcomes.map(({ proof, passed, failedAt, why }) =>
    `| ${proof.id} | ${proof.failsIf} | ${proof.sabotage} | \`${failedAt}\` | ${passed ? '✅' : '❌'} ${why.replace(/\|/g, '\\|')} |`);
  return ['| Test | Fails if | Sabotage | Failed at | Proof |', '|---|---|---|---|---|', ...rows].join('\n');
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.proof) throw new Error('Usage: verify-failure-proof.ts --proof <dir>/proof.json');
  const root = process.cwd();
  const manifest = JSON.parse(fs.readFileSync(args.proof, 'utf8')) as ProofManifest;
  const outcomes = manifest.proofs.map((proof) => runProof(proof, manifest, path.dirname(args.proof), root));
  console.log(proofTable(outcomes));
  const failed = outcomes.filter((o) => !o.passed).length;
  console.log(`\n${outcomes.length - failed} of ${outcomes.length} proofs passed.${failed ? ' Each failed proof flags its test for a full QA review.' : ''}`);
  if (failed > 0) process.exitCode = 1;
}
