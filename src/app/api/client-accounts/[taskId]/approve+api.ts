import { setStatus } from '@/lib/accounts';
import { requireAdmin } from '@/lib/session';

// Admin-only. Approves a client's self-service "add project" request,
// flipping it from "pending" to "active" so it starts showing up in that
// client's project switcher/login. Rejecting a request is just deleting the
// row (the existing DELETE /api/client-accounts/[taskId] route already does
// that, pending or not).
export async function POST(request: Request, { taskId }: { taskId: string }) {
  const session = requireAdmin(request);
  if (session instanceof Response) return session;

  await setStatus(taskId, 'active');
  return Response.json({ ok: true });
}
