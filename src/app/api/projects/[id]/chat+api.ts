import { getResponsible, listMessages, respondAsAssistant, sendMessage } from '@/lib/chat';
import { requireAuth, type Session } from '@/lib/session';

async function authorizeForProject(request: Request, projectId: string): Promise<Session | Response> {
  const session = requireAuth(request);
  if (session instanceof Response) return session;
  if (session.role === 'admin') return session;
  if (session.role !== 'client' || session.projectId !== projectId) {
    return Response.json({ error: 'Not allowed to view this project.' }, { status: 403 });
  }
  return session;
}

export async function GET(request: Request, { id }: { id: string }) {
  const session = await authorizeForProject(request, id);
  if (session instanceof Response) return session;

  const [responsible, messages] = await Promise.all([getResponsible(id), listMessages(id)]);
  return Response.json({ responsible, messages });
}

// Body: { text }. Sender role/name are inferred from the session, never from the client.
export async function POST(request: Request, { id }: { id: string }) {
  const session = await authorizeForProject(request, id);
  if (session instanceof Response) return session;

  const { text } = await request.json();
  if (!text || !text.trim()) return Response.json({ error: 'Message cannot be empty.' }, { status: 400 });

  const senderRole = session.role === 'admin' ? 'team' : 'client';
  const senderName = session.role === 'admin' ? session.name : session.projectName;
  await sendMessage(id, senderRole, senderName, text.trim());

  // The AI drafts a first response to the client — the team stays the real
  // "responsible" and can jump in any time from the team chat screen.
  if (session.role === 'client') await respondAsAssistant(id, session.projectName, text.trim());

  return Response.json({ ok: true });
}
