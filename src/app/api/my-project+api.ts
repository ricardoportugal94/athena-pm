import { findAccountByEmail } from '@/lib/accounts';
import { getProject, getProjectTasks, toSafeClientView } from '@/lib/clickup';
import { requireAuth } from '@/lib/session';

// For logged-in "client" accounts: their own project, read-only, via their
// session (no token/link needed — they're already authenticated).
export async function GET(request: Request) {
  const session = requireAuth(request);
  if (session instanceof Response) return session;
  if (session.role !== 'client') return Response.json({ error: 'This route is client accounts only.' }, { status: 403 });

  const [project, tasks, account] = await Promise.all([
    getProject(session.projectId),
    getProjectTasks(session.projectId),
    findAccountByEmail(session.email),
  ]);
  return Response.json({ project: { name: project.name }, tasks: toSafeClientView(tasks), canChat: account?.canChat ?? false });
}
