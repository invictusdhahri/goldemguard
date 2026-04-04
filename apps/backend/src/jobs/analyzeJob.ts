import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { supabase } from '../services/supabase';
import { callMlDetect } from '../services/mlService';

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const analysisWorker = new Worker(
  'analysis',
  async (job) => {
    const { jobId, fileUrl, mediaType } = job.data;
    const startTime = Date.now();

    try {
      await supabase
        .from('analysis_jobs')
        .update({ status: 'processing' })
        .eq('id', jobId);

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('uploads')
        .download(fileUrl);

      if (downloadError || !fileData) {
        throw new Error(`Failed to download file: ${downloadError?.message}`);
      }

      const buffer = Buffer.from(await fileData.arrayBuffer());
      const filename = fileUrl.split('/').pop() ?? 'file';

      const mlResult = await callMlDetect(mediaType, buffer, filename);

      const processingMs = Date.now() - startTime;

      await supabase.from('results').insert({
        job_id: jobId,
        verdict: mlResult.verdict ?? 'UNCERTAIN',
        confidence: mlResult.fused_score ?? 0.5,
        explanation: mlResult.explanation ?? 'Analysis complete.',
        model_scores: mlResult.model_scores ?? {},
        models_run: mlResult.models_run ?? [],
        models_skipped: mlResult.models_skipped ?? [],
        signals: mlResult.signals ?? [],
        caveat: mlResult.caveat ?? null,
        processing_ms: processingMs,
      });

      await supabase
        .from('analysis_jobs')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', jobId);
    } catch (err) {
      console.error(`Job ${jobId} failed:`, err);

      await supabase
        .from('analysis_jobs')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('id', jobId);
    }
  },
  { connection },
);
