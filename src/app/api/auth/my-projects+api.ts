import { findAccountsByEmail } from '@/lib/accounts';
import { requireAuth, signToken } from '@/lib/session';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// GET: lists every project this client's email is linked to (so the app can
// decide whether to show a "switch project" option at all), split from any
// self-service requests still waiting on admin approval.
export async function GET(request: Request) {
  const session = requireAuth(request);
  if (session instanceof Response) return session;
  if (session.role !== 'client') return Response.json({ projects: [], pending: [] });

  const accounts = await findAccountsByEmail(session.email);
  return Response.json({
    projects: accounts.filter((a) => a.status === 'active').map((a) => ({ id: a.projectId, name: a.projectName })),
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
