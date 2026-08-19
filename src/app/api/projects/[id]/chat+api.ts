import { getResponsible, listMessages, sendMessage } from '@/lib/chat';
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

  const [responsible, messages] = await Promise.all([getResponsible(id), listMessages(id)]);
  return Response.json({ responsible, messages });
}

// Body: { text }. Sender role/name are inferred from the session, never from the client.
export async function POST(request: Request, { id }: { id: string }) {
  const session = authorizeForProject(request, id);
  if (session instanceof Response) return session;

  const { text } = await request.json();
  if (!text || !text.trim()) return Response.json({ error: 'Message cannot be empty.' }, { status: 400 });

  const senderRole = session.role === 'admin' ? 'team' : 'client';
  const senderName = session.role === 'admin' ? session.name : session.projectName;
  await sendMessage(id, senderRole, senderName, text.trim());
  return Response.json({ ok: true });
}
