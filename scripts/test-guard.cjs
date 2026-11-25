'use strict';
/**
 * Test isolation guard. Preload with:  node --require ./scripts/test-guard.cjs ...
 *
 * - Blocks every outbound TCP/TLS connection and DNS lookup that is not loopback.
 *   This covers fetch (undici), http/https, nodemailer (SMTP), pg, ioredis and raw sockets,
 *   because all of them end in net.Socket.prototype.connect.
 * - Refuses to start when production connection strings or provider credentials are present.
 * - Forces NODE_ENV=test (server/config.ts then skips loading .env).
 * - On exit, prints the number of blocked attempts and fails the process if any occurred.
 */
const net = require('net');
const dns = require('dns');

process.env.NODE_ENV = 'test';

// Node 24 + tsx currently calls os.userInfo() while creating its temp directory.
// In this restricted Windows runner that API can fail with ENOMEM before tests load.
// Provide the POSIX-style branch tsx already supports; this only affects the test
// bootstrap and has no application/runtime impact.
if (process.platform === 'win32' && typeof process.geteuid !== 'function') {
  process.geteuid = () => 0;
}

const FORBIDDEN_ENV = [
  'DATABASE_URL', 'POSTGRES_URL', 'REDIS_URL', 'SMTP_PASS', 'SMTP_USER', 'TELEGRAM_BOT_TOKEN',
  'GEMINI_API_KEY', 'OPENROUTER_API_KEY', 'GOOGLE_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY'
];
const present = FORBIDDEN_ENV.filter((k) => process.env[k] && String(process.env[k]).trim() !== '');
if (present.length > 0) {
  console.error(`[test-guard] Refusing to run: real connection/credential variables are set: ${present.join(', ')}`);
  process.exit(2);
}

const attempts = [];
const isLoopback = (host) => {
  if (host === undefined || host === null || host === '') return true; // node defaults to localhost
  const h = String(host).replace(/^\[|\]$/g, '').toLowerCase();
  return h === 'localhost' || h === '::1' || h === '::ffff:127.0.0.1' || h.startsWith('127.');
};

function describeTarget(args) {
  let a = args[0];
  if (Array.isArray(a)) a = a[0]; // internal normalized arguments
  if (a && typeof a === 'object') return { host: a.host, port: a.port, path: a.path };
  if (typeof a === 'string' && Number.isNaN(Number(a))) return { path: a };
  return { host: typeof args[1] === 'string' ? args[1] : undefined, port: a };
}

const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function guardedConnect(...args) {
  const t = describeTarget(args);
  if (!t.path && !isLoopback(t.host)) {
    attempts.push(`${t.host}:${t.port}`);
    const err = Object.assign(new Error(`[test-guard] blocked outbound connection to ${t.host}:${t.port}`), { code: 'ETESTGUARD' });
    process.nextTick(() => this.destroy(err));
    return this;
  }
  return originalConnect.apply(this, args);
};

const originalLookup = dns.lookup;
dns.lookup = function guardedLookup(hostname, options, callback) {
  const cb = typeof options === 'function' ? options : callback;
  if (!isLoopback(hostname)) {
    attempts.push(`dns:${hostname}`);
    const err = Object.assign(new Error(`[test-guard] blocked DNS lookup for ${hostname}`), { code: 'ENOTFOUND' });
    process.nextTick(() => cb(err));
    return {};
  }
  return originalLookup.apply(this, arguments);
};
if (dns.promises && dns.promises.lookup) {
  const originalPromiseLookup = dns.promises.lookup;
  dns.promises.lookup = async function guardedPromiseLookup(hostname, options) {
    if (!isLoopback(hostname)) {
      attempts.push(`dns:${hostname}`);
      throw Object.assign(new Error(`[test-guard] blocked DNS lookup for ${hostname}`), { code: 'ENOTFOUND' });
    }
    return originalPromiseLookup.call(this, hostname, options);
  };
}

globalThis.__testGuard = { attempts };

process.on('exit', (code) => {
  if (attempts.length > 0) {
    console.error(`[test-guard] ${attempts.length} outbound attempt(s) were blocked: ${[...new Set(attempts)].slice(0, 10).join(', ')}`);
    if (code === 0) process.exitCode = 3;
  } else {
    console.log('[test-guard] outbound network attempts: 0');
  }
});
