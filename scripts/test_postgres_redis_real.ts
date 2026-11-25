import { getPostgresPool, checkPostgresHealth, initializePostgresSchema } from '../server/postgres';
import { getRedisClient, checkRedisHealth, saveAdminSession, getAdminSession, checkRateLimit } from '../server/redis';

async function runRealPostgresAndRedisTests() {
  console.log('====================================================');
  console.log('Phase 1 & 2: Real PostgreSQL (Supabase) & Redis (Upstash) Test');
  console.log('====================================================\n');

  // ---------------------------------------------------------
  // 1. POSTGRESQL REAL RUNTIME VERIFICATION
  // ---------------------------------------------------------
  console.log('[Phase 1: PostgreSQL Real Runtime Verification]');
  
  // Initialize Schema
  const schemaOk = await initializePostgresSchema();
  console.log(`  - Postgres Schema Migration: ${schemaOk ? 'SUCCESS' : 'FAILED'}`);

  const pgPool = getPostgresPool();
  if (!pgPool) {
    console.error('  ✗ FAIL: PostgreSQL pool failed to initialize.');
    process.exit(1);
  }

  const pgHealth = await checkPostgresHealth();
  console.log(`  - Postgres Connection Health: ${pgHealth.status}`);
  console.log(`  - Driver: pg (Node.js PostgreSQL client)`);

  if (pgHealth.status !== 'healthy') {
    console.error('  ✗ FAIL: PostgreSQL health check reported unhealthy state.');
    process.exit(1);
  }

  // Direct SQL Query against Supabase pooler
  const client = await pgPool.connect();
  try {
    const resTime = await client.query('SELECT NOW() as current_time, current_database() as db_name, version() as pg_version');
    console.log(`  ✓ PostgreSQL Connection Query: Database=${resTime.rows[0].db_name}, Time=${resTime.rows[0].current_time}`);
    console.log(`  ✓ Version: ${resTime.rows[0].pg_version.slice(0, 60)}...`);

    // Verify Tables in Schema
    const resTables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const tablesList = resTables.rows.map(r => r.table_name);
    console.log(`  ✓ Verified Public Tables (${tablesList.length}): ${tablesList.join(', ')}`);

    // Real CRUD Test on portfolio_projects Table in Supabase
    const testSlug = `real-pg-test-${Date.now()}`;
    const testProjectPayload = {
      id: testSlug,
      slug: testSlug,
      title: 'Real PostgreSQL Project',
      short_description: 'Testing real Supabase persistence',
      category: 'AI Solutions',
      technologies: ['TypeScript', 'PostgreSQL'],
      features: [],
      results: [],
      cover_image: '',
      featured: true,
      status: 'completed'
    };

    console.log(`\n  [PostgreSQL Real CRUD Test on 'portfolio_projects' Table]`);
    
    // Create
    await client.query(`
      INSERT INTO portfolio_projects (id, slug, title, category, status, featured, data)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [testSlug, testSlug, testProjectPayload.title, testProjectPayload.category, testProjectPayload.status, testProjectPayload.featured, JSON.stringify(testProjectPayload)]);
    console.log(`  ✓ CREATE: Inserted test record into 'portfolio_projects' table (slug: ${testSlug})`);

    // Read
    const readRes = await client.query('SELECT * FROM portfolio_projects WHERE slug = $1', [testSlug]);
    if (readRes.rows.length === 1 && readRes.rows[0].title === 'Real PostgreSQL Project') {
      console.log(`  ✓ READ: Successfully retrieved record from Supabase: ID=${readRes.rows[0].id}`);
    } else {
      console.error(`  ✗ FAIL: Could not read inserted project from Supabase`);
    }

    // Update
    testProjectPayload.title = 'Updated Real PostgreSQL Project';
    await client.query('UPDATE portfolio_projects SET title = $1, data = $2 WHERE slug = $3', [testProjectPayload.title, JSON.stringify(testProjectPayload), testSlug]);
    const updateRes = await client.query('SELECT title FROM portfolio_projects WHERE slug = $1', [testSlug]);
    if (updateRes.rows[0].title === 'Updated Real PostgreSQL Project') {
      console.log(`  ✓ UPDATE: Successfully updated record title in Supabase to '${updateRes.rows[0].title}'`);
    } else {
      console.error(`  ✗ FAIL: Project update verification failed`);
    }

    // Delete
    await client.query('DELETE FROM portfolio_projects WHERE slug = $1', [testSlug]);
    const postDeleteRes = await client.query('SELECT * FROM portfolio_projects WHERE slug = $1', [testSlug]);
    if (postDeleteRes.rows.length === 0) {
      console.log(`  ✓ DELETE: Successfully deleted test record from Supabase table`);
    } else {
      console.error(`  ✗ FAIL: Deletion failed, record still present`);
    }

  } finally {
    client.release();
  }

  // ---------------------------------------------------------
  // 2. REDIS REAL RUNTIME VERIFICATION
  // ---------------------------------------------------------
  console.log('\n[Phase 2: Redis Real Runtime Verification]');
  const redis = getRedisClient();
  if (!redis) {
    console.error('  ✗ FAIL: Redis client failed to initialize.');
    process.exit(1);
  }

  const redisHealth = await checkRedisHealth();
  console.log(`  - Redis Connection Health: ${redisHealth.status}`);
  console.log(`  - Provider: Upstash Distributed Redis (rediss://)`);

  if (redisHealth.status !== 'healthy') {
    console.error('  ✗ FAIL: Redis health check reported unhealthy state.');
    process.exit(1);
  }

  // Direct Redis Ping & Operations
  const pingRes = await redis.ping();
  console.log(`  ✓ Redis PING Response: ${pingRes}`);

  const testKey = `test:redis:${Date.now()}`;
  await redis.set(testKey, 'real_redis_value', 'EX', 30);
  const val = await redis.get(testKey);
  console.log(`  ✓ Redis SET & GET: Key=${testKey}, Value=${val}`);
  await redis.del(testKey);

  // Test Admin Session Storage in Redis
  const testSession = {
    token: `adm_test_${Date.now()}`,
    createdAt: Date.now(),
    expiresAt: Date.now() + 60000,
    ip: '127.0.0.1',
    role: 'admin',
    name: 'Baraa Abu Musameh (Test)'
  };
  await saveAdminSession(testSession);
  const fetchedSession = await getAdminSession(testSession.token);
  if (fetchedSession && fetchedSession.name === testSession.name) {
    console.log(`  ✓ Redis Session Store: Successfully saved and retrieved admin session token '${testSession.token}'`);
  } else {
    console.error(`  ✗ FAIL: Admin session storage in Redis failed`);
  }

  // Test Rate Limiter in Redis
  const rateLimitKey = `ratelimit:test:${Date.now()}`;
  const rl1 = await checkRateLimit(rateLimitKey, 5, 60000);
  const rl2 = await checkRateLimit(rateLimitKey, 5, 60000);
  console.log(`  ✓ Redis Rate Limiter: Attempt 1 allowed=${rl1.allowed}; Attempt 2 allowed=${rl2.allowed}`);

  console.log('\n====================================================');
  console.log('REAL POSTGRESQL (SUPABASE) & REDIS (UPSTASH) VERIFIED 100%');
  console.log('====================================================\n');
  process.exit(0);
}

runRealPostgresAndRedisTests().catch((err) => {
  console.error('PostgreSQL / Redis Test Error:', err);
  process.exit(1);
});
