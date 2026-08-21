import { createAccount, findAccountsByEmail } from '@/lib/accounts';
import { getProject } from '@/lib/clickup';
import { verifyToken } from '@/lib/session';

// Body: { pendingToken, projectId }. Same self-service "request another
// project" as link-project+api.ts, but reachable from the login screen's
// multi-project picker — before a real session exists, all the client has
// is the short-lived pending-project-pick token login/google issued when
// their email matched more than one active project. Still just creates a
// "pending" row an admin has to approve; never grants access directly.
export async function POST(request: Request) {
  const { pendingToken, projectId } = await request.json();
  if (!pendingToken || !projectId) return Response.json({ error: 'pendingToken and projectId are required.' }, { status: 400 });

  const pending = verifyToken<{ role: string; email: string }>(pendingToken);
  if (!pending || pending.role !== 'pending-project-pick') {
    return Response.json({ error: 'That expired — please sign in again.' }, { status: 401 });
  }

  const project = await getProject(projectId).catch(() => null);
  if (!project) return Response.json({ error: 'Invalid project.' }, { status: 400 });

  const accounts = await findAccountsByEmail(pending.email);
  if (accounts.some((a) => a.projectId === project.id)) {
    return Response.json({ error: 'This project is already linked to your account.' }, { status: 409 });
  }

  const passwordHash = accounts[0]?.passwordHash ?? '';
  await createAccount(pending.email, passwordHash, project.id, project.name, 'pending');

  return Response.json({ pending: true, projectName: project.name }, { status: 201 });
}
