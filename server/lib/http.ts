import crypto from 'crypto';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { SiteSettings } from '../../src/types';

/** Escape a value for safe interpolation into HTML text or attribute context. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Settings that must never be returned to anonymous visitors. */
export const PRIVATE_SETTINGS_KEYS = [
  'notification_email_to',
  'telegram_chat_id',
  'enable_visitor_confirmation'
] as const;

export function toPublicSettings(settings: SiteSettings): Partial<SiteSettings> {
  const copy: Record<string, unknown> = { ...settings };
  for (const key of PRIVATE_SETTINGS_KEYS) delete copy[key];
  return copy as Partial<SiteSettings>;
}

/** Express 4 does not forward rejected promises to the error handler; this wrapper does. */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => unknown): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.substring(7).trim();
  return token.length > 0 && token.length <= 512 ? token : null;
}

/** Short, non-reversible identifier used for rate-limit keys (e.g. per recipient email). */
export function hashKey(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex').slice(0, 32);
}

/** Mask an email for logs: "ab***@example.com". */
export function maskEmail(email: unknown): string {
  if (typeof email !== 'string' || !email.includes('@')) return '***';
  const [local, domain] = email.trim().split('@');
  return `${local.substring(0, 2)}***@${domain}`;
}

/** Message of an unknown thrown value (catch variables are `unknown` under strict mode). */
export function errorText(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return typeof e === 'string' ? e : '';
}

/** HTTP-style status attached to a thrown value by SDKs and fetch wrappers, if any. */
export function errorStatus(e: unknown): number | undefined {
  if (e && typeof e === 'object' && 'status' in e) {
    const s = (e as { status: unknown }).status;
    return typeof s === 'number' ? s : undefined;
  }
  return undefined;
}
