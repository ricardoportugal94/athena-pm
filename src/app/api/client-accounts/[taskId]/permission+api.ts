import { setCanChat } from '@/lib/accounts';
import { requireAdmin } from '@/lib/session';

// Admin-only. Grants/revokes the client's permission to use the chat — the
// team decides who gets to interact with them through Athena.
export async function PATCH(request: Request, { taskId }: { taskId: string }) {
  const session = requireAdmin(request);
  if (session instanceof Response) return session;

  const { canChat } = await request.json();
  await setCanChat(taskId, !!canChat);
  return Response.json({ ok: true });
}
