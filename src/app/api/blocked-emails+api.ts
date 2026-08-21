import { listBlockedEmails } from '@/lib/blocklist';
import { requireAdmin } from '@/lib/session';

// Admin-only. Lists every permanently blocked client email.
export async function GET(request: Request) {
  const session = requireAdmin(request);
  if (session instanceof Response) return session;

  const emails = await listBlockedEmails();
  return Response.json({ emails });
}
