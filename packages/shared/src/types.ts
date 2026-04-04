export type MediaType = 'image' | 'video' | 'audio' | 'document';

export type JobStatus = 'pending' | 'processing' | 'done' | 'failed';

/** Backend (SightEngine) verdict values */
export type Verdict = 'AI_GENERATED' | 'HUMAN' | 'UNCERTAIN';

export type Plan = 'free' | 'pro' | 'enterprise';

export interface User {
  id: string;
  email: string;
  created_at: string;
  plan: Plan;
}

/** Full row from DB; `/api/status/:id` may omit some fields */
export interface AnalysisJob {
  id: string;
  user_id?: string;
  file_url?: string;
  media_type: MediaType;
  status: JobStatus;
  created_at: string;
  completed_at: string | null;
}

export interface ModelScore {
  model: string;
  score: number | null;
  status: string;
}

export interface AnalysisResult {
  id: string;
  job_id: string;
  verdict: Verdict;
  confidence: number;
  explanation: string;
  model_scores: Record<string, number | null>;
  models_run: string[];
  models_skipped: string[];
  signals: string[];
  caveat: string | null;
  processing_ms: number;
}

/** Per-model outputs shown on the result page (proof + skip reasons). */
export interface ModelEvidence {
  sightengine: {
    ai_likeness: number;
    verdict: Verdict;
    proof: string;
  };
  grok:
    | {
        ran: true;
        assessment: 'LIKELY_AI' | 'LIKELY_REAL' | 'UNCERTAIN';
        confidence_pct: number;
        proof: string;
      }
    | { ran: false; skip_reason: string };
  claude:
    | {
        ran: true;
        /** 0–100: Claude’s own visual AI-likeness estimate */
        confidence_pct: number;
        proof_points: string[];
      }
    | { ran: false; skip_reason: string };
}

export interface FinalResponse {
  job_id: string;
  verdict: Verdict;
  confidence: number;
  explanation: string;
  top_signals: string[];
  caveat: string | null;
  model_scores: Record<string, number | null>;
  models_run: string[];
  models_skipped: string[];
  processing_ms: number;
  /** Present for new analyses; older rows may omit until backfilled. */
  model_evidence?: ModelEvidence;
}

export interface ClaudeVerdictResponse {
  verdict: Verdict;
  confidence_pct: number;
  explanation: string;
  top_signals: string[];
  caveat: string | null;
}
