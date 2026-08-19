// Server-only. One internal chat thread per project, between one assigned
// team member (the "responsible") and the client. Stored as tasks in the
// "Athena — Chat" list (a sibling of the SDP Projects folder, so it never
// shows up in listProjects()). One list holds two kinds of records, told
// apart by `recordType`: a single "settings" record per project (who's
// responsible) and many "message" records (the log itself, ordered by each
// task's native `date_created`).

import chatConfig from '@/data/chat-config.json';

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

export type Responsible = { id: number; name: string } | null;
export type ChatMessage = { senderRole: 'team' | 'client'; senderName: string; body: string; sentAt: string };

function fieldValue(task: any, fieldId: string): string | null {
  return task.custom_fields?.find((f: any) => f.id === fieldId)?.value ?? null;
}

async function listRecords(projectId: string) {
  const { tasks } = await cu('GET', `/list/${chatConfig.listId}/task?include_closed=true`);
  return (tasks as any[]).filter((t) => fieldValue(t, chatConfig.fields.projectId) === projectId);
}

export async function getResponsible(projectId: string): Promise<Responsible> {
  const records = await listRecords(projectId);
  const settings = records.find((r) => fieldValue(r, chatConfig.fields.recordType) === 'settings');
  if (!settings) return null;
  const id = fieldValue(settings, chatConfig.fields.responsibleId);
  const name = fieldValue(settings, chatConfig.fields.responsibleName);
  return id && name ? { id: Number(id), name } : null;
}

export async function setResponsible(projectId: string, memberId: number, memberName: string): Promise<void> {
  const records = await listRecords(projectId);
  const existing = records.find((r) => fieldValue(r, chatConfig.fields.recordType) === 'settings');

  if (existing) {
    await cu('POST', `/task/${existing.id}/field/${chatConfig.fields.responsibleId}`, { value: String(memberId) });
    await cu('POST', `/task/${existing.id}/field/${chatConfig.fields.responsibleName}`, { value: memberName });
    return;
  }

  await cu('POST', `/list/${chatConfig.listId}/task`, {
    name: `${projectId} — settings`,
    custom_fields: [
      { id: chatConfig.fields.projectId, value: projectId },
      { id: chatConfig.fields.recordType, value: 'settings' },
      { id: chatConfig.fields.responsibleId, value: String(memberId) },
      { id: chatConfig.fields.responsibleName, value: memberName },
    ],
  });
}

export async function listMessages(projectId: string): Promise<ChatMessage[]> {
  const records = await listRecords(projectId);
  return records
    .filter((r) => fieldValue(r, chatConfig.fields.recordType) === 'message')
    .map((r) => ({
      senderRole: (fieldValue(r, chatConfig.fields.senderRole) as 'team' | 'client') ?? 'team',
      senderName: fieldValue(r, chatConfig.fields.senderName) ?? '',
      body: fieldValue(r, chatConfig.fields.body) ?? '',
      sentAt: new Date(Number(r.date_created)).toISOString(),
    }))
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

export async function sendMessage(projectId: string, senderRole: 'team' | 'client', senderName: string, body: string): Promise<void> {
  await cu('POST', `/list/${chatConfig.listId}/task`, {
    name: `${projectId} — message`,
    custom_fields: [
      { id: chatConfig.fields.projectId, value: projectId },
      { id: chatConfig.fields.recordType, value: 'message' },
      { id: chatConfig.fields.senderRole, value: senderRole },
      { id: chatConfig.fields.senderName, value: senderName },
      { id: chatConfig.fields.body, value: body },
    ],
  });
}
