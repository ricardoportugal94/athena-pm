// Server-only. Free-text notes per project: one general note plus one per
// phase (1/2/3), stored as tasks in the "Athena — Project Notes" list (a
// sibling of the SDP Projects folder, so it never shows up in listProjects()).
// Each record = one task, told apart by its `scope` custom field.

import notesConfig from '@/data/project-notes-config.json';

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

export type NoteScope = 'general' | 'phase1' | 'phase2' | 'phase3';
export type ProjectNotes = Record<NoteScope, string>;

const SCOPES: NoteScope[] = ['general', 'phase1', 'phase2', 'phase3'];

function fieldValue(task: any, fieldId: string): string | null {
  return task.custom_fields?.find((f: any) => f.id === fieldId)?.value ?? null;
}

async function listRecords(projectId: string) {
  const { tasks } = await cu('GET', `/list/${notesConfig.listId}/task?include_closed=true`);
  return (tasks as any[]).filter((t) => fieldValue(t, notesConfig.fields.projectId) === projectId);
}

export async function getNotes(projectId: string): Promise<ProjectNotes> {
  const records = await listRecords(projectId);
  const notes: ProjectNotes = { general: '', phase1: '', phase2: '', phase3: '' };
  for (const record of records) {
    const scope = fieldValue(record, notesConfig.fields.scope) as NoteScope | null;
    if (scope && SCOPES.includes(scope)) notes[scope] = fieldValue(record, notesConfig.fields.body) ?? '';
  }
  return notes;
}

export async function setNote(projectId: string, scope: NoteScope, body: string): Promise<void> {
  const records = await listRecords(projectId);
  const existing = records.find((r) => fieldValue(r, notesConfig.fields.scope) === scope);

  if (existing) {
    await cu('POST', `/task/${existing.id}/field/${notesConfig.fields.body}`, { value: body });
    return;
  }

  await cu('POST', `/list/${notesConfig.listId}/task`, {
    name: `${projectId} — ${scope}`,
    custom_fields: [
      { id: notesConfig.fields.projectId, value: projectId },
      { id: notesConfig.fields.scope, value: scope },
      { id: notesConfig.fields.body, value: body },
    ],
  });
}
