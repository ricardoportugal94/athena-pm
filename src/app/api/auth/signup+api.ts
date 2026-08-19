import { createAccount, findAccountByEmail } from '@/lib/accounts';
import { getProject } from '@/lib/clickup';
import { hashPassword } from '@/lib/password';
import { signToken } from '@/lib/session';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Body: { email, password, projectId }. Projects are only ever created by the
// Portugal Production team (see /team) — a client can only join one that
// already exists, picked from the search box.
export async function POST(request: Request) {
  const { email, password, projectId } = await request.json();
  if (!email || !password || !projectId) {
    return Response.json({ error: 'Email, password, and a project are required.' }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  const existingAccount = await findAccountByEmail(email);
  if (existingAccount) return Response.json({ error: 'An account with this email already exists.' }, { status: 409 });

  const project = await getProject(projectId).catch(() => null);
  if (!project) return Response.json({ error: 'Invalid project.' }, { status: 400 });

  const account = await createAccount(email.trim().toLowerCase(), hashPassword(password), project.id, project.name);

  const session = { role: 'client' as const, email: account.email, projectId: account.projectId, projectName: account.projectName };
  const token = signToken(session, THIRTY_DAYS_MS);
  return Response.json({ token, session }, { status: 201 });
}
