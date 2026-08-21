import crypto from 'node:crypto';

import { createAccount, findAccountsByEmail, listAccounts } from '@/lib/accounts';
import { getProject } from '@/lib/clickup';
import { hashPassword } from '@/lib/password';
import { requireAdmin } from '@/lib/session';

// Admin-only. Never returns passwordHash.
export async function GET(request: Request) {
  const session = requireAdmin(request);
  if (session instanceof Response) return session;

  const accounts = await listAccounts();
  return Response.json(
    accounts.map((a) => ({ taskId: a.taskId, email: a.email, projectId: a.projectId, projectName: a.projectName, status: a.status }))
  );
}

// Body: { email, projectId }. Links a client to a project — same email
// already registered links a new project under that same identity (sharing
// its existing password); a brand-new email gets a fresh temporary password,
// returned once, for the team to pass along (same pattern as reset-password).
export async function POST(request: Request) {
  const session = requireAdmin(request);
  if (session instanceof Response) return session;

  const { email, projectId } = await request.json();
  if (!email || !projectId) return Response.json({ error: 'Email and project are required.' }, { status: 400 });

  const project = await getProject(projectId).catch(() => null);
  if (!project) return Response.json({ error: 'Invalid project.' }, { status: 400 });

  const normalized = String(email).trim().toLowerCase();
  const existing = await findAccountsByEmail(normalized);
  if (existing.some((a) => a.projectId === project.id)) {
    return Response.json({ error: 'This client is already linked to this project.' }, { status: 409 });
  }

  let tempPassword: string | null = null;
  let passwordHash = existing[0]?.passwordHash ?? '';
  if (!existing.length) {
    tempPassword = crypto.randomBytes(6).toString('base64url');
    passwordHash = hashPassword(tempPassword);
  }

  await createAccount(normalized, passwordHash, project.id, project.name);
  return Response.json({ ok: true, tempPassword }, { status: 201 });
}
