// Client-side fetch helpers for talking to our own /api routes. Safe to import
// from screens — never touches CLICKUP_API_TOKEN or the Google Client Secret,
// only calls our own server.

import { Platform } from 'react-native';

export type TeamMember = { id: number; username: string };
export type ProjectSummary = { id: string; name: string };
export type ProjectWithStats = ProjectSummary & { done: number; total: number; percent: number; blocked: number; url: string };
export type AuthResult = { token: string; session: any };

// Native builds have no "same origin" to call relative paths against — they
// need the deployed server's absolute URL. Web keeps relative paths so local
// `expo start --web` dev keeps hitting its own dev server.
const API_BASE_URL = Platform.OS === 'web' ? '' : 'https://72-62-237-99.sslip.io';

async function request(path: string, opts: RequestInit & { token?: string | null } = {}) {
  const { token, headers, ...rest } = opts;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
  return json;
}

export const api = {
  teamMembers: (token: string): Promise<TeamMember[]> => request('/api/team-members', { token }),

  googleLogin: (code: string, redirectUri: string, codeVerifier?: string): Promise<AuthResult | { needsProject: true; pendingToken: string }> =>
    request('/api/auth/google', { method: 'POST', body: JSON.stringify({ code, redirectUri, codeVerifier }) }),

  completeGoogleSignup: (pendingToken: string, projectId: string) =>
    request('/api/auth/google-complete', { method: 'POST', body: JSON.stringify({ pendingToken, projectId }) }),

  signup: (email: string, password: string, projectId: string) =>
    request('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, projectId }) }),

  login: (email: string, password: string): Promise<AuthResult> =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  myProjects: (token: string): Promise<{ projects: ProjectWithStats[]; pending: ProjectSummary[] }> =>
    request('/api/auth/my-projects', { token }),

  switchProject: (token: string, projectId: string): Promise<AuthResult> =>
    request('/api/auth/my-projects', { method: 'POST', token, body: JSON.stringify({ projectId }) }),

  // Requests another project be linked to the caller's own client account —
  // stays pending until an admin approves it, so this never returns a
  // session to sign into right away.
  linkProject: (token: string, projectId: string): Promise<{ pending: true; projectName: string }> =>
    request('/api/auth/link-project', { method: 'POST', token, body: JSON.stringify({ projectId }) }),

  searchProjects: (query: string): Promise<ProjectSummary[]> =>
    request(`/api/public-projects-search?q=${encodeURIComponent(query)}`),

  listProjects: (token: string): Promise<ProjectWithStats[]> => request('/api/projects', { token }),

  createProject: (token: string, name: string) =>
    request('/api/projects', { method: 'POST', token, body: JSON.stringify({ name }) }),

  renameProject: (token: string, projectId: string, name: string) =>
    request(`/api/projects/${projectId}`, { method: 'PATCH', token, body: JSON.stringify({ name }) }),

  deleteProject: (token: string, projectId: string) => request(`/api/projects/${projectId}`, { method: 'DELETE', token }),

  listClientAccounts: (
    token: string
  ): Promise<{ taskId: string; email: string; projectId: string; projectName: string; status: 'active' | 'pending' }[]> =>
    request('/api/client-accounts', { token }),

  addClientAccount: (token: string, email: string, projectId: string): Promise<{ ok: true; tempPassword: string | null }> =>
    request('/api/client-accounts', { method: 'POST', token, body: JSON.stringify({ email, projectId }) }),

  resetClientPassword: (token: string, taskId: string): Promise<{ tempPassword: string }> =>
    request(`/api/client-accounts/${taskId}/reset-password`, { method: 'POST', token }),

  approveClientAccount: (token: string, taskId: string) => request(`/api/client-accounts/${taskId}/approve`, { method: 'POST', token }),

  deleteClientAccount: (token: string, taskId: string) => request(`/api/client-accounts/${taskId}`, { method: 'DELETE', token }),

  getProjectTasks: (token: string, projectId: string) => request(`/api/projects/${projectId}/tasks`, { token }),

  updateTask: (token: string, projectId: string, taskId: string, update: Record<string, unknown>) =>
    request(`/api/projects/${projectId}/tasks`, { method: 'PATCH', token, body: JSON.stringify({ taskId, ...update }) }),

  createClientLink: (token: string, listId: string) =>
    request('/api/create-client-link', { method: 'POST', token, body: JSON.stringify({ listId }) }),

  getClientProject: (shareToken: string) => request(`/api/client-project/${shareToken}`),

  getMyProject: (token: string) => request('/api/my-project', { token }),

  getProjectNotes: (token: string | null, projectId: string): Promise<Record<'general' | 'phase1' | 'phase2' | 'phase3', string>> =>
    request(`/api/projects/${projectId}/notes`, { token }),

  updateProjectNote: (token: string, projectId: string, scope: string, body: string) =>
    request(`/api/projects/${projectId}/notes`, { method: 'PATCH', token, body: JSON.stringify({ scope, body }) }),

  getChat: (
    token: string | null,
    projectId: string,
    channel: 'manager' | 'mia'
  ): Promise<{ responsible: { id: number; name: string } | null; messages: { senderRole: 'team' | 'client'; senderName: string; body: string; sentAt: string }[] }> =>
    request(`/api/projects/${projectId}/chat?channel=${channel}`, { token }),

  sendChatMessage: (token: string | null, projectId: string, channel: 'manager' | 'mia', text: string) =>
    request(`/api/projects/${projectId}/chat`, { method: 'POST', token, body: JSON.stringify({ text, channel }) }),

  setChatResponsible: (token: string, projectId: string, memberId: number, memberName: string) =>
    request(`/api/projects/${projectId}/chat-responsible`, { method: 'PATCH', token, body: JSON.stringify({ memberId, memberName }) }),

  sendChatAttachment: async (token: string | null, projectId: string, channel: 'manager' | 'mia', formData: FormData) => {
    formData.append('channel', channel);
    const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/chat/attachment`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
    return json;
  },
};
