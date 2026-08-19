import { getNotes, setNote, type NoteScope } from '@/lib/project-notes';
import { requireAuth } from '@/lib/session';

function authorizeForProject(request: Request, projectId: string) {
  const session = requireAuth(request);
  if (session instanceof Response) return session;
  if (session.role === 'admin') return session;
  if (session.role === 'client' && session.projectId === projectId) return session;
  return Response.json({ error: 'Not allowed to view this project.' }, { status: 403 });
}

export async function GET(request: Request, { id }: { id: string }) {
  const session = authorizeForProject(request, id);
  if (session instanceof Response) return session;

  const notes = await getNotes(id);
  return Response.json(notes);
}

const VALID_SCOPES: NoteScope[] = ['general', 'phase1', 'phase2', 'phase3'];

// Body: { scope, body }. Only the team can edit notes — clients see them read-only.
export async function PATCH(request: Request, { id }: { id: string }) {
  const session = requireAuth(request);
  if (session instanceof Response) return session;
  if (session.role !== 'admin') return Response.json({ error: 'Only the team can edit notes.' }, { status: 403 });

  const { scope, body } = await request.json();
  if (!VALID_SCOPES.includes(scope)) return Response.json({ error: 'Invalid scope.' }, { status: 400 });

  await setNote(id, scope, body ?? '');
  return Response.json({ ok: true });
}
