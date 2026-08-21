import crypto from 'node:crypto';

import { listAccounts, setPasswordHash } from '@/lib/accounts';
import { hashPassword } from '@/lib/password';
import { requireAdmin } from '@/lib/session';

// Admin-only. Generates a random temporary password, stores its hash, and
// returns the plain value once — the admin passes it to the client directly
// (WhatsApp/email), there is no self-service email reset flow.
//
// A client linked to more than one project shares one password across all
// of them (each project is its own account row) — reset updates every row
// for that email, not just the one the admin clicked on.
export async function POST(request: Request, { taskId }: { taskId: string }) {
  const session = requireAdmin(request);
  if (session instanceof Response) return session;

  const accounts = await listAccounts();
  const target = accounts.find((a) => a.taskId === taskId);
  if (!target) return Response.json({ error: 'Client account not found.' }, { status: 404 });

  const tempPassword = crypto.randomBytes(6).toString('base64url');
  const hash = hashPassword(tempPassword);
  const siblings = accounts.filter((a) => a.email.toLowerCase() === target.email.toLowerCase());
  await Promise.all(siblings.map((a) => setPasswordHash(a.taskId, hash)));

  return Response.json({ tempPassword });
}
