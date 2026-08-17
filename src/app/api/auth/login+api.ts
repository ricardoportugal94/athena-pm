import { findAccountByEmail } from '@/lib/accounts';
import { verifyPassword } from '@/lib/password';
import { signToken } from '@/lib/session';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const { email, password } = await request.json();
  if (!email || !password) return Response.json({ error: 'Email e password são obrigatórios.' }, { status: 400 });

  const account = await findAccountByEmail(email);
  if (!account || !verifyPassword(password, account.passwordHash)) {
    return Response.json({ error: 'Email ou password incorretos.' }, { status: 401 });
  }

  const session = { role: 'client' as const, email: account.email, projectId: account.projectId, projectName: account.projectName };
  const token = signToken(session, THIRTY_DAYS_MS);
  return Response.json({ token, session });
}
