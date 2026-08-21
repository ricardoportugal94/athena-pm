import { createAccount, findAccountsByEmail } from '@/lib/accounts';
import { getProject } from '@/lib/clickup';
import { requireAuth, signToken } from '@/lib/session';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Body: { projectId }. Lets an already-signed-in client link ANOTHER
// existing project to their own account — same self-service "search and
// join" as signup, just without re-entering a password since they're
// already proven to be that email. Returns a session for the new project,
// same as switch-project, so adding one also opens it right away.
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
  await createAccount(session.email, passwordHash, project.id, project.name);

  const newSession = { role: 'client' as const, email: session.email, projectId: project.id, projectName: project.name };
  const token = signToken(newSession, THIRTY_DAYS_MS);
  return Response.json({ token, session: newSession }, { status: 201 });
}
