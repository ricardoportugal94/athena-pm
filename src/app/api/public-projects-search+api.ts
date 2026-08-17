import { searchProjectsByName } from '@/lib/clickup';

// Public (needed on the signup screen, before any session exists), but only
// returns matches for a real query — never the full client roster.
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q') ?? '';
  if (q.trim().length < 2) return Response.json([]);

  const results = await searchProjectsByName(q);
  return Response.json(results.map((p) => ({ id: p.id, name: p.name })));
}
