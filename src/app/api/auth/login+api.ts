import { findAccountByEmail, findAccountsByEmail } from '@/lib/accounts';
import { verifyPassword } from '@/lib/password';
import { signToken } from '@/lib/session';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const FIFTEEN_MIN_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const { email, password } = await request.json();
  if (!email || !password) return Response.json({ error: 'Email and password are required.' }, { status: 400 });

  const account = await findAccountByEmail(email);
  if (!account || !verifyPassword(password, account.passwordHash)) {
    return Response.json({ error: 'Incorrect email or password.' }, { status: 401 });
  }

  // Same email can be linked to more than one project — let them pick
  // instead of silently landing on whichever one happened to come first.
  const accounts = await findAccountsByEmail(account.email);
  if (accounts.length > 1) {
    const pendingToken = signToken({ role: 'pending-project-pick', email: account.email }, FIFTEEN_MIN_MS);
    return Response.json({ needsProjectPick: true, pendingToken, projects: accounts.map((a) => ({ id: a.projectId, name: a.projectName })) });
  }

  const session = { role: 'client' as const, email: account.email, projectId: account.projectId, projectName: account.projectName };
  const token = signToken(session, THIRTY_DAYS_MS);
  return Response.json({ token, session });
}
