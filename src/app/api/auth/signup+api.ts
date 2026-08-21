import { createAccount, findAccountByEmail, findAccountsByEmail } from '@/lib/accounts';
import { isEmailBlocked } from '@/lib/blocklist';
import { getProject } from '@/lib/clickup';
import { hashPassword, verifyPassword } from '@/lib/password';
import { signToken } from '@/lib/session';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Body: { email, password, projectId }. Projects are only ever created by the
// Portugal Production team (see /team) — a client can only join one that
// already exists, picked from the search box.
//
// An email that already has an account can join ANOTHER project too — same
// password required (proves it's really them), which then links the new
// project under the same identity instead of a separate account.
export async function POST(request: Request) {
  const { email, password, projectId } = await request.json();
  if (!email || !password || !projectId) {
    return Response.json({ error: 'Email, password, and a project are required.' }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }
  if (await isEmailBlocked(email)) {
    return Response.json({ error: 'This email has been blocked. Contact the Portugal Production team.' }, { status: 403 });
  }

  const project = await getProject(projectId).catch(() => null);
  if (!project) return Response.json({ error: 'Invalid project.' }, { status: 400 });

  const existingAccount = await findAccountByEmail(email);
  if (existingAccount) {
    if (!verifyPassword(password, existingAccount.passwordHash)) {
      return Response.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }
    const accounts = await findAccountsByEmail(email);
    const already = accounts.find((a) => a.projectId === project.id);
    const account = already ?? (await createAccount(existingAccount.email, existingAccount.passwordHash, project.id, project.name));
    const session = { role: 'client' as const, email: account.email, projectId: account.projectId, projectName: account.projectName };
    const token = signToken(session, THIRTY_DAYS_MS);
    return Response.json({ token, session }, { status: already ? 200 : 201 });
  }

  const account = await createAccount(email.trim().toLowerCase(), hashPassword(password), project.id, project.name);

  const session = { role: 'client' as const, email: account.email, projectId: account.projectId, projectName: account.projectName };
  const token = signToken(session, THIRTY_DAYS_MS);
  return Response.json({ token, session }, { status: 201 });
}
