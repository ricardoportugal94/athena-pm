import { summarizeDailyLearnings } from '@/lib/ai-assistant';
import { getMiaNotes, listMessages, setMiaNotes } from '@/lib/chat';
import { listProjects } from '@/lib/clickup';

// Meant to be called once a day (see .github/workflows/mia-daily-review.yml)
// by an external scheduler, not by a logged-in user — authorized via a
// shared secret instead of a session. For each project, folds today's MIA
// conversation into her rolling memory notes (see summarizeDailyLearnings).
function authorized(request: Request): boolean {
  const secret = process.env.MIA_CRON_SECRET;
  if (!secret) return false;
  const provided = request.headers.get('x-cron-secret') ?? new URL(request.url).searchParams.get('secret');
  return provided === secret;
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth() && d.getUTCDate() === now.getUTCDate();
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized.' }, { status: 401 });

  const projects = await listProjects();
  const results: { projectId: string; updated: boolean }[] = [];

  for (const project of projects) {
    try {
      const messages = await listMessages(project.id, 'mia');
      const todaysMessages = messages.filter((m) => isToday(m.sentAt));
      if (todaysMessages.length === 0) {
        results.push({ projectId: project.id, updated: false });
        continue;
      }
      const existingNotes = await getMiaNotes(project.id);
      const updatedNotes = await summarizeDailyLearnings(existingNotes, todaysMessages);
      await setMiaNotes(project.id, updatedNotes);
      results.push({ projectId: project.id, updated: true });
    } catch (err) {
      console.error(`MIA daily review failed for project ${project.id}:`, err);
      results.push({ projectId: project.id, updated: false });
    }
  }

  return Response.json({ ok: true, results });
}
