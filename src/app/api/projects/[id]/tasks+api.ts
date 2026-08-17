import { getProject, getProjectTasks, TaskUpdateError, updateTask } from '@/lib/clickup';
import { requireAdmin } from '@/lib/session';

export async function GET(request: Request, { id }: { id: string }) {
  const session = requireAdmin(request);
  if (session instanceof Response) return session;

  const [project, tasks] = await Promise.all([getProject(id), getProjectTasks(id)]);
  return Response.json({ project, tasks });
}

// Body: { taskId, status?, assigneeId?, blocked?, blockerReason?, blockerOwner?, blockerExpectedDate?, notes? }
export async function PATCH(request: Request) {
  const session = requireAdmin(request);
  if (session instanceof Response) return session;

  const { taskId, ...update } = await request.json();
  if (!taskId) return Response.json({ error: 'taskId é obrigatório.' }, { status: 400 });

  try {
    await updateTask(taskId, update);
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof TaskUpdateError) return Response.json({ error: err.message }, { status: 422 });
    throw err;
  }
}
