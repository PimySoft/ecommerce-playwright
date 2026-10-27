import fs from 'fs';
import path from 'path';

// The ci-history branch holds one JSONL file per CI run or agent session, so concurrent writers never touch the same
// file and a push only ever needs a rebase, never a merge.
export const TEST_RUNS_DIR = 'test-runs';
export const AGENT_RUNS_DIR = 'agent-runs';

export type TestOutcome = 'passed' | 'flaky' | 'failed' | 'skipped';

export interface TestRecord {
  schema: 1;
  runId: string;
  runAttempt: number;
  runUrl: string | null;
  trigger: string;
  branch: string;
  commit: string;
  recordedAt: string;
  testId: string;
  title: string;
  file: string;
  line: number;
  project: string;
  tags: string[];
  issues: string[];
  status: TestOutcome;
  retries: number;
  durationMs: number;
  error: string | null;
}

export type AgentOutcome = 'done' | 'blocked' | 'stuck' | 'abandoned';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
}

export interface AgentRunRecord {
  schema: 1;
  mode: 'interactive' | 'unattended';
  sessionId: string;
  agent: string;
  agents: string[];
  // A hash of the agent and skill definitions the run used, so eval and acceptance rates can be tied to a prompt version.
  promptVersion: string;
  ticket: string | null;
  stage: string | null;
  // Interactive sessions can't tell how the ticket ended; agent-metrics resolves it from the ticket's labels.
  outcome: AgentOutcome | null;
  turns: number;
  // Per model, because a notional cost is derived later from current prices rather than frozen into the record.
  usageByModel: Record<string, TokenUsage>;
  startedAt: string;
  endedAt: string;
  durationMs: number;
}

export function readJsonl<T>(dir: string): T[] {
  if (!fs.existsSync(dir)) return [];
  const records: T[] = [];
  for (const entry of fs.readdirSync(dir, { recursive: true, encoding: 'utf8' })) {
    if (!entry.endsWith('.jsonl')) continue;
    const lines = fs.readFileSync(path.join(dir, entry), 'utf8').split('\n');
    for (const line of lines) {
      if (line.trim()) records.push(JSON.parse(line) as T);
    }
  }
  return records;
}

export function writeJsonl(file: string, records: object[]): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, records.map((record) => JSON.stringify(record)).join('\n') + '\n');
}

// "2026-10-27T03:05:12.345Z" -> "2026/10/2026-10-27T030512Z", which sorts by time and keeps directories small.
export function datedPath(iso: string): string {
  const stamp = iso.replace(/[:-]|\.\d+/g, '').replace(/^(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
  return `${iso.slice(0, 4)}/${iso.slice(5, 7)}/${stamp}`;
}

export function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith('--') || value === undefined) {
      throw new Error(`Expected --name value pairs, got "${argv.slice(i).join(' ')}"`);
    }
    args[key.slice(2)] = value;
  }
  return args;
}
