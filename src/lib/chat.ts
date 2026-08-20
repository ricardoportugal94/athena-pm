// Server-only. One internal chat thread per project, between one assigned
// team member (the "responsible") and the client. Stored as tasks in the
// "Athena — Chat" list (a sibling of the SDP Projects folder, so it never
// shows up in listProjects()). One list holds two kinds of records, told
// apart by `recordType`: a single "settings" record per project (who's
// responsible) and many "message" records (the log itself, ordered by each
// task's native `date_created`).

import chatConfig from '@/data/chat-config.json';
import { draftAssistantReply } from '@/lib/ai-assistant';
import { ASSISTANT_NAME } from '@/lib/assistant-name';
import { getProjectTasks } from '@/lib/clickup';
import { getNotes } from '@/lib/project-notes';

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
export type ChatAttachment = { url: string; name: string };
export type ChatMessage = { senderRole: 'team' | 'client'; senderName: string; body: string; sentAt: string; attachment: ChatAttachment | null };

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
    .map((r) => {
      const attachmentUrl = fieldValue(r, chatConfig.fields.attachmentUrl);
      const attachmentName = fieldValue(r, chatConfig.fields.attachmentName);
      return {
        senderRole: (fieldValue(r, chatConfig.fields.senderRole) as 'team' | 'client') ?? 'team',
        senderName: fieldValue(r, chatConfig.fields.senderName) ?? '',
        body: fieldValue(r, chatConfig.fields.body) ?? '',
        sentAt: new Date(Number(r.date_created)).toISOString(),
        attachment: attachmentUrl && attachmentName ? { url: attachmentUrl, name: attachmentName } : null,
      };
    })
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

// Returns the new message's task id, so a caller can optionally attach a
// file to it right after (see attachFileToMessage).
export async function sendMessage(projectId: string, senderRole: 'team' | 'client', senderName: string, body: string): Promise<string> {
  const task = await cu('POST', `/list/${chatConfig.listId}/task`, {
    name: `${projectId} — message`,
    custom_fields: [
      { id: chatConfig.fields.projectId, value: projectId },
      { id: chatConfig.fields.recordType, value: 'message' },
      { id: chatConfig.fields.senderRole, value: senderRole },
      { id: chatConfig.fields.senderName, value: senderName },
      { id: chatConfig.fields.body, value: body },
    ],
  });
  return task.id;
}

// Team members share the same thread as the client, so MIA must NOT jump in
// on every team message (most are addressed to the client, not to her) —
// only when a team member starts the message with her name, e.g. "MIA,
// what's the sample lead time?" or "@MIA ...". Returns the question with the
// mention stripped, or null if the message isn't addressed to her.
export function extractMiaMention(text: string): string | null {
  const match = /^@?mia\b[\s,:.\-]*/i.exec(text.trim());
  if (!match) return null;
  const rest = text.trim().slice(match[0].length).trim();
  return rest || text.trim();
}

// Best-effort: an AI first-response to a client message, using the real
// project status as context. Never throws — if Gemini is down or the key is
// missing, the client's own message still goes through untouched, the team
// just doesn't get an AI-drafted reply this time.
export async function respondAsAssistant(projectId: string, projectName: string, clientMessageBody: string): Promise<void> {
  try {
    const [tasks, notes, priorMessages] = await Promise.all([getProjectTasks(projectId), getNotes(projectId), listMessages(projectId)]);
    const reply = await draftAssistantReply(projectName, tasks, notes, priorMessages, clientMessageBody);
    await sendMessage(projectId, 'team', ASSISTANT_NAME, reply);
  } catch (err) {
    console.error('AI assistant reply failed:', err);
  }
}

// Uploads the file to ClickUp as a real task attachment (so it's stored
// properly, not just a link), then mirrors its URL/name onto plain custom
// fields — list-tasks responses don't include attachments, so this is what
// `listMessages` actually reads from.
export async function attachFileToMessage(taskId: string, file: Blob, filename: string): Promise<ChatAttachment> {
  const form = new FormData();
  form.append('attachment', file, filename);
  const res = await fetch(`${API}/task/${taskId}/attachment`, {
    method: 'POST',
    headers: { Authorization: token() },
    body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`ClickUp attachment upload -> ${res.status}: ${JSON.stringify(json)}`);

  await cu('POST', `/task/${taskId}/field/${chatConfig.fields.attachmentUrl}`, { value: json.url });
  await cu('POST', `/task/${taskId}/field/${chatConfig.fields.attachmentName}`, { value: filename });
  return { url: json.url, name: filename };
}
