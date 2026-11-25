/**
 * Cookie authentication + CSRF regression suite (part of `npm test`, runs inside scripts/run_tests.ts
 * against the isolated in-process server). It changes runtime config (password, secret, session
 * length, cookie flag) temporarily and always restores it.
 *
 * Login budget: the auth rate limiter allows 20 logins/min per IP for the whole run; this suite
 * performs 10 logins.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type http from 'http';

type Res = { status: number; body: any; headers: http.IncomingHttpHeaders };
type RequestFn = (baseUrl: string, method: string, path: string, headers?: Record<string, string>, body?: any) => Promise<Res>;
type AssertFn = (condition: boolean, testName: string, detail?: string) => void;

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);
/** Every state-changing route that is public on purpose. Anything else must require an admin session. */
const PUBLIC_UNSAFE = new Set([
  'POST /api/auth/login',
  'POST /api/auth/logout',
  'POST /api/messages',
  'POST /api/leads',
  'POST /api/events',
  'POST /api/ai/chat',
  'POST /api/ai/semantic-search',
  'POST /api/ai/project-advisor'
]);

interface Route { method: string; path: string; admin: boolean }

/** Routes declared in server.ts (one `app.<method>('<path>', …)` per line). */
function listRoutes(): Route[] {
  const src = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
  const out: Route[] = [];
  for (const m of src.matchAll(/^app\.(get|post|put|delete|patch)\(\s*'([^']+)'\s*,([^\n]*)$/gm)) {
    out.push({ method: m[1].toUpperCase(), path: m[2], admin: /\brequireAdmin\b/.test(m[3]) });
  }
  return out;
}

const probePath = (p: string) => p.replace(/:[A-Za-z]+/g, '__auth_probe__');
const cookieOf = (r: Res) => String(([] as string[]).concat(r.headers['set-cookie'] || [])[0] || '');
const cookiePair = (setCookie: string) => setCookie.split(';')[0];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runAuthCsrfSuite(baseUrl: string, adminPassword: string, request: RequestFn, assert: AssertFn): Promise<void> {
  const { config } = await import('../server/config');
  const redis = await import('../server/redis');
  const authMw = await import('../server/middleware/auth');
  const origin = config.corsOrigins[0];

  const login = (extraHeaders: Record<string, string> = {}, body: Record<string, unknown> = {}) =>
    request(baseUrl, 'POST', '/api/auth/login', extraHeaders, { password: adminPassword, ...body });

  // ---------- A. Login: cookie flags, CSRF token, no session token for the browser ----------
  // Also proves a spoofed X-Forwarded-Proto is ignored without TRUST_PROXY (no Secure over HTTP).
  const a = await login({ 'X-Forwarded-Proto': 'https' });
  const aSet = cookieOf(a);
  const aCookie = cookiePair(aSet);
  const aCsrf: string = a.body?.csrfToken || '';
  assert(a.status === 200 && /^portfolio_admin=adm_[0-9a-f]{64}$/.test(aCookie), 'A1 login sets the session cookie', `status=${a.status}`);
  assert(/;\s*HttpOnly/i.test(aSet), 'A2 session cookie is HttpOnly (unreadable by page scripts)');
  assert(/;\s*SameSite=Strict/i.test(aSet), 'A3 session cookie is SameSite=Strict');
  assert(/;\s*Path=\/api/i.test(aSet) && /;\s*Max-Age=\d+/i.test(aSet), 'A4 cookie is scoped to /api with a bounded lifetime');
  assert(!/;\s*Secure/i.test(aSet), 'A5 plain-HTTP login without TRUST_PROXY: no Secure flag, spoofed X-Forwarded-Proto ignored');
  assert(!('token' in (a.body || {})), 'A6 browser login response does not expose the session token');
  assert(/^[A-Za-z0-9_-]{43}$/.test(aCsrf), 'A7 login returns a 256-bit CSRF token', `len=${aCsrf.length}`);
  assert(!aSet.includes(aCsrf), 'A8 CSRF token is not stored in a cookie');

  const aCheck = await request(baseUrl, 'GET', '/api/auth/check', { Cookie: aCookie });
  assert(aCheck.status === 200 && aCheck.body.authenticated === true && aCheck.body.csrfToken === aCsrf, 'A9 auth check (cookie) returns the same CSRF token after a reload');

  // Bearer opt-in for scripts
  const bearerLogin = await login({}, { client: 'bearer' });
  const bearer: string = bearerLogin.body?.token || '';
  assert(bearerLogin.status === 200 && /^adm_[0-9a-f]{64}$/.test(bearer), 'A10 scripts can opt in to a Bearer token ({"client":"bearer"})');
  assert(bearerLogin.body.csrfToken !== aCsrf, 'A11 every session gets its own CSRF token');
  const bearerAuth = { Authorization: `Bearer ${bearer}` };

  // ---------- B. CSRF validation on cookie-authenticated writes ----------
  const before = (await request(baseUrl, 'GET', '/api/settings', bearerAuth)).body;
  const noToken = await request(baseUrl, 'PUT', '/api/settings', { Cookie: aCookie }, { tagline: 'csrf-attack-1' });
  assert(noToken.status === 403 && noToken.body?.code === 'CSRF_INVALID', 'B1 cookie write without CSRF token is rejected (403 CSRF_INVALID)', `status=${noToken.status}`);
  const wrongToken = await request(baseUrl, 'PUT', '/api/settings', { Cookie: aCookie, 'X-CSRF-Token': crypto.randomBytes(32).toString('base64url') }, { tagline: 'csrf-attack-2' });
  assert(wrongToken.status === 403, 'B2 cookie write with a wrong CSRF token is rejected');
  const otherSession = await request(baseUrl, 'PUT', '/api/settings', { Cookie: aCookie, 'X-CSRF-Token': bearerLogin.body.csrfToken }, { tagline: 'csrf-attack-3' });
  assert(otherSession.status === 403, 'B3 a CSRF token of another session is rejected (token bound to its session)');
  const legacy = await request(baseUrl, 'PUT', '/api/settings', { Cookie: aCookie, 'X-Requested-With': 'portfolio-admin' }, { tagline: 'csrf-attack-4' });
  assert(legacy.status === 403, 'B4 the old static X-Requested-With header is no longer accepted');
  const emptyToken = await request(baseUrl, 'PUT', '/api/settings', { Cookie: aCookie, 'X-CSRF-Token': '' }, { tagline: 'csrf-attack-5' });
  assert(emptyToken.status === 403, 'B5 an empty CSRF header is rejected');
  const formPost = await request(baseUrl, 'POST', '/api/projects', { Cookie: aCookie, Origin: 'https://evil.example', 'Content-Type': 'application/x-www-form-urlencoded' }, { title: 'csrf' });
  assert(formPost.status === 403, 'B6 simulated cross-site form POST with the cookie is rejected');
  const afterAttacks = (await request(baseUrl, 'GET', '/api/settings', bearerAuth)).body;
  assert(afterAttacks.tagline === before.tagline, 'B7 rejected CSRF attempts changed nothing');
  const good = await request(baseUrl, 'PUT', '/api/settings', { Cookie: aCookie, 'X-CSRF-Token': aCsrf }, { tagline: before.tagline || '' });
  assert(good.status === 200, 'B8 cookie write with the session CSRF token is accepted', `status=${good.status}`);
  const bearerWrite = await request(baseUrl, 'PUT', '/api/settings', bearerAuth, { tagline: before.tagline || '' });
  assert(bearerWrite.status === 200, 'B9 Bearer writes need no CSRF token (never sent automatically by browsers)');
  const csrfAsToken = await request(baseUrl, 'GET', '/api/leads', { Authorization: `Bearer ${aCsrf}` });
  assert(csrfAsToken.status === 401, 'B10 the CSRF token cannot be used as a session token');
  const cookieRead = await request(baseUrl, 'GET', '/api/leads', { Cookie: aCookie });
  assert(cookieRead.status === 200, 'B11 cookie reads (GET) need no CSRF token');

  // ---------- C. Every admin route: protection sweep ----------
  const routes = listRoutes();
  const unsafePublic = routes.filter((r) => !SAFE.has(r.method) && !r.admin).map((r) => `${r.method} ${r.path}`);
  const unexpected = unsafePublic.filter((r) => !PUBLIC_UNSAFE.has(r));
  assert(routes.length > 60 && unexpected.length === 0, 'C1 every state-changing route except the 8 intended public ones requires an admin session', unexpected.join(', ') || `routes=${routes.length}`);

  const snapshot = async () => {
    const parts: Record<string, string> = {};
    for (const r of routes.filter((x) => x.method === 'GET' && !x.path.includes(':'))) {
      const res = await request(baseUrl, 'GET', r.path, bearerAuth);
      // Process telemetry (uptime, memory) changes by itself and is not stored data.
      parts[r.path] = `${res.status}:${JSON.stringify(res.body).replace(/"(uptimeSeconds|memoryUsageMB)":\d+/g, '')}`;
    }
    return parts;
  };
  const diffSnapshots = (x: Record<string, string>, y: Record<string, string>) =>
    Object.keys(x).filter((k) => x[k] !== y[k]);
  const dataBefore = await snapshot();

  const adminUnsafe = routes.filter((r) => r.admin && !SAFE.has(r.method));
  const adminSafe = routes.filter((r) => r.admin && SAFE.has(r.method));
  const fails: Record<string, string[]> = { anon: [], badBearer: [], noCsrf: [], wrongCsrf: [], legacy: [], readNoAuth: [], readCookie: [] };
  for (const r of adminUnsafe) {
    const p = probePath(r.path);
    const id = `${r.method} ${r.path}`;
    const anon = await request(baseUrl, r.method, p, {}, {});
    if (anon.status !== 401) fails.anon.push(`${id}=${anon.status}`);
    const bad = await request(baseUrl, r.method, p, { Authorization: 'Bearer adm_forged' }, {});
    if (bad.status !== 401) fails.badBearer.push(`${id}=${bad.status}`);
    const nc = await request(baseUrl, r.method, p, { Cookie: aCookie }, {});
    if (nc.status !== 403) fails.noCsrf.push(`${id}=${nc.status}`);
    const wc = await request(baseUrl, r.method, p, { Cookie: aCookie, 'X-CSRF-Token': 'forged-token' }, {});
    if (wc.status !== 403) fails.wrongCsrf.push(`${id}=${wc.status}`);
    const lg = await request(baseUrl, r.method, p, { Cookie: aCookie, 'X-Requested-With': 'portfolio-admin' }, {});
    if (lg.status !== 403) fails.legacy.push(`${id}=${lg.status}`);
  }
  for (const r of adminSafe) {
    const p = probePath(r.path);
    const anon = await request(baseUrl, r.method, p);
    if (anon.status !== 401) fails.readNoAuth.push(`${r.path}=${anon.status}`);
    const ck = await request(baseUrl, r.method, p, { Cookie: aCookie });
    if (ck.status === 401 || ck.status === 403) fails.readCookie.push(`${r.path}=${ck.status}`);
  }
  const n = adminUnsafe.length;
  assert(n >= 35 && fails.anon.length === 0, `C2 all ${n} admin write routes reject anonymous requests (401)`, fails.anon.join(', '));
  assert(fails.badBearer.length === 0, `C3 all ${n} admin write routes reject a forged Bearer token (401)`, fails.badBearer.join(', '));
  assert(fails.noCsrf.length === 0, `C4 all ${n} admin write routes reject a cookie without CSRF token (403)`, fails.noCsrf.join(', '));
  assert(fails.wrongCsrf.length === 0, `C5 all ${n} admin write routes reject a wrong CSRF token (403)`, fails.wrongCsrf.join(', '));
  assert(fails.legacy.length === 0, `C6 all ${n} admin write routes reject the old static header (403)`, fails.legacy.join(', '));
  assert(adminSafe.length >= 4 && fails.readNoAuth.length === 0, `C7 all ${adminSafe.length} admin read routes reject anonymous requests (401)`, fails.readNoAuth.join(', '));
  assert(fails.readCookie.length === 0, `C8 all ${adminSafe.length} admin read routes accept the cookie session`, fails.readCookie.join(', '));
  const dataAfter = await snapshot();
  const changed = diffSnapshots(dataBefore, dataAfter);
  const detail = changed.map((k) => {
    const a = dataBefore[k];
    const b = dataAfter[k];
    let i = 0;
    while (i < a.length && a[i] === b[i]) i++;
    return `${k} @${i}: ${a.slice(Math.max(0, i - 60), i + 60)} => ${b.slice(Math.max(0, i - 60), i + 60)}`;
  });
  assert(changed.length === 0, `C9 the rejected probes changed no data (${Object.keys(dataBefore).length} GET endpoints identical)`, detail.join(' | '));

  // Positive sweep: every kind of admin write works with cookie + CSRF (temporary records only).
  const ck = { Cookie: aCookie, 'X-CSRF-Token': aCsrf };
  const okPath: string[] = [];
  const failPath: string[] = [];
  const step = async (label: string, run: () => Promise<Res>, expect: (r: Res) => boolean) => {
    const r = await run();
    (expect(r) ? okPath : failPath).push(expect(r) ? label : `${label}=${r.status}`);
    return r;
  };
  const crud = async (base: string, body: Record<string, unknown>, patch: Record<string, unknown>) => {
    const created = await step(`POST ${base}`, () => request(baseUrl, 'POST', base, ck, body), (r) => r.status === 200 || r.status === 201);
    const id = created.body?.id;
    if (!id) return;
    await step(`PUT ${base}/:id`, () => request(baseUrl, 'PUT', `${base}/${encodeURIComponent(id)}`, ck, patch), (r) => r.status === 200);
    await step(`DELETE ${base}/:id`, () => request(baseUrl, 'DELETE', `${base}/${encodeURIComponent(id)}`, ck), (r) => r.status === 200);
  };
  const tag = crypto.randomBytes(3).toString('hex');
  await crud('/api/projects', { title: `Cookie CRUD ${tag}`, slug: `cookie-crud-${tag}`, category: 'Test', short_description: 'x', full_description: 'x', technologies: [] }, { title: `Cookie CRUD ${tag} (edited)` });
  await crud('/api/services', { title: `Cookie Svc ${tag}`, slug: `cookie-svc-${tag}`, category: 'Test', short_description: 'x', full_description: 'x', icon: 'Code', features: [], technologies: [], active: false }, { active: false, title: `Cookie Svc ${tag} (edited)` });
  await crud('/api/skills', { name: `Cookie Skill ${tag}`, category: 'Test', level: 50 }, { level: 60 });
  await crud('/api/blog', { title: `Cookie Post ${tag}`, slug: `cookie-post-${tag}`, excerpt: 'x', content: 'x', category: 'Test', tags: [], published: false }, { excerpt: 'y' });
  await crud('/api/testimonials', { name: `Cookie Client ${tag}`, role: 'QA', company: 'Test', content: 'x', rating: 5, published: false }, { content: 'y' });
  for (const list of ['/api/experience', '/api/education', '/api/certificates', '/api/methodology', '/api/principles', '/api/architecture-nodes', '/api/courses']) {
    const cur = (await request(baseUrl, 'GET', list, ck)).body;
    await step(`PUT ${list} (unchanged list)`, () => request(baseUrl, 'PUT', list, ck, cur), (r) => r.status === 200);
  }
  const profile = (await request(baseUrl, 'GET', '/api/profile', ck)).body;
  await step('PUT /api/profile (unchanged)', () => request(baseUrl, 'PUT', '/api/profile', ck, profile), (r) => r.status === 200);
  const forms = (await request(baseUrl, 'GET', '/api/forms', ck)).body || [];
  const contact = forms.find((f: any) => f.slug === 'contact');
  if (contact) await step('PUT /api/forms/:slug (unchanged)', () => request(baseUrl, 'PUT', '/api/forms/contact', ck, { enabled: contact.enabled }), (r) => r.status === 200);
  const msgs = (await request(baseUrl, 'GET', '/api/messages', ck)).body || [];
  if (msgs[0]) await step('PUT /api/messages/:id/status', () => request(baseUrl, 'PUT', `/api/messages/${msgs[0].id}/status`, ck, { status: msgs[0].status || 'new' }), (r) => r.status === 200);
  const leads = (await request(baseUrl, 'GET', '/api/leads', ck)).body || [];
  if (leads[0]) await step('PUT /api/leads/:id', () => request(baseUrl, 'PUT', `/api/leads/${leads[0].id}`, ck, { status: leads[0].status || 'new' }), (r) => r.status === 200);
  const doc = await step('POST /api/knowledge/documents', () => request(baseUrl, 'POST', '/api/knowledge/documents', ck, { title: `Cookie doc ${tag}`, content: 'Cookie session knowledge document.' }), (r) => r.status === 200 || r.status === 201);
  const docId = doc.body?.id || doc.body?.document?.id;
  if (docId) await step('DELETE /api/knowledge/:id', () => request(baseUrl, 'DELETE', `/api/knowledge/${encodeURIComponent(docId)}`, ck), (r) => r.status === 200);
  await step('POST /api/ai/blog-assistant (no provider → 503, not 401/403)', () => request(baseUrl, 'POST', '/api/ai/blog-assistant', ck, { action: 'outline', topic: 'x' }), (r) => r.status !== 401 && r.status !== 403);
  assert(failPath.length === 0 && okPath.length >= 25, `C10 ${okPath.length} admin write operations succeed with cookie + CSRF token`, failPath.join(', '));

  // ---------- D. Cross-origin ----------
  const evilPreflight = await request(baseUrl, 'OPTIONS', '/api/settings', { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'x-csrf-token,content-type' });
  assert(evilPreflight.status === 403 && !evilPreflight.headers['access-control-allow-origin'], 'D1 preflight from a foreign origin is refused (no CORS grant for the CSRF header)');
  const okPreflight = await request(baseUrl, 'OPTIONS', '/api/settings', { Origin: origin, 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'x-csrf-token' });
  assert(okPreflight.status === 204 && okPreflight.headers['access-control-allow-origin'] === origin && /X-CSRF-Token/i.test(String(okPreflight.headers['access-control-allow-headers'])), 'D2 configured origin may send the CSRF header');
  const evilCheck = await request(baseUrl, 'GET', '/api/auth/check', { Origin: 'https://evil.example', Cookie: aCookie });
  assert(!evilCheck.headers['access-control-allow-origin'], 'D3 a foreign origin gets no CORS grant, so it cannot read the CSRF token from /api/auth/check');
  const evilWrite = await request(baseUrl, 'PUT', '/api/settings', { Origin: 'https://evil.example', Cookie: aCookie }, { tagline: 'cross-origin' });
  assert(evilWrite.status === 403, 'D4 cross-origin cookie write without the token is rejected');

  // ---------- E. Session rotation after login ----------
  const b = await login({ Cookie: aCookie });
  const bCookie = cookiePair(cookieOf(b));
  const bCsrf: string = b.body?.csrfToken || '';
  assert(b.status === 200 && bCookie !== aCookie && bCsrf !== aCsrf, 'E1 a new login issues a new session token and CSRF token');
  assert((await request(baseUrl, 'GET', '/api/leads', { Cookie: aCookie })).status === 401, 'E2 the session the browser held before logging in again is revoked (rotation)');
  assert((await request(baseUrl, 'GET', '/api/leads', { Cookie: bCookie })).status === 200, 'E3 the new session works');

  // ---------- F. Logout / logout-all ----------
  const lgNoCsrf = await request(baseUrl, 'POST', '/api/auth/logout', { Cookie: bCookie });
  assert(lgNoCsrf.status === 403 && (await request(baseUrl, 'GET', '/api/leads', { Cookie: bCookie })).status === 200, 'F1 logout without CSRF token is refused and the session stays valid (no forced logout)');
  const lg = await request(baseUrl, 'POST', '/api/auth/logout', { Cookie: bCookie, 'X-CSRF-Token': bCsrf });
  const lgSet = cookieOf(lg);
  assert(lg.status === 200 && /^portfolio_admin=;/.test(lgSet) && /Expires=Thu, 01 Jan 1970/i.test(lgSet), 'F2 logout with the token clears the cookie');
  assert((await request(baseUrl, 'GET', '/api/leads', { Cookie: bCookie })).status === 401 && (await request(baseUrl, 'GET', '/api/auth/check', { Cookie: bCookie })).status === 401, 'F3 the cookie is rejected after logout');
  assert((await request(baseUrl, 'POST', '/api/auth/logout', { Cookie: bCookie })).status === 200, 'F4 logout with an already-ended session just clears the cookie');

  const c = await login();
  const cCookie = cookiePair(cookieOf(c));
  const cCsrf: string = c.body?.csrfToken || '';
  const laNoCsrf = await request(baseUrl, 'POST', '/api/auth/logout-all', { Cookie: cCookie });
  assert(laNoCsrf.status === 403 && (await request(baseUrl, 'GET', '/api/leads', bearerAuth)).status === 200, 'F5 logout-all without CSRF token is refused and revokes nothing');
  const la = await request(baseUrl, 'POST', '/api/auth/logout-all', { Cookie: cCookie, 'X-CSRF-Token': cCsrf });
  assert(la.status === 200 && la.body.sessionsRevoked >= 2, 'F6 logout-all with cookie + token revokes every session', `revoked=${la.body?.sessionsRevoked}`);
  assert((await request(baseUrl, 'GET', '/api/leads', bearerAuth)).status === 401 && (await request(baseUrl, 'GET', '/api/leads', { Cookie: cCookie })).status === 401, 'F7 Bearer and cookie sessions on other devices are rejected after logout-all');

  // ---------- G. Session expiration ----------
  const originalDuration = config.sessionDurationMs;
  try {
    config.sessionDurationMs = 1500;
    const e = await login();
    const eCookie = cookiePair(cookieOf(e));
    await sleep(900);
    const mid = await request(baseUrl, 'GET', '/api/leads', { Cookie: eCookie });
    await sleep(900);
    const extended = await request(baseUrl, 'GET', '/api/leads', { Cookie: eCookie });
    assert(mid.status === 200 && extended.status === 200, 'G1 activity extends the sliding session lifetime');
    await sleep(1800);
    const expired = await request(baseUrl, 'GET', '/api/leads', { Cookie: eCookie });
    const expiredCheck = await request(baseUrl, 'GET', '/api/auth/check', { Cookie: eCookie });
    assert(expired.status === 401 && expiredCheck.status === 401, 'G2 an idle session expires (401 on reads and auth check)');
  } finally {
    config.sessionDurationMs = originalDuration;
  }
  const now = Date.now();
  const base = { role: 'admin', name: 'Test', csrf: 'x'.repeat(43) };
  await redis.saveAdminSession({ ...base, token: 'adm_absolute_test', createdAt: now - authMw.SESSION_ABSOLUTE_MAX_MS - 1000, expiresAt: now + 60_000, fp: authMw.credentialFingerprint() });
  assert((await request(baseUrl, 'GET', '/api/leads', { Authorization: 'Bearer adm_absolute_test' })).status === 401 && (await redis.getAdminSession('adm_absolute_test')) === null, 'G3 a session older than 7 days is rejected and deleted even if recently active');
  await redis.saveAdminSession({ ...base, token: 'adm_legacy_test', createdAt: now, expiresAt: now + 60_000 });
  assert((await request(baseUrl, 'GET', '/api/leads', { Authorization: 'Bearer adm_legacy_test' })).status === 401, 'G4 a legacy session without credential fingerprint is rejected');
  await redis.saveAdminSession({ role: 'admin', name: 'Test', token: 'adm_nocsrf_test', createdAt: now, expiresAt: now + 60_000, fp: authMw.credentialFingerprint() });
  const noCsrfRead = await request(baseUrl, 'GET', '/api/leads', { Cookie: 'portfolio_admin=adm_nocsrf_test' });
  const noCsrfWrite = await request(baseUrl, 'PUT', '/api/settings', { Cookie: 'portfolio_admin=adm_nocsrf_test', 'X-CSRF-Token': 'anything' }, { tagline: 'x' });
  assert(noCsrfRead.status === 200 && noCsrfWrite.status === 403, 'G5 a cookie session created without a CSRF token can read but never write');
  await redis.deleteAdminSession('adm_nocsrf_test');

  // ---------- H. Unauthorized access (variants of a currently valid session) ----------
  const liveTok = `adm_${crypto.randomBytes(32).toString('hex')}`;
  await redis.saveAdminSession({ ...base, token: liveTok, createdAt: Date.now(), expiresAt: Date.now() + 60_000, fp: authMw.credentialFingerprint() });
  assert((await request(baseUrl, 'GET', '/api/messages', { Cookie: `portfolio_admin=${liveTok}` })).status === 200, 'H0 control: the untampered session is accepted');
  const bad = [
    ['tampered cookie', { Cookie: `portfolio_admin=${liveTok.slice(0, -1)}${liveTok.endsWith('0') ? '1' : '0'}` }],
    ['truncated cookie', { Cookie: `portfolio_admin=${liveTok.slice(0, 40)}` }],
    ['oversized cookie', { Cookie: `portfolio_admin=${liveTok}${'a'.repeat(600)}` }],
    ['cookie with another name', { Cookie: `portfolio_admin_x=${liveTok}` }],
    ['token in the query string', { 'X-Probe': 'query' }],
    ['Bearer "undefined"', { Authorization: 'Bearer undefined' }],
    ['Basic auth with the password', { Authorization: `Basic ${Buffer.from(`admin:${adminPassword}`).toString('base64')}` }],
    ['password as Bearer token', { Authorization: `Bearer ${adminPassword}` }]
  ] as const;
  const leaked = [];
  for (const [label, h] of bad) {
    const target = label === 'token in the query string' ? `/api/messages?token=${liveTok}&access_token=${liveTok}` : '/api/messages';
    const r = await request(baseUrl, 'GET', target, h as Record<string, string>);
    if (r.status !== 401) leaked.push(`${label}=${r.status}`);
  }
  assert(leaked.length === 0, `H1 ${bad.length} forged/invalid credential variants are all rejected (401)`, leaked.join(', '));
  await redis.deleteAdminSession(liveTok);

  // ---------- I. Credential rotation (ADMIN_PASSWORD / ADMIN_SESSION_SECRET) ----------
  const originalPassword = config.adminPassword;
  const originalSecret = process.env.ADMIN_SESSION_SECRET;
  try {
    const r1 = await login();
    const r1Cookie = cookiePair(cookieOf(r1));
    config.adminPassword = `${originalPassword}-rotated`;
    assert((await request(baseUrl, 'GET', '/api/leads', { Cookie: r1Cookie })).status === 401, 'I1 changing ADMIN_PASSWORD invalidates existing sessions');
    assert((await login()).status === 401, 'I2 the old password no longer logs in after rotation');
    const r2 = await request(baseUrl, 'POST', '/api/auth/login', {}, { password: config.adminPassword });
    const r2Cookie = cookiePair(cookieOf(r2));
    assert(r2.status === 200 && (await request(baseUrl, 'GET', '/api/leads', { Cookie: r2Cookie })).status === 200, 'I3 the new password logs in');
    config.adminPassword = originalPassword;
    assert((await request(baseUrl, 'GET', '/api/leads', { Cookie: r2Cookie })).status === 401, 'I4 reverting the password also invalidates sessions issued in between');

    const r3 = await login();
    const r3Cookie = cookiePair(cookieOf(r3));
    process.env.ADMIN_SESSION_SECRET = `rotated-${crypto.randomBytes(8).toString('hex')}`;
    assert((await request(baseUrl, 'GET', '/api/leads', { Cookie: r3Cookie })).status === 401, 'I5 changing ADMIN_SESSION_SECRET invalidates existing sessions');
    if (originalSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = originalSecret;
    assert((await request(baseUrl, 'GET', '/api/leads', { Cookie: r3Cookie })).status === 401, 'I6 a session rejected after rotation was deleted (does not come back when the secret is reverted)');
  } finally {
    config.adminPassword = originalPassword;
    if (originalSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = originalSecret;
  }

  // ---------- J. Secure cookie in production (SESSION_COOKIE_SECURE=true) ----------
  try {
    config.cookieSecure = true;
    const s = await login();
    assert(s.status === 200 && /;\s*Secure/i.test(cookieOf(s)), 'J1 SESSION_COOKIE_SECURE=true marks the session cookie Secure');
    await request(baseUrl, 'POST', '/api/auth/logout', { Cookie: cookiePair(cookieOf(s)), 'X-CSRF-Token': s.body.csrfToken });
  } finally {
    config.cookieSecure = false;
  }
}
