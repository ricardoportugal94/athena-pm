import { deleteAccount, listAccounts } from '@/lib/accounts';
import { requireAdmin } from '@/lib/session';

// Admin-only. Body: { email }. Deletes EVERY project-linked row for this
// client's email at once — the "Delete client" action on the grouped
// clients list, instead of removing one project at a time. Does not block
// the email; they could sign up again later.
export async function POST(request: Request) {
  const session = requireAdmin(request);
  if (session instanceof Response) return session;

  const { email } = await request.json();
  if (!email) return Response.json({ error: 'email is required.' }, { status: 400 });

  const normalized = String(email).trim().toLowerCase();
  const rows = (await listAccounts()).filter((a) => a.email.toLowerCase() === normalized);
  await Promise.all(rows.map((r) => deleteAccount(r.taskId)));
  return Response.json({ ok: true, removed: rows.length });
}
