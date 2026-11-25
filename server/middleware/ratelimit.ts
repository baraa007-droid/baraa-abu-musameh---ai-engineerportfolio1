import { Request, Response, NextFunction } from 'express';
import { checkRateLimit } from '../redis';

export function createDistributedRateLimiter(limit = 30, windowMs = 60 * 1000, prefix = 'api') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const rawIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const key = `${prefix}:${rawIp}`;

    try {
      const result = await checkRateLimit(key, limit, windowMs);

      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTimeMs / 1000).toString());

      if (!result.allowed) {
        res.setHeader('Retry-After', result.retryAfterSeconds.toString());
        return res.status(429).json({
          error: 'Too many requests. Please try again later.',
          retryAfter: result.retryAfterSeconds
        });
      }

      next();
    } catch (e) {
      // checkRateLimit has its own in-memory fallback. If that also fails, reject
      // sensitive traffic rather than allowing an unlimited attack path.
      console.warn('[RateLimit] Rate-limit check failed; rejecting request.');
      return res.status(503).json({ error: 'Service temporarily unavailable. Please try again later.' });
    }
  };
}
