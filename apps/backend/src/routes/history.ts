import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { supabase } from '../services/supabase';

export const historyRouter = Router();

historyRouter.get('/', requireAuth, async (req: AuthRequest, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  const { data: jobs, error } = await supabase
    .from('analysis_jobs')
    .select(
      `
      id,
      file_url,
      media_type,
      status,
      created_at,
      completed_at,
      results (
        verdict,
        confidence,
        explanation,
        processing_ms
      )
    `,
    )
    .eq('user_id', req.userId!)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    res.status(500).json({ error: `Failed to fetch history: ${error.message}` });
    return;
  }

  const items = (jobs ?? []).map((job) => ({
    ...job,
    result: Array.isArray(job.results) ? job.results[0] ?? null : job.results,
    results: undefined,
  }));

  res.json({ items, limit, offset });
});
