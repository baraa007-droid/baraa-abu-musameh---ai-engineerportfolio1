/**
 * Isolated browser E2E (Playwright/Chromium) for the public site and all 18 admin tabs.
 *
 * Isolation: same preamble as scripts/run_tests.ts (temp DATA_DIR, random admin password, no
 * credentials, NODE_ENV=test) + scripts/test-guard.cjs blocks every non-loopback connection from
 * Node. In the browser every request that is not 127.0.0.1 is aborted (fonts, remote images).
 * Run with:  npm run test:e2e
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const PORT = 3895;
process.env.PORT = String(PORT);
process.env.HOST = '127.0.0.1';
process.env.NODE_ENV = 'test';
process.env.CORS_ORIGIN = `http://127.0.0.1:${PORT}`;
for (const key of ['DATABASE_URL', 'POSTGRES_URL', 'REDIS_URL', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'GEMINI_API_KEY', 'OPENROUTER_API_KEY', 'NOTIFICATION_EMAIL_TO', 'NOTIFICATION_EMAIL_FROM', 'ADMIN_SESSION_SECRET']) {
  delete process.env[key];
}
process.env.NOTIFICATIONS_ENABLED = 'false';
process.env.EMAIL_PROVIDER = 'none';
process.env.FORM_RATE_LIMIT = '100';
// The suite intentionally performs many UI logins across independent auth flows.
// Keep the production default (20/min) unchanged while preventing the test harness
// from rate-limiting itself during its multi-minute run.
process.env.AUTH_RATE_LIMIT = '100';
const ADMIN_PASSWORD = `e2e-${crypto.randomBytes(16).toString('hex')}`;
process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
const PROJECT_DATA_DIR = path.join(process.cwd(), '.data');
const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-e2e-'));
process.env.DATA_DIR = TEST_DATA_DIR;

function hashDir(dir: string): string {
  const h = crypto.createHash('sha256');
  if (!fs.existsSync(dir)) return 'missing';
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isFile()) h.update(name).update(fs.readFileSync(full));
  }
  return h.digest('hex');
}
const dataHashBefore = hashDir(PROJECT_DATA_DIR);

type Row = { area: string; check: string; ok: boolean; detail?: string };
const rows: Row[] = [];
function record(area: string, check: string, ok: boolean, detail?: string) {
  rows.push({ area, check, ok, detail });
  console.log(`  ${ok ? '✓' : '✗'} [${area}] ${check}${detail ? ` (${detail})` : ''}`);
}

const BASE = `http://127.0.0.1:${PORT}`;
let token = '';
async function api(method: string, p: string, body?: unknown, auth = true): Promise<{ status: number; body: any }> {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(auth && token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let parsed: any = text;
  try { parsed = JSON.parse(text); } catch { /* text */ }
  return { status: res.status, body: parsed };
}

async function main() {
  await import('../server');
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${BASE}/live`)).ok) break; } catch { /* starting */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  const login = await api('POST', '/api/auth/login', { password: ADMIN_PASSWORD, client: 'bearer' }, false);
  token = login.body.token;

  // ---- Seed (temporary database only) ----
  await api('PUT', '/api/settings', { cta_banner_enabled: false, maintenance_mode: false, ai_enabled: true });
  await api('POST', '/api/projects', { title: 'E2E Gallery Project', slug: 'e2e-gallery-project', category: 'AI', short_description: 'Seeded for E2E', full_description: 'x', gallery: ['/images/baraa-profile.webp'], technologies: ['TypeScript'], featured: true, status: 'completed' });
  await api('POST', '/api/services', { title: 'E2E Active Service', slug: 'e2e-active-service', category: 'Web', short_description: 'Visible', full_description: 'x', icon: 'Code', features: ['F1'], technologies: [], deliverables: ['D1'], active: true, starting_price: '$100', timeline: '1 week' });
  await api('POST', '/api/services', { title: 'E2E Hidden Service', slug: 'e2e-hidden-service', category: 'Web', short_description: 'Hidden', full_description: 'x', icon: 'Code', features: [], technologies: [], active: false });
  await api('POST', '/api/blog', { title: 'E2E Published Post', slug: 'e2e-published-post', excerpt: 'x', content: '# Hello', category: 'Test', tags: ['e2e'], published: true, read_time: '1 min' });
  await api('POST', '/api/blog', { title: 'E2E Draft Post', slug: 'e2e-draft-post', excerpt: 'x', content: 'secret', category: 'Test', tags: [], published: false, read_time: '1 min' });
  await api('PUT', '/api/experience', [
    { id: 'exp-e2e-1', role: 'Current Role E2E', company: 'Now Co', location: 'Remote', start_date: '2023-01', end_date: '', current: true, description: 'x', technologies: ['TS'] },
    { id: 'exp-e2e-2', role: 'Past Role E2E', company: 'Old Co', location: 'Remote', start_date: '2020-01', end_date: '2022-12', current: false, description: 'y', technologies: [] }
  ]);
  await api('POST', '/api/leads', { name: 'E2E Lead', email: 'lead@example.com', description: 'Need a RAG system', required_features: [], reference_links: ['https://ref.example'] }, false);
  await api('POST', '/api/messages', { name: 'E2E Sender', email: 'sender@example.com', subject: 'Hello', message: 'E2E message body' }, false);

  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  // Nothing leaves the machine: external fonts/images are aborted.
  await context.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === '127.0.0.1' || u.hostname === 'localhost' || u.protocol === 'data:' || u.protocol === 'blob:') return route.continue();
    return route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  const consoleErrors: string[] = [];
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/Failed to load resource|ERR_FAILED|net::/.test(t)) return; // blocked external requests (by design)
    consoleErrors.push(t.slice(0, 200));
  });
  page.on('dialog', (d) => d.accept());
  // waitForResponse that never produces an unhandled rejection if the triggering action fails
  const wfr = (pred: (r: import('@playwright/test').Response) => boolean) => {
    const p = page.waitForResponse(pred, { timeout: 15_000 });
    p.catch(() => {});
    return p;
  };
  const takeErrors = () => consoleErrors.splice(0, consoleErrors.length);
  const noOverflow = async () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth <= 1);
  const hasBoundary = async () => (await page.locator('text=/Something went wrong rendering this view|Admin Workspace Error/').count()) > 0;

  // =============================== PUBLIC SITE ===============================
  console.log('\n[Public site]');
  const publicRoutes: [string, string, RegExp | null][] = [
    ['/', 'Home', null],
    ['/about', 'About', /Past Role E2E/],
    ['/projects', 'Projects', /E2E Gallery Project/],
    ['/projects/e2e-gallery-project', 'Project details', /E2E Gallery Project/],
    ['/services', 'Services', /E2E Active Service/],
    ['/services/e2e-active-service', 'Service details', /E2E Active Service/],
    ['/blog', 'Blog', /E2E Published Post/],
    ['/blog/e2e-published-post', 'Blog details', /E2E Published Post/],
    ['/contact', 'Contact', null],
    ['/start-project', 'Start Project', null]
  ];
  for (const [route, name, expect] of publicRoutes) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    // This is a Vite-backed SPA. HMR/dev-server activity can keep the network
    // perpetually non-idle even after the document and API data are ready.
    // The assertions below wait for the rendered content, so networkidle adds
    // delay without increasing coverage.
    if (expect) await page.getByText(expect).first().waitFor({ timeout: 15_000 }).catch(() => {});
    const body = await page.locator('body').innerText();
    const errs = takeErrors();
    record('Public', `${name} renders without errors`, !(await hasBoundary()) && body.trim().length > 200 && errs.length === 0, errs.join(' | ') || undefined);
    if (expect) record('Public', `${name} shows seeded content`, expect.test(body));
  }

  await page.goto(`${BASE}/projects`);
  await page.getByText('E2E Gallery Project').first().waitFor();
  record('Public', 'Project card image comes from gallery', (await page.locator('img[src*="baraa-profile.webp"]').count()) > 0);
  await page.goto(`${BASE}/services`);
  await page.getByText('E2E Active Service').first().waitFor();
  record('Public', 'Inactive service is not listed', !(await page.locator('body').innerText()).includes('E2E Hidden Service'));
  await page.goto(`${BASE}/blog`);
  await page.getByText('E2E Published Post').first().waitFor();
  record('Public', 'Draft post is not listed', !(await page.locator('body').innerText()).includes('E2E Draft Post'));
  await page.goto(`${BASE}/blog/e2e-draft-post`);
  await page.waitForTimeout(1500);
  record('Public', 'Draft post URL does not show the draft', !(await page.locator('body').innerText()).includes('secret'));

  // Start Similar Project → prefilled intake form
  await page.goto(`${BASE}/projects/e2e-gallery-project`);
  const similar = page.getByRole('button', { name: /Start Similar Project|بدء مشروع مماثل/i }).first();
  await similar.waitFor({ timeout: 20_000 }).catch(() => {});
  if (await similar.count()) {
    await similar.click();
    await page.waitForURL(/start-project/, { timeout: 10_000 }).catch(() => {});
    await page.locator('textarea').first().waitFor();
    const desc = await page.locator('textarea').first().inputValue();
    record('Public', 'Start Similar Project pre-fills the intake form', /E2E Gallery Project/.test(desc), desc.slice(0, 60));
  } else {
    record('Public', 'Start Similar Project button present', false);
  }
  await page.goto(`${BASE}/start-project`);
  await page.locator('select').first().waitFor();
  const selectValues = await page.locator('select').evaluateAll((els) => els.map((e) => (e as HTMLSelectElement).value));
  record('Public', 'Intake selects start empty (no budget/urgency chosen for the user)', selectValues.every((v) => v === ''), JSON.stringify(selectValues));

  // Contact form: success, then simulated server failure must not show success
  await page.goto(`${BASE}/contact`);
  const contactForm = page.locator('form').first();
  await contactForm.waitFor();
  await contactForm.locator('input[type="text"]:not([name="_hp"])').first().fill('E2E Visitor');
  await contactForm.locator('input[type="email"]').first().fill('visitor@example.com');
  await contactForm.locator('textarea').first().fill('Hello from the E2E test');
  const contactResp = wfr((r) => r.url().endsWith('/api/messages') && r.request().method() === 'POST');
  await contactForm.locator('button[type="submit"]').click();
  const ok1 = (await contactResp).status();
  await page.waitForTimeout(500);
  const msgs = await api('GET', '/api/messages');
  record('Public', 'Contact form submits and the message is stored', ok1 === 201 && msgs.body.some((m: any) => m.message === 'Hello from the E2E test'));
  await page.goto(`${BASE}/contact`);
  await page.route('**/api/messages', (r) => (r.request().method() === 'POST' ? r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"Internal server error"}' }) : r.continue()));
  const cf = page.locator('form').first();
  await cf.waitFor();
  await cf.locator('input[type="text"]:not([name="_hp"])').first().fill('E2E Visitor');
  await cf.locator('input[type="email"]').first().fill('visitor@example.com');
  await cf.locator('textarea').first().fill('This one fails');
  await cf.locator('button[type="submit"]').click();
  await page.waitForTimeout(1200);
  const failText = await page.locator('body').innerText();
  record('Public', 'Failed contact submission shows an error, not success', /Internal server error|failed|فشل/i.test(failText) && (await page.locator('form').count()) > 0);
  await page.unroute('**/api/messages');

  // Network failure must not white-screen the site
  await page.route('**/api/projects', (r) => r.abort());
  await page.goto(`${BASE}/`);
  await page.waitForTimeout(2500);
  record('Public', 'API outage does not blank the page', (await page.locator('body').innerText()).trim().length > 200 && !(await hasBoundary()));
  await page.unroute('**/api/projects');
  takeErrors();

  // SEO basics + mobile layout
  await page.goto(`${BASE}/`);
  await page.locator('body').waitFor({ timeout: 15_000 });
  record('Public', 'Home has <title> and meta description', Boolean(await page.title()) && (await page.locator('meta[name="description"]').count()) > 0);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [route, name] of publicRoutes) {
    await page.goto(`${BASE}${route}`);
    await page.waitForTimeout(800);
    record('Mobile', `${name}: no horizontal overflow at 390px`, await noOverflow());
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  takeErrors();

  // =============================== ADMIN ===============================
  console.log('\n[Admin]');
  await page.goto(`${BASE}/admin`);
  await page.waitForURL(/\/admin\/login/, { timeout: 15_000 }).catch(() => {});
  record('Auth', 'Unauthenticated /admin redirects to login', page.url().includes('/admin/login'));
  await page.locator('input[type="password"]').fill('wrong-password');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(1000);
  record('Auth', 'Wrong password is rejected with a message', page.url().includes('/admin/login') && /invalid|failed|خاطئ|غير صحيح/i.test(await page.locator('body').innerText()));
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20_000 });
  await page.getByRole('button', { name: /^Overview/ }).waitFor({ timeout: 60_000 });
  record('Auth', 'Correct password opens the dashboard', true);

  const openTab = async (name: RegExp) => {
    await page.getByRole('button', { name }).first().click();
    await page.waitForTimeout(400);
  };
  const tabs: [string, RegExp][] = [
    ['Overview', /^Overview/], ['Leads', /^Inbound Leads/], ['Messages', /^Messages/], ['Projects', /^Projects \(/],
    ['Services', /^Services \(/], ['Blog', /^Blog \(/], ['Skills', /^Skills \(/], ['Methodology', /^Methodology/],
    ['Principles', /^Principles/], ['Hero Nodes', /^Hero Nodes/], ['Experience', /^Experience$/], ['Education & Certs', /^Education/],
    ['Courses', /^Courses/], ['Testimonials', /^Testimonials/], ['Profile', /^Profile$/], ['Knowledge', /^RAG Knowledge/],
    ['Forms', /^Forms$/], ['Settings', /^Settings$/]
  ];
  takeErrors();
  for (const [label, re] of tabs) {
    console.log(`[E2E phase] opening admin tab: ${label}`);
    await openTab(re);
    const errs = takeErrors();
    record(label, 'tab opens without error boundary or console errors', !(await hasBoundary()) && errs.length === 0, errs.join(' | ') || undefined);
    record(label, 'no horizontal overflow (desktop)', await noOverflow());
  }

  // ---- generic CRUD through the UI, verified through the API ----
  // Nearest ancestor of the record text that contains exactly ONE such button = that record's own
  // card. (Taking the first button of a larger container could act on a different record.)
  const ancestorWith = (text: string, icon: string) =>
    page.getByText(text, { exact: false }).first().locator(`xpath=ancestor::*[count(.//button[.//*[name()="svg" and contains(@class,"${icon}")]])=1][1]`);
  const resetDashboard = async () => {
    // Keep the authenticated dashboard alive between CRUD checks. Reloading
    // `/admin` for every tab re-fetches the entire public dataset (14+ API
    // calls) and made the suite exceed its harness limit without adding test
    // coverage. Clicking Overview resets the selected tab without a reload.
    const overlay = page.locator('div.fixed.inset-0').last();
    if (await overlay.count() > 0) {
      const close = overlay.getByRole('button', { name: /Cancel|Close|إغلاق|إلغاء/i }).first();
      if (await close.count() > 0) await close.click({ force: true });
    }
    if (!page.url().includes('/admin') || await page.getByRole('button', { name: /^Overview/ }).count() === 0) {
      await page.goto(`${BASE}/admin`);
    } else {
      await page.getByRole('button', { name: /^Overview/ }).first().click();
    }
    await page.getByRole('button', { name: /^Overview/ }).waitFor({ timeout: 60_000 });
    takeErrors();
  };
  /** Starts waiting for a response, runs the action, never leaves an unhandled rejection. */
  async function act(pred: (r: import('@playwright/test').Response) => boolean, action: () => Promise<unknown>): Promise<number> {
    const p = page.waitForResponse(pred, { timeout: 15_000 });
    p.catch(() => {});
    await action();
    return (await p).status();
  }
  const isWrite = (r: import('@playwright/test').Response, methods: string[]) => r.url().includes('/api/') && methods.includes(r.request().method());
  async function fillByValue(value: string, next: string) {
    const form = page.locator('form').last();
    // first editable field whose value starts with the marker (read-only ids are skipped)
    const idx = await form.locator('input, textarea').evaluateAll((els, v) => els.findIndex((e) => !(e as HTMLInputElement).readOnly && (e as HTMLInputElement).value.startsWith(v)), value);
    if (idx < 0) throw new Error(`no field with value ${value}`);
    await form.locator('input, textarea').nth(idx).fill(next);
  }

  async function fillAndSubmit(marker: string) {
    const form = page.locator('form').last();
    await form.waitFor();
    const fields = form.locator('input:visible, textarea:visible');
    const n = await fields.count();
    let markerSet = false;
    for (let i = 0; i < n; i++) {
      const f = fields.nth(i);
      const type = ((await f.getAttribute('type')) || 'text').toLowerCase();
      if (['checkbox', 'radio', 'file', 'range', 'hidden', 'submit', 'button', 'color'].includes(type)) continue;
      const tag = await f.evaluate((el) => el.tagName.toLowerCase());
      const ph = ((await f.getAttribute('placeholder')) || '').toLowerCase();
      if (!markerSet && tag === 'input' && type === 'text' && !/http|url|image|link/.test(ph)) { await f.fill(marker); markerSet = true; continue; }
      if (await f.inputValue()) continue;
      if (type === 'url' || /http|url|image|link/.test(ph)) await f.fill('https://e2e.example/resource');
      else if (type === 'number') await f.fill((await f.getAttribute('min')) || '3');
      else if (type === 'email') await f.fill('e2e@example.com');
      else if (type === 'date') await f.fill('2024-01-15');
      else if (type === 'month') await f.fill('2024-01');
      else await f.fill(tag === 'textarea' ? `${marker} description` : `${marker} value`);
    }
    return act((r) => isWrite(r, ['POST', 'PUT']), () => form.locator('button[type="submit"]').first().click());
  }
  async function crud(label: string, tabRe: RegExp, openBtn: RegExp, listPath: string) {
    const marker = `E2E ${label} ${crypto.randomBytes(2).toString('hex')}`;
    const has = async (m: string) => JSON.stringify((await api('GET', listPath)).body).includes(m);
    try {
      await resetDashboard();
      await openTab(tabRe);
      await page.getByRole('button', { name: openBtn }).first().click();
      const s1 = await fillAndSubmit(marker);
      await page.waitForTimeout(500);
      record(label, 'create via UI', s1 < 400 && (await has(marker)), `HTTP ${s1}`);
    } catch (e: any) {
      record(label, 'create via UI', false, e.message.split('\n')[0]);
      return;
    }
    try {
      await ancestorWith(marker, 'lucide-pen').locator('button:has(svg[class*="lucide-pen"]), button:has(svg[class*="lucide-edit"]), button:has(svg[class*="lucide-pencil"])').first().click();
      await fillByValue(marker, `${marker} edited`);
      const s2 = await act((r) => isWrite(r, ['POST', 'PUT']), () => page.locator('form').last().locator('button[type="submit"]').first().click());
      await page.waitForTimeout(400);
      record(label, 'update via UI', s2 < 400 && (await has(`${marker} edited`)), `HTTP ${s2}`);
    } catch (e: any) {
      record(label, 'update via UI', false, e.message.split('\n')[0]);
    }
    try {
      const s3 = await act((r) => isWrite(r, ['DELETE', 'PUT']), () => ancestorWith(marker, 'lucide-trash').locator('button:has(svg[class*="lucide-trash"])').first().click());
      await page.waitForTimeout(400);
      record(label, 'delete via UI (test record only)', s3 < 400 && !(await has(marker)), `HTTP ${s3}`);
    } catch (e: any) {
      record(label, 'delete via UI (test record only)', false, e.message.split('\n')[0]);
    }
    const errs = takeErrors();
    if (errs.length) record(label, 'no console errors during CRUD', false, errs.join(' | '));
  }

  for (const [label, tabRe, openBtn, listPath] of [
    ['Projects', /^Projects \(/, /New Project/, '/api/projects'],
    ['Services', /^Services \(/, /New Service/, '/api/services?all=true'],
    ['Blog', /^Blog \(/, /New Article/, '/api/blog?all=true'],
    ['Skills', /^Skills \(/, /Add Skill/, '/api/skills'],
    ['Testimonials', /^Testimonials/, /Add Testimonial/, '/api/testimonials?all=true'],
    ['Experience', /^Experience$/, /Add Experience/, '/api/experience'],
    ['Education & Certs', /^Education/, /Add Education/, '/api/education'],
    ['Courses', /^Courses/, /Add Course/, '/api/courses'],
    ['Methodology', /^Methodology/, /New Step/, '/api/methodology'],
    ['Principles', /^Principles/, /New Principle/, '/api/principles'],
    ['Hero Nodes', /^Hero Nodes/, /New Architecture Node/, '/api/architecture-nodes']
  ] as const) {
    console.log(`[E2E phase] CRUD: ${label}`);
    await crud(label, tabRe, openBtn, listPath);
  }

  // Leads
  try {
    await resetDashboard();
    await openTab(/^Inbound Leads/);
    const leadSelect = page.locator('select').filter({ has: page.locator('option[value="in_discussion"]') }).first();
    let resp = wfr((r) => r.url().includes('/api/leads/') && r.request().method() === 'PUT');
    await leadSelect.selectOption('contacted');
    await resp;
    record('Leads', 'status change persists', (await api('GET', '/api/leads')).body.some((l: any) => l.status === 'contacted'));
    await page.locator('#lead-notes').fill('Called the client (E2E)');
    resp = wfr((r) => r.url().includes('/api/leads/') && r.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Save Notes' }).click();
    await resp;
    record('Leads', 'private notes save', (await api('GET', '/api/leads')).body.some((l: any) => l.notes === 'Called the client (E2E)'));
    const before = (await api('GET', '/api/leads')).body.length;
    resp = wfr((r) => r.url().includes('/api/leads/') && r.request().method() === 'DELETE');
    await page.getByTitle('Delete Lead').click();
    await resp;
    record('Leads', 'delete (test record)', (await api('GET', '/api/leads')).body.length === before - 1);
  } catch (e: any) { record('Leads', 'UI actions', false, e.message.split('\n')[0]); }

  // Messages
  try {
    await resetDashboard();
    await openTab(/^Messages/);
    const msgSelect = page.locator('select').filter({ has: page.locator('option[value="replied"]') }).first();
    let resp = wfr((r) => r.url().includes('/api/messages/') && r.request().method() === 'PUT');
    await msgSelect.selectOption('archived');
    await resp;
    record('Messages', 'status change persists', (await api('GET', '/api/messages')).body.some((m: any) => m.status === 'archived'));
    const before = (await api('GET', '/api/messages')).body.length;
    resp = wfr((r) => r.url().includes('/api/messages/') && r.request().method() === 'DELETE');
    await ancestorWith('Reply', 'lucide-trash').locator('button:has(svg[class*="lucide-trash"])').first().click();
    await resp;
    record('Messages', 'delete (test record)', (await api('GET', '/api/messages')).body.length === before - 1);
  } catch (e: any) { record('Messages', 'UI actions', false, e.message.split('\n')[0]); }

  // Knowledge
  try {
    await resetDashboard();
    await openTab(/^RAG Knowledge/);
    const title = `E2E Knowledge ${crypto.randomBytes(2).toString('hex')}`;
    await page.locator('input[placeholder^="Document Title"]').fill(title);
    await page.locator('textarea[placeholder^="Document Content"]').fill('Paragraph one about pgvector.\n\nParagraph two about BM25.');
    let resp = wfr((r) => r.url().includes('/api/knowledge/documents') && r.request().method() === 'POST');
    await page.getByRole('button', { name: /Add Document/ }).click();
    const st = (await resp).status();
    await page.waitForTimeout(600);
    const kn = await api('GET', '/api/knowledge');
    const doc = kn.body.documents.find((d: any) => d.title === title);
    record('Knowledge', 'add document → chunked and indexed', st === 201 && doc?.chunks_count === 2, `chunks=${doc?.chunks_count}`);
    record('Knowledge', 'document listed in UI', await page.getByText(title).first().isVisible());
    resp = wfr((r) => r.url().includes('/api/knowledge/') && r.request().method() === 'DELETE');
    await page.getByLabel(`Delete ${title}`).click();
    await resp;
    await page.waitForTimeout(400);
    record('Knowledge', 'delete document', !(await api('GET', '/api/knowledge')).body.documents.some((d: any) => d.title === title));
    resp = wfr((r) => r.url().includes('/api/knowledge/reindex'));
    await page.getByRole('button', { name: /Rebuild Vector Index/ }).click();
    await resp;
    await page.waitForTimeout(500);
    record('Knowledge', 'reindex reports honest status (no provider configured)', /No embedding provider is configured/.test(await page.locator('body').innerText()));
  } catch (e: any) { record('Knowledge', 'UI actions', false, e.message.split('\n')[0]); }

  // Forms
  try {
    await resetDashboard();
    await openTab(/^Forms$/);
    const toggle = page.locator('button[title*="isable form"], button[title*="nable form"]').first();
    if (await toggle.count()) {
      let resp = wfr((r) => r.url().includes('/api/forms/') && r.request().method() === 'PUT');
      await toggle.click();
      const s = (await resp).status();
      const forms = (await api('GET', '/api/forms')).body;
      record('Forms', 'enable/disable form persists (partial update)', s === 200 && forms.some((f: any) => f.active === false), `HTTP ${s}`);
      resp = wfr((r) => r.url().includes('/api/forms/') && r.request().method() === 'PUT');
      await page.locator('button[title*="nable form"]').first().click();
      await resp;
      record('Forms', 're-enable form', (await api('GET', '/api/forms')).body.every((f: any) => f.active === true));
    } else {
      record('Forms', 'enable/disable control present', false, 'toggle not found');
    }
  } catch (e: any) { record('Forms', 'UI actions', false, e.message.split('\n')[0]); }

  // Profile
  try {
    await resetDashboard();
    await openTab(/^Profile$/);
    const resp = wfr((r) => r.url().endsWith('/api/profile') && r.request().method() === 'PUT');
    await page.getByRole('button', { name: /Save Profile Changes/ }).click();
    record('Profile', 'save profile', (await resp).status() === 200);
  } catch (e: any) { record('Profile', 'save profile', false, e.message.split('\n')[0]); }

  // Settings: success path, then forced failure must not show "Saved"
  try {
    await resetDashboard();
    await openTab(/^Settings$/);
    let resp = wfr((r) => r.url().endsWith('/api/settings') && r.request().method() === 'PUT');
    await page.getByRole('button', { name: /Save All Settings/ }).first().click();
    const s = (await resp).status();
    record('Settings', 'save settings shows success only after HTTP 200', s === 200 && (await page.getByText(/Saved!/).count()) > 0, `HTTP ${s}`);
    // wait for the first success notice to disappear before forcing a failure
    await page.getByText(/Saved!/).first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {});
    await page.route('**/api/settings', (r) => (r.request().method() === 'PUT' ? r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"Internal server error"}' }) : r.continue()));
    resp = wfr((r) => r.url().endsWith('/api/settings') && r.request().method() === 'PUT');
    await page.getByRole('button', { name: /Save All Settings/ }).first().click();
    await resp;
    await page.getByRole('alert').first().waitFor({ timeout: 10_000 }).catch(() => {});
    record('Settings', 'failed save shows an error and no "Saved!"', (await page.getByRole('alert').count()) > 0 && (await page.getByText(/Saved!/).count()) === 0);
    await page.unroute('**/api/settings');
  } catch (e: any) { record('Settings', 'save flows', false, e.message.split('\n')[0]); }

  // Services: inactive services visible to admin
  await resetDashboard();
  await openTab(/^Services \(/);
  record('Services', 'inactive service visible in admin', (await page.locator('body').innerText()).includes('E2E Hidden Service'));
  await openTab(/^Blog \(/);
  record('Blog', 'drafts visible in admin', (await page.locator('body').innerText()).includes('E2E Draft Post'));

  // ---- Certificates (sub-section of Education & Certs) ----
  await crud('Certificates', /^Education/, /Add Certificate/, '/api/certificates');

  // ---- Profile image upload (file picker → crop → save) ----
  try {
    await resetDashboard();
    await openTab(/^Profile$/);
    await page.locator('input[type="file"]').setInputFiles(path.join(process.cwd(), 'public', 'images', 'baraa-profile.webp'));
    await page.waitForTimeout(1500); // crop preview renders asynchronously
    const st = await act((r) => r.url().endsWith('/api/profile') && r.request().method() === 'PUT', () => page.getByRole('button', { name: /Save Profile Changes/ }).click());
    const avatar = String((await api('GET', '/api/profile')).body.avatar_url || '');
    record('Profile', 'avatar upload is cropped and saved as an inline image', st === 200 && /^data:image\/(webp|png|jpeg);base64,/.test(avatar), `HTTP ${st}, ${avatar.slice(0, 22)}…`);
  } catch (e: any) { record('Profile', 'avatar upload', false, e.message.split('\n')[0]); }

  // ---- Featured / Published / Active / Enabled toggles ----
  async function toggleInEditForm(label: string, tabRe: RegExp, recordText: string, checkboxText: RegExp, listPath: string, pick: (list: any[]) => any, field: string) {
    try {
      await resetDashboard();
      await openTab(tabRe);
      const before = pick((await api('GET', listPath)).body)?.[field];
      await ancestorWith(recordText, 'lucide-pen').locator('button:has(svg[class*="lucide-pen"]), button:has(svg[class*="lucide-edit"])').first().click();
      // nearest ancestor of the label text that contains a checkbox (works with or without <label>)
      await page.locator('form').last().getByText(checkboxText).first().locator('xpath=ancestor::*[.//input[@type="checkbox"]][1]').locator('input[type="checkbox"]').first().click();
      const st = await act((r) => isWrite(r, ['PUT', 'POST']), () => page.locator('form').last().locator('button[type="submit"]').first().click());
      await page.waitForTimeout(300);
      const after = pick((await api('GET', listPath)).body)?.[field];
      record(label, `${field} toggle persists (${String(before !== false)} → ${String(after !== false)})`, st < 400 && (before !== false) !== (after !== false), `HTTP ${st}`);
      return after;
    } catch (e: any) {
      record(label, `${field} toggle`, false, e.message.split('\n')[0]);
      return undefined;
    }
  }
  const svcActive = await toggleInEditForm('Services', /^Services \(/, 'E2E Active Service', /Active Offering/, '/api/services?all=true', (l) => l.find((s: any) => s.slug === 'e2e-active-service'), 'active');
  if (svcActive === false) {
    const pub = (await api('GET', '/api/services', undefined, false)).body;
    record('Services', 'deactivated service disappears from the public API', !pub.some((s: any) => s.slug === 'e2e-active-service'));
  }
  const draftPublished = await toggleInEditForm('Blog', /^Blog \(/, 'E2E Draft Post', /Published/, '/api/blog?all=true', (l) => l.find((b: any) => b.slug === 'e2e-draft-post'), 'published');
  if (draftPublished === true) {
    const pub = (await api('GET', '/api/blog', undefined, false)).body;
    record('Blog', 'published draft appears in the public API', pub.some((b: any) => b.slug === 'e2e-draft-post'));
  }
  await toggleInEditForm('Projects', /^Projects \(/, 'E2E Gallery Project', /Featured Case Study/, '/api/projects', (l) => l.find((p: any) => p.slug === 'e2e-gallery-project'), 'featured');
  const firstTestimonial = (await api('GET', '/api/testimonials?all=true')).body[0];
  if (firstTestimonial) {
    await toggleInEditForm('Testimonials', /^Testimonials/, firstTestimonial.name, /Published on Site/, '/api/testimonials?all=true', (l) => l.find((t: any) => t.id === firstTestimonial.id), 'published');
  }
  async function toggleInList(label: string, tabRe: RegExp, titleRe: RegExp, listPath: string, field: string) {
    try {
      await resetDashboard();
      await openTab(tabRe);
      const before = JSON.stringify((await api('GET', listPath)).body.map((x: any) => x[field]));
      const st = await act((r) => isWrite(r, ['PUT']), () => page.getByTitle(titleRe).first().click());
      await page.waitForTimeout(300);
      const after = JSON.stringify((await api('GET', listPath)).body.map((x: any) => x[field]));
      record(label, `${field} toggle from the list persists`, st < 400 && before !== after, `HTTP ${st}`);
    } catch (e: any) { record(label, `${field} list toggle`, false, e.message.split('\n')[0]); }
  }
  await toggleInList('Methodology', /^Methodology/, /^(Disable|Enable)$/, '/api/methodology', 'enabled');
  await toggleInList('Principles', /^Principles/, /^(Disable|Enable)$/, '/api/principles', 'enabled');
  await toggleInList('Hero Nodes', /^Hero Nodes/, /^(Disable|Enable)$/, '/api/architecture-nodes', 'enabled');
  await toggleInList('Courses', /^Courses/, /^(Publish|Unpublish)$/, '/api/courses', 'published');
  await toggleInList('Education & Certs', /^Education/, /^(Publish|Unpublish)$/, '/api/education', 'published');

  // ---- Network failure while saving: error shown, form and input kept ----
  try {
    await resetDashboard();
    await openTab(/^Projects \(/);
    await ancestorWith('E2E Gallery Project', 'lucide-pen').locator('button:has(svg[class*="lucide-pen"]), button:has(svg[class*="lucide-edit"])').first().click();
    await fillByValue('E2E Gallery Project', 'E2E Gallery Project (unsaved)');
    await page.route('**/api/projects/**', (r) => (r.request().method() === 'PUT' ? r.abort('connectionfailed') : r.continue()));
    await page.locator('form').last().locator('button[type="submit"]').first().click();
    await page.getByRole('alert').first().waitFor({ timeout: 10_000 }).catch(() => {});
    const formStillOpen = (await page.locator('form').count()) > 0;
    const kept = await page.locator('form').last().locator('input, textarea').evaluateAll((els) => els.some((e) => (e as HTMLInputElement).value === 'E2E Gallery Project (unsaved)'));
    record('Projects', 'network failure on save: error shown, form stays open with the input', (await page.getByRole('alert').count()) > 0 && formStillOpen && kept);
    const stored = (await api('GET', '/api/projects')).body.find((p: any) => p.slug === 'e2e-gallery-project');
    record('Projects', 'nothing is saved when the request fails', stored?.title === 'E2E Gallery Project');
    await page.unroute('**/api/projects/**');
  } catch (e: any) { record('Projects', 'network failure on save', false, e.message.split('\n')[0]); }

  // ---- Every admin tab at phone width ----
  await resetDashboard();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [label, re] of tabs) {
    await page.getByRole('button', { name: re }).first().scrollIntoViewIfNeeded().catch(() => {});
    await openTab(re);
    const errs = takeErrors();
    record('Mobile', `${label}: renders at 390px without overflow or errors`, (await noOverflow()) && !(await hasBoundary()) && errs.length === 0, errs.join(' | ') || undefined);
  }
  await page.setViewportSize({ width: 1366, height: 900 });

  // Session revocation from another device → UI returns to login on next action
  await api('POST', '/api/auth/logout-all');
  await openTab(/^Settings$/);
  await page.getByRole('button', { name: /Save All Settings/ }).first().click();
  await page.waitForURL(/\/admin\/login/, { timeout: 15_000 }).catch(() => {});
  record('Auth', 'revoked session sends the UI back to login', page.url().includes('/admin/login'));

  // ======================= COOKIE SESSION + CSRF IN THE BROWSER =======================
  console.log('\n[Auth / CSRF]');
  const { config: srvConfig } = await import('../server/config');
  const uiLogin = async () => {
    await page.goto(`${BASE}/admin/login`);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.getByRole('button', { name: /^Overview/ }).waitFor({ timeout: 60_000 });
    takeErrors();
  };
  const refreshHarnessToken = async () => {
    token = (await api('POST', '/api/auth/login', { password: ADMIN_PASSWORD, client: 'bearer' }, false)).body.token;
  };
  const sessionCookie = async () => (await context.cookies()).find((c) => c.name === 'portfolio_admin');
  const settingsPut = (r: import('@playwright/test').Response) => r.url().endsWith('/api/settings') && r.request().method() === 'PUT';
  const clickSaveSettings = () => page.getByRole('button', { name: /Save All Settings/ }).first().click();
  const savedGone = () => page.getByText(/Saved!/).first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {});

  try {
    await uiLogin();
    const sc = await sessionCookie();
    const visible = await page.evaluate(() => JSON.stringify({ l: { ...window.localStorage }, s: { ...window.sessionStorage }, c: document.cookie }));
    record('Auth', 'session cookie is HttpOnly + SameSite=Strict + Path=/api and invisible to page scripts', Boolean(sc) && sc!.httpOnly && sc!.sameSite === 'Strict' && sc!.path === '/api' && !visible.includes(sc!.value));
    record('Auth', 'no session token in localStorage / sessionStorage', !/adm_[0-9a-f]{16}/.test(visible) && !visible.includes('baraa_admin_token'));

    // UI writes carry the session CSRF token (and no Bearer header)
    await openTab(/^Settings$/);
    const sentP = page.waitForRequest((r) => r.url().endsWith('/api/settings') && r.method() === 'PUT', { timeout: 15_000 });
    let resp = wfr(settingsPut);
    await clickSaveSettings();
    const sent = await sentP;
    const sentHeaders = await sent.allHeaders();
    const csrfSent = sentHeaders['x-csrf-token'] || '';
    const st = (await resp).status();
    record('CSRF', 'UI writes send the session CSRF token (no Bearer header) and succeed', /^[A-Za-z0-9_-]{43}$/.test(csrfSent) && !sentHeaders['authorization'] && st === 200, `HTTP ${st}`);
    const visibleAfter = await page.evaluate(() => JSON.stringify({ l: { ...window.localStorage }, s: { ...window.sessionStorage }, c: document.cookie }));
    record('CSRF', 'CSRF token is kept in memory only (not in storage or a readable cookie)', Boolean(csrfSent) && !visibleAfter.includes(csrfSent));

    // Reload: the cookie session survives, the token is fetched again, writes still work
    await savedGone();
    await page.reload();
    await page.getByRole('button', { name: /^Overview/ }).waitFor({ timeout: 60_000 });
    await openTab(/^Settings$/);
    const sent2P = page.waitForRequest((r) => r.url().endsWith('/api/settings') && r.method() === 'PUT', { timeout: 15_000 });
    resp = wfr(settingsPut);
    await clickSaveSettings();
    const csrfAfterReload = (await (await sent2P).allHeaders())['x-csrf-token'];
    record('CSRF', 'after a page reload the session persists and writes still work (same token re-fetched)', (await resp).status() === 200 && csrfAfterReload === csrfSent);

    // Stale token (e.g. the session was re-created in another tab): refreshed once, save completes
    await savedGone();
    let tampered = 0;
    await page.route('**/api/settings', async (r) => {
      if (r.request().method() === 'PUT' && tampered === 0) {
        tampered++;
        return r.continue({ headers: { ...(await r.request().allHeaders()), 'x-csrf-token': 'stale-token' } });
      }
      return r.continue();
    });
    const statuses: number[] = [];
    const onResp = (r: import('@playwright/test').Response) => { if (settingsPut(r)) statuses.push(r.status()); };
    page.on('response', onResp);
    await clickSaveSettings();
    await page.getByText(/Saved!/).first().waitFor({ timeout: 10_000 }).catch(() => {});
    page.off('response', onResp);
    await page.unroute('**/api/settings');
    record('CSRF', 'a stale CSRF token is refreshed once and the save completes (403 then 200, still signed in)', statuses.join(',') === '403,200' && (await page.getByText(/Saved!/).count()) > 0 && !page.url().includes('/login'), statuses.join(','));
  } catch (e: any) { record('CSRF', 'cookie session + CSRF flow', false, e.message.split('\n')[0]); }

  // Missing token on every attempt: rejected, error shown, input kept, still signed in, nothing saved
  try {
    await refreshHarnessToken();
    await resetDashboard();
    await openTab(/^Projects \(/);
    await ancestorWith('E2E Gallery Project', 'lucide-pen').locator('button:has(svg[class*="lucide-pen"]), button:has(svg[class*="lucide-edit"])').first().click();
    await fillByValue('E2E Gallery Project', 'E2E Gallery Project (csrf-blocked)');
    await page.route('**/api/projects/**', async (r) => {
      if (r.request().method() !== 'PUT') return r.continue();
      const h = { ...(await r.request().allHeaders()) };
      delete h['x-csrf-token'];
      return r.continue({ headers: h });
    });
    const putStatuses: number[] = [];
    const onPut = (r: import('@playwright/test').Response) => { if (r.url().includes('/api/projects/') && r.request().method() === 'PUT') putStatuses.push(r.status()); };
    page.on('response', onPut);
    await page.locator('form').last().locator('button[type="submit"]').first().click();
    await page.getByRole('alert').first().waitFor({ timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(500);
    page.off('response', onPut);
    const alertText = (await page.getByRole('alert').first().innerText().catch(() => '')) || '';
    const formOpen = (await page.locator('form').count()) > 0;
    const kept = await page.locator('form').last().locator('input, textarea').evaluateAll((els) => els.some((e) => (e as HTMLInputElement).value === 'E2E Gallery Project (csrf-blocked)'));
    record('CSRF', 'write without CSRF token is rejected (403): error shown, form and input kept, user stays signed in',
      putStatuses.length >= 1 && putStatuses.every((s) => s === 403) && /CSRF/i.test(alertText) && formOpen && kept && !page.url().includes('/login'), `${putStatuses.join(',')} ${alertText.slice(0, 80)}`);
    await page.unroute('**/api/projects/**');
    const stored = (await api('GET', '/api/projects')).body.find((p: any) => p.slug === 'e2e-gallery-project');
    record('CSRF', 'nothing is saved when the CSRF check fails', stored?.title === 'E2E Gallery Project');
  } catch (e: any) { record('CSRF', 'missing CSRF token flow', false, e.message.split('\n')[0]); }

  // Idle session expiry: the next action returns to the login page
  const originalDuration = srvConfig.sessionDurationMs;
  try {
    srvConfig.sessionDurationMs = 15_000;
    // Issue a fresh session after changing the duration. Otherwise the browser
    // still holds the long-lived session created by the earlier admin checks,
    // so waiting cannot exercise idle expiry deterministically.
    await api('POST', '/api/auth/logout');
    // The API helper uses its own cookie jar. Clear the browser jar as well,
    // otherwise /admin/login can immediately redirect the still-authenticated
    // browser session back to /admin before the password field is rendered.
    await context.clearCookies();
    await uiLogin();
    await resetDashboard(); // every admin read now extends the session by 5 s only
    await openTab(/^Settings$/);
    await page.waitForTimeout(17_000);
    const expiredResp = wfr(settingsPut);
    await clickSaveSettings();
    const expiredStatus = (await expiredResp).status();
    await page.waitForURL(/\/admin\/login/, { timeout: 15_000 }).catch(() => {});
    record('Auth', 'expired session: next action gets 401 and the UI returns to login', expiredStatus === 401 && page.url().includes('/admin/login'), `HTTP ${expiredStatus}`);
  } catch (e: any) { record('Auth', 'expired session flow', false, e.message.split('\n')[0]); }
  finally { srvConfig.sessionDurationMs = originalDuration; }

  // Sign Out: session ended server-side and cookie removed
  try {
    await uiLogin();
    const before = (await sessionCookie())?.value || '';
    const outResp = wfr((r) => r.url().endsWith('/api/auth/logout'));
    await page.getByRole('button', { name: /^Sign Out$/ }).click();
    const outStatus = (await outResp).status();
    await page.waitForURL(/\/admin\/login/, { timeout: 15_000 }).catch(() => {});
    const reuse = await fetch(`${BASE}/api/leads`, { headers: { Cookie: `portfolio_admin=${before}` } });
    record('Auth', 'Sign Out ends the session server-side (old cookie rejected) and clears the cookie', outStatus === 200 && page.url().includes('/admin/login') && reuse.status === 401 && !(await sessionCookie()), `logout=${outStatus} reuse=${reuse.status}`);
  } catch (e: any) { record('Auth', 'sign out flow', false, e.message.split('\n')[0]); }

  // "All Devices": every session (this browser + another device) is revoked
  try {
    await uiLogin();
    await refreshHarnessToken();
    const otherBefore = (await api('GET', '/api/leads')).status;
    const laResp = wfr((r) => r.url().endsWith('/api/auth/logout-all'));
    await page.getByRole('button', { name: 'Sign out all devices' }).click(); // confirm() auto-accepted
    const laStatus = (await laResp).status();
    await page.waitForURL(/\/admin\/login/, { timeout: 15_000 }).catch(() => {});
    const otherAfter = (await api('GET', '/api/leads')).status;
    record('Auth', '"All Devices" signs out every device (other sessions rejected afterwards)', otherBefore === 200 && laStatus === 200 && page.url().includes('/admin/login') && otherAfter === 401, `before=${otherBefore} logoutAll=${laStatus} after=${otherAfter}`);
  } catch (e: any) { record('Auth', 'logout all devices flow', false, e.message.split('\n')[0]); }

  const leftover = takeErrors();
  if (leftover.length) record('Console', 'no unexpected console errors', false, leftover.join(' | '));

  await browser.close();
  const failed = rows.filter((r) => !r.ok);
  console.log(`\nE2E Summary: ${rows.length - failed.length} PASSED, ${failed.length} FAILED`);
  fs.writeFileSync(path.join(os.tmpdir(), 'portfolio-e2e-results.json'), JSON.stringify(rows, null, 2));
  process.exit(failed.length ? 1 : 0);
}

process.on('exit', () => {
  const changed = hashDir(PROJECT_DATA_DIR) !== dataHashBefore;
  console.log(changed ? '[isolation] FAIL: project .data changed!' : '[isolation] project .data unchanged during the E2E run.');
  if (changed) process.exitCode = 4;
  try { fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
});

main().catch((e) => {
  console.error('E2E crashed:', e);
  process.exit(1);
});
