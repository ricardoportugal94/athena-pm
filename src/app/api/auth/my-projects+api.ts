import { findAccountsByEmail } from '@/lib/accounts';
import { getProjectsWithStats } from '@/lib/clickup';
import { requireAuth, signToken } from '@/lib/session';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// GET: lists every project this client's email is linked to, with the same
// progress stats the admin's project list shows (for the "My Projects"
// directory page), split from any self-service requests still waiting on
// admin approval. Stats are only ever computed for this client's own
// projects — never the whole workspace.
export async function GET(request: Request) {
  const session = requireAuth(request);
  if (session instanceof Response) return session;
  if (session.role !== 'client') return Response.json({ projects: [], pending: [] });

  const accounts = await findAccountsByEmail(session.email);
  const activeIds = accounts.filter((a) => a.status === 'active').map((a) => a.projectId);
  const projects = await getProjectsWithStats(activeIds);
  return Response.json({
    projects,
    pending: accounts.filter((a) => a.status === 'pending').map((a) => ({ id: a.projectId, name: a.projectName })),
  });
}

// Body: { projectId }. Swaps the active session to a different project
// already linked to this same client email — validated, not trusted blindly.
export async function POST(request: Request) {
  const session = requireAuth(request);
  if (session instanceof Response) return session;
  if (session.role !== 'client') return Response.json({ error: 'Client access only.' }, { status: 403 });

  const { projectId } = await request.json();
  if (!projectId) return Response.json({ error: 'projectId is required.' }, { status: 400 });

  const accounts = await findAccountsByEmail(session.email);
  const match = accounts.find((a) => a.projectId === projectId && a.status === 'active');
  if (!match) return Response.json({ error: 'That project is not linked to this account, or is still pending approval.' }, { status: 403 });

  const newSession = { role: 'client' as const, email: match.email, projectId: match.projectId, projectName: match.projectName };
  const token = signToken(newSession, THIRTY_DAYS_MS);
  return Response.json({ token, session: newSession });
}
