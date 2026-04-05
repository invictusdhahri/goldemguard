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
  /** Free-tier pool; omitted in older API responses. */
  trial_credits?: number;
}

/** Full row from DB; `/api/status/:id` may omit some fields */
export interface AnalysisJob {
  id: string;
  user_id?: string;
  file_url?: string;
  /** SHA-256 hex of file bytes; used server-side to reuse prior results for identical uploads */
  content_hash?: string | null;
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
  /** Present for image analyses only. */
  sightengine?: {
    ai_likeness: number;
    verdict: Verdict;
    proof: string;
  };
  /** Present for image analyses only. */
  grok?:
    | {
        ran: true;
        assessment: 'LIKELY_AI' | 'LIKELY_REAL' | 'UNCERTAIN';
        confidence_pct: number;
        proof: string;
        /** What real-world event/person/place Grok identified in the image */
        event_description?: string | null;
        /** Whether Grok's live web search confirmed the depicted event happened */
        event_verified?: 'CONFIRMED' | 'DISPUTED' | 'UNVERIFIABLE' | null;
        /** News/web sources Grok cited when verifying the event */
        event_sources?: string[];
      }
    | { ran: false; skip_reason: string };
  /** Present for image analyses only. */
  claude?:
    | {
        ran: true;
        /** 0–100: Claude's own visual AI-likeness estimate */
        confidence_pct: number;
        proof_points: string[];
      }
    | { ran: false; skip_reason: string };
  /** Present for audio analyses only. */
  resemble?:
    | {
        ran: true;
        /** Seconds analyzed from the start of the file (API segment). Omitted on older rows. */
        sample_seconds?: number;
        label: 'fake' | 'real' | 'uncertain';
        aggregated_score: number;
        chunk_scores: string[];
        consistency: string;
        source_tracing: string | null;
        intelligence: string | null;
      }
    | { ran: false; skip_reason: string };
  /** Present for document analyses only. */
  sapling?:
    | {
        ran: true;
        /** Raw Sapling AI probability score (0–1). */
        score: number;
        verdict: Verdict;
        sentence_count: number;
      }
    | { ran: false; skip_reason: string };
  /**
   * Present for video analyses — SightEngine video genai model results.
   * Populated on the visual path (after audio check passes).
   */
  sightengine_video?:
    | {
        ran: true;
        /** Per-frame AI-generated scores (0–1). */
        frame_scores: number[];
        /** Maximum per-frame score — headline threat signal. */
        max_score: number;
        /** Mean score across all analyzed frames. */
        mean_score: number;
        verdict: Verdict;
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
