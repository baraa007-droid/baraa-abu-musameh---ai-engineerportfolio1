import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { initializePostgresSchema, getPostgresPool, closePostgres } from '../server/postgres';

const dataDir = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), '.data'));
const jsonFile = path.join(dataDir, 'db.json');
const apply = process.argv.includes('--apply');
const confirmed = process.env.MIGRATION_CONFIRM === '1';

function canonical(value: unknown): string {
  return JSON.stringify(value);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  if (!fs.existsSync(jsonFile)) throw new Error(`JSON source not found: ${jsonFile}`);

  const parsed = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('db.json must contain one object.');

  console.log(`[Migration] Source: ${jsonFile}`);
  console.log(`[Migration] Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`[Migration] SHA-256: ${crypto.createHash('sha256').update(canonical(parsed)).digest('hex')}`);

  if (!await initializePostgresSchema()) throw new Error('PostgreSQL schema initialization failed.');
  const pool = getPostgresPool();
  if (!pool) throw new Error('PostgreSQL pool unavailable.');
  const current = await pool.query('SELECT data FROM portfolio_state WHERE id = $1', ['main']);

  if (current.rows[0]?.data) {
    if (canonical(current.rows[0].data) === canonical(parsed)) {
      console.log('[Migration] PostgreSQL already contains the exact JSON snapshot; no changes needed.');
      return;
    }
    throw new Error('Conflict: portfolio_state already contains different data. No overwrite was performed.');
  }

  if (!apply) {
    console.log('[Migration] DRY-RUN PASS: destination is empty and the snapshot is structurally valid.');
    return;
  }
  if (!confirmed) throw new Error('Refusing mutation. Re-run with --apply and MIGRATION_CONFIRM=1.');

  const backup = path.join(dataDir, `db.pre-pg-migration-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.copyFileSync(jsonFile, backup);
  await pool.query(
    `INSERT INTO portfolio_state (id, data, revision, updated_at)
     VALUES ($1, $2, 1, CURRENT_TIMESTAMP)`,
    ['main', JSON.stringify(parsed)]
  );
  console.log(`[Migration] APPLY PASS: snapshot inserted; source backup preserved at ${backup}`);
}

main().catch((error) => {
  console.error(`[Migration] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}).finally(() => closePostgres());
