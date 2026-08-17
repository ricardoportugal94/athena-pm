import { deleteProject, renameProject } from '@/lib/clickup';
import { requireAdmin } from '@/lib/session';

export async function PATCH(request: Request, { id }: { id: string }) {
  const session = requireAdmin(request);
  if (session instanceof Response) return session;

  const { name } = await request.json();
  if (!name || typeof name !== 'string' || !name.trim()) {
    return Response.json({ error: 'Nome do projeto é obrigatório.' }, { status: 400 });
  }

  const project = await renameProject(id, name.trim());
  return Response.json(project);
}

export async function DELETE(request: Request, { id }: { id: string }) {
  const session = requireAdmin(request);
  if (session instanceof Response) return session;

  await deleteProject(id);
  return Response.json({ ok: true });
}
