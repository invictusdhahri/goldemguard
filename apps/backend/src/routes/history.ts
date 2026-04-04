import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { createSupabaseWithAccessToken } from '../services/supabase';

export const historyRouter = Router();

historyRouter.get('/', requireAuth, async (req: AuthRequest, res) => {
  // Validate and sanitize query parameters
  const limitParam = parseInt(req.query.limit as string);
  const offsetParam = parseInt(req.query.offset as string);
  
  // Ensure valid numbers and apply constraints
  const limit = Math.min(
    isNaN(limitParam) ? 20 : Math.max(1, limitParam),
    100
  );
  const offset = isNaN(offsetParam) ? 0 : Math.max(0, offsetParam);

  const db = createSupabaseWithAccessToken(req.accessToken!);

  const { data: jobs, error } = await db
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
