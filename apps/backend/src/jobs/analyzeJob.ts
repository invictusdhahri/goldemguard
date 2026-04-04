/**
 * analyzeJob.ts — Production BullMQ worker for VeritasAI analysis pipeline
 *
 * Flow per job:
 *   1. Mark job "processing" in DB
 *   2. Download file from Supabase storage (uploads bucket)
 *   3. Guard against oversized files (>100 MB)
 *   4. Send file to ML service via multipart/form-data with timeout + retry
 *   5. Normalise partial ML response (missing fields are defaulted, not fatal)
 *   6. Idempotent upsert into `results` table
 *   7. Mark job "done" or "failed" with completed_at timestamp
 *
 * Error taxonomy:
 *   UnrecoverableError  → BullMQ drops the job immediately (no retry)
 *   Regular Error       → BullMQ retries up to job.opts.attempts (default 3)
 *
 * Shutdown: SIGTERM/SIGINT wait for in-flight jobs via worker.close()
 */

import { Worker, type Job, UnrecoverableError } from 'bullmq';
import IORedis from 'ioredis';
import { getSupabase } from '../services/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

const ML_SERVICE_URL    = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';
const MAX_FILE_BYTES    = 100 * 1024 * 1024; // 100 MB
const ML_TIMEOUT_MS     = 30_000;            // abort single ML request after 30s
const ML_MAX_ATTEMPTS   = 3;                 // internal retry counter (separate from BullMQ retries)

// ─── Type definitions ─────────────────────────────────────────────────────────

/** Shape of data pushed onto the 'analysis' BullMQ queue */
interface AnalysisJobPayload {
  jobId:     string;
  fileUrl:   string;
  mediaType: 'image' | 'video' | 'audio' | 'document';
  userId:    string;
}

/** Canonical ML service response — all fields optional to handle partial responses */
interface MlResponseRaw {
  verdict?:        'AI_GENERATED' | 'HUMAN' | 'UNCERTAIN';
  confidence?:     number;
  explanation?:    string;
  model_scores?:   Record<string, number>;
  models_run?:     string[];
  models_skipped?: string[];
  top_signals?:    string[];
  caveat?:         string | null;
}

/** Normalised — all fields guaranteed after sanitisation */
interface MlResult {
  verdict:        'AI_GENERATED' | 'HUMAN' | 'UNCERTAIN';
  confidence:     number;
  explanation:    string;
  model_scores:   Record<string, number>;
  models_run:     string[];
  models_skipped: string[];
  top_signals:    string[];
  caveat:         string | null;
}

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

// ─── ML service call with timeout + internal retry ────────────────────────────
//
// Why internal retry instead of relying purely on BullMQ retries?
// BullMQ retries re-queue the job (seconds of latency + DB round-trip).
// Internal retry is faster for transient 5xx flickers while still honouring
// the 30s timeout per attempt.

async function callMlService(
  mediaType: string,
  buffer:    Buffer,
  filename:  string,
  jobId:     string,
): Promise<MlResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < ML_MAX_ATTEMPTS; attempt++) {
    // Exponential backoff between internal retries (not the first attempt)
    if (attempt > 0) {
      const delayMs = Math.min(Math.pow(2, attempt) * 1_000, 30_000);
      log('warn', jobId, `ML retry ${attempt + 1}/${ML_MAX_ATTEMPTS} in ${delayMs}ms`);
      await sleep(delayMs);
    }

    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);

    try {
      const form = new FormData();
      form.append('file', new Blob([new Uint8Array(buffer)]), filename);

      const res = await fetch(`${ML_SERVICE_URL}/detect/${mediaType}`, {
        method: 'POST',
        body:   form,
        signal: controller.signal,
      });

      clearTimeout(timer);

      // 4xx — client/input error; retrying won't help
      if (res.status >= 400 && res.status < 500) {
        const body = await res.text().catch(() => '');
        throw new UnrecoverableError(`ML rejected input (HTTP ${res.status}): ${body}`);
      }

      // 5xx — server-side failure; eligible for retry
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        lastError  = new Error(`ML service HTTP ${res.status}: ${body}`);
        continue;
      }

      const raw = (await res.json()) as MlResponseRaw;
      return normaliseMlResponse(raw);

    } catch (err) {
      clearTimeout(timer);

      // Propagate immediately — no point retrying unrecoverable errors
      if (err instanceof UnrecoverableError) throw err;

      if ((err as Error).name === 'AbortError') {
        lastError = new Error(`ML timed out after ${ML_TIMEOUT_MS}ms (attempt ${attempt + 1})`);
        log('warn', jobId, lastError.message);
        continue;
      }

      // Network-level error (DNS, ECONNREFUSED) — retry
      lastError = err as Error;
    }
  }

  // All attempts exhausted — let BullMQ decide whether to re-queue
  throw lastError ?? new Error('ML service failed after all internal retries');
}

/** Fill in defaults for any missing ML response fields — partial results are still useful */
function normaliseMlResponse(raw: MlResponseRaw): MlResult {
  return {
    verdict:        raw.verdict        ?? 'UNCERTAIN',
    confidence:     raw.confidence     ?? 0,
    explanation:    raw.explanation    ?? 'No explanation provided.',
    model_scores:   raw.model_scores   ?? {},
    models_run:     raw.models_run     ?? [],
    models_skipped: raw.models_skipped ?? [],
    top_signals:    raw.top_signals    ?? [],
    caveat:         raw.caveat         ?? null,
  };
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
  const db = getSupabase();

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
  const db = getSupabase();

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
    job_id:         jobId,
    verdict:        result.verdict,
    confidence:     result.confidence,
    explanation:    result.explanation,
    model_scores:   result.model_scores,
    models_run:     result.models_run,
    models_skipped: result.models_skipped,
    signals:        result.top_signals,
    caveat:         result.caveat,
    processing_ms:  processingMs,
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
  const db = getSupabase();
  const { data: fileBlob, error: downloadError } = await db.storage
    .from('uploads')
    .download(fileUrl);

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

  const filename = fileUrl.split('/').pop() ?? 'upload';
  log('info', jobId, `📦 Downloaded ${(buffer.byteLength / 1024).toFixed(1)} KB — calling ML`);

  // ── Step 4: ML inference ──────────────────────────────────
  // callMlService throws UnrecoverableError on 4xx; throws regular Error on 5xx/timeout
  // (BullMQ will retry regular errors per job.opts.attempts)
  let mlResult: MlResult;
  try {
    mlResult = await callMlService(mediaType, buffer, filename, jobId);
  } catch (err) {
    await setJobStatus(jobId, 'failed');
    throw err; // re-throw so BullMQ handles retry vs. drop decision
  }

  const processingMs = Date.now() - t0;
  log(
    'info',
    jobId,
    `🤖 ML done — verdict=${mlResult.verdict} confidence=${(mlResult.confidence * 100).toFixed(1)}% ` +
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
    `[worker] 🚀 Analysis worker started — concurrency=2, rateLimit=10/min, ML_SERVICE=${ML_SERVICE_URL}`,
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

export { worker as analysisWorker };
