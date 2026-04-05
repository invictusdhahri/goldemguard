import { Queue } from 'bullmq';
import IORedis from 'ioredis';

function createRedisConnection() {
  const conn = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    connectTimeout: 5000,
    // Give up after 3 failed attempts instead of retrying forever
    retryStrategy: (times) => (times >= 3 ? null : Math.min(times * 500, 2000)),
    enableOfflineQueue: false,
  });

  conn.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'ECONNREFUSED') {
      // Printed once; ioredis won't spam after retryStrategy returns null
      console.warn('[queue] Redis unavailable — job queue disabled. Start Redis to enable background jobs.');
    } else {
      console.error('[queue] Redis error:', err.message);
    }
  });

  return conn;
}

export const redisConnection = createRedisConnection();

export const analysisQueue = new Queue('analysis', { connection: redisConnection });

analysisQueue.on('error', (err: Error) => {
  console.warn('[queue] BullMQ queue error (Redis likely offline):', err.message);
});
