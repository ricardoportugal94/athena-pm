// Server-only. Signs/verifies opaque session tokens with an HMAC. No fallback
// secret: if the env var is missing, this throws instead of silently signing
// with a public value (that was the security bug found in athena-precheck's
// send-code.js).

import crypto from 'node:crypto';

function secret() {
  const s = process.env.CLIENT_LINK_SECRET;
  if (!s) throw new Error('CLIENT_LINK_SECRET is not set');
  return s;
}

function sign(payload: string) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex');
}

export function signToken(payload: Record<string, unknown>, ttlMs: number) {
  const expires = Date.now() + ttlMs;
  const data = JSON.stringify({ ...payload, expires });
  const encoded = Buffer.from(data).toString('base64url');
  const sig = sign(encoded);
  return `${encoded}.${sig}`;
}

export function verifyToken<T extends Record<string, unknown>>(token: string): T | null {
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  if (sign(encoded) !== sig) return null;
  try {
    const data = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (Date.now() > data.expires) return null;
    return data as T;
  } catch {
    return null;
  }
}

// Admin: signed in with Google, verified @<ADMIN_EMAIL_DOMAIN>. Full access.
export type AdminSession = { role: 'admin'; email: string; name: string };
// Client: local email+password account, read-only, bound to one project.
export type ClientSession = { role: 'client'; email: string; projectId: string; projectName: string };
export type Session = AdminSession | ClientSession;

function sessionFromRequest(request: Request): Session | null {
  const auth = request.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  return token ? verifyToken<Session>(token) : null;
}

export function requireAuth(request: Request): Session | Response {
  const session = sessionFromRequest(request);
  if (!session) return Response.json({ error: 'Not authenticated.' }, { status: 401 });
  return session;
}

export function requireAdmin(request: Request): AdminSession | Response {
  const session = sessionFromRequest(request);
  if (!session || session.role !== 'admin') return Response.json({ error: 'Team access only.' }, { status: 403 });
  return session;
}
