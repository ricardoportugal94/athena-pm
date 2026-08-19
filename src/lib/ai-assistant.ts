// Server-only. Drafts the AI assistant's first-line reply to a client chat
// message, using Google Gemini with the real project status as context. The
// team stays the actual "responsible" and can jump into the conversation at
// any time via the team chat screen — this is a first responder, not a
// replacement.

import type { SdpTask } from '@/lib/clickup';

// The "lite" variant skips extended thinking by default — a few seconds
// instead of ~30s per reply, which matters a lot for a live chat.
const MODEL = 'gemini-flash-lite-latest';

function apiKey() {
  const k = process.env.GOOGLE_AI_API_KEY;
  if (!k) throw new Error('GOOGLE_AI_API_KEY is not set');
  return k;
}

function summarizeProject(projectName: string, tasks: SdpTask[], notes: { general: string; phase1: string; phase2: string; phase3: string }): string {
  const applicable = tasks.filter((t) => t.applicable);
  const done = applicable.filter((t) => t.status === 'done').length;
  const blocked = applicable.filter((t) => t.blocked);

  const byPhase = [1, 2, 3].map((phase) => {
    const phaseTasks = applicable.filter((t) => t.phase === phase);
    const phaseDone = phaseTasks.filter((t) => t.status === 'done').length;
    return `Phase ${phase}: ${phaseDone}/${phaseTasks.length} tasks done`;
  });

  const blockedLines = blocked.slice(0, 10).map((t) => `- "${t.name}"${t.blockerReason ? `: ${t.blockerReason}` : ''}`);

  const noteLines = [
    notes.general && `General note: ${notes.general}`,
    notes.phase1 && `Phase 1 note: ${notes.phase1}`,
    notes.phase2 && `Phase 2 note: ${notes.phase2}`,
    notes.phase3 && `Phase 3 note: ${notes.phase3}`,
  ].filter(Boolean);

  return [
    `Project: ${projectName}`,
    `Overall progress: ${done}/${applicable.length} tasks done (${applicable.length ? Math.round((done / applicable.length) * 100) : 0}%).`,
    ...byPhase,
    blocked.length ? `Currently blocked (${blocked.length}):\n${blockedLines.join('\n')}` : 'Nothing is currently blocked.',
    ...noteLines,
  ].join('\n');
}

export async function draftAssistantReply(
  projectName: string,
  tasks: SdpTask[],
  notes: { general: string; phase1: string; phase2: string; phase3: string },
  recentMessages: { senderRole: 'team' | 'client'; senderName: string; body: string }[],
  clientMessage: string
): Promise<string> {
  const systemPrompt = [
    'You are the AI assistant for Portugal Production, a footwear/apparel sourcing agency and academy.',
    "You're chatting with a client about their production project, inside the Athena PM app.",
    'Answer using ONLY the project status given below — never invent progress, dates, or facts not present in it.',
    "If the question needs something you don't know or requires a decision only the team can make, say the Portugal Production team will follow up shortly — don't guess.",
    'Keep replies short (2-4 sentences), friendly, and professional. No markdown formatting.',
    '',
    '--- CURRENT PROJECT STATUS ---',
    summarizeProject(projectName, tasks, notes),
  ].join('\n');

  const history = recentMessages.slice(-10).map((m) => ({
    role: m.senderRole === 'client' ? ('user' as const) : ('model' as const),
    parts: [{ text: m.body }],
  }));

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [...history, { role: 'user', parts: [{ text: clientMessage }] }],
    }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${JSON.stringify(json)}`);

  const text = json.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
  if (!text.trim()) throw new Error('Gemini returned an empty reply');
  return text.trim();
}
