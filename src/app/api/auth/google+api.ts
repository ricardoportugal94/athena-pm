import { findAccountByEmail, findAccountsByEmail } from '@/lib/accounts';
import { isEmailBlocked } from '@/lib/blocklist';
import { signToken } from '@/lib/session';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const FIFTEEN_MIN_MS = 15 * 60 * 1000;

// Body: { code, redirectUri } — the authorization code from expo-auth-session's
// Google flow, exchanged here (server-side, with the Client Secret) for tokens.
// The Client Secret never reaches the app bundle.
export async function POST(request: Request) {
  const { code, redirectUri, codeVerifier } = await request.json();
  if (!code || !redirectUri) return Response.json({ error: 'code and redirectUri are required.' }, { status: 400 });

  const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const adminDomain = process.env.ADMIN_EMAIL_DOMAIN;
  if (!clientId || !clientSecret || !adminDomain) {
    return Response.json({ error: 'Google OAuth is not configured on the server.' }, { status: 500 });
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
    }).toString(),
  });
  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson.id_token) {
    console.error('Google token exchange failed:', tokenJson);
    return Response.json({ error: `Failed to exchange code with Google: ${tokenJson.error_description ?? tokenJson.error ?? 'unknown error'}` }, { status: 401 });
  }

  // Verifying via Google's tokeninfo endpoint (Google itself checks the
  // signature/expiry) — no extra JWT-verification dependency needed.
  const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${tokenJson.id_token}`);
  const info = await infoRes.json();
  if (!infoRes.ok || !info.email) {
    return Response.json({ error: 'Invalid Google token.' }, { status: 401 });
  }

  const emailVerified = info.email_verified === true || info.email_verified === 'true';
  if (!emailVerified) return Response.json({ error: 'Google account email is not verified.' }, { status: 401 });

  const domain = String(info.email).split('@')[1]?.toLowerCase();
  if (domain === adminDomain.toLowerCase()) {
    const session = { role: 'admin' as const, email: info.email, name: info.name ?? info.email };
    const token = signToken(session, SEVEN_DAYS_MS);
    return Response.json({ token, session });
  }

  // Not a team domain — this is a client signing in with Google instead of
  // email/password. An existing account logs straight in; a first-time
  // Google user still has to say which project they're on, same as the
  // email/password signup form, before an account gets created for them.
  if (await isEmailBlocked(info.email)) {
    return Response.json({ error: 'This account has been blocked. Contact the Portugal Production team.' }, { status: 403 });
  }

  const account = await findAccountByEmail(info.email);
  if (account) {
    // Same email can be linked to more than one active project — the
    // session lands on one of them; the client picks which to open from
    // the "My Projects" directory. Pending self-service requests aren't
    // openable yet.
    const accounts = (await findAccountsByEmail(account.email)).filter((a) => a.status === 'active');
    const target = accounts[0] ?? account;
    const session = { role: 'client' as const, email: target.email, projectId: target.projectId, projectName: target.projectName };
    const token = signToken(session, SEVEN_DAYS_MS);
    return Response.json({ token, session });
  }

  const pendingToken = signToken({ role: 'pending-google-client', email: info.email, name: info.name ?? info.email }, FIFTEEN_MIN_MS);
  return Response.json({ needsProject: true, pendingToken });
}
