import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { supabase } from '../services/supabase';
import { analysisQueue } from '../services/queue';

export const analyzeRouter = Router();

const analyzeSchema = z.object({
  file_url: z.string().min(1),
  media_type: z.enum(['image', 'video', 'audio', 'document']),
});

analyzeRouter.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = analyzeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const { file_url, media_type } = parsed.data;

  const { data: job, error } = await supabase
    .from('analysis_jobs')
    .insert({
      user_id: req.userId,
      file_url,
      media_type,
      status: 'pending',
    })
    .select('id, status, created_at')
    .single();

  if (error) {
    res.status(500).json({ error: `Failed to create job: ${error.message}` });
    return;
  }

  await analysisQueue.add('analyze', {
    jobId: job.id,
    fileUrl: file_url,
    mediaType: media_type,
    userId: req.userId,
  });

  res.status(201).json({ job_id: job.id, status: job.status });
});
