import '../loadEnv';

/**
 * analyzeJob.ts — Production BullMQ worker for VeritasAI analysis pipeline
 *
 * Flow per job:
 *   1. Mark job "processing" in DB
 *   2. Download file from Supabase storage (uploads bucket)
 *   3. Guard against oversized files (>100 MB)
 *   4a. SightEngine + Grok in parallel (Grok assesses independently — no SE anchoring)
 *   4b. Claude Haiku (vision): independent AI-likeness rate + reasoning synthesis (optional)
 *   4c. Final verdict: SE raw score ≥ 0.5 → always AI_GENERATED; else SE threshold AI_GENERATED → AI;
 *       else Grok preferred, then Claude, then SE
 *   5. Idempotent upsert into `results` table
 *   6. Mark job "done" or "failed" with completed_at timestamp
 *
 * Error taxonomy:
 *   UnrecoverableError  → BullMQ drops the job immediately (no retry)
 *   Regular Error       → BullMQ retries up to job.opts.attempts (default 3)
 *
 * Shutdown: SIGTERM/SIGINT wait for in-flight jobs via worker.close()
 */

import { Worker, type Job, UnrecoverableError } from 'bullmq';
import IORedis from 'ioredis';
import { getSupabaseServiceRole, storageObjectPathFromFileUrl } from '../services/supabase';
import { analyzeImage, unsupportedMediaResult, type SightEngineResult } from '../services/sightengineService';
import { analyzeAudio } from '../services/resembleService';
import { callGrok, isValidGrokResult, type GrokResult } from '../services/grokService';
import { callClaude } from '../services/claudeService';
import { analyzeSaplingText } from '../services/saplingService';
import { extractText } from '../utils/extractText';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_BYTES    = 100 * 1024 * 1024; // 100 MB
const API_TIMEOUT_MS    = 30_000;            // abort single SightEngine request after 30s
const API_MAX_ATTEMPTS  = 3;                 // internal retry counter (separate from BullMQ retries)

// ─── Type definitions ─────────────────────────────────────────────────────────

/** Shape of data pushed onto the 'analysis' BullMQ queue */
interface AnalysisJobPayload {
  jobId:     string;
  fileUrl:   string;
  mediaType: 'image' | 'video' | 'audio' | 'document';
  userId:    string;
}

/** Re-export for internal use — matches the shape persisted to the DB */
type MlResult = SightEngineResult;

// ─── Structured logger ────────────────────────────────────────────────────────

const EMOJI: Record<'info' | 'warn' | 'error', string> = {
  info:  '✅',
  warn:  '⚠️ ',
  error: '❌',
};

function log(
  level:  'info' | 'warn' | 'error',
  jobId:  string,
  msg:    string,
  meta?:  unknown,
): void {
  const ts   = new Date().toISOString();
  const line = `${ts} ${EMOJI[level]} [worker][${jobId}] ${msg}`;
  meta !== undefined ? console[level](line, meta) : console[level](line);
}

// ─── Redis connection ─────────────────────────────────────────────────────────
//
// The Worker MUST use its own IORedis instance — BullMQ uses two connections
// internally per worker (blocking poll + command pipe) and sharing the Queue's
// connection causes race conditions and disconnects under load.

function createWorkerRedis(): IORedis {
  // Prefer granular REDIS_HOST/PORT (12-factor) with REDIS_URL as fallback
  const host = process.env.REDIS_HOST;
  const port = parseInt(process.env.REDIS_PORT ?? '6379', 10);

  const connOptions = host
    ? { host, port }
    : { host: '127.0.0.1', port: 6379 };

  const redisUrl = process.env.REDIS_URL;
  const conn     = redisUrl
    ? new IORedis(redisUrl, {
        maxRetriesPerRequest: null,   // required by BullMQ
        lazyConnect:          true,
        enableOfflineQueue:   false,
        retryStrategy: (times) => (times >= 3 ? null : Math.min(times * 500, 2_000)),
      })
    : new IORedis({
        ...connOptions,
        maxRetriesPerRequest: null,
        lazyConnect:          true,
        enableOfflineQueue:   false,
        retryStrategy: (times) => (times >= 3 ? null : Math.min(times * 500, 2_000)),
      });

  conn.on('error', (err: NodeJS.ErrnoException) => {
    // Silenced after 3 retries (retryStrategy returns null); won't spam
    if (err.code !== 'ECONNREFUSED') {
      console.error('[worker] Redis error:', err.message);
    }
  });

  return conn;
}

// ─── SightEngine API call with timeout + internal retry ───────────────────────
//
// Internal retry is faster for transient HTTP errors while still honouring
// the per-attempt timeout. BullMQ-level retries re-queue the whole job.

async function callSightEngine(
  mediaType: string,
  buffer:    Buffer,
  filename:  string,
  jobId:     string,
): Promise<MlResult> {
  if (mediaType !== 'image') {
    log('warn', jobId, `Unsupported media type "${mediaType}" — returning stub result`);
    return unsupportedMediaResult(mediaType);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < API_MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      const delayMs = Math.min(Math.pow(2, attempt) * 1_000, 30_000);
      log('warn', jobId, `SightEngine retry ${attempt + 1}/${API_MAX_ATTEMPTS} in ${delayMs}ms`);
      await sleep(delayMs);
    }

    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const result = await analyzeImage(buffer, filename, controller.signal);
      clearTimeout(timer);
      return result;
    } catch (err) {
      clearTimeout(timer);

      if ((err as Error).message?.includes('Missing SIGHTENGINE')) {
        throw new UnrecoverableError((err as Error).message);
      }

      if ((err as Error).name === 'AbortError') {
        lastError = new Error(`SightEngine timed out after ${API_TIMEOUT_MS}ms (attempt ${attempt + 1})`);
        log('warn', jobId, lastError.message);
        continue;
      }

      lastError = err as Error;
    }
  }

  throw lastError ?? new Error('SightEngine API failed after all internal retries');
}

// ─── Database helpers ─────────────────────────────────────────────────────────

/**
 * Update analysis_jobs.status with a single DB-level retry on failure.
 * Using a tail-recursive flag instead of a loop keeps the call-stack clear.
 */
async function setJobStatus(
  jobId:   string,
  status:  'processing' | 'done' | 'failed',
  isRetry = false,
): Promise<void> {
  const db = getSupabaseServiceRole();

  const patch: Record<string, unknown> = { status };
  if (status !== 'processing') patch.completed_at = new Date().toISOString();

  const { error } = await db
    .from('analysis_jobs')
    .update(patch)
    .eq('id', jobId);

  if (error) {
    if (!isRetry) {
      log('warn', jobId, `DB status update failed, retrying once: ${error.message}`);
      await sleep(500);
      return setJobStatus(jobId, status, true);
    }
    // Second failure: throw so the job itself fails (BullMQ will retry the whole job)
    throw new Error(`DB status update failed after retry: ${error.message}`);
  }
}

/**
 * Idempotent result insert.
 * Checks for an existing row first so replayed jobs don't duplicate results.
 * Retries the insert once on transient DB errors.
 */
async function persistResult(
  jobId:        string,
  result:       MlResult,
  processingMs: number,
  isRetry       = false,
): Promise<void> {
  const db = getSupabaseServiceRole();

  // ── Idempotency guard ─────────────────────────────────────
  const { data: existing, error: checkError } = await db
    .from('results')
    .select('id')
    .eq('job_id', jobId)
    .maybeSingle();

  if (checkError) {
    log('warn', jobId, `Idempotency check failed: ${checkError.message} — proceeding with insert`);
  }

  if (existing) {
    log('warn', jobId, 'Result already exists — skipping insert (replayed job, safe to ignore)');
    return;
  }

  // ── Insert ────────────────────────────────────────────────
  const { error } = await db.from('results').insert({
    job_id:          jobId,
    verdict:         result.verdict,
    confidence:      result.confidence,
    explanation:     result.explanation,
    model_scores:    result.model_scores,
    models_run:      result.models_run,
    models_skipped:  result.models_skipped,
    signals:         result.top_signals,
    caveat:          result.caveat,
    processing_ms:   processingMs,
    model_evidence:    result.model_evidence ?? {},
  });

  if (error) {
    if (!isRetry) {
      log('warn', jobId, `DB insert failed, retrying once: ${error.message}`);
      await sleep(500);
      return persistResult(jobId, result, processingMs, true);
    }
    throw new Error(`DB insert failed after retry: ${error.message}`);
  }
}

// ─── Core job processor ───────────────────────────────────────────────────────

async function processJob(job: Job<AnalysisJobPayload>): Promise<void> {
  const { jobId, fileUrl, mediaType } = job.data;
  const t0 = Date.now();

  log('info', jobId, `🔍 Job received — mediaType=${mediaType} file=${fileUrl} attempt=${job.attemptsMade + 1}`);

  // ── Step 1: Mark processing ───────────────────────────────
  await setJobStatus(jobId, 'processing');

  // ── Step 2: Download from Supabase storage ────────────────
  const db = getSupabaseServiceRole();
  let objectPath: string;
  try {
    objectPath = storageObjectPathFromFileUrl(fileUrl);
  } catch {
    log('error', jobId, `Invalid storage URL (expected public uploads URL): ${fileUrl}`);
    await setJobStatus(jobId, 'failed');
    throw new UnrecoverableError('Invalid file_url — cannot resolve storage path');
  }

  const { data: fileBlob, error: downloadError } = await db.storage
    .from('uploads')
    .download(objectPath);

  if (downloadError || !fileBlob) {
    const reason = downloadError?.message ?? 'empty response';
    log('error', jobId, `File not found in storage: ${reason}`);
    await setJobStatus(jobId, 'failed');
    // File missing won't self-heal — mark unrecoverable so BullMQ doesn't retry
    throw new UnrecoverableError(`File not found in Supabase storage: ${reason}`);
  }

  // ── Step 3: Memory guard ──────────────────────────────────
  const buffer = Buffer.from(await fileBlob.arrayBuffer());

  if (buffer.byteLength > MAX_FILE_BYTES) {
    const sizeMb = (buffer.byteLength / 1024 / 1024).toFixed(1);
    log('error', jobId, `File too large: ${sizeMb} MB (limit 100 MB)`);
    await setJobStatus(jobId, 'failed');
    throw new UnrecoverableError(`File exceeds 100 MB limit (${sizeMb} MB)`);
  }

  const filename = objectPath.split('/').pop() ?? 'upload';
  // Infer MIME type from extension (used for Grok vision input and document text extraction)
  const ext      = filename.split('.').pop()?.toLowerCase() ?? '';
  const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
    : ext === 'png'  ? 'image/png'
    : ext === 'gif'  ? 'image/gif'
    : ext === 'webp' ? 'image/webp'
    : ext === 'pdf'  ? 'application/pdf'
    : ext === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : ext === 'doc'  ? 'application/msword'
    : 'image/jpeg';

  log('info', jobId, `📦 Downloaded ${(buffer.byteLength / 1024).toFixed(1)} KB — dispatching to analysis pipeline`);

  // ── Step 4: SightEngine ∥ Grok, then Claude ───────────────
  let mlResult: MlResult;
  try {
    if (mediaType === 'audio') {
      // ── Audio: Resemble AI deepfake detection ─────────────
      log('info', jobId, '🎙️  Audio detected — calling Resemble AI (file upload)');
      const resembleResult = await analyzeAudio(buffer, filename);

      mlResult = {
        verdict:        resembleResult.verdict,
        confidence:     resembleResult.confidence,
        explanation:    resembleResult.explanation,
        model_scores:   resembleResult.model_scores,
        models_run:     resembleResult.models_run,
        models_skipped: resembleResult.models_skipped,
        top_signals:    resembleResult.top_signals,
        caveat:         resembleResult.caveat,
        model_evidence: {
          resemble: {
            ran:              true,
            sample_seconds:   resembleResult.resemble_raw.sample_seconds,
            label:            resembleResult.resemble_raw.label as 'fake' | 'real' | 'uncertain',
            aggregated_score: parseFloat(resembleResult.resemble_raw.aggregated_score),
            chunk_scores:     resembleResult.resemble_raw.chunk_scores,
            consistency:      resembleResult.resemble_raw.consistency,
            source_tracing:   resembleResult.resemble_raw.source_tracing,
            intelligence:     resembleResult.resemble_raw.intelligence,
          },
        },
      };

      log(
        'info',
        jobId,
        `🎙️  Resemble AI done — label=${resembleResult.resemble_raw.label} ` +
        `score=${resembleResult.resemble_raw.aggregated_score} ` +
        `source=${resembleResult.resemble_raw.source_tracing ?? 'n/a'}`,
      );
    } else if (mediaType === 'document') {
      // ── Document: Sapling AI text detection ───────────────
      log('info', jobId, `📄 Document detected (${mimeType}) — extracting text for Sapling AI`);

      let extractedText: string;
      try {
        extractedText = await extractText(buffer, mimeType);
        log('info', jobId, `📄 Extracted ${extractedText.length} chars from document`);
      } catch (err) {
        log('warn', jobId, `📄 Text extraction failed: ${(err as Error).message} — marking UNCERTAIN`);
        mlResult = {
          verdict:        'UNCERTAIN',
          confidence:     0.5,
          explanation:    `Could not extract text from this document: ${(err as Error).message}`,
          model_scores:   { sapling_aidetect: 0 },
          models_run:     [],
          models_skipped: ['sapling_aidetect'],
          top_signals:    [],
          caveat:         'Text extraction failed; analysis could not be performed.',
          model_evidence: {
            sapling: { ran: false, skip_reason: `Text extraction failed: ${(err as Error).message}` },
          },
        };
        // Skip to persist — mlResult already assigned via the extraction-failure path
        const processingMsExt = Date.now() - t0;
        log('info', jobId, `✅ Analysis done (extraction failure) — verdict=UNCERTAIN in ${processingMsExt}ms`);
        await persistResult(jobId, mlResult, processingMsExt);
        await setJobStatus(jobId, 'done');
        log('info', jobId, `🎉 Job complete — total=${processingMsExt}ms`);
        return;
      }

      const saplingResult = await analyzeSaplingText(extractedText);
      log(
        'info',
        jobId,
        `📝 Sapling AI done — score=${saplingResult.score.toFixed(3)} verdict=${saplingResult.verdict} ` +
        `sentences=${saplingResult.sentence_count}`,
      );

      mlResult = {
        verdict:      saplingResult.verdict,
        confidence:   saplingResult.score,
        explanation:  `Sapling AI text analysis scored ${(saplingResult.score * 100).toFixed(1)}% AI probability across ${saplingResult.sentence_count} sentence(s).`,
        model_scores: { sapling_aidetect: saplingResult.score },
        models_run:   ['sapling_aidetect'],
        models_skipped: [
          'sightengine_genai',
          'grok_grok4fast',
          'claude_haiku',
          'resemble_ai',
        ],
        top_signals: saplingResult.sentence_scores
          .filter((s) => s.score >= 0.7)
          .slice(0, 3)
          .map((s) => `High AI probability sentence (${(s.score * 100).toFixed(0)}%): "${s.sentence.slice(0, 80)}…"`),
        caveat: null,
        model_evidence: {
          sapling: {
            ran:            true,
            score:          saplingResult.score,
            verdict:        saplingResult.verdict,
            sentence_count: saplingResult.sentence_count,
          },
        },
      };
    } else if (mediaType === 'video') {
      // ── Video: not yet supported ───────────────────────────
      const sightEngineResult = await callSightEngine(mediaType, buffer, filename, jobId);
      mlResult = {
        ...sightEngineResult,
        model_evidence: {
          sapling: { ran: false, skip_reason: 'Text detection only applies to documents' },
          grok:    { ran: false, skip_reason: 'Vision models only run on images' },
          claude:  { ran: false, skip_reason: 'Claude synthesis runs after image vision pipeline' },
        },
      };
    } else {
      const [sightEngineResult, grokOutcome] = await Promise.all([
        callSightEngine(mediaType, buffer, filename, jobId),
        callGrok(buffer, mimeType),
      ]);

      mlResult = { ...sightEngineResult };
      mlResult.models_run     = Array.isArray(mlResult.models_run) ? mlResult.models_run : [];
      mlResult.models_skipped = Array.isArray(mlResult.models_skipped) ? mlResult.models_skipped : [];

      const grokResult =
        grokOutcome.ok && isValidGrokResult(grokOutcome.data) ? grokOutcome.data : null;

      if (grokResult) {
        log('info', jobId,
          `🤖 Grok result — assessment=${grokResult.assessment} confidence=${grokResult.confidence_pct}% ` +
          `reasoning="${grokResult.reasoning}"`,
        );
        mlResult.model_scores   = { ...mlResult.model_scores, grok_grok4fast: grokResult.confidence_pct / 100 };
        mlResult.models_run     = [...mlResult.models_run, 'grok_grok4fast'];
      } else {
        const why = !grokOutcome.ok
          ? grokOutcome.reason
          : 'Grok payload invalid or empty (check xAI response format)';
        log('warn', jobId, `⏭  Grok skipped — ${why}`);
        mlResult.models_skipped = [...mlResult.models_skipped, 'grok_grok4fast'];
      }

      const claudeOutcome = await callClaude(
        buffer,
        mimeType,
        sightEngineResult.confidence,
        sightEngineResult.verdict,
        grokResult,
      );

      if (claudeOutcome.ok) {
        const llm = claudeOutcome.data;
        const proofN = (llm.proof_points ?? []).length;
        log('info', jobId,
          `🧠 Claude result — rate=${llm.confidence_pct}% verdict=${llm.verdict} proof_points=${proofN} ` +
          `explanation="${(llm.explanation ?? '').slice(0, 120)}…" caveat=${llm.caveat ?? 'none'}`,
        );
        mlResult.model_scores = {
          ...mlResult.model_scores,
          claude_haiku: llm.confidence_pct / 100,
        };
        mlResult.verdict     = llm.verdict;
        mlResult.explanation = llm.explanation;
        mlResult.top_signals = Array.isArray(llm.top_signals) ? llm.top_signals : [];
        mlResult.caveat      = llm.caveat;
        mlResult.models_run  = [...new Set([...mlResult.models_run, 'claude_haiku'])];
      } else {
        log('warn', jobId, `⏭  Claude skipped — ${claudeOutcome.reason}`);
        mlResult.models_skipped = [...mlResult.models_skipped, 'claude_haiku'];
      }

      mlResult.verdict = resolveFinalVerdict(
        sightEngineResult.confidence,
        sightEngineResult.verdict,
        grokResult,
        claudeOutcome.ok ? claudeOutcome.data.verdict : null,
      );

      mlResult.model_evidence = {
        sightengine: {
          ai_likeness: sightEngineResult.confidence,
          verdict:     sightEngineResult.verdict,
          proof:       sightEngineResult.explanation,
        },
        grok: grokResult
          ? {
              ran:             true,
              assessment:      grokResult.assessment,
              confidence_pct:  grokResult.confidence_pct,
              proof:           grokResult.reasoning,
            }
          : {
              ran: false,
              skip_reason: !grokOutcome.ok ? grokOutcome.reason : 'Grok payload invalid or empty',
            },
        claude: claudeOutcome.ok
          ? {
              ran:            true,
              confidence_pct: claudeOutcome.data.confidence_pct,
              proof_points:   claudeOutcome.data.proof_points ?? [],
            }
          : { ran: false, skip_reason: claudeOutcome.reason },
      };

      const blended = blendAiLikeness(mlResult.model_scores);
      if (blended != null) mlResult.confidence = blended;
    }
  } catch (err) {
    await setJobStatus(jobId, 'failed');
    throw err;
  }

  mlResult.models_run     = Array.isArray(mlResult.models_run) ? mlResult.models_run : [];
  mlResult.models_skipped = Array.isArray(mlResult.models_skipped) ? mlResult.models_skipped : [];

  const processingMs = Date.now() - t0;
  log(
    'info',
    jobId,
    `✅ Analysis done — verdict=${mlResult.verdict} confidence=${(mlResult.confidence * 100).toFixed(1)}% ` +
    `models=${mlResult.models_run.join(',')} in ${processingMs}ms`,
  );

  // ── Step 5: Persist result (idempotent) ───────────────────
  try {
    await persistResult(jobId, mlResult, processingMs);
  } catch (err) {
    await setJobStatus(jobId, 'failed');
    throw err;
  }

  // ── Step 6: Mark done ─────────────────────────────────────
  await setJobStatus(jobId, 'done');

  log('info', jobId, `🎉 Job complete — total=${processingMs}ms`);
}

// ─── Worker bootstrap ─────────────────────────────────────────────────────────

let worker: Worker<AnalysisJobPayload> | null = null;

try {
  const connection = createWorkerRedis();

  worker = new Worker<AnalysisJobPayload>('analysis', processJob, {
    connection,
    concurrency: 2,
    limiter: {
      max:      10,
      duration: 60_000,
    },
    settings: {
      // Exponential backoff for BullMQ-level retries: 2s → 4s → 8s … cap 30s
      // This fires when the job itself is re-queued (not the internal ML retry)
      backoffStrategy: (attempts: number) =>
        Math.min(Math.pow(2, attempts) * 1_000, 30_000),
    },
  });

  worker.on('completed', (job) => {
    log('info', job.data.jobId, `✅ BullMQ confirmed complete (attempts=${job.attemptsMade})`);
  });

  worker.on('failed', (job, err) => {
    const id            = job?.data.jobId ?? '?';
    const unrecoverable = err instanceof UnrecoverableError;
    log(
      'error',
      id,
      unrecoverable
        ? `💥 Unrecoverable failure (no retry): ${err.message}`
        : `💥 Failed on attempt ${job?.attemptsMade ?? '?'}: ${err.message}`,
    );
  });

  worker.on('error', (err) => {
    console.error('[worker] Worker-level error:', err.message);
  });

  console.log(
    '[worker] 🚀 Analysis worker started — concurrency=2, rateLimit=10/min, backend=SightEngine+Grok+Claude (images) / Resemble (audio) / Sapling (documents)',
  );
} catch (err) {
  console.warn('[worker] ⚠️  Failed to start — Redis likely unavailable:', (err as Error).message);
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────
//
// worker.close() waits for in-flight processors to finish before closing the
// Redis connection. Without this, SIGTERM would mid-flight jobs corrupt state.

async function shutdown(signal: string): Promise<never> {
  console.log(`\n[worker] ${signal} — draining in-flight jobs…`);
  if (worker) {
    await worker.close();
    console.log('[worker] Clean shutdown complete.');
  }
  process.exit(0);
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT',  () => void shutdown('SIGINT'));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Mean AI-likeness (0–1) across sightengine_genai, grok_grok4fast, claude_haiku when present. */
function blendAiLikeness(modelScores: Record<string, number | null>): number | null {
  const keys = ['sightengine_genai', 'grok_grok4fast', 'claude_haiku'] as const;
  const parts: number[] = [];
  for (const k of keys) {
    const v = modelScores[k];
    if (typeof v === 'number' && !Number.isNaN(v)) parts.push(v);
  }
  if (parts.length === 0) return null;
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

/** Raw genai score at or above this (majority AI-likeness) → AI regardless of Grok/Claude. */
const SE_AI_SCORE_THRESHOLD = 0.5;

/**
 * SightEngine raw score ≥ {@link SE_AI_SCORE_THRESHOLD} → always AI_GENERATED.
 * Else if SE threshold verdict is AI_GENERATED → AI_GENERATED.
 * Else Grok preferred when present; else Claude; else SE.
 */
function resolveFinalVerdict(
  seScore:   number,
  seVerdict: MlResult['verdict'],
  grok:      GrokResult | null,
  claude:    MlResult['verdict'] | null,
): MlResult['verdict'] {
  if (seScore >= SE_AI_SCORE_THRESHOLD) return 'AI_GENERATED';
  if (seVerdict === 'AI_GENERATED') return 'AI_GENERATED';
  if (grok) {
    if (grok.assessment === 'LIKELY_AI') return 'AI_GENERATED';
    if (grok.assessment === 'LIKELY_REAL') return 'HUMAN';
  }
  if (claude) return claude;
  return seVerdict;
}

export { worker as analysisWorker };
