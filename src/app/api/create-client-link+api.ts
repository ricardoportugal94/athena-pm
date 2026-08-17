import { getProject } from '@/lib/clickup';
import { requireAdmin } from '@/lib/session';
import { signToken } from '@/lib/session';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const session = requireAdmin(request);
  if (session instanceof Response) return session;

  const { listId } = await request.json();
  if (!listId) return Response.json({ error: 'listId é obrigatório.' }, { status: 400 });

  const project = await getProject(listId); // throws if it doesn't exist
  const token = signToken({ listId: project.id }, ONE_YEAR_MS);

  const origin = new URL(request.url).origin;
  return Response.json({ token, url: `${origin}/client/${token}` });
}
