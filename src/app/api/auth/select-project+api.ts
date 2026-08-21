import { findAccountsByEmail } from '@/lib/accounts';
import { signToken, verifyToken } from '@/lib/session';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Body: { pendingToken, projectId }. Finishes the "which project?" step that
// login/google return when an email is linked to more than one project —
// the projectId is validated against that email's actual accounts, never
// trusted blindly from the client.
export async function POST(request: Request) {
  const { pendingToken, projectId } = await request.json();
  if (!pendingToken || !projectId) return Response.json({ error: 'pendingToken and projectId are required.' }, { status: 400 });

  const pending = verifyToken<{ role: string; email: string }>(pendingToken);
  if (!pending || pending.role !== 'pending-project-pick') {
    return Response.json({ error: 'That expired — please sign in again.' }, { status: 401 });
  }

  const accounts = await findAccountsByEmail(pending.email);
  const match = accounts.find((a) => a.projectId === projectId && a.status === 'active');
  if (!match) return Response.json({ error: 'That project is not linked to this account.' }, { status: 403 });

  const session = { role: 'client' as const, email: match.email, projectId: match.projectId, projectName: match.projectName };
  const token = signToken(session, THIRTY_DAYS_MS);
  return Response.json({ token, session });
}
