import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { supabase } from '../services/supabase';

export const resultsRouter = Router();

resultsRouter.get('/status/:id', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('analysis_jobs')
    .select('id, status, media_type, created_at, completed_at')
    .eq('id', id)
    .eq('user_id', req.userId!)
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.json(data);
});

resultsRouter.get('/result/:id', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;

  const { data: job, error: jobError } = await supabase
    .from('analysis_jobs')
    .select('id, user_id, status')
    .eq('id', id)
    .eq('user_id', req.userId!)
    .single();

  if (jobError || !job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  if (job.status !== 'done') {
    res.status(409).json({ error: 'Analysis not complete', status: job.status });
    return;
  }

  const { data: result, error: resultError } = await supabase
    .from('results')
    .select('*')
    .eq('job_id', id)
    .single();

  if (resultError || !result) {
    res.status(404).json({ error: 'Result not found' });
    return;
  }

  res.json({
    job_id: id,
    verdict: result.verdict,
    confidence: result.confidence,
    explanation: result.explanation,
    top_signals: result.signals,
    caveat: result.caveat,
    model_scores: result.model_scores,
    models_run: result.models_run,
    models_skipped: result.models_skipped,
    processing_ms: result.processing_ms,
  });
});
