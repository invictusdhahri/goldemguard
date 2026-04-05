-- SHA-256 (hex) of file bytes — dedupe re-analysis for same user + media type without re-calling external APIs
ALTER TABLE public.analysis_jobs
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_hash_media_done
  ON public.analysis_jobs (user_id, content_hash, media_type)
  WHERE content_hash IS NOT NULL AND status = 'done';

COMMENT ON COLUMN public.analysis_jobs.content_hash IS
  'SHA-256 hex digest of uploaded file bytes; used to reuse prior results for identical files.';
