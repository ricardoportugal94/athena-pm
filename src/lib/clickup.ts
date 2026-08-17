// Server-only ClickUp REST client. Import this ONLY from `+api.ts` route files —
// it reads process.env.CLICKUP_API_TOKEN, which must never reach the client bundle.
// (Expo Router keeps unprefixed env vars out of the client bundle automatically,
// but importing this file from client code would still be a mistake to avoid.)

import clickupConfig from '@/data/clickup-config.json';
import taskTemplate from '@/data/tasks-template.json';

const API = 'https://api.clickup.com/api/v2';
const WORKSPACE_ID = '9005188518';

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

export type SdpTask = {
  clickupId: string;
  seedId: string | null;
  name: string;
  order: number;
  process: 'S' | 'D' | 'P' | null;
  phase: 1 | 2 | 3 | null;
  category: string | null;
  status: 'not_started' | 'in_progress' | 'done';
  assignees: { id: number; username: string }[];
  applicable: boolean;
  blocked: boolean;
  blockerReason: string | null;
  blockerOwner: string | null;
  blockerExpectedDate: string | null;
  notes: string | null;
  url: string;
};

const PROCESS_BY_LABEL: Record<string, 'S' | 'D' | 'P'> = { Sourcing: 'S', Development: 'D', Production: 'P' };
const PHASE_BY_LABEL: Record<string, 1 | 2 | 3> = { '1. Prepare': 1, '2. Test': 2, '3. Make': 3 };
const STATUS_BY_LABEL: Record<string, SdpTask['status']> = {
  [clickupConfig.statuses.todo]: 'not_started',
  [clickupConfig.statuses.inProgress]: 'in_progress',
  [clickupConfig.statuses.done]: 'done',
};

function fieldValue(task: any, fieldId: string) {
  const f = (task.custom_fields ?? []).find((cf: any) => cf.id === fieldId);
  return f?.value ?? null;
}

function fieldBoolean(task: any, fieldId: string) {
  const v = fieldValue(task, fieldId);
  return v === true || v === 'true';
}

// ClickUp quirk: writing a drop_down custom field takes the option's UUID, but
// reading one back returns the option's orderindex (an integer), not the UUID.
// `options` here is built with Object.fromEntries in creation order, so its key
// order matches the option orderindex.
function dropdownLabel(task: any, fieldId: string, options: Record<string, string>) {
  const value = fieldValue(task, fieldId); // orderindex, or null if unset
  if (value === null || value === undefined) return null;
  return Object.keys(options)[value] ?? null;
}

function mapTask(task: any): SdpTask {
  const seedIdMatch = /Seed ID:\s*(T\d+)/i.exec(task.text_content ?? task.description ?? '');
  const processLabel = dropdownLabel(task, clickupConfig.fields.process.id, clickupConfig.fields.process.options);
  const phaseLabel = dropdownLabel(task, clickupConfig.fields.phase.id, clickupConfig.fields.phase.options);
  const categoryLabel = dropdownLabel(task, clickupConfig.fields.category.id, clickupConfig.fields.category.options);

  return {
    clickupId: task.id,
    seedId: seedIdMatch?.[1] ?? null,
    name: task.name,
    order: Number(task.orderindex ?? 0),
    process: processLabel ? PROCESS_BY_LABEL[processLabel] : null,
    phase: phaseLabel ? PHASE_BY_LABEL[phaseLabel] : null,
    category: categoryLabel,
    status: STATUS_BY_LABEL[task.status?.status] ?? 'not_started',
    assignees: (task.assignees ?? []).map((a: any) => ({ id: a.id, username: a.username })),
    applicable: fieldBoolean(task, clickupConfig.fields.applicable.id),
    blocked: fieldBoolean(task, clickupConfig.fields.blocked.id),
    blockerReason: fieldValue(task, clickupConfig.fields.blockerReason.id),
    blockerOwner: fieldValue(task, clickupConfig.fields.blockerOwner.id),
    blockerExpectedDate: fieldValue(task, clickupConfig.fields.blockerExpectedDate.id),
    notes: fieldValue(task, clickupConfig.fields.notes.id),
    url: task.url,
  };
}

export async function listProjects() {
  const { lists } = await cu('GET', `/folder/${clickupConfig.folderId}/list`);
  return (lists as any[]).map((l) => ({ id: l.id, name: l.name, url: `https://app.clickup.com/${WORKSPACE_ID}/v/l/li/${l.id}` }));
}

// Used by the signup search box. Only ever called with a non-trivial query
// (enforced by the route) — never returns the full list on an empty query, to
// avoid casually exposing the whole client roster.
export async function searchProjectsByName(query: string, limit = 5) {
  const all = await listProjects();
  const q = query.trim().toLowerCase();
  return all.filter((p) => p.name.toLowerCase().includes(q)).slice(0, limit);
}

export async function listProjectsWithStats() {
  const projects = await listProjects();
  return Promise.all(
    projects.map(async (p) => {
      const tasks = await getProjectTasks(p.id);
      const applicableTasks = tasks.filter((t) => t.applicable);
      const done = applicableTasks.filter((t) => t.status === 'done').length;
      const total = applicableTasks.length;
      const blocked = applicableTasks.filter((t) => t.blocked).length;
      return { ...p, done, total, percent: total ? Math.round((done / total) * 100) : 0, blocked };
    })
  );
}

export async function getProject(listId: string) {
  const list = await cu('GET', `/list/${listId}`);
  return { id: list.id, name: list.name, url: `https://app.clickup.com/${WORKSPACE_ID}/v/l/li/${list.id}` };
}

export async function renameProject(listId: string, name: string) {
  const list = await cu('PUT', `/list/${listId}`, { name });
  return { id: list.id, name: list.name, url: `https://app.clickup.com/${WORKSPACE_ID}/v/l/li/${list.id}` };
}

export async function deleteProject(listId: string) {
  await cu('DELETE', `/list/${listId}`);
}

export async function getProjectTasks(listId: string): Promise<SdpTask[]> {
  const { tasks } = await cu('GET', `/list/${listId}/task?include_closed=true`);
  return (tasks as any[]).map(mapTask).sort((a, b) => a.order - b.order);
}

// Shared by the client-link route and the logged-in "client" role: only
// fields safe to show outside the team — no notes, no blocker owner/reason.
export function toSafeClientView(tasks: SdpTask[]) {
  return tasks
    .filter((t) => t.applicable)
    .map((t) => ({
      seedId: t.seedId,
      name: t.name,
      order: t.order,
      process: t.process,
      phase: t.phase,
      category: t.category,
      status: t.status,
      blocked: t.blocked,
    }));
}

const PROCESS_LABEL: Record<string, string> = { S: 'Sourcing', D: 'Development', P: 'Production' };
const PHASE_LABEL: Record<number, string> = { 1: '1. Prepare', 2: '2. Test', 3: '3. Make' };

export async function createProject(name: string) {
  const list = await cu('POST', `/folder/${clickupConfig.folderId}/list`, { name });

  for (const t of [...taskTemplate.tasks].sort((a, b) => a.order - b.order)) {
    const custom_fields = [
      { id: clickupConfig.fields.process.id, value: (clickupConfig.fields.process.options as any)[PROCESS_LABEL[t.process]] },
      { id: clickupConfig.fields.phase.id, value: (clickupConfig.fields.phase.options as any)[PHASE_LABEL[t.phase]] },
      { id: clickupConfig.fields.category.id, value: (clickupConfig.fields.category.options as any)[t.category] },
      { id: clickupConfig.fields.applicable.id, value: true },
      { id: clickupConfig.fields.blocked.id, value: false },
    ];
    await cu('POST', `/list/${list.id}/task`, {
      name: t.name,
      status: clickupConfig.statuses.todo,
      markdown_description: `**Seed ID:** ${t.id}`,
      custom_fields,
    });
  }

  return { id: list.id, name: list.name, url: `https://app.clickup.com/${WORKSPACE_ID}/v/l/li/${list.id}` };
}

export type TaskUpdate = {
  status?: SdpTask['status'];
  assigneeId?: number | null;
  blocked?: boolean;
  blockerReason?: string;
  blockerOwner?: string;
  blockerExpectedDate?: string; // YYYY-MM-DD
  notes?: string;
};

export class TaskUpdateError extends Error {}

export async function updateTask(taskId: string, update: TaskUpdate) {
  const needsCurrent = update.status === 'done' || update.assigneeId !== undefined;
  const current = needsCurrent ? await cu('GET', `/task/${taskId}`) : null;

  // Business rule (plan §"Assignee obrigatório"): a task cannot be marked done
  // without an assignee. Checked here, server-side, not just in the UI.
  if (update.status === 'done') {
    const willHaveAssignee = update.assigneeId != null || (current.assignees ?? []).length > 0;
    if (!willHaveAssignee) {
      throw new TaskUpdateError('Uma tarefa não pode ser marcada como concluída sem um responsável atribuído.');
    }
  }

  if (update.status) {
    const label = { not_started: clickupConfig.statuses.todo, in_progress: clickupConfig.statuses.inProgress, done: clickupConfig.statuses.done }[update.status];
    await cu('PUT', `/task/${taskId}`, { status: label });
  }
  if (update.assigneeId !== undefined) {
    // One owner per task: replace whatever assignees are already there instead
    // of just adding — otherwise re-assigning piles up multiple assignees and
    // the UI can't tell who the "real" owner is anymore.
    const currentIds: number[] = (current.assignees ?? []).map((a: any) => a.id);
    const rem = currentIds.filter((currentId) => currentId !== update.assigneeId);
    const add = update.assigneeId != null && !currentIds.includes(update.assigneeId) ? [update.assigneeId] : [];
    await cu('PUT', `/task/${taskId}`, { assignees: { add, rem } });
  }
  if (update.blocked !== undefined) {
    await cu('POST', `/task/${taskId}/field/${clickupConfig.fields.blocked.id}`, { value: update.blocked });
  }
  if (update.blockerReason !== undefined) {
    await cu('POST', `/task/${taskId}/field/${clickupConfig.fields.blockerReason.id}`, { value: update.blockerReason });
  }
  if (update.blockerOwner !== undefined) {
    await cu('POST', `/task/${taskId}/field/${clickupConfig.fields.blockerOwner.id}`, { value: update.blockerOwner });
  }
  if (update.blockerExpectedDate !== undefined) {
    await cu('POST', `/task/${taskId}/field/${clickupConfig.fields.blockerExpectedDate.id}`, { value: update.blockerExpectedDate });
  }
  if (update.notes !== undefined) {
    await cu('POST', `/task/${taskId}/field/${clickupConfig.fields.notes.id}`, { value: update.notes });
  }

  return true;
}

export type TeamMember = { id: number; username: string; email: string };

// Workspace members hidden from Athena's assignee picker without touching
// their actual ClickUp membership (they may still be needed elsewhere).
const HIDDEN_ASSIGNEE_USERNAMES = ['yusuke matsumoto'];

export async function listTeamMembers(): Promise<TeamMember[]> {
  const { teams } = await cu('GET', '/team');
  const team = (teams as any[]).find((t) => t.id === WORKSPACE_ID);
  return (team?.members ?? [])
    .map((m: any) => ({ id: m.user.id, username: m.user.username, email: m.user.email }))
    .filter((m: TeamMember) => !HIDDEN_ASSIGNEE_USERNAMES.includes(m.username?.toLowerCase()));
}
