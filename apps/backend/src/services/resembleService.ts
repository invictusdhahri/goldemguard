/**
 * Resemble AI deepfake detection for audio.
 *
 * We do **not** use `@resemble/node` for detection: that SDK sends
 * `Authorization: Token token=…`, while the API expects `Bearer` tokens
 * (see https://docs.resemble.ai/getting-started/authentication). That mismatch
 * makes secure upload / detect return `success: false` with no `item`.
 *
 * Flow: multipart POST /v2/secure_uploads → JSON POST /v2/detect with
 * `media_token` + `Prefer: wait`, with polling fallback.
 *
 * Docs: https://docs.resemble.ai/detect
 */

import type { SightEngineResult } from './sightengineService';

const API_V2 = process.env.RESEMBLE_API_BASE ?? 'https://app.resemble.ai/api/v2';

/** Seconds from the start of the file to analyze (Resemble `start_region` / `end_region`). */
function getAudioSampleSeconds(): number {
  const raw = process.env.RESEMBLE_AUDIO_SAMPLE_SECONDS;
  const n   = raw != null && raw !== '' ? Number.parseInt(raw, 10) : 5;
  if (Number.isNaN(n) || n < 1) return 5;
  return Math.min(120, Math.max(1, n));
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ResembleDetectionResult extends SightEngineResult {
  resemble_raw: {
    /** Seconds of audio sent to the detector (start of file). */
    sample_seconds: number;
    label: string;
    aggregated_score: string;
    chunk_scores: string[];
    consistency: string;
    source_tracing: string | null;
    intelligence: string | null;
  };
}

interface DetectionItem {
  uuid?: string;
  status?: string;
  error_message?: string;
  metrics?: {
    label?: string;
    aggregated_score?: string;
    score?: Array<string | number>;
    consistency?: string;
  };
  audio_source_tracing?: { label?: string; error_message?: string | null };
  intelligence?: { description?: string | null } | null;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.RESEMBLE_API_KEY ?? '';
  if (!key) throw new Error('Missing RESEMBLE_API_KEY environment variable');
  return key;
}

function bearerHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Bearer ${getApiKey()}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

// ─── HTTP ─────────────────────────────────────────────────────────────────────

/** Upload bytes → short-lived `media_token` for /detect. */
async function secureUpload(buffer: Buffer, filename: string): Promise<string> {
  const form = new FormData();
  form.append(
    'file',
    new Blob([new Uint8Array(buffer)], { type: 'application/octet-stream' }),
    pathBasenameSafe(filename),
  );

  const res = await fetch(`${API_V2}/secure_uploads`, {
    method:  'POST',
    headers: bearerHeaders(),
    body:    form,
  });

  const raw = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    token?:  string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(
      `Resemble secure upload HTTP ${res.status}: ${raw.message ?? JSON.stringify(raw)}`,
    );
  }
  if (!raw.success || !raw.token) {
    throw new Error(`Resemble secure upload failed: ${raw.message ?? JSON.stringify(raw)}`);
  }
  return raw.token;
}

function pathBasenameSafe(name: string): string {
  const base = name.replace(/^.*[/\\]/, '');
  return base.replace(/[^a-zA-Z0-9._-]/g, '_') || 'audio.bin';
}

/** Create detection job; `Prefer: wait` asks the API to block until complete when possible. */
async function detectCreate(
  mediaToken: string,
  sampleSeconds: number,
): Promise<{
  success: boolean;
  message?: string;
  item?: DetectionItem | null;
}> {
  /** Analysis window within the segment (API allows 1–4s; use 1 when the segment is a single second). */
  const frameLen = sampleSeconds <= 1 ? 1 : 2;

  const res = await fetch(`${API_V2}/detect`, {
    method: 'POST',
    headers: {
      ...bearerHeaders(true),
      Prefer: 'wait',
    },
    body: JSON.stringify({
      media_token:            mediaToken,
      /** Only analyze this time range (seconds from start) — avoids processing entire long files. */
      start_region:           0,
      end_region:             sampleSeconds,
      visualize:              true,
      frame_length:           frameLen,
      intelligence:           true,
      audio_source_tracing:   true,
      use_ood_detector:       true,
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    item?:   DetectionItem | null;
  };

  if (!res.ok) {
    throw new Error(
      `Resemble detect HTTP ${res.status}: ${json.message ?? JSON.stringify(json)}`,
    );
  }
  return json as { success: boolean; message?: string; item?: DetectionItem | null };
}

async function detectGet(uuid: string): Promise<{
  success: boolean;
  message?: string;
  item?: DetectionItem | null;
}> {
  const res = await fetch(`${API_V2}/detect/${encodeURIComponent(uuid)}`, {
    headers: bearerHeaders(),
  });
  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    item?:   DetectionItem | null;
  };
  if (!res.ok) {
    throw new Error(
      `Resemble get detect HTTP ${res.status}: ${json.message ?? JSON.stringify(json)}`,
    );
  }
  return json as { success: boolean; message?: string; item?: DetectionItem | null };
}

/** Poll until completed/failed or attempts exhausted. */
async function waitForDetection(
  uuid: string,
  maxAttempts: number,
  waitSeconds: number,
): Promise<DetectionItem> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, waitSeconds * 1000));
    }
    const got = await detectGet(uuid);
    if (!got.success || !got.item) {
      throw new Error(got.message ?? 'Resemble get detect: no item');
    }
    const st = got.item.status;
    if (st === 'completed' || st === 'failed' || got.item.metrics?.label != null) {
      return got.item;
    }
    if (st === 'processing' || st === undefined) {
      continue;
    }
    return got.item;
  }
  throw new Error(`Resemble detection timed out after ${maxAttempts} polls`);
}

// ─── Response helpers ─────────────────────────────────────────────────────────

function labelToVerdict(label: string): SightEngineResult['verdict'] {
  if (label === 'fake') return 'AI_GENERATED';
  if (label === 'real') return 'HUMAN';
  return 'UNCERTAIN';
}

function buildExplanation(
  label: string,
  aggregatedScore: string,
  consistency: string,
  sourceTracing: string | null,
  intelligence: string | null,
): string {
  const scorePct       = (parseFloat(aggregatedScore) * 100).toFixed(1);
  const consistencyPct = (parseFloat(consistency) * 100).toFixed(1);

  let base: string;
  if (label === 'fake') {
    base = `Resemble AI detects this audio as AI-generated with ${scorePct}% confidence (consistency: ${consistencyPct}%).`;
    if (sourceTracing && sourceTracing !== 'real') {
      base += ` The audio appears to have been synthesised using ${sourceTracing.replace(/_/g, ' ')}.`;
    }
  } else if (label === 'real') {
    base = `Resemble AI classifies this audio as authentic with ${scorePct}% confidence (consistency: ${consistencyPct}%).`;
  } else {
    base = `Resemble AI returned an ambiguous score of ${scorePct}% (consistency: ${consistencyPct}%). The audio could not be definitively classified.`;
  }

  if (intelligence) base += ` ${intelligence}`;
  return base;
}

function intelligenceDescription(intel: DetectionItem['intelligence']): string | null {
  if (!intel?.description) return null;
  const d = intel.description;
  if (typeof d !== 'string') return null;
  const s = d.trim();
  if (!s) return null;
  // API returns this when the optional intelligence step fails — not user-facing content
  if (/^error generating intelligence/i.test(s)) return null;
  return s;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run deepfake detection on an in-memory audio file (no public URL required).
 */
export async function analyzeAudio(
  buffer:      Buffer,
  filename:    string,
  maxAttempts  = 20,
  waitSeconds  = 3,
): Promise<ResembleDetectionResult> {
  getApiKey(); // validate env early

  const sampleSeconds = getAudioSampleSeconds();

  const mediaToken = await secureUpload(buffer, filename);

  const created = await detectCreate(mediaToken, sampleSeconds);

  if (!created.success) {
    throw new Error(`Resemble detect failed: ${created.message ?? 'unknown'}`);
  }
  if (!created.item?.uuid) {
    throw new Error(`Resemble detect returned no item: ${created.message ?? JSON.stringify(created)}`);
  }

  let item: DetectionItem = created.item;

  if (item.status === 'failed') {
    throw new Error(`Resemble AI detection job failed: ${item.error_message ?? 'unknown error'}`);
  }

  const hasMetrics =
    item.metrics?.label != null
    || item.metrics?.aggregated_score != null
    || item.status === 'completed';

  if (!hasMetrics && item.uuid) {
    item = await waitForDetection(item.uuid, maxAttempts, waitSeconds);
  }

  if (item.status === 'failed') {
    throw new Error(`Resemble AI detection job failed: ${item.error_message ?? 'unknown error'}`);
  }

  const metrics         = item.metrics ?? {};
  const label           = (metrics.label ?? 'uncertain').toLowerCase();
  const aggregatedScore = metrics.aggregated_score != null ? String(metrics.aggregated_score) : '0';
  const chunkScores     = (metrics.score ?? []).map((s) => String(s));
  const consistency     = metrics.consistency != null ? String(metrics.consistency) : '0';

  const sourceTracingLabel = item.audio_source_tracing?.label ?? null;
  const intelligenceText   = intelligenceDescription(item.intelligence);

  const verdict     = labelToVerdict(label);
  const confidence  = parseFloat(aggregatedScore);
  const segmentNote =
    `This verdict is based on the first ${sampleSeconds} second${sampleSeconds === 1 ? '' : 's'} of the file (not the full duration). `;
  const explanation = segmentNote + buildExplanation(
    label, aggregatedScore, consistency, sourceTracingLabel, intelligenceText,
  );

  const topSignals: string[] = [];
  if (label === 'fake') {
    topSignals.push('ai_generated_audio');
    if (sourceTracingLabel && sourceTracingLabel !== 'real') {
      topSignals.push(`source:${sourceTracingLabel}`);
    }
  }

  const borderline =
    confidence < 0.6 && confidence > 0.4
      ? 'Resemble AI score is in the borderline range — treat the result with caution.'
      : null;

  return {
    verdict,
    confidence,
    explanation,
    model_scores:   { resemble_detect: confidence },
    models_run:     ['resemble_detect'],
    models_skipped: [],
    top_signals:    topSignals,
    caveat: borderline,
    resemble_raw: {
      sample_seconds: sampleSeconds,
      label,
      aggregated_score: aggregatedScore,
      chunk_scores:     chunkScores,
      consistency,
      source_tracing:   sourceTracingLabel,
      intelligence:     intelligenceText,
    },
  };
}
