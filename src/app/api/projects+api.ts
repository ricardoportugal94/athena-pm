import { createProject, listProjectsWithStats } from '@/lib/clickup';
import { requireAdmin } from '@/lib/session';

export async function GET(request: Request) {
  const session = requireAdmin(request);
  if (session instanceof Response) return session;

  const projects = await listProjectsWithStats();
  return Response.json(projects);
}

export async function POST(request: Request) {
  const session = requireAdmin(request);
  if (session instanceof Response) return session;

  const { name } = await request.json();
  if (!name || typeof name !== 'string' || !name.trim()) {
    return Response.json({ error: 'Project name is required.' }, { status: 400 });
  }

  const project = await createProject(name.trim());
  return Response.json(project, { status: 201 });
}
