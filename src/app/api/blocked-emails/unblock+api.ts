import { unblockEmail } from '@/lib/blocklist';
import { requireAdmin } from '@/lib/session';

// Admin-only. Body: { email }. Lets a previously blocked email sign up/log
// in again — does not restore any of their old project links, which were
// already removed when they were blocked.
export async function POST(request: Request) {
  const session = requireAdmin(request);
  if (session instanceof Response) return session;

  const { email } = await request.json();
  if (!email) return Response.json({ error: 'email is required.' }, { status: 400 });

  await unblockEmail(email);
  return Response.json({ ok: true });
}
