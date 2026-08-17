import { listTeamMembers } from '@/lib/clickup';
import { requireAdmin } from '@/lib/session';

// Used inside the team app to render the "atribuir responsável" picker.
export async function GET(request: Request) {
  const session = requireAdmin(request);
  if (session instanceof Response) return session;

  const members = await listTeamMembers();
  return Response.json(members.map((m) => ({ id: m.id, username: m.username })));
}
