import dotenv from 'dotenv';

// Tests must never read the real .env (production credentials, real database URLs).
// scripts/test-guard.cjs forces NODE_ENV=test before anything is imported.
if (process.env.NODE_ENV !== 'test') {
  dotenv.config();
}

export type PgSslMode = 'disable' | 'no-verify' | 'verify-full';

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  host: string;
  adminPassword: string;
  geminiApiKey?: string;
  geminiModel: string;
  openRouterApiKey?: string;
  openRouterModel: string;
  openRouterFreeModels: string[];
  aiPrimaryProvider: 'openrouter' | 'gemini';
  databaseUrl?: string;
  pgSslMode: PgSslMode;
  redisUrl?: string;
  appUrl?: string;
  trustProxy: boolean | number | string;
  corsOrigins: string[];
  /** true: the session cookie always carries `Secure`; false: only when the request arrived over HTTPS. */
  cookieSecure: boolean;
  sessionDurationMs: number;
  maxBodySize: string;
  notificationsEnabled: boolean;
  emailProvider: 'smtp' | 'none';
  smtpHost?: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser?: string;
  smtpPass?: string;
  notificationEmailFrom?: string;
  notificationEmailTo?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  whatsappEnabled: boolean;
}

export const DEFAULT_OPENROUTER_FREE_MODELS = [
  'inclusionai/ling-3.2-flash:free'
] as const;

export function isFreeOpenRouterModel(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9._-]+\/[a-z0-9][a-z0-9._-]+:free$/i.test(value.trim());
}

function resolveOpenRouterFreeModels(): string[] {
  const configured = (process.env.OPENROUTER_FREE_MODELS || '')
    .split(',')
    .map((model) => model.trim())
    .filter(isFreeOpenRouterModel);
  const models = [...new Set(configured.length > 0 ? configured : DEFAULT_OPENROUTER_FREE_MODELS)];
  return models.length >= 1 ? models : [...DEFAULT_OPENROUTER_FREE_MODELS];
}

const openRouterFreeModels = resolveOpenRouterFreeModels();
const configuredOpenRouterModel = (process.env.OPENROUTER_MODEL || '').trim();
const openRouterModel = isFreeOpenRouterModel(configuredOpenRouterModel)
  ? configuredOpenRouterModel
  : openRouterFreeModels[0];

/**
 * Express "trust proxy" from TRUST_PROXY: "true" = trust every hop, a number = hop count,
 * anything else = comma-separated addresses/subnets/names ("loopback", "10.0.0.0/8").
 * A digit string must become a number: Express would read "1" as the IP address 0.0.0.1.
 */
export function resolveTrustProxy(raw: string | undefined): boolean | number | string {
  const v = (raw || '').trim();
  if (!v || v.toLowerCase() === 'false') return false;
  if (v.toLowerCase() === 'true') return true;
  if (/^\d+$/.test(v)) return Number(v);
  return v;
}

function resolveEmailProvider(): 'smtp' | 'none' {
  const explicit = (process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
  if (explicit === 'none' || explicit === 'disabled' || explicit === 'false') return 'none';
  if (explicit === 'smtp') return 'smtp';
  return process.env.SMTP_HOST || process.env.SMTP_USER ? 'smtp' : 'none';
}

function resolvePgSslMode(databaseUrl: string | undefined): PgSslMode {
  const explicit = (process.env.PG_SSL_MODE || '').trim().toLowerCase();
  if (explicit === 'disable' || explicit === 'no-verify' || explicit === 'verify-full') return explicit;
  const url = databaseUrl || '';
  if (/sslmode=disable/.test(url)) return 'disable';
  if (/sslmode=(verify-full|verify-ca)/.test(url)) return 'verify-full';
  // Local / docker-network databases do not use TLS.
  if (/@(localhost|127\.0\.0\.1|postgres)(:|\/)/.test(url)) return 'disable';
  // Backwards-compatible default for remote databases: encrypted, certificate not verified.
  // Set PG_SSL_MODE=verify-full in production once the provider CA is trusted (see DEPLOYMENT.md).
  return 'no-verify';
}

const databaseUrl = process.env.DATABASE_URL;

export const config: AppConfig = {
  env: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  port: Number.parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '127.0.0.1', // Docker sets HOST=0.0.0.0 explicitly
  adminPassword: process.env.ADMIN_PASSWORD || '',
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite',
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  openRouterModel,
  openRouterFreeModels,
  aiPrimaryProvider: (process.env.AI_PRIMARY_PROVIDER as 'openrouter' | 'gemini') || (process.env.OPENROUTER_API_KEY ? 'openrouter' : 'gemini'),
  databaseUrl,
  pgSslMode: resolvePgSslMode(databaseUrl),
  redisUrl: process.env.REDIS_URL,
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  trustProxy: resolveTrustProxy(process.env.TRUST_PROXY),
  corsOrigins: (process.env.CORS_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean),
  cookieSecure: process.env.SESSION_COOKIE_SECURE === 'true',
  sessionDurationMs: 24 * 60 * 60 * 1000, // 24 hours sliding; absolute cap enforced in middleware/auth.ts
  maxBodySize: process.env.MAX_BODY_SIZE || '2mb',
  notificationsEnabled: process.env.NOTIFICATIONS_ENABLED !== 'false',
  emailProvider: resolveEmailProvider(),
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: Number.parseInt(process.env.SMTP_PORT || '587', 10),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  notificationEmailFrom: process.env.NOTIFICATION_EMAIL_FROM || process.env.SMTP_USER || undefined,
  notificationEmailTo: process.env.NOTIFICATION_EMAIL_TO || process.env.SMTP_USER || undefined,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID,
  whatsappEnabled: process.env.WHATSAPP_ENABLED === 'true'
};

export function isProduction(): boolean {
  return config.env === 'production';
}

/** Vercel functions are disposable and may run concurrently; local fallbacks are unsafe there. */
export function isVercelProduction(): boolean {
  return isProduction() && process.env.VERCEL === '1';
}

/** Fail before accepting traffic when production authentication or CORS is unsafe. */
export function validateProductionConfig(): void {
  if (!isProduction()) return;
  const missing: string[] = [];
  if (!config.adminPassword) missing.push('ADMIN_PASSWORD');
  if (config.adminPassword && config.adminPassword.length < 12) missing.push('ADMIN_PASSWORD (min 12 chars)');
  if (config.corsOrigins.length === 0 || config.corsOrigins.includes('*')) missing.push('CORS_ORIGIN');
  if (isVercelProduction() && !isPostgresConfigured()) missing.push('DATABASE_URL (required on Vercel)');
  if (isVercelProduction() && !isRedisConfigured()) missing.push('REDIS_URL (required on Vercel)');
  if (isVercelProduction() && (process.env.PG_SYNC_MODE || 'load').trim().toLowerCase() !== 'load') {
    missing.push('PG_SYNC_MODE=load (required on Vercel)');
  }
  if (missing.length > 0) {
    throw new Error(`Missing or unsafe production configuration: ${missing.join(', ')}`);
  }
  if (!config.cookieSecure) {
    console.warn('[Config] SESSION_COOKIE_SECURE is not "true": the admin session cookie gets the Secure flag only for requests that arrive over HTTPS (behind a proxy this needs TRUST_PROXY). Set SESSION_COOKIE_SECURE=true once the site is served over HTTPS.');
  }
  if (isPostgresConfigured() && config.pgSslMode === 'no-verify') {
    console.warn('[Config] PostgreSQL TLS certificate is not verified (PG_SSL_MODE=no-verify). Set PG_SSL_MODE=verify-full when possible.');
  }
}

export function isPostgresConfigured(): boolean {
  return Boolean(config.databaseUrl && config.databaseUrl.trim().length > 0);
}

export function isRedisConfigured(): boolean {
  return Boolean(config.redisUrl && config.redisUrl.trim().length > 0);
}
