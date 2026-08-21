import { createAccount, findAccountByEmail } from '@/lib/accounts';
import { isEmailBlocked } from '@/lib/blocklist';
import { getProject } from '@/lib/clickup';
import { signToken, verifyToken } from '@/lib/session';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Body: { pendingToken, projectId }. Finishes a first-time Google client
// sign-in: `pendingToken` is the short-lived token /api/auth/google issued
// for this Google-verified email once it turned out no account existed yet.
// No password — Google already proved who they are.
export async function POST(request: Request) {
  const { pendingToken, projectId } = await request.json();
  if (!pendingToken || !projectId) return Response.json({ error: 'pendingToken and projectId are required.' }, { status: 400 });

  const pending = verifyToken<{ role: string; email: string; name: string }>(pendingToken);
  if (!pending || pending.role !== 'pending-google-client') {
    return Response.json({ error: 'Your Google sign-in expired — please try again.' }, { status: 401 });
  }

  if (await isEmailBlocked(pending.email)) {
    return Response.json({ error: 'This email has been blocked. Contact the Portugal Production team.' }, { status: 403 });
  }

  const existing = await findAccountByEmail(pending.email);
  if (existing) return Response.json({ error: 'An account with this email already exists.' }, { status: 409 });

  const project = await getProject(projectId).catch(() => null);
  if (!project) return Response.json({ error: 'Invalid project.' }, { status: 400 });

  const account = await createAccount(pending.email, '', project.id, project.name);

  const session = { role: 'client' as const, email: account.email, projectId: account.projectId, projectName: account.projectName };
  const token = signToken(session, THIRTY_DAYS_MS);
  return Response.json({ token, session }, { status: 201 });
}
