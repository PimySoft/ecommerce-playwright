// Claude Code SessionEnd hook: when a session used one of this repo's agents or skills, writes an AgentRunRecord for it
// to .agent-runs/, and `npm run history:push-agent-runs` publishes the outbox to the ci-history branch. Sessions that
// used none are ordinary coding sessions and aren't recorded.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { AGENT_RUNS_DIR, type AgentRunRecord, type TokenUsage, datedPath, writeJsonl } from './history/records';

export const OUTBOX_DIR = '.agent-runs';

interface HookInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
}

interface ContentBlock {
  type: string;
  name?: string;
  input?: Record<string, unknown>;
  text?: string;
}

interface TranscriptEntry {
  type?: string;
  timestamp?: string;
  message?: {
    id?: string;
    model?: string;
    content?: string | ContentBlock[];
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
}

interface Invocation {
  name: string;
  args: string;
}

function readTranscript(file: string): TranscriptEntry[] {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line) as TranscriptEntry);
}

// Subagents write their own transcripts next to the session's, and their tokens belong to the same run.
function subagentTranscripts(transcriptPath: string, sessionId: string): string[] {
  const dir = path.join(path.dirname(transcriptPath), sessionId, 'subagents');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')).map((f) => path.join(dir, f));
}

function projectDefinitions(root: string): Map<string, string> {
  const definitions = new Map<string, string>();
  const agentsDir = path.join(root, '.claude', 'agents');
  if (fs.existsSync(agentsDir)) {
    for (const file of fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md'))) {
      definitions.set(path.basename(file, '.md'), path.join(agentsDir, file));
    }
  }
  const skillsDir = path.join(root, '.claude', 'skills');
  if (fs.existsSync(skillsDir)) {
    for (const name of fs.readdirSync(skillsDir)) {
      const file = path.join(skillsDir, name, 'SKILL.md');
      if (fs.existsSync(file)) definitions.set(name, file);
    }
  }
  return definitions;
}

// A slash command typed by the user is recorded as text in the user's message, not as a tool call.
function slashCommand(text: string): Invocation | null {
  const command = /<command-name>\/?([\w:-]+)<\/command-name>/.exec(text);
  if (!command) return null;
  return { name: command[1], args: /<command-args>([\s\S]*?)<\/command-args>/.exec(text)?.[1] ?? '' };
}

function invocations(entries: TranscriptEntry[]): Invocation[] {
  const found: Invocation[] = [];
  for (const entry of entries) {
    const content = entry.message?.content;
    const blocks: ContentBlock[] = typeof content === 'string' ? [{ type: 'text', text: content }] : (content ?? []);
    for (const block of blocks) {
      const command = block.type === 'text' && block.text ? slashCommand(block.text) : null;
      if (command) found.push(command);
      if (block.type !== 'tool_use' || !block.input) continue;
      if (block.name === 'Skill' && typeof block.input.skill === 'string') {
        found.push({ name: block.input.skill, args: String(block.input.args ?? '') });
      }
      if ((block.name === 'Agent' || block.name === 'Task') && typeof block.input.subagent_type === 'string') {
        found.push({ name: block.input.subagent_type, args: String(block.input.prompt ?? '') });
      }
    }
  }
  return found;
}

function usageByModel(entries: TranscriptEntry[]): { usage: Record<string, TokenUsage>; turns: number } {
  // One API response is written as several transcript entries that each repeat its usage, so count each message once.
  const seen = new Set<string>();
  const usage: Record<string, TokenUsage> = {};
  for (const entry of entries) {
    const message = entry.message;
    if (entry.type !== 'assistant' || !message?.id || !message.usage || !message.model || seen.has(message.id)) continue;
    if (message.model === '<synthetic>') continue;
    seen.add(message.id);
    const total = (usage[message.model] ??= {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
    });
    total.inputTokens += message.usage.input_tokens ?? 0;
    total.outputTokens += message.usage.output_tokens ?? 0;
    total.cacheCreationInputTokens += message.usage.cache_creation_input_tokens ?? 0;
    total.cacheReadInputTokens += message.usage.cache_read_input_tokens ?? 0;
  }
  return { usage, turns: seen.size };
}

export function buildRecord(input: HookInput, root: string): AgentRunRecord | null {
  const main = readTranscript(input.transcript_path);
  const definitions = projectDefinitions(root);
  const used = invocations(main).filter((invocation) => definitions.has(invocation.name));
  if (used.length === 0) return null;

  const agents = [...new Set(used.map((invocation) => invocation.name))];
  const hash = crypto.createHash('sha256');
  for (const name of [...agents].sort()) hash.update(name).update(fs.readFileSync(definitions.get(name) as string));
  const ticket = used.map((invocation) => /#?(\d+)\b/.exec(invocation.args)?.[1]).find(Boolean);

  const all = [main, ...subagentTranscripts(input.transcript_path, input.session_id).map(readTranscript)].flat();
  const { usage, turns } = usageByModel(all);
  const timestamps = main.map((entry) => entry.timestamp).filter((t): t is string => Boolean(t)).sort();
  const startedAt = timestamps[0] ?? new Date().toISOString();
  const endedAt = timestamps[timestamps.length - 1] ?? startedAt;

  return {
    schema: 1,
    mode: 'interactive',
    sessionId: input.session_id,
    agent: agents[0],
    agents,
    promptVersion: hash.digest('hex').slice(0, 12),
    ticket: ticket ? `#${ticket}` : null,
    stage: null,
    outcome: null,
    turns,
    usageByModel: usage,
    startedAt,
    endedAt,
    durationMs: Date.parse(endedAt) - Date.parse(startedAt),
  };
}

if (require.main === module) {
  const input = JSON.parse(fs.readFileSync(0, 'utf8')) as HookInput;
  const root = process.env.CLAUDE_PROJECT_DIR ?? input.cwd;
  const record = buildRecord(input, root);
  if (record) {
    // Named by start time and session, so a resumed session overwrites its own record instead of adding a second one.
    const file = path.join(root, OUTBOX_DIR, AGENT_RUNS_DIR, `${datedPath(record.startedAt)}-${record.sessionId}.jsonl`);
    writeJsonl(file, [record]);
  }
}
