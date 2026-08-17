import { deleteAccount } from '@/lib/accounts';
import { requireAdmin } from '@/lib/session';

// Admin-only. Deletes the client account, not the ClickUp project itself —
// the project and its tasks stay untouched.
export async function DELETE(request: Request, { taskId }: { taskId: string }) {
  const session = requireAdmin(request);
  if (session instanceof Response) return session;

  await deleteAccount(taskId);
  return Response.json({ ok: true });
}
