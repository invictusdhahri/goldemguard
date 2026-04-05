-- ============================================================
-- GolemGuard — initial schema
-- ============================================================

-- Users table (mirrors auth.users; id == auth.uid())
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  plan        TEXT        DEFAULT 'free'
);

-- Analysis jobs
CREATE TABLE IF NOT EXISTS public.analysis_jobs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_url     TEXT        NOT NULL,
  media_type   TEXT        NOT NULL,
  status       TEXT        DEFAULT 'pending',
  created_at   TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Results
CREATE TABLE IF NOT EXISTS public.results (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID        NOT NULL REFERENCES public.analysis_jobs(id) ON DELETE CASCADE,
  verdict         TEXT        NOT NULL,
  confidence      FLOAT       NOT NULL,
  explanation     TEXT        NOT NULL,
  model_scores    JSONB       NOT NULL DEFAULT '{}',
  models_run      JSONB       NOT NULL DEFAULT '[]',
  models_skipped  JSONB       NOT NULL DEFAULT '[]',
  signals         JSONB       NOT NULL DEFAULT '[]',
  caveat          TEXT,
  processing_ms   INTEGER
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_id  ON public.analysis_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status   ON public.analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_results_job_id         ON public.results(job_id);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results       ENABLE ROW LEVEL SECURITY;

-- users: each user can only see/edit their own row
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- analysis_jobs: scoped to the owning user
CREATE POLICY "jobs_select_own" ON public.analysis_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "jobs_insert_own" ON public.analysis_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "jobs_update_own" ON public.analysis_jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- results: accessible when the parent job belongs to the user
CREATE POLICY "results_select_own" ON public.results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.analysis_jobs j
      WHERE j.id = results.job_id
        AND j.user_id = auth.uid()
    )
  );

-- ============================================================
-- Storage bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('uploads', 'uploads', false, 52428800)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "uploads_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "uploads_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "uploads_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
