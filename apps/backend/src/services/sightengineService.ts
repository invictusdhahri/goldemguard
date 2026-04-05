/**
 * SightEngine API client for AI-generated image and video detection.
 *
 * Replaces the self-hosted ML service (services/ml/).
 * Image docs: https://sightengine.com/docs/ai-generated-image-detection
 * Video docs:  https://sightengine.com/docs/ai-generated-video-detection
 */

import type { ModelEvidence } from '@veritas/shared';

const SIGHTENGINE_URL       = 'https://api.sightengine.com/1.0/check.json';
const SIGHTENGINE_VIDEO_URL = 'https://api.sightengine.com/1.0/video/check-sync.json';

const API_USER   = process.env.SIGHTENGINE_API_USER   ?? '';
const API_SECRET = process.env.SIGHTENGINE_API_SECRET ?? '';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SightEngineResponse {
  status: string;
  type?: { ai_generated?: number };
  request?: { id?: string; operations?: number };
  media?: { id?: string; uri?: string };
  error?: { type?: string; message?: string; code?: number };
}

export interface SightEngineResult {
  verdict:        'AI_GENERATED' | 'HUMAN' | 'UNCERTAIN';
  confidence:     number;
  explanation:    string;
  model_scores:   Record<string, number>;
  models_run:     string[];
  models_skipped: string[];
  top_signals:    string[];
  caveat:         string | null;
  /** Filled by analyzeJob after Grok + Claude (optional on raw SightEngine-only path). */
  model_evidence?: ModelEvidence;
}

// ─── Verdict mapping ─────────────────────────────────────────────────────────

function scoreToVerdict(score: number): SightEngineResult {
  let verdict: SightEngineResult['verdict'];
  let explanation: string;

  if (score >= 0.75) {
    verdict     = 'AI_GENERATED';
    explanation = `SightEngine genai model reports a ${(score * 100).toFixed(1)}% likelihood that the image is AI-generated.`;
  } else if (score <= 0.35) {
    verdict     = 'HUMAN';
    explanation = `SightEngine genai model reports a ${((1 - score) * 100).toFixed(1)}% likelihood that the image is authentic.`;
  } else {
    verdict     = 'UNCERTAIN';
    explanation = `SightEngine genai model returned an ambiguous score of ${(score * 100).toFixed(1)}%. The image could be either AI-generated or authentic.`;
  }

  return {
    verdict,
    confidence:     score,
    explanation,
    model_scores:   { sightengine_genai: score },
    models_run:     ['sightengine_genai'],
    models_skipped: [],
    top_signals:    verdict === 'AI_GENERATED' ? ['ai_generated_content'] : [],
    caveat:         null,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Analyse an image buffer via the SightEngine `genai` model.
 * Throws on network/API errors so the caller can handle retries.
 */
export async function analyzeImage(
  buffer:   Buffer,
  filename: string,
  signal?:  AbortSignal,
): Promise<SightEngineResult> {
  if (!API_USER || !API_SECRET) {
    throw new Error(
      'Missing SIGHTENGINE_API_USER or SIGHTENGINE_API_SECRET environment variables',
    );
  }

  const form = new FormData();
  form.append('media', new Blob([new Uint8Array(buffer)]), filename);
  form.append('models', 'genai');
  form.append('api_user', API_USER);
  form.append('api_secret', API_SECRET);

  const res = await fetch(SIGHTENGINE_URL, {
    method: 'POST',
    body:   form,
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`SightEngine HTTP ${res.status}: ${text}`);
  }

  const json = (await res.json()) as SightEngineResponse;

  if (json.status !== 'success') {
    const msg = json.error?.message ?? JSON.stringify(json);
    throw new Error(`SightEngine API error: ${msg}`);
  }

  const aiScore = json.type?.ai_generated ?? 0;
  return scoreToVerdict(aiScore);
}

/**
 * Returns a stub result for media types not yet supported by SightEngine integration.
 */
export function unsupportedMediaResult(mediaType: string): SightEngineResult {
  return {
    verdict:        'UNCERTAIN',
    confidence:     0,
    explanation:    `${mediaType} analysis is not yet supported. Only image detection is currently available.`,
    model_scores:   {},
    models_run:     [],
    models_skipped: ['sightengine_genai'],
    top_signals:    [],
    caveat:         `${mediaType} detection is not implemented yet.`,
  };
}

// ─── Video types + helpers ────────────────────────────────────────────────────

interface SightEngineVideoFrame {
  info?: { id?: string; position?: number };
  type?: { ai_generated?: number };
}

interface SightEngineVideoResponse {
  status: string;
  data?: { frames?: SightEngineVideoFrame[] };
  media?: { id?: string; uri?: string };
  error?: { type?: string; message?: string; code?: number };
}

export interface SightEngineVideoResult extends SightEngineResult {
  /** Per-frame AI-generated scores (0–1). */
  frame_scores: number[];
  /** Maximum per-frame score — used as the headline threat signal. */
  max_score:    number;
  /** Mean score across all analyzed frames. */
  mean_score:   number;
}

function videoScoresToVerdict(
  frameScores: number[],
): SightEngineVideoResult {
  const max  = frameScores.length > 0 ? Math.max(...frameScores) : 0;
  const mean = frameScores.length > 0
    ? frameScores.reduce((s, x) => s + x, 0) / frameScores.length
    : 0;

  // Use max score for threat verdict (a single AI frame is significant)
  let verdict: SightEngineResult['verdict'];
  let explanation: string;

  if (max >= 0.75) {
    verdict     = 'AI_GENERATED';
    explanation = `SightEngine video analysis found a peak AI-generation score of ${(max * 100).toFixed(1)}% across ${frameScores.length} frame(s) (mean: ${(mean * 100).toFixed(1)}%).`;
  } else if (max <= 0.35) {
    verdict     = 'HUMAN';
    explanation = `SightEngine video analysis found no significant AI generation signals (peak: ${(max * 100).toFixed(1)}%, mean: ${(mean * 100).toFixed(1)}% across ${frameScores.length} frame(s)).`;
  } else {
    verdict     = 'UNCERTAIN';
    explanation = `SightEngine video analysis returned an ambiguous result (peak: ${(max * 100).toFixed(1)}%, mean: ${(mean * 100).toFixed(1)}% across ${frameScores.length} frame(s)).`;
  }

  return {
    verdict,
    confidence:     max,
    explanation,
    model_scores:   { sightengine_genai_video: max },
    models_run:     ['sightengine_genai_video'],
    models_skipped: [],
    top_signals:    verdict === 'AI_GENERATED' ? ['ai_generated_video_content'] : [],
    caveat:         frameScores.length < 3
      ? 'Fewer than 3 frames were analyzed — result may be less reliable.'
      : null,
    frame_scores: frameScores,
    max_score:    max,
    mean_score:   mean,
  };
}

// ─── Video public API ─────────────────────────────────────────────────────────

/**
 * Analyse a video buffer via the SightEngine `genai` synchronous video endpoint.
 * Intended for videos ≤ 10 seconds (enforced upstream by the worker).
 * Throws on network/API errors so the caller can handle retries.
 */
export async function analyzeVideo(
  buffer:   Buffer,
  filename: string,
  signal?:  AbortSignal,
): Promise<SightEngineVideoResult> {
  if (!API_USER || !API_SECRET) {
    throw new Error(
      'Missing SIGHTENGINE_API_USER or SIGHTENGINE_API_SECRET environment variables',
    );
  }

  const form = new FormData();
  form.append('media', new Blob([new Uint8Array(buffer)]), filename);
  form.append('models', 'genai');
  form.append('api_user', API_USER);
  form.append('api_secret', API_SECRET);

  const res = await fetch(SIGHTENGINE_VIDEO_URL, {
    method: 'POST',
    body:   form,
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`SightEngine video HTTP ${res.status}: ${text}`);
  }

  const json = (await res.json()) as SightEngineVideoResponse;

  if (json.status !== 'success') {
    const msg = json.error?.message ?? JSON.stringify(json);
    throw new Error(`SightEngine video API error: ${msg}`);
  }

  const frames      = json.data?.frames ?? [];
  const frameScores = frames
    .map((f) => f.type?.ai_generated ?? 0)
    .filter((s) => typeof s === 'number');

  return videoScoresToVerdict(frameScores);
}
