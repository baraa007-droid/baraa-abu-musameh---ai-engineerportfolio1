import './setup';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { TEST_DATA_DIR } from './setup';

const { config } = await import('../../server/config');
const auth = await import('../../server/middleware/auth');
const { db } = await import('../../server/db');
const ai = await import('../../server/ai');
const validation = await import('../../server/validation');
const { escapeHtml, toPublicSettings } = await import('../../server/lib/http');

test('db uses the temporary DATA_DIR, never the project .data', () => {
  assert.ok(fs.existsSync(path.join(TEST_DATA_DIR, 'db.json')));
});

test('session validity: fingerprint, sliding expiry and absolute lifetime', () => {
  const now = Date.now();
  const good = { token: 't', createdAt: now, expiresAt: now + 60_000, role: 'admin', name: 'x', fp: auth.credentialFingerprint() };
  assert.equal(auth.isSessionValid(good, now), true);
  assert.equal(auth.isSessionValid({ ...good, fp: undefined }, now), false, 'legacy sessions without fingerprint are rejected');
  assert.equal(auth.isSessionValid({ ...good, fp: 'other' }, now), false);
  assert.equal(auth.isSessionValid({ ...good, expiresAt: now - 1 }, now), false);
  assert.equal(auth.isSessionValid({ ...good, createdAt: now - auth.SESSION_ABSOLUTE_MAX_MS - 1 }, now), false);

  const original = config.adminPassword;
  try {
    (config as any).adminPassword = original + '-rotated';
    assert.equal(auth.isSessionValid(good, now), false, 'rotating ADMIN_PASSWORD invalidates existing sessions');
  } finally {
    (config as any).adminPassword = original;
  }
});

test('passwordMatches is exact and rejects empty configuration', () => {
  assert.equal(auth.passwordMatches(config.adminPassword), true);
  assert.equal(auth.passwordMatches(config.adminPassword + 'x'), false);
  const original = config.adminPassword;
  try {
    (config as any).adminPassword = '';
    assert.equal(auth.passwordMatches(''), false);
  } finally {
    (config as any).adminPassword = original;
  }
});

test('reindex keeps embeddings of unchanged chunks and drops those of edited chunks', () => {
  const chunks = db.reindexAllKnowledge();
  const [a, b] = chunks;
  assert.ok(a && b);
  assert.equal(db.attachEmbedding(a.id, a.content, [0.1, 0.2, 0.3]), true);
  assert.equal(db.attachEmbedding(b.id, 'stale content', [0.4]), false, 'vector for changed content is discarded');
  const again = db.reindexAllKnowledge();
  assert.deepEqual(again.find((c) => c.id === a.id)?.embedding, [0.1, 0.2, 0.3]);
  assert.equal(again.find((c) => c.id === b.id)?.embedding, undefined);
});

test('a corrupt db.json stops startup and is preserved (never replaced by seed data)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-corrupt-'));
  try {
    fs.writeFileSync(path.join(dir, 'db.json'), '{"messages": [ broken');
    const r = spawnSync(process.execPath, ['--require', './scripts/test-guard.cjs', '--import', 'tsx', '-e', "await import('./server/db.ts')"], {
      env: { ...process.env, DATA_DIR: dir, NODE_ENV: 'test' },
      encoding: 'utf8',
      timeout: 60_000
    });
    assert.notEqual(r.status, 0, 'process must fail');
    assert.equal(fs.readFileSync(path.join(dir, 'db.json'), 'utf8'), '{"messages": [ broken', 'original file untouched');
    assert.ok(fs.readdirSync(dir).some((n) => n.startsWith('db.corrupt-')), 'quarantine copy written');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('tests refuse to run against the project .data directory', () => {
  const r = spawnSync(process.execPath, ['--require', './scripts/test-guard.cjs', '--import', 'tsx', '-e', "await import('./server/db.ts')"], {
    env: { ...process.env, DATA_DIR: path.join(process.cwd(), '.data'), NODE_ENV: 'test' },
    encoding: 'utf8',
    timeout: 60_000
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr + r.stdout, /Refusing to run tests against the project \.data directory/);
});

test('Arabic normalization unifies Persian kaf/yeh, alef forms and taa marbuta', () => {
  assert.equal(ai.normalizeArabicText('کتاب'), ai.normalizeArabicText('كتاب'));
  assert.equal(ai.normalizeArabicText('یوم'), ai.normalizeArabicText('يوم'));
  assert.equal(ai.normalizeArabicText('أحمد'), ai.normalizeArabicText('احمد'));
  assert.equal(ai.normalizeArabicText('مدرسة'), 'مدرسه');
});

test('settings validation stores only known keys', () => {
  const r = validation.validateSettingsBody({ site_name: 'X', injected: 'evil', maintenance_mode: 1 } as any);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.data.injected, undefined);
    assert.equal(r.data.maintenance_mode, true);
  }
});

test('public settings never include notification routing', () => {
  const pub = toPublicSettings({ site_name: 'x', notification_email_to: 'a@b.c', telegram_chat_id: '1', contact_email: 'p@b.c', maintenance_mode: false } as any);
  assert.equal((pub as any).notification_email_to, undefined);
  assert.equal((pub as any).telegram_chat_id, undefined);
  assert.equal(pub.contact_email, 'p@b.c');
});

test('escapeHtml neutralises markup', () => {
  assert.equal(escapeHtml('<img src=x onerror="a">'), '&lt;img src=x onerror=&quot;a&quot;&gt;');
});

test('withAbortTimeout aborts the underlying call', async () => {
  let aborted = false;
  await assert.rejects(
    ai.withAbortTimeout(30, 'probe', (signal) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')); });
    })),
    /timed out|aborted/
  );
  assert.equal(aborted, true);
});

test('TRUST_PROXY: a hop count is a number (Express would read "1" as the IP 0.0.0.1)', async () => {
  const { resolveTrustProxy } = await import('../../server/config');
  assert.equal(resolveTrustProxy(undefined), false);
  assert.equal(resolveTrustProxy(''), false);
  assert.equal(resolveTrustProxy('false'), false);
  assert.equal(resolveTrustProxy('true'), true);
  assert.equal(resolveTrustProxy('1'), 1);
  assert.equal(resolveTrustProxy(' 2 '), 2);
  assert.equal(resolveTrustProxy('loopback'), 'loopback');
  assert.equal(resolveTrustProxy('10.0.0.0/8, 127.0.0.1'), '10.0.0.0/8, 127.0.0.1');

  // Behaviour in Express: one trusted hop makes a request forwarded as HTTPS count as secure.
  const express = (await import('express')).default;
  const http = await import('http');
  const app = express();
  app.set('trust proxy', resolveTrustProxy('1'));
  app.get('/', (req, res) => res.json({ secure: req.secure, ip: req.ip }));
  const server = http.createServer(app).listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  try {
    const port = (server.address() as { port: number }).port;
    const res = await fetch(`http://127.0.0.1:${port}/`, { headers: { 'X-Forwarded-Proto': 'https', 'X-Forwarded-For': '203.0.113.7' } });
    assert.deepEqual(await res.json(), { secure: true, ip: '203.0.113.7' });
  } finally {
    server.close();
  }
});

test('CSRF tokens are random 256-bit values', () => {
  const a = auth.newCsrfToken();
  const b = auth.newCsrfToken();
  assert.match(a, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(a, b);
});
