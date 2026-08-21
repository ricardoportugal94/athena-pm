import { attachFileToMessage, respondAsAssistant, sendMessage, type Channel } from '@/lib/chat';
import { getProject } from '@/lib/clickup';
import { extractText } from '@/lib/extract-text';
import { requireAuth, type Session } from '@/lib/session';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

async function authorizeForProject(request: Request, projectId: string): Promise<Session | Response> {
  const session = requireAuth(request);
  if (session instanceof Response) return session;
  if (session.role === 'admin') return session;
  if (session.role !== 'client' || session.projectId !== projectId) {
    return Response.json({ error: 'Not allowed to view this project.' }, { status: 403 });
  }
  return session;
}

// multipart/form-data: { file, text?, channel? }. On MIA's channel, the
// file's text is best-effort extracted (PDF/Word/Excel) so she can actually
// answer questions about it, not just acknowledge a filename.
export async function POST(request: Request, { id }: { id: string }) {
  const session = await authorizeForProject(request, id);
  if (session instanceof Response) return session;

  const form = (await request.formData()) as any;
  const file = form.get('file');
  const text = String(form.get('text') ?? '');
  const channel: Channel = form.get('channel') === 'mia' ? 'mia' : 'manager';
  if (!(file instanceof Blob)) return Response.json({ error: 'A file is required.' }, { status: 400 });
  if (file.size > MAX_SIZE) return Response.json({ error: 'File is too large (max 10MB).' }, { status: 400 });
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return Response.json({ error: 'Only Word, Excel, and PDF files are allowed.' }, { status: 400 });
  }

  const filename = (file as any).name ?? 'attachment';
  const senderRole = session.role === 'admin' ? 'team' : 'client';
  const senderName = session.role === 'admin' ? session.name : session.projectName;
  const messageBody = text.trim() || `📎 ${filename}`;

  const taskId = await sendMessage(id, channel, senderRole, senderName, messageBody);
  const attachment = await attachFileToMessage(taskId, file, filename);

  if (channel === 'mia') {
    const projectName = session.role === 'admin' ? (await getProject(id).catch(() => null))?.name ?? 'this project' : session.projectName;
    const extracted = await extractText(file, file.type);
    const contextForAi = extracted
      ? `${messageBody}\n\n--- CONTENTS OF THE ATTACHED FILE "${filename}" ---\n${extracted}`
      : `${messageBody} (shared a file named "${filename}", but its contents could not be read — this format isn't supported for reading)`;
    await respondAsAssistant(id, projectName, contextForAi);
  }

  return Response.json({ ok: true, attachment });
}
