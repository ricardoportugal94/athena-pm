// Server-only. Two independent chat channels per project, stored as tasks in
// the "Athena — Chat" list (a sibling of the SDP Projects folder, so it never
// shows up in listProjects()):
//   - "manager": human-only support — client <-> the assigned team member
//     (the "responsible"). MIA never speaks here.
//   - "mia": MIA's own 24/7 line — every message posted here (by client or
//     team) gets an instant AI reply. No human assignment applies.
// One list holds three kinds of records, told apart by `recordType`: a
// single "settings" record per project (who's responsible + MIA's rolling
// memory notes) and many "message" records (the log itself, ordered by each
// task's native `date_created`). Messages created before this channel split
// have no `channel` value — they're treated as "manager" so nothing already
// said gets hidden.

import chatConfig from '@/data/chat-config.json';
import { draftAssistantReply } from '@/lib/ai-assistant';
import { ASSISTANT_NAME } from '@/lib/assistant-name';
import { getProjectTasks } from '@/lib/clickup';
import { getNotes } from '@/lib/project-notes';

export type Channel = 'manager' | 'mia';

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

function findSettings(records: any[]) {
  return records.find((r) => fieldValue(r, chatConfig.fields.recordType) === 'settings');
}

async function upsertSettingsField(projectId: string, fieldId: string, value: string): Promise<void> {
  const records = await listRecords(projectId);
  const existing = findSettings(records);
  if (existing) {
    await cu('POST', `/task/${existing.id}/field/${fieldId}`, { value });
    return;
  }
  await cu('POST', `/list/${chatConfig.listId}/task`, {
    name: `${projectId} — settings`,
    custom_fields: [
      { id: chatConfig.fields.projectId, value: projectId },
      { id: chatConfig.fields.recordType, value: 'settings' },
      { id: fieldId, value },
    ],
  });
}

export async function getResponsible(projectId: string): Promise<Responsible> {
  const records = await listRecords(projectId);
  const settings = findSettings(records);
  if (!settings) return null;
  const id = fieldValue(settings, chatConfig.fields.responsibleId);
  const name = fieldValue(settings, chatConfig.fields.responsibleName);
  return id && name ? { id: Number(id), name } : null;
}

export async function setResponsible(projectId: string, memberId: number, memberName: string): Promise<void> {
  const records = await listRecords(projectId);
  const existing = findSettings(records);
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

// MIA's rolling memory: a short running note of patterns/learnings from past
// conversations, refreshed daily (see mia-memory.ts) and fed back into her
// system prompt so her communication keeps improving over time.
export async function getMiaNotes(projectId: string): Promise<string> {
  const records = await listRecords(projectId);
  const settings = findSettings(records);
  return (settings && fieldValue(settings, chatConfig.fields.miaNotes)) || '';
}

export async function setMiaNotes(projectId: string, notes: string): Promise<void> {
  await upsertSettingsField(projectId, chatConfig.fields.miaNotes, notes);
}

export async function listMessages(projectId: string, channel: Channel): Promise<ChatMessage[]> {
  const records = await listRecords(projectId);
  return records
    .filter((r) => fieldValue(r, chatConfig.fields.recordType) === 'message')
    .filter((r) => (fieldValue(r, chatConfig.fields.channel) || 'manager') === channel)
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
export async function sendMessage(projectId: string, channel: Channel, senderRole: 'team' | 'client', senderName: string, body: string): Promise<string> {
  const task = await cu('POST', `/list/${chatConfig.listId}/task`, {
    name: `${projectId} — message`,
    custom_fields: [
      { id: chatConfig.fields.projectId, value: projectId },
      { id: chatConfig.fields.recordType, value: 'message' },
      { id: chatConfig.fields.channel, value: channel },
      { id: chatConfig.fields.senderRole, value: senderRole },
      { id: chatConfig.fields.senderName, value: senderName },
      { id: chatConfig.fields.body, value: body },
    ],
  });
  return task.id;
}

// Best-effort: MIA's reply on her own channel, using the real project status
// as context. Never throws — if Gemini is down or the key is missing, the
// sender's own message still goes through untouched, just without a reply.
export async function respondAsAssistant(projectId: string, projectName: string, messageBody: string): Promise<void> {
  try {
    const [tasks, notes, priorMessages, miaNotes] = await Promise.all([
      getProjectTasks(projectId),
      getNotes(projectId),
      listMessages(projectId, 'mia'),
      getMiaNotes(projectId),
    ]);
    const reply = await draftAssistantReply(projectName, tasks, notes, priorMessages, messageBody, miaNotes);
    await sendMessage(projectId, 'mia', 'team', ASSISTANT_NAME, reply);
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
