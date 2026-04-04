import { Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const analysisWorker = new Worker(
  'analysis',
  async (job) => {
    const { jobId, fileUrl, mediaType } = job.data;
    console.log(`Processing job ${jobId}: ${mediaType} at ${fileUrl}`);
    // TODO: call ML service, get scores, call Claude, save result
  },
  { connection },
);
