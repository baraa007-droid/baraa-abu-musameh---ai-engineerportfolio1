import dotenv from 'dotenv';
import pg from 'pg';
import Redis from 'ioredis';

dotenv.config({ quiet: true });

const pgUrl = process.env.PERSISTENCE_TEST_DATABASE_URL;
const redisUrl = process.env.PERSISTENCE_TEST_REDIS_URL;

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

async function main() {
  if (!pgUrl || !redisUrl) throw new Error('Persistence test variables are missing.');
  const pool = new pg.Pool({ connectionString: pgUrl, max: 2, connectionTimeoutMillis: 8000 });
  try {
    const health = await pool.query('SELECT 1 AS ok');
    if (health.rows[0]?.ok !== 1) throw new Error('PostgreSQL health query failed.');
    const tables = await pool.query(
      `SELECT table_schema, table_name
       FROM information_schema.tables
       WHERE table_type = 'BASE TABLE'
         AND table_schema NOT IN ('pg_catalog', 'information_schema')`
    );
    let rowCount = 0;
    for (const table of tables.rows) {
      const identifier = `${quoteIdentifier(String(table.table_schema))}.${quoteIdentifier(String(table.table_name))}`;
      const result = await pool.query(`SELECT count(*)::int AS count FROM ${identifier}`);
      rowCount += Number(result.rows[0]?.count || 0);
    }
    if (tables.rows.length > 0 || rowCount > 0) {
      throw new Error(`PostgreSQL safety check failed: ${tables.rows.length} user tables and ${rowCount} rows already exist.`);
    }
    console.log('POSTGRES_SAFETY_PASS: connection succeeded and no user tables/rows were found.');
    let redisScheme: string;
    try { redisScheme = new URL(redisUrl).protocol; } catch { throw new Error('PERSISTENCE_TEST_REDIS_URL is not a valid URL.'); }
    if (redisScheme !== 'redis:' && redisScheme !== 'rediss:') throw new Error('PERSISTENCE_TEST_REDIS_URL must use redis:// or rediss://.');
    const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 8000 });
    // Never allow a client error to echo a connection string or credential.
    redis.on('error', () => undefined);
    try {
      const pong = await redis.ping();
      if (pong !== 'PONG') throw new Error('Redis PING did not return PONG.');
      console.log('PERSISTENCE_SAFETY_PASS: PostgreSQL has no user tables/rows and Redis PING passed.');
    } finally {
      await redis.quit();
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown';
  console.error(`PERSISTENCE_SAFETY_BLOCK: ${error instanceof Error && error.message ? error.message : 'connection or query failed'} (code=${code})`);
  process.exitCode = 1;
});
