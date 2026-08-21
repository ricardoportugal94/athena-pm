// Reports the exact commit this running server was built from — lets us
// confirm a VPS deploy actually landed without guessing from user reports.
export async function GET() {
  return Response.json({ commit: process.env.GIT_SHA ?? 'unknown' });
}
