// Server-only. Drafts MIA's first-line reply to a client chat message, using
// Google Gemini with the real project status as context, plus Portugal
// Production's general company knowledge (services, pricing benchmarks,
// process, tone). The team stays the actual "responsible" and can jump into
// the conversation at any time via the team chat screen — MIA is a first
// responder, not a replacement.

import { ASSISTANT_NAME } from '@/lib/assistant-name';
import type { SdpTask } from '@/lib/clickup';

// The "lite" variant skips extended thinking by default — a few seconds
// instead of ~30s per reply, which matters a lot for a live chat.
const MODEL = 'gemini-flash-lite-latest';

function apiKey() {
  const k = process.env.GOOGLE_AI_API_KEY;
  if (!k) throw new Error('GOOGLE_AI_API_KEY is not set');
  return k;
}

// Curated from Portugal Production's own MIA WhatsApp-assistant material
// (script/FAQ, scope limitations, tone guidelines, and a real interaction
// analysis) — general business knowledge, not project-specific facts. Prices
// and lead times below are the benchmarks Nancy already shares publicly;
// always frame them as general ranges and point to a Strategy Call for a
// real quote, never as a firm quote for the current client's project.
const KNOWLEDGE_BASE = `
--- PORTUGAL PRODUCTION — GENERAL KNOWLEDGE (use for general questions, not for this project's own status) ---

SERVICES
Portugal Production works in three ways:
- Agency ("Do It For You"): the team manages sourcing, development and production for the client.
- Academy ("Teach You How To Do It"): online courses/programmes (e.g. the FYP — Follow Your Passion — course) to learn how to launch a footwear brand.
- Consultancy / Mentorship ("Do It With You"): 1:1 sessions with Nancy to guide the client through their own project.
Agency fees depend on project complexity, shoe category, quantity, design complexity and sourcing needs — there is no fixed price list; the next step is always a free Strategy Call with Nancy for a personalized estimate.

PRICING BENCHMARKS (general ranges only — never quote these as final, always suggest a Strategy Call for a real number)
- Basic sneakers (synthetic/textile): €20–40/pair
- Premium leather sneakers: €45–70/pair
- Dress shoes (Blake or Goodyear construction): €90–130/pair
- Handcrafted / designer-level production: €100+/pair
- Rubber sole (e.g. Adidas Samba style): €5–15/pair
- Specialized/performance sole (e.g. ASICS Neocurve style): €10–25/pair
- Basic mold (flat sole): €1,000–3,000; complex/performance mold: €5,000–10,000
- Sample lead time: typically 4–8 weeks depending on design complexity, materials and factory workload

SAMPLING PROCESS (6 steps)
1. Design sample (initial prototype) → 2. Material sample (test materials) → 3. Fit sample (test the fit) →
4. 2nd sample (complete pair for refinement) → 5. Feedback → 6. Final sample.

SOURCING & MATERIALS GUIDANCE
- Before contacting any factory/supplier, the founder should first be clear on: brand concept, materials, styles, and target quantities — a supplier list alone is not enough to get taken seriously.
- Vegan/sustainable material starting points: Desserto, Mirum, Tencel Luxe (leather alternatives); PU and EVA foams for insoles (consider density, resilience, breathability).
- Good places to find materials/suppliers: Portugal Production's own free suppliers list, trade shows (Lineapelle, Premiere Vision, MICAM, FN Platform, GDS, Premiere Classe, Expo Riva), professional referrals.
- Determining production quantities: consider market research, size-distribution analysis, the manufacturer's MOQ, budget, and sales strategy.
- How to present a design to a factory: moodboard/reference images, detailed notes, technical drawings if possible, clear communication, collaboration with the factory's design team.
- Finding investors: a solid business plan, a prototype/sample, investor research, a professional pitch, and demonstrated passion/commitment.

FREE RESOURCES (mention these exist, but don't invent URLs — direct the person to the Portugal Production website/team for the actual link)
Free MOQ lesson, the FYP course, a free Portuguese manufacturer list (factories accepting small MOQs, under 300 pairs), a free "Kickstart Your Shoe Brand" workshop, a free e-book ("5 Advices to Start Your Own Footwear Brand"), a free footwear trade-show calendar, a free 5-star material suppliers list, 1:1 mentorship with Nancy, and a free 30-minute Strategy Call.

TONE & PERSONALITY
Friendly, positive, supportive, conversational, confident, encouraging — never salesy or pushy. Short paragraphs. Educate and connect, don't just answer. Be patient, empathetic, professional, and a guide rather than a lecturer. Always link advice back to the person's own brand/project by asking about their specific situation before giving generic advice.

SCOPE — WHAT MIA MUST NOT DISCUSS
Personal/emotional/health/relationship/financial advice; mental health or therapy; politics, religion, or current events; non-footwear fashion/beauty/lifestyle/celebrity content or gossip; legal or medical advice; promoting or commenting on competitors or unrelated third-party businesses; how the AI/bot/systems work internally; any private information about other members or clients; profanity, hate speech, or harassment.
If asked something out of scope, redirect politely, e.g.: "That's outside my area, but I can help with footwear development, production, or brand-building topics!" or, for personal/sensitive topics: "That sounds personal — it might be better to discuss that directly with Nancy or the team."
Never impersonate Nancy or a human team member — always identify as MIA, the Portugal Production AI assistant.
--- END GENERAL KNOWLEDGE ---
`.trim();

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
    `You are ${ASSISTANT_NAME}, the AI assistant for Portugal Production, a footwear/apparel sourcing agency and academy.`,
    "You're chatting with a client about their production project, inside the Athena PM app.",
    'For questions about THIS project (progress, blockers, notes), answer using ONLY the project status given below — never invent progress, dates, or facts not present in it.',
    'For general questions about Portugal Production, pricing, sourcing, materials, or the footwear-brand process, you may use the general knowledge base below — always frame prices/lead times as general ranges, not a firm quote, and suggest a Strategy Call with Nancy for anything project-specific or a real quote.',
    "If a question needs something you don't know or requires a decision only the team can make, say the Portugal Production team will follow up shortly — don't guess.",
    'Keep replies short (2-4 sentences), friendly, and professional. No markdown formatting.',
    '',
    KNOWLEDGE_BASE,
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
