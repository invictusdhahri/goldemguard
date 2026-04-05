import type { SupabaseClient } from '@supabase/supabase-js';
import type { SightEngineResult } from './sightengineService';

/** Row shape from `results` / select('*') */
export interface ResultRow {
  verdict: string;
  confidence: number;
  explanation: string;
  model_scores: Record<string, number | null>;
  models_run: string[];
  models_skipped: string[];
  signals: unknown;
  caveat: string | null;
  processing_ms: number | null;
  model_evidence: Record<string, unknown>;
}

export function resultRowToMlResult(row: ResultRow): SightEngineResult {
  const scores: Record<string, number> = {};
  for (const [k, v] of Object.entries(row.model_scores ?? {})) {
    if (typeof v === 'number' && !Number.isNaN(v)) scores[k] = v;
  }
  return {
    verdict:        row.verdict as SightEngineResult['verdict'],
    confidence:     row.confidence,
    explanation:    row.explanation,
    model_scores:   scores,
    models_run:       Array.isArray(row.models_run) ? row.models_run : [],
    models_skipped:   Array.isArray(row.models_skipped) ? row.models_skipped : [],
    top_signals:    Array.isArray(row.signals) ? (row.signals as string[]) : [],
    caveat:           row.caveat,
    model_evidence:   row.model_evidence ?? {},
  };
}

/**
 * Returns a prior completed analysis for the same user, bytes, and media type.
 * Pass `excludeJobId` when the current job row already exists (worker) so we never match ourselves.
 */
export async function findPriorDuplicateResult(
  db:           SupabaseClient,
  userId:       string,
  contentHash:  string,
  mediaType:    string,
  excludeJobId?: string,
): Promise<{ sourceJobId: string; result: ResultRow } | null> {
  let q = db
    .from('analysis_jobs')
    .select('id')
    .eq('user_id', userId)
    .eq('content_hash', contentHash)
    .eq('media_type', mediaType)
    .eq('status', 'done');

  if (excludeJobId) q = q.neq('id', excludeJobId);

  const { data: priorJob, error: jobErr } = await q
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (jobErr || !priorJob?.id) return null;

  const { data: row, error: resErr } = await db
    .from('results')
    .select('*')
    .eq('job_id', priorJob.id)
    .maybeSingle();

  if (resErr || !row) return null;

  const r = row as unknown as ResultRow;
  return { sourceJobId: priorJob.id, result: r };
}
