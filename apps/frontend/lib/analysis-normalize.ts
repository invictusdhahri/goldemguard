import type { FinalResponse, Verdict } from '@veritas/shared';

const VERDICTS: Verdict[] = ['REAL', 'FAKE', 'UNCERTAIN'];

function isVerdict(v: unknown): v is Verdict {
  return typeof v === 'string' && (VERDICTS as readonly string[]).includes(v);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

function asModelScores(v: unknown): Record<string, number | null> {
  if (!v || typeof v !== 'object') return {};
  const out: Record<string, number | null> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (val === null) {
      out[k] = null;
    } else if (typeof val === 'number' && Number.isFinite(val)) {
      const x = val > 1 ? val / 100 : val;
      out[k] = clamp01(x);
    }
  }
  return out;
}

/** Tolerates API drift; always returns a render-safe object. */
export function normalizeFinalResponse(jobId: string, raw: unknown): FinalResponse {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  const confidenceRaw = typeof o.confidence === 'number' ? o.confidence : 0;
  const confidence = clamp01(confidenceRaw > 1 ? confidenceRaw / 100 : confidenceRaw);

  return {
    job_id: typeof o.job_id === 'string' ? o.job_id : jobId,
    verdict: isVerdict(o.verdict) ? o.verdict : 'UNCERTAIN',
    confidence,
    explanation: typeof o.explanation === 'string' ? o.explanation : 'No explanation was returned.',
    top_signals: asStringArray(o.top_signals),
    caveat: o.caveat === null || typeof o.caveat === 'string' ? o.caveat : null,
    model_scores: asModelScores(o.model_scores),
    models_run: asStringArray(o.models_run),
    models_skipped: asStringArray(o.models_skipped),
    processing_ms: typeof o.processing_ms === 'number' && Number.isFinite(o.processing_ms) ? o.processing_ms : 0,
  };
}
