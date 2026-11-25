/**
 * Shared isolation for unit tests that import server modules. Import this FIRST (before any
 * server module): it points DATA_DIR at a fresh temp directory and sets a random admin password.
 * The network guard (scripts/test-guard.cjs) is preloaded by `npm run test:unit`.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

process.env.NODE_ENV = 'test';
export const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-unit-'));
process.env.DATA_DIR = TEST_DATA_DIR;
process.env.ADMIN_PASSWORD = `unit-${crypto.randomBytes(12).toString('hex')}`;
delete process.env.DATABASE_URL;
delete process.env.REDIS_URL;
delete process.env.GEMINI_API_KEY;
delete process.env.OPENROUTER_API_KEY;

process.on('exit', () => {
  try {
    fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
});
