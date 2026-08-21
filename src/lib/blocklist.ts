// Server-only. Permanently blocked client emails, stored as tasks in the
// "Athena — Blocked Emails" list (a sibling of the SDP Projects folder, so
// it never shows up in listProjects()) — the task name IS the email, no
// custom fields needed. Checked at every client entry point (login, signup,
// Google) so a blocked email can never open a session again, even by
// signing up fresh under a different project.

import blocklistConfig from '@/data/blocklist-config.json';

const API = 'https://api.clickup.com/api/v2';

function token() {
  const t = process.env.CLICKUP_API_TOKEN;
  if (!t) throw new Error('CLICKUP_API_TOKEN is not set');
  return t;
}

async function cu(method: string, urlPath: string, body?: unknown) {
  const res = await fetch(`${API}${urlPath}`, {
    method,
    headers: { Authorization: token(), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`ClickUp ${method} ${urlPath} -> ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function listTasks() {
  const { tasks } = await cu('GET', `/list/${blocklistConfig.listId}/task?include_closed=true`);
  return tasks as { id: string; name: string }[];
}

function normalize(email: string) {
  return email.trim().toLowerCase();
}

export async function listBlockedEmails(): Promise<string[]> {
  const tasks = await listTasks();
  return tasks.map((t) => normalize(t.name));
}

export async function isEmailBlocked(email: string): Promise<boolean> {
  const normalized = normalize(email);
  const tasks = await listTasks();
  return tasks.some((t) => normalize(t.name) === normalized);
}

export async function blockEmail(email: string): Promise<void> {
  const normalized = normalize(email);
  const tasks = await listTasks();
  if (tasks.some((t) => normalize(t.name) === normalized)) return;
  await cu('POST', `/list/${blocklistConfig.listId}/task`, { name: normalized });
}

export async function unblockEmail(email: string): Promise<void> {
  const normalized = normalize(email);
  const tasks = await listTasks();
  const match = tasks.find((t) => normalize(t.name) === normalized);
  if (match) await cu('DELETE', `/task/${match.id}`);
}
