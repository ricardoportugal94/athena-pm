import crypto from 'node:crypto';

import { setPasswordHash } from '@/lib/accounts';
import { hashPassword } from '@/lib/password';
import { requireAdmin } from '@/lib/session';

// Admin-only. Generates a random temporary password, stores its hash, and
// returns the plain value once — the admin passes it to the client directly
// (WhatsApp/email), there is no self-service email reset flow.
export async function POST(request: Request, { taskId }: { taskId: string }) {
  const session = requireAdmin(request);
  if (session instanceof Response) return session;

  const tempPassword = crypto.randomBytes(6).toString('base64url');
  await setPasswordHash(taskId, hashPassword(tempPassword));

  return Response.json({ tempPassword });
}
