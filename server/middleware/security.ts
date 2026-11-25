import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config, isProduction } from '../config';

// Extend Express Request interface to carry requestId and startTime
declare global {
  // Module augmentation of Express.Request requires a namespace declaration.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
      startTime: number;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const existingId = req.header('X-Request-Id');
  const reqId = existingId && existingId.length < 128 ? existingId : crypto.randomUUID();
  req.id = reqId;
  req.startTime = Date.now();
  res.setHeader('X-Request-Id', reqId);
  next();
}

export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Clickjacking protection (CSP frame-ancestors is also set for the production build)
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.removeHeader('X-Powered-By');

  // HSTS in production when over HTTPS
  if (isProduction() && req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Only echo explicitly allowed browser origins. Requests without Origin (health
  // checks, server-to-server calls) remain valid but do not receive CORS headers.
  const origin = req.header('Origin');
  if (origin && config.corsOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id, X-CSRF-Token');
  }

  if (req.method === 'OPTIONS') {
    if (origin && !config.corsOrigins.includes(origin)) return res.status(403).end();
    return res.status(204).end();
  }

  next();
}

export function structuredLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  res.on('finish', () => {
    // Skip noisy static assets in dev logging
    if (req.path.startsWith('/@') || req.path.startsWith('/node_modules') || req.path.endsWith('.js') || req.path.endsWith('.css') || req.path.endsWith('.map')) {
      return;
    }

    const durationMs = Date.now() - (req.startTime || Date.now());
    const logData = {
      timestamp: new Date().toISOString(),
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip || req.socket.remoteAddress
    };

    // Use stdout for structured JSON in production, clean format in development
    if (isProduction()) {
      console.log(JSON.stringify(logData));
    } else if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/ready')) {
      const statusColor = res.statusCode >= 500 ? '\x1b[31m' : res.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
      console.log(`[API] ${req.method} ${req.path} ${statusColor}${res.statusCode}\x1b[0m - ${durationMs}ms [${req.id.substring(0, 8)}]`);
    }
  });

  next();
}
