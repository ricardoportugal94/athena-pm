import { listAccounts } from '@/lib/accounts';
import { requireAdmin } from '@/lib/session';

// Admin-only. Never returns passwordHash.
export async function GET(request: Request) {
  const session = requireAdmin(request);
  if (session instanceof Response) return session;

  const accounts = await listAccounts();
  return Response.json(accounts.map((a) => ({ taskId: a.taskId, email: a.email, projectId: a.projectId, projectName: a.projectName, canChat: a.canChat })));
}
