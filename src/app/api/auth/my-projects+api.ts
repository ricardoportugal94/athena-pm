import { findAccountsByEmail } from '@/lib/accounts';
import { requireAuth } from '@/lib/session';
import { signToken } from '@/lib/session';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// GET: lists every project this client's email is linked to (so the app can
// decide whether to show a "switch project" option at all).
export async function GET(request: Request) {
  const session = requireAuth(request);
  if (session instanceof Response) return session;
  if (session.role !== 'client') return Response.json({ projects: [] });

  const accounts = await findAccountsByEmail(session.email);
  return Response.json({ projects: accounts.map((a) => ({ id: a.projectId, name: a.projectName })) });
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
  const match = accounts.find((a) => a.projectId === projectId);
  if (!match) return Response.json({ error: 'That project is not linked to this account.' }, { status: 403 });

  const newSession = { role: 'client' as const, email: match.email, projectId: match.projectId, projectName: match.projectName };
  const token = signToken(newSession, THIRTY_DAYS_MS);
  return Response.json({ token, session: newSession });
}
