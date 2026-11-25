import Redis from 'ioredis';
import { config, isRedisConfigured, isVercelProduction } from './config';
import { errorText } from './lib/http';

export interface AdminSession {
  token: string;
  createdAt: number;
  expiresAt: number;
  ip?: string;
  role: string;
  name: string;
  /** Credential fingerprint (see middleware/auth.ts). Sessions without a matching value are rejected. */
  fp?: string;
  /** Per-session CSRF token; cookie-authenticated writes must echo it in the X-CSRF-Token header. */
  csrf?: string;
}

let redisClient: Redis | null = null;
const memorySessions = new Map<string, AdminSession>();
const memoryRateLimitMap = new Map<string, { count: number; resetTime: number }>();

function requireDistributedRedis(): void {
  if (isVercelProduction() && (!isRedisConfigured() || !redisClient || redisClient.status !== 'ready')) {
    throw new Error('Redis is required and must be ready for Vercel production sessions and rate limits.');
  }
}

// Expired in-memory rate-limit windows are swept every minute so the map cannot grow without bound.
const rateLimitSweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryRateLimitMap) {
    if (now > entry.resetTime) memoryRateLimitMap.delete(key);
  }
  for (const [token, session] of memorySessions) {
    if (now > session.expiresAt) memorySessions.delete(token);
  }
}, 60_000);
rateLimitSweeper.unref?.();

export function getRedisClient(): Redis | null {
  if (!isRedisConfigured()) {
    return null;
  }

  if (!redisClient && config.redisUrl) {
    try {
      redisClient = new Redis(config.redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        connectTimeout: 5000,
        lazyConnect: false,
        retryStrategy(times) {
          const delay = Math.min(times * 200, 2000);
          return delay;
        }
      });

      redisClient.on('error', (err) => {
        console.warn('[Redis] Connection error (falling back to memory where applicable):', err.message);
      });

      redisClient.on('connect', () => {
        console.log('[Redis] Connected successfully to distributed cache / session store');
      });
    } catch (e) {
      console.error('[Redis] Failed to initialize Redis client:', e);
      redisClient = null;
    }
  }

  return redisClient;
}

// Session Management (Redis with Memory Fallback)
const SESSION_PREFIX = 'sess:admin:';

export async function saveAdminSession(session: AdminSession): Promise<void> {
  const client = getRedisClient();
  const ttlSeconds = Math.max(1, Math.floor((session.expiresAt - Date.now()) / 1000));

  if (client && client.status === 'ready') {
    try {
      await client.setex(`${SESSION_PREFIX}${session.token}`, ttlSeconds, JSON.stringify(session));
      return;
    } catch (e) {
      console.warn('[Session] Redis write error, saving to memory fallback:', e);
    }
  }

  requireDistributedRedis();
  memorySessions.set(session.token, session);
}

export async function getAdminSession(token: string): Promise<AdminSession | null> {
  const client = getRedisClient();

  if (client && client.status === 'ready') {
    try {
      const data = await client.get(`${SESSION_PREFIX}${token}`);
      if (data) {
        return JSON.parse(data) as AdminSession;
      }
      // A session may have been created while Redis was unavailable and kept
      // in the local fallback store. Do not discard it merely because Redis
      // recovered after the login request.
    } catch (e) {
      console.warn('[Session] Redis read error, checking memory fallback:', e);
    }
  }

  requireDistributedRedis();
  const mem = memorySessions.get(token);
  if (mem) {
    if (Date.now() > mem.expiresAt) {
      memorySessions.delete(token);
      return null;
    }
    return mem;
  }

  return null;
}

export async function deleteAdminSession(token: string): Promise<boolean> {
  const client = getRedisClient();

  if (client && client.status === 'ready') {
    try {
      await client.del(`${SESSION_PREFIX}${token}`);
    } catch (e) {
      console.warn('[Session] Redis delete error:', e);
    }
  }

  requireDistributedRedis();
  const existed = memorySessions.has(token);
  memorySessions.delete(token);
  return existed;
}

/** Removes every admin session (Redis and memory). Used by "log out all devices". */
export async function deleteAllAdminSessions(): Promise<number> {
  let removed = memorySessions.size;
  memorySessions.clear();

  const client = getRedisClient();
  if (client && client.status === 'ready') {
    try {
      let cursor = '0';
      do {
        const [next, keys] = await client.scan(cursor, 'MATCH', `${SESSION_PREFIX}*`, 'COUNT', 200);
        cursor = next;
        if (keys.length > 0) removed += await client.del(...keys);
      } while (cursor !== '0');
    } catch (e) {
      console.warn('[Session] Redis error while removing all sessions:', (e as Error).message);
    }
  }
  requireDistributedRedis();
  return removed;
}

export async function touchAdminSession(token: string, additionalDurationMs: number): Promise<void> {
  const session = await getAdminSession(token);
  if (session) {
    session.expiresAt = Date.now() + additionalDurationMs;
    await saveAdminSession(session);
  }
}

// Distributed Rate Limiting (Redis with Memory Fallback)
export interface RateLimitResult {
  allowed: boolean;
  count: number;
  remaining: number;
  resetTimeMs: number;
  retryAfterSeconds: number;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const client = getRedisClient();
  const now = Date.now();
  const redisKey = `ratelimit:${key}`;

  if (client && client.status === 'ready') {
    try {
      const windowSeconds = Math.ceil(windowMs / 1000);
      const multi = client.multi();
      multi.incr(redisKey);
      multi.ttl(redisKey);
      const results = await multi.exec();

      if (results && results[0] && results[1]) {
        const count = results[0][1] as number;
        let ttl = results[1][1] as number;

        if (ttl === -1) {
          // Set expiry if missing
          await client.expire(redisKey, windowSeconds);
          ttl = windowSeconds;
        }

        const resetTimeMs = now + (ttl > 0 ? ttl * 1000 : windowMs);
        const allowed = count <= limit;
        const remaining = Math.max(0, limit - count);
        const retryAfterSeconds = allowed ? 0 : Math.max(1, ttl);

        return { allowed, count, remaining, resetTimeMs, retryAfterSeconds };
      }
    } catch (e) {
      console.warn('[RateLimit] Redis error, using memory fallback:', e);
    }
  }

  requireDistributedRedis();
  // Memory fallback
  const entry = memoryRateLimitMap.get(key);
  if (!entry || now > entry.resetTime) {
    memoryRateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return {
      allowed: true,
      count: 1,
      remaining: limit - 1,
      resetTimeMs: now + windowMs,
      retryAfterSeconds: 0
    };
  }

  entry.count++;
  const allowed = entry.count <= limit;
  const remaining = Math.max(0, limit - entry.count);
  const retryAfterSeconds = allowed ? 0 : Math.max(1, Math.ceil((entry.resetTime - now) / 1000));

  return {
    allowed,
    count: entry.count,
    remaining,
    resetTimeMs: entry.resetTime,
    retryAfterSeconds
  };
}

// Health Check
export async function checkRedisHealth(): Promise<{ status: 'healthy' | 'unconfigured' | 'unhealthy'; latencyMs?: number; error?: string }> {
  if (!isRedisConfigured()) {
    return { status: 'unconfigured' };
  }

  const client = getRedisClient();
  if (!client) {
    return { status: 'unhealthy', error: 'Redis client not initialized' };
  }

  const start = Date.now();
  try {
    const pong = await client.ping();
    if (pong === 'PONG') {
      return { status: 'healthy', latencyMs: Date.now() - start };
    }
    return { status: 'unhealthy', error: `Unexpected ping response: ${pong}` };
  } catch (e) {
    return { status: 'unhealthy', error: errorText(e) || 'Redis ping failed' };
  }
}

// Graceful close
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('[Redis] Connection closed cleanly');
    } catch (e) {
      console.warn('[Redis] Error during quit, disconnecting:', e);
      redisClient.disconnect();
    }
    redisClient = null;
  }
}
