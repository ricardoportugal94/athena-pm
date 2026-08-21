// Server-only. Local (non-Google) client accounts, stored as tasks in the
// "Athena — Client Accounts" list (a sibling of the SDP Projects folder, so it
// never shows up in listProjects()). Each task = one account.

import accountsConfig from '@/data/client-accounts-config.json';

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

export type ClientAccount = {
  taskId: string;
  email: string;
  passwordHash: string;
  projectId: string;
  projectName: string;
};

function fieldValue(task: any, fieldId: string): any {
  return task.custom_fields?.find((f: any) => f.id === fieldId)?.value ?? null;
}

function mapAccount(task: any): ClientAccount {
  return {
    taskId: task.id,
    email: fieldValue(task, accountsConfig.fields.email) ?? '',
    passwordHash: fieldValue(task, accountsConfig.fields.passwordHash) ?? '',
    projectId: fieldValue(task, accountsConfig.fields.projectId) ?? '',
    projectName: fieldValue(task, accountsConfig.fields.projectName) ?? '',
  };
}

export async function listAccounts(): Promise<ClientAccount[]> {
  const { tasks } = await cu('GET', `/list/${accountsConfig.listId}/task?include_closed=true`);
  return (tasks as any[]).map(mapAccount);
}

export async function findAccountByEmail(email: string): Promise<ClientAccount | null> {
  const accounts = await listAccounts();
  const normalized = email.trim().toLowerCase();
  return accounts.find((a) => a.email.toLowerCase() === normalized) ?? null;
}

// A client can be linked to more than one project — each is its own task
// row sharing the same email/passwordHash. Used to decide whether login
// needs a "which project?" step, and to validate a chosen project belongs
// to that email before issuing a session for it.
export async function findAccountsByEmail(email: string): Promise<ClientAccount[]> {
  const accounts = await listAccounts();
  const normalized = email.trim().toLowerCase();
  return accounts.filter((a) => a.email.toLowerCase() === normalized);
}

export async function setPasswordHash(taskId: string, passwordHash: string): Promise<void> {
  await cu('POST', `/task/${taskId}/field/${accountsConfig.fields.passwordHash}`, { value: passwordHash });
}

export async function deleteAccount(taskId: string): Promise<void> {
  await cu('DELETE', `/task/${taskId}`);
}

export async function createAccount(email: string, passwordHash: string, projectId: string, projectName: string): Promise<ClientAccount> {
  const task = await cu('POST', `/list/${accountsConfig.listId}/task`, {
    name: email,
    custom_fields: [
      { id: accountsConfig.fields.email, value: email },
      { id: accountsConfig.fields.passwordHash, value: passwordHash },
      { id: accountsConfig.fields.projectId, value: projectId },
      { id: accountsConfig.fields.projectName, value: projectName },
    ],
  });
  return mapAccount(task);
}
