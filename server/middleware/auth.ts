import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { getAdminSession, touchAdminSession, deleteAdminSession, AdminSession } from '../redis';
import { config } from '../config';
import { getBearerToken } from '../lib/http';

/** HttpOnly session cookie used by the admin UI (scripts and tests may still send a Bearer token). */
export const SESSION_COOKIE = 'portfolio_admin';
/**
 * Synchronizer CSRF token: a random value stored in the server-side session and handed to the
 * admin UI in the login / auth-check JSON (never in a cookie). Cookie-authenticated writes must
 * echo it in this header. A cross-site page can neither read it nor add the header.
 */
export const CSRF_HEADER = 'x-csrf-token';
export const CSRF_ERROR = { error: 'CSRF token missing or invalid. Reload the admin page and try again.', code: 'CSRF_INVALID' };

export function newCsrfToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const x = crypto.createHash('sha256').update(a).digest();
  const y = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(x, y);
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === name) {
      const value = decodeURIComponent(part.slice(idx + 1).trim());
      return value && value.length <= 512 ? value : null;
    }
  }
  return null;
}

/** Session token from the Authorization header, else from the HttpOnly cookie. */
export function getSessionToken(req: Request): { token: string; via: 'bearer' | 'cookie' } | null {
  const bearer = getBearerToken(req);
  if (bearer) return { token: bearer, via: 'bearer' };
  const cookie = readCookie(req, SESSION_COOKIE);
  return cookie ? { token: cookie, via: 'cookie' } : null;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** A session is rejected after this age even if activity kept extending it. */
export const SESSION_ABSOLUTE_MAX_MS = 7 * 24 * 60 * 60 * 1000;

let cachedFingerprint: { source: string; value: string } | null = null;

/**
 * Binds every admin session to the credentials in effect when it was issued.
 * Rotating ADMIN_PASSWORD (or ADMIN_SESSION_SECRET) changes the fingerprint and
 * therefore invalidates all existing sessions, including those stored in Redis.
 * scrypt keeps the stored value expensive to brute-force if the session store leaks.
 */
export function credentialFingerprint(): string {
  const password = config.adminPassword || '';
  const salt = process.env.ADMIN_SESSION_SECRET || 'baraa-admin-session-v1';
  const source = crypto.createHash('sha256').update(`${salt}\u0000${password}`).digest('hex');
  if (cachedFingerprint && cachedFingerprint.source === source) return cachedFingerprint.value;
  const value = crypto.scryptSync(password, salt, 24, { N: 16384, r: 8, p: 1 }).toString('hex');
  cachedFingerprint = { source, value };
  return value;
}

/** Constant-time comparison of a supplied password against ADMIN_PASSWORD. */
export function passwordMatches(supplied: string): boolean {
  if (!config.adminPassword) return false;
  const a = crypto.createHash('sha256').update(supplied, 'utf8').digest();
  const b = crypto.createHash('sha256').update(config.adminPassword, 'utf8').digest();
  return crypto.timingSafeEqual(a, b);
}

export function isSessionValid(session: AdminSession | null | undefined, now = Date.now()): session is AdminSession {
  if (!session || !config.adminPassword) return false;
  if (typeof session.expiresAt !== 'number' || now >= session.expiresAt) return false;
  if (typeof session.createdAt !== 'number' || now - session.createdAt > SESSION_ABSOLUTE_MAX_MS) return false;
  return typeof session.fp === 'string' && session.fp === credentialFingerprint();
}

export type AdminAuthResult =
  | { session: AdminSession; via: 'bearer' | 'cookie' }
  | { session: null; reason: 'missing' | 'invalid' | 'csrf' };

/**
 * Authenticates the request. Stale or rotated sessions are deleted.
 * CSRF: a cookie is attached by the browser automatically, so a state-changing request that relies
 * on it must also carry the session's CSRF token. Bearer tokens are never attached automatically,
 * so they need no CSRF token. A valid session with a missing/wrong token yields reason 'csrf'.
 */
export async function authenticateAdmin(req: Request): Promise<AdminAuthResult> {
  const found = getSessionToken(req);
  if (!found) return { session: null, reason: 'missing' };
  const session = await getAdminSession(found.token);
  if (!isSessionValid(session)) {
    if (session) await deleteAdminSession(found.token);
    return { session: null, reason: 'invalid' };
  }
  if (found.via === 'cookie' && !SAFE_METHODS.has(req.method)) {
    const supplied = req.get(CSRF_HEADER) || '';
    if (!session.csrf || !supplied || !safeEqual(supplied, session.csrf)) return { session: null, reason: 'csrf' };
  }
  return { session, via: found.via };
}

/** Returns the valid admin session for this request (CSRF enforced for cookie writes), or null. */
export async function resolveAdminSession(req: Request): Promise<AdminSession | null> {
  return (await authenticateAdmin(req)).session;
}

export async function isAdminRequest(req: Request): Promise<boolean> {
  try {
    return Boolean(await resolveAdminSession(req));
  } catch {
    return false;
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  let auth: AdminAuthResult;
  try {
    auth = await authenticateAdmin(req);
  } catch (e) {
    return next(e);
  }

  const session = auth.session;
  if (!session && 'reason' in auth && auth.reason === 'csrf') {
    // 403, not 401: the session is valid, so the UI must not treat this as "signed out".
    return res.status(403).json(CSRF_ERROR);
  }

  if (session) {
    const remainingAbsolute = session.createdAt + SESSION_ABSOLUTE_MAX_MS - Date.now();
    try {
      await touchAdminSession(session.token, Math.max(1000, Math.min(config.sessionDurationMs, remainingAbsolute)));
    } catch {
      /* extending the session is best-effort */
    }
    (req as any).adminSession = session;
    return next();
  }

  return res.status(401).json({
    error: 'Unauthorized: Valid admin credentials or active session required.'
  });
}
