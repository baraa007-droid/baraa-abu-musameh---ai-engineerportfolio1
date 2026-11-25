import pg from 'pg';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

/**
 * Runs only against explicitly supplied disposable services. It never reads
 * DATABASE_URL/REDIS_URL from .env and refuses to run without confirmation.
 */
const pgUrl = process.env.PERSISTENCE_TEST_DATABASE_URL;
const redisUrl = process.env.PERSISTENCE_TEST_REDIS_URL;
const confirmed = process.env.PERSISTENCE_TEST_CONFIRM === '1';
const probeTable = `portfolio_persistence_probe_${process.pid}`;

async function main() {
  if (!pgUrl || !redisUrl || !confirmed) {
    throw new Error('Set PERSISTENCE_TEST_DATABASE_URL, PERSISTENCE_TEST_REDIS_URL, and PERSISTENCE_TEST_CONFIRM=1 for disposable services.');
  }
  let redisScheme: string;
  try { redisScheme = new URL(redisUrl).protocol; } catch { throw new Error('PERSISTENCE_TEST_REDIS_URL is not a valid URL.'); }
  if (redisScheme !== 'redis:' && redisScheme !== 'rediss:') throw new Error('PERSISTENCE_TEST_REDIS_URL must use redis:// or rediss://.');

  const pgPool = new pg.Pool({ connectionString: pgUrl, max: 4, connectionTimeoutMillis: 5000 });
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 5000 });
  redis.on('error', () => undefined);
  try {
    await pgPool.query(`CREATE TABLE ${probeTable} (id TEXT PRIMARY KEY, value JSONB NOT NULL, revision INTEGER NOT NULL)`);
    await pgPool.query(`INSERT INTO ${probeTable} (id, value, revision) VALUES ('main', $1, 1)`, [JSON.stringify({ first: false, second: false })]);

    // Two independent clients attempt the same revision. Exactly one may win.
    const [a, b] = await Promise.all([pgPool.connect(), pgPool.connect()]);
    try {
      const [ra, rb] = await Promise.all([
        a.query(`UPDATE ${probeTable} SET value = value || '{"first":true}', revision = revision + 1 WHERE id = 'main' AND revision = 1`),
        b.query(`UPDATE ${probeTable} SET value = value || '{"second":true}', revision = revision + 1 WHERE id = 'main' AND revision = 1`)
      ]);
      const winners = (ra.rowCount || 0) + (rb.rowCount || 0);
      if (winners !== 1) throw new Error(`CAS test expected one winner, got ${ra.rowCount} and ${rb.rowCount}.`);
    } finally {
      a.release();
      b.release();
    }

    const persisted = await pgPool.query(`SELECT value, revision FROM ${probeTable} WHERE id = 'main'`);
    if (Number(persisted.rows[0]?.revision) !== 2) throw new Error('Revision was not persisted after concurrent update.');

    const key = `persistence-probe:${process.pid}`;
    await redis.set(key, 'alive', 'EX', 30);
    if (await redis.get(key) !== 'alive') throw new Error('Redis read-after-write failed.');
    await redis.del(key);
    console.log('REAL_PERSISTENCE_PROBE_PASS: PostgreSQL persistence/CAS and Redis read-after-write verified.');
  } finally {
    await pgPool.query(`DROP TABLE IF EXISTS ${probeTable}`);
    await redis.quit();
    await pgPool.end();
  }
}

main().catch((error) => {
  console.error(`REAL_PERSISTENCE_PROBE_FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
