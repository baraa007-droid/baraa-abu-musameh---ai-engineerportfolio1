import { Router, Request, Response } from 'express';
import { checkPostgresHealth } from './postgres';
import { checkRedisHealth } from './redis';
import { db } from './db';
import { config } from './config';

const router = Router();

// Liveness probes (Kubernetes / Cloud Run / Container liveness)
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

router.get('/health', (req: Request, res: Response) => {
  const mem = process.memoryUsage();
  res.status(200).json({
    status: 'healthy',
    ok: true,
    service: 'baraa-portfolio-backend',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    env: config.env,
    memory: {
      rssMB: Math.round(mem.rss / (1024 * 1024)),
      heapUsedMB: Math.round(mem.heapUsed / (1024 * 1024))
    }
  });
});

// Readiness probe (Kubernetes / Cloud Run readiness)
router.get('/ready', async (req: Request, res: Response) => {
  const [postgresHealth, redisHealth] = await Promise.all([
    checkPostgresHealth(),
    checkRedisHealth()
  ]);

  const chunksCount = db.getChunks().length;
  const isStorageReady = chunksCount >= 0;

  const dependencies: Record<string, any> = {
    storage: {
      status: isStorageReady ? 'ready' : 'degraded',
      chunksIndexed: chunksCount,
      provider: config.databaseUrl ? 'postgresql' : 'atomic_json_file'
    },
    postgres: postgresHealth,
    redis: redisHealth
  };

  const isPostgresCritical = config.databaseUrl && postgresHealth.status === 'unhealthy';
  const isRedisCritical = config.redisUrl && redisHealth.status === 'unhealthy';

  if (isPostgresCritical || isRedisCritical || !isStorageReady) {
    return res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      dependencies
    });
  }

  return res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    dependencies
  });
});

export default router;
