import { getResponsible, listMessages, respondAsAssistant, sendMessage, type Channel } from '@/lib/chat';
import { getProject } from '@/lib/clickup';
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

function parseChannel(value: string | null): Channel {
  return value === 'mia' ? 'mia' : 'manager';
}

// Query: ?channel=manager|mia (defaults to "manager").
export async function GET(request: Request, { id }: { id: string }) {
  const session = await authorizeForProject(request, id);
  if (session instanceof Response) return session;

  const channel = parseChannel(new URL(request.url).searchParams.get('channel'));
  const [responsible, messages] = await Promise.all([
    channel === 'manager' ? getResponsible(id) : Promise.resolve(null),
    listMessages(id, channel),
  ]);
  return Response.json({ responsible, messages });
}

// Body: { text, channel }. Sender role/name are inferred from the session,
// never from the client. On the "mia" channel every message gets an instant
// AI reply, from client or team alike — that's the whole point of her having
// her own dedicated line. The "manager" channel is human-only: MIA never
// speaks there.
export async function POST(request: Request, { id }: { id: string }) {
  const session = await authorizeForProject(request, id);
  if (session instanceof Response) return session;

  const { text, channel: rawChannel } = await request.json();
  if (!text || !text.trim()) return Response.json({ error: 'Message cannot be empty.' }, { status: 400 });
  const channel = parseChannel(rawChannel);

  const senderRole = session.role === 'admin' ? 'team' : 'client';
  const senderName = session.role === 'admin' ? session.name : session.projectName;
  await sendMessage(id, channel, senderRole, senderName, text.trim());

  if (channel === 'mia') {
    const projectName = session.role === 'admin' ? (await getProject(id).catch(() => null))?.name ?? 'this project' : session.projectName;
    await respondAsAssistant(id, projectName, text.trim());
  }

  return Response.json({ ok: true });
}
