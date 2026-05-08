// Session auth using HMAC-SHA256 signed tokens.
// Works in Cloudflare Workers via the Web Crypto API.

export const SESSION_COOKIE = 'tnc_admin_session';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Crypto helpers ────────────────────────────────────────────────────────────

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromBase64Url(s: string): string {
  return atob(s.replace(/-/g, '+').replace(/_/g, '/'));
}

// ── Token: `<b64url(payload)>.<b64url(hmac)>` ────────────────────────────────

export async function createSessionToken(username: string): Promise<string> {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) throw new Error('ADMIN_JWT_SECRET is not set.');

  const expires = Date.now() + TTL_MS;
  const payload = `${username}:${expires}`;
  const key = await importHmacKey(secret);
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));

  const payloadBuf = new TextEncoder().encode(payload).buffer as ArrayBuffer;
  return `${toBase64Url(payloadBuf)}.${toBase64Url(sigBuf)}`;
}

export async function verifySessionToken(token: string): Promise<string | null> {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) return null;

  try {
    const [encodedPayload, encodedSig] = token.split('.');
    if (!encodedPayload || !encodedSig) return null;

    const payload = fromBase64Url(encodedPayload);
    const [username, expiresStr] = payload.split(':');
    if (!username || !expiresStr) return null;
    if (Date.now() > parseInt(expiresStr, 10)) return null; // expired

    const key = await importHmacKey(secret);
    const expectedSigBuf = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(payload),
    );
    const expectedSig = toBase64Url(expectedSigBuf);

    // Constant-time comparison to prevent timing attacks
    if (expectedSig.length !== encodedSig.length) return null;
    let diff = 0;
    for (let i = 0; i < expectedSig.length; i++) {
      diff |= expectedSig.charCodeAt(i) ^ encodedSig.charCodeAt(i);
    }
    if (diff !== 0) return null;

    return username;
  } catch {
    return null;
  }
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

export function makeSessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${60 * 60 * 24}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function getTokenFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// ── Credential check ──────────────────────────────────────────────────────────

export function checkCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME ?? 'admin';
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedPass) return false;

  // Constant-time comparison for both fields
  const userMatch =
    username.length === expectedUser.length &&
    username.split('').reduce((acc, c, i) => acc | (c.charCodeAt(0) ^ expectedUser.charCodeAt(i)), 0) === 0;
  const passMatch =
    password.length === expectedPass.length &&
    password.split('').reduce((acc, c, i) => acc | (c.charCodeAt(0) ^ expectedPass.charCodeAt(i)), 0) === 0;

  return userMatch && passMatch;
}
