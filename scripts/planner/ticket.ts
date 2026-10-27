import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// The ticket source. In the demo a ticket is a GitHub Issue made from .github/ISSUE_TEMPLATE/user-story.yml, or a
// Markdown file in the same layout for evals; in a real team these functions would call Jira instead.
export const DEMO_LABEL = 'demo-story';
export const LABELS = {
  ready: 'ready-for-automation',
  clarify: 'needs-clarification',
  review: 'plan-review',
  approved: 'plan-approved',
  stuck: 'agent-stuck',
} as const;

export interface TicketComment {
  author: string;
  createdAt: string;
  body: string;
}

export interface Ticket {
  schema: 1;
  // "#42" for an Issue, or the path of a Markdown ticket.
  id: string;
  url: string | null;
  title: string;
  labels: string[];
  summary: string;
  story: string;
  criteria: string[];
  priority: string;
  component: string;
  comments: TicketComment[];
}

interface IssueJson {
  number: number;
  url: string;
  title: string;
  body: string;
  labels: { name: string }[];
  comments: { author: { login: string }; createdAt: string; body: string }[];
}

// Issue forms render each field as "### <label>" followed by its value, and an empty field as "_No response_".
function sections(body: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const part of body.split(/^### /m).slice(1)) {
    const [heading, ...rest] = part.split('\n');
    const value = rest.join('\n').trim();
    found.set(heading.trim().toLowerCase(), value === '_No response_' ? '' : value);
  }
  return found;
}

function listItems(text: string): string[] {
  return text.split('\n')
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s+(?:\[[ x]\]\s+)?/i, '').trim())
    .filter(Boolean);
}

export function parseTicket(id: string, url: string | null, title: string, body: string, labels: string[], comments: TicketComment[]): Ticket {
  const fields = sections(body);
  return {
    schema: 1,
    id,
    url,
    title,
    labels,
    summary: fields.get('summary') ?? '',
    story: fields.get('user story') ?? '',
    criteria: listItems(fields.get('acceptance criteria') ?? ''),
    priority: fields.get('priority') ?? '',
    component: fields.get('component') ?? '',
    comments,
  };
}

export function gh(args: string[]): string {
  return execFileSync('gh', args, { encoding: 'utf8' });
}

export function fetchIssue(issue: number): Ticket {
  const json = JSON.parse(gh(['issue', 'view', String(issue), '--json', 'number,url,title,body,labels,comments'])) as IssueJson;
  const labels = json.labels.map((label) => label.name);
  // Anyone can open an Issue on a public repo, so agents read only those the owner has labelled.
  if (!labels.includes(DEMO_LABEL)) throw new Error(`#${issue} has no ${DEMO_LABEL} label, so agents may not read it`);
  const comments = json.comments.map((c) => ({ author: c.author.login, createdAt: c.createdAt, body: c.body }));
  return parseTicket(`#${json.number}`, json.url, json.title, json.body, labels, comments);
}

// A Markdown ticket starts with "# <title>" and then has the Issue form's sections.
export function readTicketFile(file: string): Ticket {
  const text = fs.readFileSync(file, 'utf8');
  const title = /^# (.+)$/m.exec(text)?.[1].trim() ?? path.basename(file, '.md');
  return parseTicket(path.normalize(file), null, title, text, [], []);
}
