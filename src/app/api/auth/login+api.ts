import { findAccountByEmail, findAccountsByEmail } from '@/lib/accounts';
import { verifyPassword } from '@/lib/password';
import { signToken } from '@/lib/session';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const { email, password } = await request.json();
  if (!email || !password) return Response.json({ error: 'Email and password are required.' }, { status: 400 });

  const account = await findAccountByEmail(email);
  if (!account || !verifyPassword(password, account.passwordHash)) {
    return Response.json({ error: 'Incorrect email or password.' }, { status: 401 });
  }

  // Same email can be linked to more than one active project — the session
  // just lands on one of them; the client picks which one to actually open
  // from the "My Projects" directory (which always loads first for a
  // client, same as the admin's own project list). Accounts still pending
  // admin approval (self-service "add project" requests) don't count.
  const accounts = (await findAccountsByEmail(account.email)).filter((a) => a.status === 'active');
  const target = accounts[0] ?? account;
  const session = { role: 'client' as const, email: target.email, projectId: target.projectId, projectName: target.projectName };
  const token = signToken(session, THIRTY_DAYS_MS);
  return Response.json({ token, session });
}
