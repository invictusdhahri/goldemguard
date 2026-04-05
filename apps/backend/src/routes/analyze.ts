import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { createSupabaseWithAccessToken, getSupabaseServiceRole } from '../services/supabase';
import { findPriorDuplicateResult } from '../services/analysisCache';
import { analysisQueue } from '../services/queue';
import { consumeTrialCredit } from '../services/creditsService';

export const analyzeRouter = Router();

const analyzeSchema = z.object({
  file_url: z.string().min(1),
  media_type: z.enum(['image', 'video', 'audio', 'document']),
  /** SHA-256 hex from upload — enables instant reuse of a prior verdict for identical bytes */
  content_hash: z
    .string()
    .regex(/^[a-f0-9]{64}$/i)
    .transform((s) => s.toLowerCase())
    .optional(),
});

analyzeRouter.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = analyzeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const { file_url, media_type, content_hash } = parsed.data;
  const userId = req.userId!;

  // One credit per analysis request (dedup, async queue, or instant) — same pool as chat + extension
  const credit = await consumeTrialCredit(userId);
  if (!credit.ok) {
    res.status(402).json({
      error: 'Trial credits exhausted. Upgrade to continue.',
      code: 'INSUFFICIENT_CREDITS',
      remaining: credit.remaining,
    });
    return;
  }

  // Instant path: same file bytes already analyzed — copy DB row, skip queue and external APIs
  if (content_hash) {
    try {
      const admin = getSupabaseServiceRole();
      const prior = await findPriorDuplicateResult(admin, userId, content_hash, media_type);
      if (prior) {
        const { data: newJob, error: jobErr } = await admin
          .from('analysis_jobs')
          .insert({
            user_id:       userId,
            file_url,
            media_type,
            status:        'done',
            content_hash,
            completed_at:  new Date().toISOString(),
          })
          .select('id')
          .single();

        if (jobErr || !newJob) {
          res.status(500).json({ error: `Failed to create job: ${jobErr?.message ?? 'unknown'}` });
          return;
        }

        const p = prior.result;
        const { error: resErr } = await admin.from('results').insert({
          job_id:         newJob.id,
          verdict:        p.verdict,
          confidence:     p.confidence,
          explanation:    p.explanation,
          model_scores:   p.model_scores,
          models_run:       p.models_run,
          models_skipped:   p.models_skipped,
          signals:          p.signals,
          caveat:           p.caveat,
          processing_ms:    0,
          model_evidence:   p.model_evidence ?? {},
        });

        if (resErr) {
          await admin.from('analysis_jobs').delete().eq('id', newJob.id);
          res.status(500).json({ error: `Failed to copy result: ${resErr.message}` });
          return;
        }

        res.status(201).json({
          job_id:         newJob.id,
          status:         'done',
          deduplicated:   true,
          source_job_id:  prior.sourceJobId,
          remaining:      credit.remaining,
        });
        return;
      }
    } catch (e) {
      console.warn('[analyze] Dedup fast path skipped:', (e as Error).message);
    }
  }

  const db = createSupabaseWithAccessToken(req.accessToken!);

  const { data: job, error } = await db
    .from('analysis_jobs')
    .insert({
      user_id: userId,
      file_url,
      media_type,
      status: 'pending',
      ...(content_hash ? { content_hash } : {}),
    })
    .select('id, status, created_at')
    .single();

  if (error) {
    res.status(500).json({ error: `Failed to create job: ${error.message}` });
    return;
  }

  try {
    await analysisQueue.add('analyze', {
      jobId: job.id,
      fileUrl: file_url,
      mediaType: media_type,
      userId,
    });
  } catch (queueError: any) {
    console.error('[analyze] Failed to add job to queue:', queueError.message);
    res.status(500).json({ 
      error: 'Analysis queue is currently unavailable. Please ensure Redis is running.',
      details: queueError.message 
    });
    return;
  }

  res.status(201).json({
    job_id: job.id,
    status: job.status,
    remaining: credit.remaining,
  });
});
