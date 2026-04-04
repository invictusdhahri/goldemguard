-- Per-model proof / skip reasons for transparency (SightEngine, Grok, Claude)
ALTER TABLE public.results
  ADD COLUMN IF NOT EXISTS model_evidence JSONB NOT NULL DEFAULT '{}'::jsonb;
