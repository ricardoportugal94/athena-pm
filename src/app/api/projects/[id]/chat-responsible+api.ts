import { setResponsible } from '@/lib/chat';
import { requireAdmin } from '@/lib/session';

// Body: { memberId, memberName }. Admin-only — clients never choose who's responsible.
export async function PATCH(request: Request, { id }: { id: string }) {
  const session = requireAdmin(request);
  if (session instanceof Response) return session;

  const { memberId, memberName } = await request.json();
  if (!memberId || !memberName) return Response.json({ error: 'memberId and memberName are required.' }, { status: 400 });

  await setResponsible(id, memberId, memberName);
  return Response.json({ ok: true });
}
