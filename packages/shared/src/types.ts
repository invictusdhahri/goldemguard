export type MediaType = 'image' | 'video' | 'audio' | 'document';

export type JobStatus = 'pending' | 'processing' | 'done' | 'failed';

export type Verdict = 'REAL' | 'FAKE' | 'UNCERTAIN';

export type Plan = 'free' | 'pro' | 'enterprise';

export interface User {
  id: string;
  email: string;
  created_at: string;
  plan: Plan;
}

export interface AnalysisJob {
  id: string;
  user_id: string;
  file_url: string;
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
}

export interface ClaudeVerdictResponse {
  verdict: Verdict;
  confidence_pct: number;
  explanation: string;
  top_signals: string[];
  caveat: string | null;
}
