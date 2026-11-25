import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { Server } from 'http';
import { config, isPostgresConfigured, isRedisConfigured, isVercelProduction, validateProductionConfig } from './server/config';
import { db } from './server/db';
import {
  saveAdminSession,
  deleteAdminSession,
  deleteAllAdminSessions,
  closeRedis
} from './server/redis';
import fs from 'fs';
import { asyncHandler, toPublicSettings, maskEmail, errorText } from './server/lib/http';
import { closePostgres } from './server/postgres';
import {
  requestIdMiddleware,
  securityHeadersMiddleware,
  structuredLoggerMiddleware
} from './server/middleware/security';
import { createDistributedRateLimiter } from './server/middleware/ratelimit';
import {
  requireAdmin,
  resolveAdminSession,
  isAdminRequest,
  passwordMatches,
  credentialFingerprint,
  getSessionToken,
  authenticateAdmin,
  newCsrfToken,
  SESSION_COOKIE,
  SESSION_ABSOLUTE_MAX_MS,
  CSRF_ERROR
} from './server/middleware/auth';

// HttpOnly: unreadable by page scripts. SameSite=Strict: never sent on cross-site requests.
// Secure: always with SESSION_COOKIE_SECURE=true, otherwise whenever the request came over HTTPS.
const sessionCookieOptions = (req: Request) => ({
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: config.cookieSecure || req.secure,
  path: '/api'
});
import { maintenanceGuard } from './server/middleware/maintenanceGuard';
import { validateAiText, validateContact, validateLead, validateFormConfigBody, validateFormConfigUpdate, validateSettingsMiddleware, galleryUrls } from './server/validation';
import healthRouter from './server/health';
import {
  chatWithBaraaAI,
  semanticPortfolioSearch,
  analyzeProjectIdea,
  qualifyLeadWithAI,
  assistBlogCreation,
  generateTextEmbedding,
  EMBEDDING_MODEL,
  AIUnavailableError
} from './server/ai';
import { notificationManager } from './server/notifications/manager';

const app = express();
let apiRequestLock: Promise<void> = Promise.resolve();
app.disable('x-powered-by');
const PORT = config.port;
validateProductionConfig();

// Analytics must not retain visitor prompts verbatim; free-form text may contain
// personal data, credentials, or other sensitive information.
const privateQueryMetadata = (value: string) => ({
  length: value.length,
  sha256: crypto.createHash('sha256').update(value, 'utf8').digest('hex')
});

// Trust Proxy Configuration for cloud containers / load balancers
if (config.trustProxy) {
  app.set('trust proxy', config.trustProxy);
}

// 1. Fundamental Observability & Security Middleware
app.use(requestIdMiddleware);
app.use(securityHeadersMiddleware);
app.use(structuredLoggerMiddleware);

// 2. Health & Readiness Probes (must be mounted before heavy middleware & rate limiting)
app.use(healthRouter);

// Do not serve the ephemeral JSON cache while a Vercel function is waiting for
// PostgreSQL initialization, or after that initialization failed.
if (isVercelProduction()) {
  app.use('/api', asyncHandler(async (_req: Request, res: Response, next: NextFunction) => {
    const previousRequest = apiRequestLock;
    let releaseRequest!: () => void;
    apiRequestLock = new Promise<void>((resolve) => { releaseRequest = resolve; });
    let released = false;
    const release = () => {
      if (!released) {
        released = true;
        releaseRequest();
      }
    };
    res.once('finish', release);
    res.once('close', release);
    await previousRequest;
    await db.waitForStartupSync(15_000);
    if (!db.isProductionPostgresReady()) return res.status(503).json({ error: 'Database is not ready' });
    await db.refreshProductionState();
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      void db.flushPostgres().then(() => originalJson(body)).catch((error) => {
        if (res.headersSent) return next(error);
        if (error instanceof Error && error.message.startsWith('PERSISTENCE_CONFLICT:')) {
          res.json = originalJson as typeof res.json;
          res.status(409);
          return originalJson({ error: 'Concurrent update conflict; please retry.' });
        }
        res.json = originalJson as typeof res.json;
        return next(error);
      });
      return res;
    }) as typeof res.json;
    next();
  }));
}

// 2b. Maintenance Mode Guard (runs after health probes so probes always pass)
app.use(maintenanceGuard);

// 3. Body parsers (admin avatar uploads are cropped client-side, so 2mb is ample)
const PUBLIC_BODY_LIMIT = '100kb';
app.use(['/api/events', '/api/messages', '/api/leads', '/api/ai', '/api/auth'], express.json({ limit: PUBLIC_BODY_LIMIT }));
app.use(express.json({ limit: config.maxBodySize }));
app.use(express.urlencoded({ extended: true, limit: config.maxBodySize }));

// 4. Rate limiters
const authRateLimiter = createDistributedRateLimiter(
  Number.parseInt(process.env.AUTH_RATE_LIMIT || '20', 10),
  60 * 1000,
  'ratelimit:auth'
);
const aiRateLimiter = createDistributedRateLimiter(15, 60 * 1000, 'ratelimit:ai');
// Public forms trigger notifications and AI scoring: keep them tight per IP.
const formRateLimiter = createDistributedRateLimiter(
  Number.parseInt(process.env.FORM_RATE_LIMIT || '5', 10),
  10 * 60 * 1000,
  'ratelimit:forms'
);
const eventsRateLimiter = createDistributedRateLimiter(120, 60 * 1000, 'ratelimit:events');

const LEAD_STATUSES = new Set(['new', 'qualified', 'contacted', 'in_discussion', 'won', 'lost', 'archived']);
const LEAD_PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);
const MESSAGE_STATUSES = new Set(['new', 'read', 'replied', 'archived']);
const EVENT_TYPES = new Set(['page_view', 'cta_click', 'ai_chat', 'search_query', 'lead_submission', 'project_view', 'service_view', 'blog_view']);

/**
 * Honeypot: the public forms render a visually hidden "_hp" field that humans leave empty.
 * Bots that fill it get the normal acknowledgement, but nothing is stored or sent.
 */
function honeypot(req: Request, res: Response, next: NextFunction) {
  const trap = req.body?._hp;
  if (typeof trap === 'string' && trap.trim() !== '') {
    console.warn(`[Spam] Honeypot triggered on ${req.path} from ${req.ip}`);
    return res.status(201).json({ id: `ignored-${Date.now()}`, status: 'received', created_at: new Date().toISOString() });
  }
  if (req.body && typeof req.body === 'object') delete req.body._hp;
  next();
}

/** Admin-entered links must be http(s) or same-origin paths; blocks javascript:/data: URLs in public pages. */
function invalidUrlField(body: Record<string, any>, fields: string[], opts: { allowMailto?: boolean; allowDataImage?: boolean } = {}): string | null {
  for (const field of fields) {
    const value = body?.[field];
    if (value === undefined || value === null || value === '') continue;
    if (typeof value !== 'string' || value.length > (opts.allowDataImage ? 1_500_000 : 2048)) return field;
    const v = value.trim();
    if (v === '#') continue; // placeholder meaning "no link"
    if (v.startsWith('/') && !v.startsWith('//')) continue;
    if (opts.allowMailto && /^mailto:[^\s]+$/i.test(v)) continue;
    if (opts.allowDataImage && /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(v)) continue;
    try {
      const u = new URL(v);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return field;
    } catch {
      return field;
    }
  }
  return null;
}

// ----------------------------------------------------
// AUTH ENDPOINTS (Distributed Redis Sessions with Fallback)
// ----------------------------------------------------
app.post('/api/auth/login', authRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ success: false, error: 'Password is required' });
  }

  if (typeof password !== 'string' || password.length > 1024) {
    return res.status(400).json({ success: false, error: 'Password must be a valid string.' });
  }

  if (passwordMatches(password)) {
    // Session rotation: a session this client already held is revoked, so a pre-planted or
    // previously captured token never survives a fresh login.
    const previous = getSessionToken(req);
    if (previous) await deleteAdminSession(previous.token);

    const token = `adm_${crypto.randomBytes(32).toString('hex')}`;
    const csrfToken = newCsrfToken();
    const now = Date.now();
    const session = {
      token,
      createdAt: now,
      expiresAt: now + config.sessionDurationMs,
      ip: req.ip || req.socket.remoteAddress,
      role: 'admin',
      name: 'Baraa Abu Musameh',
      fp: credentialFingerprint(),
      csrf: csrfToken
    };

    await saveAdminSession(session);
    res.cookie(SESSION_COOKIE, token, { ...sessionCookieOptions(req), maxAge: SESSION_ABSOLUTE_MAX_MS });

    // The browser UI authenticates with the HttpOnly cookie and never sees the session token.
    // Scripts that cannot keep cookies opt in with {"client":"bearer"} and send it as a Bearer token.
    const wantsBearer = req.body?.client === 'bearer';
    res.json({
      success: true,
      ...(wantsBearer ? { token } : {}),
      csrfToken,
      user: { role: session.role, name: session.name },
      expiresIn: config.sessionDurationMs
    });
  } else {
    res.status(401).json({ success: false, error: 'Invalid admin credentials' });
  }
}));

app.get('/api/auth/check', asyncHandler(async (req: Request, res: Response) => {
  const session = await resolveAdminSession(req);
  if (session) {
    // Same-origin JSON only: a cross-site page cannot read this response (no CORS grant).
    return res.json({ authenticated: true, user: { role: session.role, name: session.name }, csrfToken: session.csrf });
  }
  res.status(401).json({ authenticated: false });
}));

app.post('/api/auth/logout', asyncHandler(async (req: Request, res: Response) => {
  // A live cookie session can only be ended by our own UI (CSRF token); a stale or unknown
  // token is simply cleared.
  const auth = await authenticateAdmin(req);
  if (!auth.session && auth.reason === 'csrf') return res.status(403).json(CSRF_ERROR);
  const found = getSessionToken(req);
  if (found) await deleteAdminSession(found.token);
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions(req));
  res.json({ success: true });
}));

// Revokes every admin session on every device (use after a suspected credential leak).
app.post('/api/auth/logout-all', requireAdmin, asyncHandler(async (_req: Request, res: Response) => {
  const removed = await deleteAllAdminSessions();
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions(_req));
  res.json({ success: true, sessionsRevoked: removed });
}));

// ----------------------------------------------------
// PROFILE ENDPOINTS
// ----------------------------------------------------
app.get('/api/profile', (req: Request, res: Response) => {
  res.json(db.getProfile());
});

app.put('/api/profile', requireAdmin, (req: Request, res: Response) => {
  const badField =
    invalidUrlField(req.body, ['avatar_url'], { allowDataImage: true }) ||
    invalidUrlField(req.body, ['resume_url', 'cv_url', 'github_url', 'linkedin_url', 'twitter_url', 'website_url']);
  if (badField) return res.status(400).json({ error: `Field "${badField}" must be an http(s) URL or a /path.` });
  const updated = db.updateProfile(req.body);
  res.json(updated);
});

// ----------------------------------------------------
// PROJECTS ENDPOINTS
// ----------------------------------------------------
app.get('/api/projects', asyncHandler(async (req: Request, res: Response) => {
  const includeUnpublished = req.query.all === 'true';
  if (includeUnpublished && !(await isAdminRequest(req))) return res.status(401).json({ error: 'Unauthorized' });
  res.json(db.getProjects(!includeUnpublished));
}));

app.get('/api/projects/:slug', asyncHandler(async (req: Request, res: Response) => {
  const project = db.getProjectBySlug(req.params.slug);
  if (!project || (project.published === false && !(await isAdminRequest(req)))) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(project);
}));

const PROJECT_URL_FIELDS = ['live_url', 'github_url', 'demo_url', 'cover_image', 'image_url', 'video_url'];

app.post('/api/projects', requireAdmin, (req: Request, res: Response) => {
  const badField = invalidUrlField(req.body, PROJECT_URL_FIELDS);
  if (badField) return res.status(400).json({ error: `Field "${badField}" must be an http(s) URL or a /path.` });
  // Validate gallery if provided
  if (req.body.gallery !== undefined) {
    const validated = galleryUrls(req.body.gallery);
    if (validated === null) {
      return res.status(400).json({ error: 'gallery must be an array of up to 20 URLs (http/https or /path), each ≤ 2048 chars.' });
    }
    req.body.gallery = validated;
  }
  const newProj = db.createProject(req.body);
  res.status(201).json(newProj);
});

app.put('/api/projects/:id', requireAdmin, (req: Request, res: Response) => {
  const badField = invalidUrlField(req.body, PROJECT_URL_FIELDS);
  if (badField) return res.status(400).json({ error: `Field "${badField}" must be an http(s) URL or a /path.` });
  // Validate gallery if provided
  if (req.body.gallery !== undefined) {
    const validated = galleryUrls(req.body.gallery);
    if (validated === null) {
      return res.status(400).json({ error: 'gallery must be an array of up to 20 URLs (http/https or /path), each ≤ 2048 chars.' });
    }
    req.body.gallery = validated;
  }
  const updated = db.updateProject(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Project not found' });
  res.json(updated);
});

app.delete('/api/projects/:id', requireAdmin, (req: Request, res: Response) => {
  const ok = db.deleteProject(req.params.id);
  if (!ok) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json({ success: true });
});

// ----------------------------------------------------
// SERVICES ENDPOINTS
// ----------------------------------------------------
// Inactive services are hidden from visitors; the admin dashboard asks for ?all=true.
app.get('/api/services', asyncHandler(async (req: Request, res: Response) => {
  if (req.query.all === 'true') {
    if (!(await isAdminRequest(req))) return res.status(401).json({ error: 'Unauthorized' });
    return res.json(db.getServices());
  }
  res.json(db.getServices(true));
}));

app.get('/api/services/:slug', asyncHandler(async (req: Request, res: Response) => {
  const srv = db.getServiceBySlug(req.params.slug);
  if (!srv || (srv.active === false && !(await isAdminRequest(req)))) {
    return res.status(404).json({ error: 'Service not found' });
  }
  res.json(srv);
}));

app.post('/api/services', requireAdmin, (req: Request, res: Response) => {
  const newSrv = db.createService(req.body);
  res.status(201).json(newSrv);
});

app.put('/api/services/:id', requireAdmin, (req: Request, res: Response) => {
  const updated = db.updateService(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Service not found' });
  res.json(updated);
});

app.delete('/api/services/:id', requireAdmin, (req: Request, res: Response) => {
  const ok = db.deleteService(req.params.id);
  res.json({ success: ok });
});

// ----------------------------------------------------
// SKILLS ENDPOINTS
// ----------------------------------------------------
app.get('/api/skills', (req: Request, res: Response) => {
  res.json(db.getSkills());
});

app.post('/api/skills', requireAdmin, (req: Request, res: Response) => {
  const newSk = db.createSkill(req.body);
  res.status(201).json(newSk);
});

app.put('/api/skills/:id', requireAdmin, (req: Request, res: Response) => {
  const updated = db.updateSkill(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Skill not found' });
  res.json(updated);
});

app.delete('/api/skills/:id', requireAdmin, (req: Request, res: Response) => {
  const ok = db.deleteSkill(req.params.id);
  res.json({ success: ok });
});

// ----------------------------------------------------
// BLOG ENDPOINTS
// ----------------------------------------------------
// Drafts are only visible to an authenticated admin.
app.get('/api/blog', asyncHandler(async (req: Request, res: Response) => {
  if (req.query.all === 'true') {
    if (!(await isAdminRequest(req))) return res.status(401).json({ error: 'Unauthorized' });
    return res.json(db.getBlogPosts(false));
  }
  res.json(db.getBlogPosts(true));
}));

app.get('/api/blog/:slug', asyncHandler(async (req: Request, res: Response) => {
  const post = db.getBlogPostBySlug(req.params.slug);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const isAdmin = await isAdminRequest(req);
  if (!post.published && !isAdmin) return res.status(404).json({ error: 'Post not found' });
  if (post.published && !isAdmin) db.incrementBlogView(req.params.slug);
  res.json(post);
}));

app.post('/api/blog', requireAdmin, (req: Request, res: Response) => {
  const newPost = db.createBlogPost(req.body);
  res.status(201).json(newPost);
});

app.put('/api/blog/:id', requireAdmin, (req: Request, res: Response) => {
  const updated = db.updateBlogPost(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Post not found' });
  res.json(updated);
});

app.delete('/api/blog/:id', requireAdmin, (req: Request, res: Response) => {
  const ok = db.deleteBlogPost(req.params.id);
  res.json({ success: ok });
});

// ----------------------------------------------------
// EXPERIENCE, EDUCATION, CERTIFICATES, TESTIMONIALS
// ----------------------------------------------------
app.get('/api/experience', asyncHandler(async (req: Request, res: Response) => {
  const includeUnpublished = req.query.all === 'true';
  if (includeUnpublished && !(await isAdminRequest(req))) return res.status(401).json({ error: 'Unauthorized' });
  res.json(db.getExperience(!includeUnpublished));
}));
app.put('/api/experience', requireAdmin, (req: Request, res: Response) => res.json(db.updateExperience(req.body)));

app.get('/api/education', asyncHandler(async (req: Request, res: Response) => {
  const includeUnpublished = req.query.all === 'true';
  if (includeUnpublished && !(await isAdminRequest(req))) return res.status(401).json({ error: 'Unauthorized' });
  res.json(db.getEducation(!includeUnpublished));
}));
app.put('/api/education', requireAdmin, (req: Request, res: Response) => res.json(db.updateEducation(req.body)));

app.get('/api/certificates', asyncHandler(async (req: Request, res: Response) => {
  const includeUnpublished = req.query.all === 'true';
  if (includeUnpublished && !(await isAdminRequest(req))) return res.status(401).json({ error: 'Unauthorized' });
  res.json(db.getCertificates(!includeUnpublished));
}));
app.put('/api/certificates', requireAdmin, (req: Request, res: Response) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Expected an array of certificates' });
  for (const certificate of req.body) {
    const badField = invalidUrlField(certificate, ['credential_url', 'badge_image']);
    if (badField) return res.status(400).json({ error: `Field "${badField}" must be an http(s) URL or a /path.` });
  }
  res.json(db.updateCertificates(req.body));
});

// Methodology, Principles, Architecture Nodes
app.get('/api/methodology', (req: Request, res: Response) => res.json(db.getMethodologySteps()));
app.put('/api/methodology', requireAdmin, (req: Request, res: Response) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Expected array of steps' });
  res.json(db.updateMethodologySteps(req.body));
});

app.get('/api/principles', (req: Request, res: Response) => res.json(db.getPrinciples()));
app.put('/api/principles', requireAdmin, (req: Request, res: Response) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Expected array of principles' });
  res.json(db.updatePrinciples(req.body));
});

app.get('/api/architecture-nodes', (req: Request, res: Response) => res.json(db.getArchitectureNodes()));
app.put('/api/architecture-nodes', requireAdmin, (req: Request, res: Response) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Expected array of architecture nodes' });
  res.json(db.updateArchitectureNodes(req.body));
});

app.get('/api/courses', (req: Request, res: Response) => res.json(db.getCourses()));
app.put('/api/courses', requireAdmin, (req: Request, res: Response) => {
  const list = req.body;
  if (!Array.isArray(list)) {
    return res.status(400).json({ error: 'Expected an array of courses.' });
  }
  for (const c of list) {
    if (!c || typeof c !== 'object') return res.status(400).json({ error: 'Invalid course entry.' });
    if (typeof c.title !== 'string' || !c.title.trim() || c.title.length > 200) {
      return res.status(400).json({ error: 'Course title is required (1-200 chars).' });
    }
    if (typeof c.provider !== 'string' || !c.provider.trim() || c.provider.length > 150) {
      return res.status(400).json({ error: 'Course provider is required (1-150 chars).' });
    }
    if (c.description !== undefined && c.description !== null && (typeof c.description !== 'string' || c.description.length > 2000)) {
      return res.status(400).json({ error: 'Course description must be at most 2000 chars.' });
    }
    const urlFields = [c.url, c.certificate_url, c.image_url];
    for (const u of urlFields) {
      if (u === undefined || u === null || u === '') continue;
      try {
        const parsed = new URL(String(u));
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('bad protocol');
      } catch {
        return res.status(400).json({ error: 'Course URLs must be valid http(s) URLs.' });
      }
    }
    if (!Number.isFinite(Number(c.order))) {
      return res.status(400).json({ error: 'Course order must be a number.' });
    }
    if (typeof c.published !== 'boolean') {
      return res.status(400).json({ error: 'Course published flag must be a boolean.' });
    }
  }
  res.json(db.updateCourses(list));
});

app.get('/api/testimonials', asyncHandler(async (req: Request, res: Response) => {
  if (req.query.all === 'true') {
    if (!(await isAdminRequest(req))) return res.status(401).json({ error: 'Unauthorized' });
    return res.json(db.getTestimonials(false));
  }
  res.json(db.getTestimonials(true));
}));
app.post('/api/testimonials', requireAdmin, (req: Request, res: Response) => {
  const badField = invalidUrlField(req.body, ['avatar_url'], { allowDataImage: true }) || invalidUrlField(req.body, ['company_url', 'linkedin_url']);
  if (badField) return res.status(400).json({ error: `Field "${badField}" must be an http(s) URL or a /path.` });
  res.status(201).json(db.createTestimonial(req.body));
});
app.put('/api/testimonials/:id', requireAdmin, (req: Request, res: Response) => {
  const badField = invalidUrlField(req.body, ['avatar_url'], { allowDataImage: true }) || invalidUrlField(req.body, ['company_url', 'linkedin_url']);
  if (badField) return res.status(400).json({ error: `Field "${badField}" must be an http(s) URL or a /path.` });
  const updated = db.updateTestimonial(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Testimonial not found' });
  res.json(updated);
});
app.delete('/api/testimonials/:id', requireAdmin, (req: Request, res: Response) => res.json({ success: db.deleteTestimonial(req.params.id) }));

// ----------------------------------------------------
// CONTACT MESSAGES
// ----------------------------------------------------
app.get('/api/messages', requireAdmin, (req: Request, res: Response) => {
  res.json(db.getMessages());
});

app.post('/api/messages', formRateLimiter, honeypot, validateContact, (req: Request, res: Response) => {
  const { name, email, subject, message, custom_fields } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  console.log(`[Contact] Message received from ${maskEmail(email)}`);

  const newMsg = db.createMessage({ 
    name, 
    email, 
    subject: subject || 'General Inquiry', 
    message,
    ...(custom_fields ? { custom_fields } : {})
  });
  db.logEvent({
    event_type: 'cta_click',
    path: '/contact',
    metadata: { sender: name, subject },
    session_id: (req.headers['x-session-id'] as string) || 'guest'
  });
  // Asynchronous non-blocking notification dispatch
  notificationManager.dispatchContact(newMsg).catch((err) => {
    console.error('[Notification Engine] Contact dispatch error:', err?.message || err);
  });
  res.status(201).json({ id: newMsg.id, status: 'received', created_at: newMsg.created_at });
});

app.put('/api/messages/:id/status', requireAdmin, (req: Request, res: Response) => {
  const status = req.body?.status;
  if (typeof status !== 'string' || !MESSAGE_STATUSES.has(status)) {
    return res.status(400).json({ error: `status must be one of: ${[...MESSAGE_STATUSES].join(', ')}` });
  }
  const ok = db.updateMessageStatus(req.params.id, status as any);
  if (!ok) return res.status(404).json({ success: false, error: 'Message not found' });
  res.json({ success: true, message: db.getMessages().find((m) => m.id === req.params.id) });
});

app.delete('/api/messages/:id', requireAdmin, (req: Request, res: Response) => {
  res.json({ success: db.deleteMessage(req.params.id) });
});

// ----------------------------------------------------
// PROJECT LEADS
// ----------------------------------------------------
app.get('/api/leads', requireAdmin, (req: Request, res: Response) => {
  res.json(db.getLeads());
});

/**
 * Scores a stored lead in the background, then notifies the owner (so the notification
 * carries the score). Disabled by settings.lead_auto_qualification=false or ai_enabled=false.
 */
async function qualifyAndNotifyLead(leadId: string) {
  const lead = db.getLeads().find((l) => l.id === leadId);
  if (!lead) return;
  const settings = db.getSettings();
  let finalLead = lead;
  if (settings.lead_auto_qualification === false || settings.ai_enabled === false) {
    finalLead = db.updateLead(leadId, { scored_by: 'skipped' } as any) || lead;
  } else {
    try {
      const q = await qualifyLeadWithAI({
        name: lead.name,
        email: lead.email,
        project_type: lead.project_type,
        budget_range: lead.budget_range,
        deadline: lead.deadline,
        description: lead.description,
        required_features: Array.isArray(lead.required_features) ? lead.required_features : []
      });
      finalLead = db.updateLead(leadId, {
        ai_summary: q.ai_summary,
        ai_score: q.ai_score,
        scored_by: q.scored_by,
        ai_breakdown: q.ai_breakdown,
        priority: q.priority
      }) || lead;
    } catch (e) {
      console.error('[Project Intake] Qualification failed:', errorText(e) || e);
    }
  }
  try {
    await notificationManager.dispatchLead(finalLead);
  } catch (err) {
    console.error('[Notification Engine] Lead dispatch error:', errorText(err) || err);
  }
}

app.post('/api/leads', formRateLimiter, honeypot, validateLead, asyncHandler(async (req: Request, res: Response) => {
  const { name, email, company, project_type, budget_range, deadline, description, required_features, reference_links, communication_pref, custom_fields } = req.body;

  if (!name || !email || !description) {
    return res.status(400).json({ error: 'Name, email, and project description are required.' });
  }

  console.log(`[Project Intake] Lead received from ${maskEmail(email)}`);

  // Stored immediately with the visitor's own answers; unspecified fields say so instead of
  // inventing a budget or timeline. Scoring happens afterwards (see qualifyAndNotifyLead).
  const newLead = db.createLead({
    name,
    email,
    company: company || '',
    project_type: project_type || 'Not specified',
    budget_range: budget_range || 'Not specified',
    deadline: deadline || 'Not specified',
    description,
    required_features: Array.isArray(required_features) ? required_features : [],
    reference_links,
    communication_pref: communication_pref || 'Email',
    scored_by: 'pending' as any,
    priority: 'medium',
    status: 'new',
    ...(custom_fields ? { custom_fields } : {})
  });

  db.logEvent({
    event_type: 'lead_submission',
    path: '/start-project',
    metadata: { lead_id: newLead.id, project_type },
    session_id: (req.headers['x-session-id'] as string)?.slice(0, 100) || 'guest'
  });

  setImmediate(() => {
    qualifyAndNotifyLead(newLead.id).catch((e) => console.error('[Project Intake] Background processing error:', e));
  });

  // The visitor gets an acknowledgement only; internal scoring is never returned publicly.
  res.status(201).json({ id: newLead.id, status: 'received', created_at: newLead.created_at });
}));

// Only workflow fields are editable; submitted client data and AI scoring stay as recorded.
app.put('/api/leads/:id', requireAdmin, (req: Request, res: Response) => {
  const body = req.body || {};
  const patch: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !LEAD_STATUSES.has(body.status)) {
      return res.status(400).json({ error: `status must be one of: ${[...LEAD_STATUSES].join(', ')}` });
    }
    patch.status = body.status;
  }
  if (body.priority !== undefined) {
    if (typeof body.priority !== 'string' || !LEAD_PRIORITIES.has(body.priority)) {
      return res.status(400).json({ error: `priority must be one of: ${[...LEAD_PRIORITIES].join(', ')}` });
    }
    patch.priority = body.priority;
  }
  if (body.notes !== undefined) {
    if (typeof body.notes !== 'string' || body.notes.length > 5000) {
      return res.status(400).json({ error: 'notes must be a string of at most 5000 characters.' });
    }
    patch.notes = body.notes;
  }
  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: 'Nothing to update. Editable fields: status, priority, notes.' });
  }
  const updated = db.updateLead(req.params.id, patch as any);
  if (!updated) return res.status(404).json({ error: 'Lead not found' });
  res.json(updated);
});

app.delete('/api/leads/:id', requireAdmin, (req: Request, res: Response) => {
  res.json({ success: db.deleteLead(req.params.id) });
});

// ----------------------------------------------------
// FORM CONFIG API
// ----------------------------------------------------
// List all forms (Admin only, or all=true query for admin)
app.get('/api/forms', asyncHandler(async (req: Request, res: Response) => {
  if (await isAdminRequest(req)) {
    return res.json(db.getForms());
  }
  // Public only sees active forms
  res.json(db.getActiveForms());
}));

// Get a single form by slug (Public sees active form with enabled fields)
app.get('/api/forms/:slug', (req: Request, res: Response) => {
  const form = db.getFormBySlug(req.params.slug);
  if (!form || !form.active) {
    return res.status(404).json({ error: 'Form not found or inactive' });
  }

  // Return enabled fields sorted by order
  const enabledFields = form.fields
    .filter(f => f.enabled)
    .sort((a, b) => a.order - b.order);

  res.json({
    ...form,
    fields: enabledFields
  });
});

// Create new form config (Admin only - restricted to system forms)
app.post('/api/forms', requireAdmin, validateFormConfigBody, (req: Request, res: Response) => {
  const ALLOWED_FORM_SLUGS = ['contact', 'lead'];
  if (!ALLOWED_FORM_SLUGS.includes(req.body.slug)) {
    return res.status(400).json({ error: "Creation of arbitrary forms is restricted. Only system forms 'contact' and 'lead' are supported." });
  }

  try {
    const created = db.createForm(req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: errorText(err) || 'Failed to create form' });
  }
});

// Update form config (Admin only)
// Partial updates (the dashboard sends only {active} or {fields}) are merged onto the
// stored config first, so validation always sees a complete form.
function mergeFormUpdate(req: Request, res: Response, next: NextFunction) {
  const existing = db.getFormBySlug(req.params.slug);
  if (!existing) return res.status(404).json({ error: 'Form not found' });
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const { slug: _ignoredSlug, ...changes } = body;
  req.body = {
    name: existing.name,
    description: existing.description,
    active: existing.active,
    fields: existing.fields,
    ...changes
  };
  next();
}

app.put('/api/forms/:slug', requireAdmin, mergeFormUpdate, validateFormConfigUpdate, (req: Request, res: Response) => {
  const slug = req.params.slug;
  const existingForm = db.getFormBySlug(slug);
  if (!existingForm) {
    return res.status(404).json({ error: 'Form not found' });
  }

  // Enforce system field protections on the backend:
  // 1. All existing system fields must still exist in the updated payload
  // 2. System field keys and types cannot be changed
  if (existingForm.fields && Array.isArray(req.body.fields)) {
    const existingSystemFields = existingForm.fields.filter(f => f.system);
    const updatedFieldMap = new Map(req.body.fields.map((f: any) => [f.key, f]));

    for (const sysField of existingSystemFields) {
      const updatedField = updatedFieldMap.get(sysField.key) as any;
      if (!updatedField) {
        return res.status(400).json({
          error: `Cannot delete system field "${sysField.label}" (${sysField.key}).`
        });
      }
      if (updatedField.enabled === false) {
        return res.status(400).json({ error: `System field "${sysField.label}" cannot be disabled.` });
      }
      if (sysField.required && updatedField.required === false) {
        return res.status(400).json({ error: `System field "${sysField.label}" must stay required.` });
      }
      if (updatedField.type !== sysField.type) {
        return res.status(400).json({
          error: `Cannot change type of system field "${sysField.label}".`
        });
      }
      // Preserve system flag
      updatedField.system = true;
    }
  }

  const updated = db.updateForm(slug, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Form not found' });
  }
  res.json(updated);
});

// Soft-delete a form (Admin only - System forms 'contact' and 'lead' cannot be deleted)
app.delete('/api/forms/:slug', requireAdmin, (req: Request, res: Response) => {
  const ALLOWED_FORM_SLUGS = ['contact', 'lead'];
  if (ALLOWED_FORM_SLUGS.includes(req.params.slug)) {
    return res.status(400).json({ error: "System forms 'contact' and 'lead' cannot be deleted." });
  }
  try {
    const ok = db.deleteForm(req.params.slug);
    if (!ok) {
      return res.status(404).json({ error: 'Form not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: errorText(err) });
  }
});

// ----------------------------------------------------
// AI SERVICES ENDPOINTS (Distributed Rate Limiting + Resilience)
// ----------------------------------------------------
/** Settings → ai_enabled=false turns off every model-backed public feature. */
function requireAiEnabled(_req: Request, res: Response, next: NextFunction) {
  if (db.getSettings().ai_enabled === false) {
    return res.status(503).json({ error: 'AI features are currently disabled by the site owner.', disabled: true });
  }
  next();
}

app.post('/api/ai/chat', requireAiEnabled, aiRateLimiter, validateAiText('message'), async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });
    const rawHistory = req.body.history;
    if (rawHistory !== undefined && rawHistory !== null && !Array.isArray(rawHistory)) {
      return res.status(400).json({ error: 'history must be an array.' });
    }
    if (Array.isArray(rawHistory) && rawHistory.length > 50) {
      return res.status(400).json({ error: 'history may contain at most 50 messages.' });
    }
    // Client-supplied history is untrusted: keep only well-formed turns, cap their size and count
    // (bounds token cost and the room available for injected instructions).
    const history = (Array.isArray(rawHistory) ? rawHistory : [])
      .filter((h: any) => h && typeof h.content === 'string' && h.content.trim() && ['user', 'assistant', 'model'].includes(h.role))
      .slice(-6)
      .map((h: any) => ({ role: h.role === 'user' ? 'user' as const : 'assistant' as const, content: h.content.slice(0, 2000) }));
    const sessionId = typeof req.body.sessionId === 'string' ? req.body.sessionId.slice(0, 100) : undefined;

    db.logEvent({
      event_type: 'ai_chat',
      path: '/ai-assistant',
      metadata: { query: privateQueryMetadata(message) },
      session_id: sessionId || 'guest'
    });

    const result = await chatWithBaraaAI({ message, history, sessionId });
    res.json(result);
  } catch (error) {
    console.error('AI Chat route error:', error);
    console.error('[API]', req.path, (error as any)?.message || error);
    res.status(500).json({ error: 'AI Assistant encountered an issue' });
  }
});

app.post('/api/ai/semantic-search', aiRateLimiter, validateAiText('query', 500), async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    db.logEvent({
      event_type: 'search_query',
      path: '/search',
      metadata: { query: privateQueryMetadata(query) },
      session_id: (req.headers['x-session-id'] as string) || 'guest'
    });

    const result = await semanticPortfolioSearch(query);
    res.json(result);
  } catch (error) {
    console.error('[API]', req.path, (error as any)?.message || error);
    res.status(500).json({ error: 'Semantic search failed' });
  }
});

app.post('/api/ai/project-advisor', requireAiEnabled, aiRateLimiter, validateAiText('idea'), async (req: Request, res: Response) => {
  try {
    const { idea, businessType, targetAudience, budgetRange } = req.body;
    if (!idea) return res.status(400).json({ error: 'Project idea is required' });

    const assessment = await analyzeProjectIdea({ idea, businessType, targetAudience, budgetRange });
    res.json(assessment);
  } catch (error) {
    console.error('[API]', req.path, (error as any)?.message || error);
    res.status(500).json({ error: 'Project Advisor error' });
  }
});

const BLOG_ACTIONS = new Set(['titles', 'outline', 'intro', 'seo', 'faq', 'summary', 'improve']);

app.post('/api/ai/blog-assistant', requireAdmin, aiRateLimiter, async (req: Request, res: Response) => {
  try {
    const { action, topic, currentContent } = req.body || {};
    if (typeof action !== 'string' || !BLOG_ACTIONS.has(action)) {
      return res.status(400).json({ error: `action must be one of: ${[...BLOG_ACTIONS].join(', ')}` });
    }
    if (typeof topic !== 'string' || !topic.trim() || topic.length > 300) {
      return res.status(400).json({ error: 'topic is required (max 300 chars).' });
    }
    if (currentContent !== undefined && (typeof currentContent !== 'string' || currentContent.length > 20000)) {
      return res.status(400).json({ error: 'currentContent must be a string of at most 20000 chars.' });
    }
    if ((action === 'improve' || action === 'summary') && !String(currentContent || '').trim()) {
      return res.status(400).json({ error: `Action "${action}" needs article content.` });
    }
    const result = await assistBlogCreation({ action: action as any, topic: topic.trim(), currentContent });
    res.json(result);
  } catch (error) {
    if (error instanceof AIUnavailableError) return res.status(503).json({ error: error.message });
    console.error('[API]', req.path, (error as any)?.message || error);
    res.status(500).json({ error: 'Blog Assistant error' });
  }
});

// ----------------------------------------------------
// KNOWLEDGE BASE & RAG ADMIN
// ----------------------------------------------------
let embeddingPassRunning = false;

/** Embeds only chunks that have no vector yet; stops after 3 consecutive provider failures. */
async function runEmbeddingPass(pending: { id: string; content: string }[]) {
  let embedded = 0;
  let consecutiveFailures = 0;
  for (const chunk of pending) {
    try {
      const vec = await generateTextEmbedding(chunk.content);
      if (vec && db.attachEmbedding(chunk.id, chunk.content, vec)) {
        embedded++;
        consecutiveFailures = 0;
        if (embedded % 10 === 0) db.saveData();
      } else if (!vec) {
        consecutiveFailures++;
        if (consecutiveFailures >= 3) break;
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch {
      console.warn('[RAG] Embedding failed for chunk, continuing:', chunk.id);
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  if (embedded > 0) db.saveData();
  if (consecutiveFailures >= 3) {
    console.warn('[RAG] Embedding pass stopped early after repeated provider failures (quota or outage). Keyword retrieval remains active.');
  }
  console.log(`[RAG] Embedding pass complete: ${embedded} of ${pending.length} pending chunks embedded.`);
}

app.get('/api/knowledge', requireAdmin, (req: Request, res: Response) => {
  const chunks = db.getChunks();
  const docs = db.getKnowledgeDocs();
  const embeddedChunks = chunks.filter((c) => Array.isArray(c.embedding) && c.embedding.length > 0).length;
  res.json({
    documents: docs,
    docs, // kept for older clients
    totalChunks: chunks.length,
    embeddedChunks,
    embeddingModel: EMBEDDING_MODEL,
    embeddingProviderConfigured: Boolean(config.geminiApiKey),
    embeddingPassRunning,
    retrievalMode: embeddedChunks > 0 ? 'hybrid' : 'keyword',
    // Vectors are large and useless in the browser: send a flag and the dimension instead.
    chunks: chunks.slice(0, 200).map(({ embedding, ...rest }) => ({
      ...rest,
      embedded: Array.isArray(embedding) && embedding.length > 0,
      dimensions: Array.isArray(embedding) ? embedding.length : 0
    })),
    indexedCategories: Array.from(new Set(chunks.map((c) => c.metadata?.type || 'general')))
  });
});

// Rebuilds chunk text from current content. Existing vectors of unchanged chunks are kept;
// only new or edited chunks are sent to the (paid) embedding provider, in the background.
app.post('/api/knowledge/reindex', requireAdmin, (req: Request, res: Response) => {
  const chunks = db.reindexAllKnowledge();
  const pending = chunks.filter((c) => !Array.isArray(c.embedding) || c.embedding.length === 0).map((c) => ({ id: c.id, content: c.content }));
  const providerConfigured = Boolean(config.geminiApiKey);
  const embeddingQueued = providerConfigured && pending.length > 0 && !embeddingPassRunning;
  if (embeddingQueued) {
    embeddingPassRunning = true;
    setImmediate(() => {
      runEmbeddingPass(pending)
        .catch((e) => console.error('[RAG] Embedding pass error:', e?.message || e))
        .finally(() => { embeddingPassRunning = false; });
    });
  }
  res.json({
    success: true,
    chunksCount: chunks.length,
    alreadyEmbedded: chunks.length - pending.length,
    missingEmbeddings: pending.length,
    embeddingQueued,
    embeddingPassRunning,
    embeddingProvider: providerConfigured ? EMBEDDING_MODEL : null
  });
});

app.post('/api/knowledge/documents', requireAdmin, (req: Request, res: Response) => {
  const { title, source_type, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }
  const newDoc = db.createKnowledgeDoc({
    title,
    source_type: source_type || 'custom',
    content,
    status: 'indexed'
  });
  res.status(201).json(newDoc);
});

app.delete('/api/knowledge/:id', requireAdmin, (req: Request, res: Response) => {
  res.json({ success: db.deleteKnowledgeDoc(req.params.id) });
});

// ----------------------------------------------------
// ANALYTICS & TELEMETRY
// ----------------------------------------------------
app.post('/api/events', eventsRateLimiter, (req: Request, res: Response) => {
  const { event_type, path: eventPath, metadata, session_id } = req.body || {};
  if (typeof event_type !== 'string' || !EVENT_TYPES.has(event_type)) {
    return res.status(400).json({ error: `event_type must be one of: ${[...EVENT_TYPES].join(', ')}` });
  }
  if (typeof eventPath !== 'string' || !eventPath.startsWith('/') || eventPath.length > 300) {
    return res.status(400).json({ error: 'path must be a site path starting with "/" (max 300 chars).' });
  }
  if (metadata !== undefined && (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata) || JSON.stringify(metadata).length > 2000)) {
    return res.status(400).json({ error: 'metadata must be an object of at most 2000 bytes.' });
  }
  if (db.getSettings().analytics_enabled === false) {
    return res.status(202).json({ accepted: false, reason: 'analytics disabled' });
  }
  const event = db.logEvent({
    event_type: event_type as any,
    path: eventPath,
    metadata: metadata || {},
    session_id: typeof session_id === 'string' && session_id ? session_id.slice(0, 100) : 'anonymous'
  });
  res.status(201).json({ id: event.id });
});

app.get('/api/analytics', requireAdmin, (req: Request, res: Response) => {
  const events = db.getEvents();
  const leads = db.getLeads();
  const messages = db.getMessages();
  const projects = db.getProjects();
  const blog = db.getBlogPosts();
  const chunks = db.getChunks();

  const totalPageViews = events.filter(e => e.event_type === 'page_view').length;
  const totalAIChats = events.filter(e => e.event_type === 'ai_chat').length;
  const totalSearches = events.filter(e => e.event_type === 'search_query').length;
  const embeddedChunks = chunks.filter(c => c.embedding && c.embedding.length > 0).length;

  res.json({
    summary: {
      totalPageViews,
      totalAIChats,
      totalSearches,
      totalLeads: leads.length,
      qualifiedLeads: leads.filter(l => l.status === 'qualified' || (l.ai_score && l.ai_score >= 80)).length,
      totalMessages: messages.length,
      unreadMessages: messages.filter(m => m.status === 'new').length,
      totalProjects: projects.length,
      totalArticles: blog.length,
      knowledgeChunks: chunks.length,
      embeddedChunks
    },
    systemTelemetry: {
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMB: Math.round(process.memoryUsage().rss / (1024 * 1024)),
      nodeVersion: process.version,
      databaseType: isPostgresConfigured() ? 'PostgreSQL (Cloud Scale)' : 'JSON State Engine (.data/db.json)',
      cacheType: isRedisConfigured() ? 'Redis (Distributed Cluster)' : 'In-Memory Sliding Map',
      environment: config.env
    },
    recentEvents: events.slice(0, 50),
    insights: db.getInsights()
  });
});

// ----------------------------------------------------
// SITE SETTINGS
// ----------------------------------------------------
// Visitors get the public subset; notification routing details are admin-only.
app.get('/api/settings', asyncHandler(async (req: Request, res: Response) => {
  const settings = db.getSettings();
  res.json((await isAdminRequest(req)) ? settings : toPublicSettings(settings));
}));

const SETTINGS_URL_FIELDS = ['og_image', 'twitter_image', 'canonical_url', 'calendly_url', 'cta_banner_primary_url', 'cta_banner_secondary_url', 'cta_primary_url', 'cta_secondary_url'];

app.put('/api/settings', requireAdmin, validateSettingsMiddleware, (req: Request, res: Response) => {
  const badField = invalidUrlField(req.body, SETTINGS_URL_FIELDS, { allowMailto: true }) || invalidUrlField(req.body.social_links || {}, Object.keys(req.body.social_links || {}));
  if (badField) return res.status(400).json({ error: `Field "${badField}" must be an http(s) URL, mailto: link or a /path.` });
  const updated = db.updateSettings(req.body);
  res.json(updated);
});

// Unknown API routes return JSON instead of falling through to the SPA's index.html.
app.use('/api', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// ----------------------------------------------------
// VITE MIDDLEWARE & SERVER STARTUP / GRACEFUL SHUTDOWN
// ----------------------------------------------------
let serverInstance: Server | null = null;

/** CSP for the production build; inline scripts in index.html are allowed by hash only. */
function buildContentSecurityPolicy(indexHtml: string): string {
  const hashes: string[] = [];
  for (const match of indexHtml.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    hashes.push(`'sha256-${crypto.createHash('sha256').update(match[1], 'utf8').digest('base64')}'`);
  }
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'"
  ].join('; ');
}

// Final error handler: malformed JSON → 400, oversized body → 413, everything else → generic 500
// (details stay in the server log, never in the response).
function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) return;
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body.' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: `Request body too large (limit ${config.maxBodySize}).` });
  console.error(`[Error] ${req.method} ${req.path} [${req.id || '-'}]:`, err?.stack || err);
  res.status(500).json({ error: 'Internal server error', requestId: req.id });
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Loaded only in development: production never imports Vite.
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const indexPath = path.join(distPath, 'index.html');
    const csp = fs.existsSync(indexPath) ? buildContentSecurityPolicy(fs.readFileSync(indexPath, 'utf8')) : null;
    app.use((_req: Request, res: Response, next: NextFunction) => {
      if (csp) res.setHeader('Content-Security-Policy', csp);
      next();
    });
    app.use(express.static(distPath, { index: false }));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(indexPath);
    });
  }
  // Do not serve requests while PostgreSQL may still replace the in-memory data (PG_SYNC_MODE=load).
  await db.waitForStartupSync(15_000);
  serverInstance = app.listen(PORT, config.host, () => {
    console.log(`[Server] Baraa Abu Musameh Portfolio listening on http://${config.host}:${PORT} (${config.env})`);
  });
}

// Graceful Shutdown Handler
let shuttingDown = false;
async function gracefulShutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[Shutdown] Received ${signal}. Starting graceful shutdown...`);

  // Hard stop if something hangs (open keep-alive sockets, stuck provider call).
  setTimeout(() => {
    console.warn('[Shutdown] Timed out after 10s; forcing exit.');
    db.flush();
    process.exit(1);
  }, 10_000).unref();

  if (serverInstance) {
    await new Promise<void>((resolve) => {
      serverInstance!.close(() => {
        console.log('[Shutdown] HTTP server closed; in-flight requests finished.');
        resolve();
      });
      serverInstance!.closeIdleConnections?.();
    });
  }

  // Persist any debounced writes (analytics events, view counters) before exiting.
  db.flush();

  try {
    await Promise.all([
      closePostgres(),
      closeRedis()
    ]);
  } catch (e) {
    console.warn('[Shutdown] Error while closing background connections:', e);
  }

  console.log('[Shutdown] All background services terminated cleanly. Exiting.');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// The same Express app is also imported by Vercel's Node.js Function adapter.
// Vercel owns the HTTP lifecycle, so it must not call app.listen() there.
app.use(errorHandler);
export { app };

if (process.env.VERCEL !== '1') {
  startServer();
}
