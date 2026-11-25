import pg from 'pg';
import { config, isPostgresConfigured } from './config';
import { errorText } from './lib/http';

const { Pool } = pg;

let pgPool: pg.Pool | null = null;

export function getPostgresPool(): pg.Pool | null {
  if (!isPostgresConfigured()) {
    return null;
  }

  if (!pgPool && config.databaseUrl) {
    try {
      pgPool = new Pool({
        connectionString: config.databaseUrl,
        max: 20, // Max concurrent connections in pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000,
        // PG_SSL_MODE: disable | no-verify (encrypted, certificate not checked) | verify-full
        ssl: config.pgSslMode === 'disable'
          ? false
          : { rejectUnauthorized: config.pgSslMode === 'verify-full' }
      });

      pgPool.on('error', (err) => {
        console.error('[PostgreSQL] Unexpected client error in pool:', err);
      });
    } catch (e) {
      console.error('[PostgreSQL] Failed to initialize connection pool:', e);
      pgPool = null;
    }
  }

  return pgPool;
}

// Auto-migration & Schema Provisioning
export async function initializePostgresSchema(): Promise<boolean> {
  const pool = getPostgresPool();
  if (!pool) return false;

  const client = await pool.connect();
  try {
    console.log('[PostgreSQL] Initializing tables and schema migrations...');
    await client.query('BEGIN');

    // 1. Profile table
    await client.query(`
      CREATE TABLE IF NOT EXISTS portfolio_profile (
        id VARCHAR(64) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Projects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS portfolio_projects (
        id VARCHAR(128) PRIMARY KEY,
        slug VARCHAR(256) UNIQUE NOT NULL,
        title TEXT NOT NULL,
        category VARCHAR(128),
        status VARCHAR(64),
        featured BOOLEAN DEFAULT FALSE,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_projects_slug ON portfolio_projects(slug);
      CREATE INDEX IF NOT EXISTS idx_projects_category ON portfolio_projects(category);
      CREATE INDEX IF NOT EXISTS idx_projects_featured ON portfolio_projects(featured);
    `);

    // 3. Services table
    await client.query(`
      CREATE TABLE IF NOT EXISTS portfolio_services (
        id VARCHAR(128) PRIMARY KEY,
        slug VARCHAR(256) UNIQUE NOT NULL,
        title TEXT NOT NULL,
        category VARCHAR(128),
        active BOOLEAN DEFAULT TRUE,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_services_slug ON portfolio_services(slug);
    `);

    // 4. Skills table
    await client.query(`
      CREATE TABLE IF NOT EXISTS portfolio_skills (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        category VARCHAR(128),
        proficiency INTEGER DEFAULT 80,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_skills_category ON portfolio_skills(category);
    `);

    // 5. Blog posts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS portfolio_blog (
        id VARCHAR(128) PRIMARY KEY,
        slug VARCHAR(256) UNIQUE NOT NULL,
        title TEXT NOT NULL,
        category VARCHAR(128),
        published BOOLEAN DEFAULT TRUE,
        views_count INTEGER DEFAULT 0,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_blog_slug ON portfolio_blog(slug);
      CREATE INDEX IF NOT EXISTS idx_blog_published ON portfolio_blog(published);
    `);

    // 6. Experience & Education & Certificates
    await client.query(`
      CREATE TABLE IF NOT EXISTS portfolio_experience (
        id VARCHAR(128) PRIMARY KEY,
        data JSONB NOT NULL,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS portfolio_education (
        id VARCHAR(128) PRIMARY KEY,
        data JSONB NOT NULL,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS portfolio_certificates (
        id VARCHAR(128) PRIMARY KEY,
        data JSONB NOT NULL,
        sort_order INTEGER DEFAULT 0
      );
    `);

    // 7. Testimonials table
    await client.query(`
      CREATE TABLE IF NOT EXISTS portfolio_testimonials (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        published BOOLEAN DEFAULT TRUE,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_testimonials_published ON portfolio_testimonials(published);
    `);

    // 8. Contact Messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS portfolio_messages (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        email VARCHAR(256) NOT NULL,
        status VARCHAR(64) DEFAULT 'new',
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_messages_status ON portfolio_messages(status);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON portfolio_messages(created_at DESC);
    `);

    // 9. Project Leads table
    await client.query(`
      CREATE TABLE IF NOT EXISTS portfolio_leads (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        email VARCHAR(256) NOT NULL,
        stage VARCHAR(64) DEFAULT 'new',
        ai_qualification_score INTEGER DEFAULT 50,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_leads_stage ON portfolio_leads(stage);
      CREATE INDEX IF NOT EXISTS idx_leads_created_at ON portfolio_leads(created_at DESC);
    `);

    // 10. Knowledge Documents & Chunks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS portfolio_knowledge_docs (
        id VARCHAR(128) PRIMARY KEY,
        title TEXT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS portfolio_knowledge_chunks (
        id VARCHAR(128) PRIMARY KEY,
        document_id VARCHAR(128),
        content TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON portfolio_knowledge_chunks(document_id);
    `);

    // 11. AI Events & Insights table
    await client.query(`
      CREATE TABLE IF NOT EXISTS portfolio_ai_events (
        id VARCHAR(128) PRIMARY KEY,
        event_type VARCHAR(128),
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_events_type ON portfolio_ai_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_events_created_at ON portfolio_ai_events(created_at DESC);

      CREATE TABLE IF NOT EXISTS portfolio_ai_insights (
        id VARCHAR(128) PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 12. Settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS portfolio_settings (
        id VARCHAR(64) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Canonical durable snapshot for the complete application state. The
    // entity tables above remain available for reporting/backward compatibility,
    // while this row prevents less common entities from falling back to JSON.
    await client.query(`
      CREATE TABLE IF NOT EXISTS portfolio_state (
        id VARCHAR(64) PRIMARY KEY,
        data JSONB NOT NULL,
        revision BIGINT NOT NULL DEFAULT 1,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_portfolio_state_updated_at ON portfolio_state(updated_at);
    `);

    await client.query('COMMIT');
    console.log('[PostgreSQL] Schema migration complete with all tables and indexes verified.');
    return true;
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('[PostgreSQL] Migration failed, rolling back:', e);
    return false;
  } finally {
    client.release();
  }
}

// Health Check
export async function checkPostgresHealth(): Promise<{ status: 'healthy' | 'unconfigured' | 'unhealthy'; latencyMs?: number; error?: string }> {
  if (!isPostgresConfigured()) {
    return { status: 'unconfigured' };
  }

  const pool = getPostgresPool();
  if (!pool) {
    return { status: 'unhealthy', error: 'Postgres pool not initialized' };
  }

  const start = Date.now();
  try {
    const res = await pool.query('SELECT 1 as alive');
    if (res.rows[0]?.alive === 1) {
      return { status: 'healthy', latencyMs: Date.now() - start };
    }
    return { status: 'unhealthy', error: 'Unexpected query response' };
  } catch (e) {
    return { status: 'unhealthy', error: errorText(e) || 'Database connection error' };
  }
}

// Graceful close
export async function closePostgres(): Promise<void> {
  if (pgPool) {
    try {
      await pgPool.end();
      console.log('[PostgreSQL] Connection pool drained and closed cleanly');
    } catch (e) {
      console.warn('[PostgreSQL] Error closing pool:', e);
    }
    pgPool = null;
  }
}
