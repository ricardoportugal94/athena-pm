import { createAccount, findAccountsByEmail } from '@/lib/accounts';
import { getProject } from '@/lib/clickup';
import { requireAuth } from '@/lib/session';

// Body: { projectId }. Lets an already-signed-in client request ANOTHER
// existing project be linked to their own account — same self-service
// "search and join" as signup, without re-entering a password since
// they're already proven to be that email. Unlike switch-project, this
// does NOT grant access right away: it creates a "pending" row an admin
// has to approve first, so the team keeps control over which projects a
// client can actually open.
export async function POST(request: Request) {
  const session = requireAuth(request);
  if (session instanceof Response) return session;
  if (session.role !== 'client') return Response.json({ error: 'Client access only.' }, { status: 403 });

  const { projectId } = await request.json();
  if (!projectId) return Response.json({ error: 'projectId is required.' }, { status: 400 });

  const project = await getProject(projectId).catch(() => null);
  if (!project) return Response.json({ error: 'Invalid project.' }, { status: 400 });

  const accounts = await findAccountsByEmail(session.email);
  if (accounts.some((a) => a.projectId === project.id)) {
    return Response.json({ error: 'This project is already linked to your account.' }, { status: 409 });
  }

  const passwordHash = accounts[0]?.passwordHash ?? '';
  await createAccount(session.email, passwordHash, project.id, project.name, 'pending');

  return Response.json({ pending: true, projectName: project.name }, { status: 201 });
}
