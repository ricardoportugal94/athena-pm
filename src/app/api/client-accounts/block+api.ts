import { deleteAccount, listAccounts } from '@/lib/accounts';
import { blockEmail } from '@/lib/blocklist';
import { requireAdmin } from '@/lib/session';

// Admin-only. Body: { email }. Removes every project-linked row for this
// email (same as delete-all) AND adds it to the permanent blocklist, so
// login/signup/Google all reject it from now on — unlike a plain delete,
// they can't just come back by signing up again.
export async function POST(request: Request) {
  const session = requireAdmin(request);
  if (session instanceof Response) return session;

  const { email } = await request.json();
  if (!email) return Response.json({ error: 'email is required.' }, { status: 400 });

  const normalized = String(email).trim().toLowerCase();
  const rows = (await listAccounts()).filter((a) => a.email.toLowerCase() === normalized);
  await Promise.all(rows.map((r) => deleteAccount(r.taskId)));
  await blockEmail(normalized);
  return Response.json({ ok: true, removed: rows.length });
}
