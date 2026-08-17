import { getProject, getProjectTasks, toSafeClientView } from '@/lib/clickup';
import { verifyToken } from '@/lib/session';

// Public route (no session). The token IS the access control — anyone with a
// valid link sees only that one project, read-only, with internal fields
// stripped out (blockerOwner, blockerReason, notes).
export async function GET(_request: Request, { token }: { token: string }) {
  const link = verifyToken<{ listId: string }>(token);
  if (!link) return Response.json({ error: 'Link inválido ou expirado.' }, { status: 401 });

  const [project, tasks] = await Promise.all([getProject(link.listId), getProjectTasks(link.listId)]);
  return Response.json({ project: { name: project.name }, tasks: toSafeClientView(tasks) });
}
