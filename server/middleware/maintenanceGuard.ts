import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { isAdminRequest } from './auth';
import { escapeHtml } from '../lib/http';

// Bypass paths – always accessible even in maintenance mode
const BYPASS_PREFIXES = ['/api/auth'];
const BYPASS_EXACT = ['/live', '/health', '/ready', '/favicon.ico', '/robots.txt', '/manifest.webmanifest'];
// Static assets must load so the /admin SPA can boot while the public site is offline.
const STATIC_PREFIXES = ['/assets/', '/images/', '/fonts/', '/@vite/', '/@react-refresh', '/@fs/', '/@id/', '/src/', '/node_modules/'];

/**
 * Middleware that returns 503 when maintenance_mode=true.
 * Bypasses:
 *  - health / liveness probes (/live, /health, /ready)
 *  - auth endpoints (/api/auth/*)
 *  - GET /api/settings (for public SPA to detect maintenance mode)
 *  - /admin* paths and the static assets the SPA needs
 *  - Any request with a valid Admin Bearer token
 */
export const maintenanceGuard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const settings = db.getSettings();

  if (!settings.maintenance_mode) {
    next();
    return;
  }

  const path = req.path || '';

  if (BYPASS_EXACT.includes(path) || BYPASS_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    next();
    return;
  }

  if (path === '/api/settings' && req.method === 'GET') {
    next();
    return;
  }

  if (path === '/admin' || path.startsWith('/admin/')) {
    next();
    return;
  }

  if ((req.method === 'GET' || req.method === 'HEAD') && STATIC_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    next();
    return;
  }

  if (await isAdminRequest(req)) {
    next();
    return;
  }

  const title = String(settings.maintenance_title || "We're improving things").slice(0, 200);
  const desc = String(
    settings.maintenance_description || "The site is temporarily offline for scheduled maintenance. We'll be back shortly."
  ).slice(0, 1000);

  res.setHeader('Retry-After', '3600');

  const acceptHeader = String(req.headers.accept || '');
  if (acceptHeader.includes('application/json') || path.startsWith('/api/')) {
    res.status(503).json({ error: 'maintenance', maintenance: true, title, description: desc });
    return;
  }

  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(desc);
  const html =
    '<!DOCTYPE html>' +
    '<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>' +
    '<meta name="robots" content="noindex"/>' +
    '<title>' + safeTitle + '</title>' +
    '<style>' +
    '*{margin:0;padding:0;box-sizing:border-box}' +
    'body{min-height:100vh;display:flex;align-items:center;justify-content:center;' +
    'background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;padding:1.5rem}' +
    '.card{max-width:480px;width:100%;text-align:center}' +
    '.icon{font-size:3rem;margin-bottom:1.5rem}' +
    'h1{font-size:1.75rem;font-weight:800;margin-bottom:1rem;color:#f8fafc}' +
    'p{font-size:0.9rem;line-height:1.7;color:#94a3b8;margin-bottom:2rem;white-space:pre-wrap}' +
    'a{color:#3b82f6;text-decoration:none;font-weight:600;font-size:0.85rem}' +
    '</style></head>' +
    '<body><div class="card">' +
    '<div class="icon">&#128295;</div>' +
    '<h1>' + safeTitle + '</h1>' +
    '<p>' + safeDesc + '</p>' +
    '<a href="/admin">Admin Access</a>' +
    '</div></body></html>';

  res.status(503).type('html').send(html);
};
