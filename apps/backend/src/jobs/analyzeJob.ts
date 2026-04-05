import '../loadEnv';

/**
 * analyzeJob.ts — Production BullMQ worker for VeritasAI analysis pipeline
 *
 * Flow per job:
 *   1. Mark job "processing" in DB
 *   2. Download file from Supabase storage (uploads bucket)
 *   3. Guard against oversized files (>100 MB); compute SHA-256 and persist to analysis_jobs.content_hash
 *   3b. If the same user already has a completed analysis for this hash + media_type, copy results row and skip APIs
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
import { findPriorDuplicateResult, resultRowToMlResult } from '../services/analysisCache';
import { analyzeImage, analyzeVideo, unsupportedMediaResult, type SightEngineResult } from '../services/sightengineService';
import { analyzeAudio } from '../services/resembleService';
import { callGrok, isValidGrokResult, type GrokResult } from '../services/grokService';
import { callClaude, callClaudeForVideo } from '../services/claudeService';
import { analyzeSaplingText } from '../services/saplingService';
import { extractText } from '../utils/extractText';
import { getVideoDuration, extractAudioSegment, extractKeyFrames, FfmpegNotFoundError } from '../utils/videoUtils';
import { sha256Hex } from '../utils/contentHash';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_BYTES    = 100 * 1024 * 1024; // 100 MB
const API_TIMEOUT_MS    = 30_000;            // abort single SightEngine request after 30s
const API_MAX_ATTEMPTS  = 3;                 // internal retry counter (separate from BullMQ retries)

// Video-specific limits (configurable via env)
function getVideoMaxDurationSeconds(): number {
  const raw = process.env.VIDEO_MAX_DURATION_SECONDS;
  const n   = raw != null && raw !== '' ? Number.parseInt(raw, 10) : 10;
  return Number.isNaN(n) || n < 1 ? 10 : n;
}
function getVideoAudioSampleSeconds(): number {
  const raw = process.env.VIDEO_AUDIO_SAMPLE_SECONDS;
  const n   = raw != null && raw !== '' ? Number.parseInt(raw, 10) : 5;
  return Number.isNaN(n) || n < 1 ? 5 : Math.min(n, 10);
}

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
        connectTimeout:       5000,
        enableOfflineQueue:   false,
        retryStrategy: (times) => (times >= 3 ? null : Math.min(times * 500, 2_000)),
      })
    : new IORedis({
        ...connOptions,
        maxRetriesPerRequest: null,
        lazyConnect:          true,
        connectTimeout:       5000,
        enableOfflineQueue:   false,
        retryStrategy: (times) => (times >= 3 ? null : Math.min(times * 500, 2_000)),
      });

  conn.on('error', (err: any) => {
    // Silence common connection-refused errors after retry-limit is reached
    if (err.code === 'ECONNREFUSED' || err.message?.includes('Connection is closed')) {
      return;
    }
    console.error('[worker] Redis error:', err.message || err);
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
async function setJobContentHash(jobId: string, contentHash: string, isRetry = false): Promise<void> {
  const db = getSupabaseServiceRole();
  const { error } = await db
    .from('analysis_jobs')
    .update({ content_hash: contentHash })
    .eq('id', jobId);

  if (error) {
    if (!isRetry) {
      log('warn', jobId, `content_hash update failed, retrying once: ${error.message}`);
      await sleep(500);
      return setJobContentHash(jobId, contentHash, true);
    }
    log('warn', jobId, `content_hash update failed after retry: ${error.message}`);
  }
}

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
  const { jobId, fileUrl, mediaType, userId } = job.data;
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

  // ── Dedup: same bytes + user + media type already analyzed — reuse DB verdict (no external APIs)
  const contentHash = sha256Hex(buffer);
  await setJobContentHash(jobId, contentHash);

  const dup = await findPriorDuplicateResult(db, userId, contentHash, mediaType, jobId);
  if (dup) {
    const processingMsDup = Date.now() - t0;
    log(
      'info',
      jobId,
      `⚡ Duplicate file (SHA-256 matches completed job ${dup.sourceJobId}) — reusing stored verdict, skipping APIs`,
    );
    try {
      await persistResult(jobId, resultRowToMlResult(dup.result), processingMsDup);
    } catch (err) {
      await setJobStatus(jobId, 'failed');
      throw err;
    }
    await setJobStatus(jobId, 'done');
    log('info', jobId, `🎉 Job complete (deduplicated) — total=${processingMsDup}ms`);
    return;
  }

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
      // ── Video: audio-first short circuit, then SightEngine video + Grok + Claude ──

      // Phase 1: Duration check
      log('info', jobId, '🎬 Video detected — checking duration');
      let videoDuration: number;
      try {
        videoDuration = await getVideoDuration(buffer);
      } catch (err) {
        if (err instanceof FfmpegNotFoundError) {
          log('error', jobId, `ffmpeg not installed — ${err.message}`);
          await setJobStatus(jobId, 'failed');
          throw new UnrecoverableError(err.message);
        }
        log('error', jobId, `ffprobe failed: ${(err as Error).message}`);
        await setJobStatus(jobId, 'failed');
        throw new UnrecoverableError(`Cannot read video duration: ${(err as Error).message}`);
      }

      const maxDuration = getVideoMaxDurationSeconds();
      if (videoDuration > maxDuration) {
        const msg = `Video duration ${videoDuration.toFixed(1)}s exceeds maximum of ${maxDuration}s`;
        log('error', jobId, msg);
        await setJobStatus(jobId, 'failed');
        throw new UnrecoverableError(msg);
      }
      log('info', jobId, `⏱  Video duration: ${videoDuration.toFixed(2)}s (limit ${maxDuration}s)`);

      // Phase 2: Extract audio + Resemble AI deepfake check (short-circuit if AI)
      const audioSampleSec = getVideoAudioSampleSeconds();
      log('info', jobId, `🎙️  Extracting first ${audioSampleSec}s of audio for deepfake check`);

      let resembleRan = false;
      let resembleResult: Awaited<ReturnType<typeof analyzeAudio>> | null = null;

      try {
        const audioBuffer = await extractAudioSegment(buffer, audioSampleSec);
        resembleResult    = await analyzeAudio(audioBuffer, 'extracted_audio.wav');
        resembleRan       = true;
        log('info', jobId,
          `🎤 Resemble AI done — label=${resembleResult.resemble_raw.label} ` +
          `score=${(resembleResult.confidence * 100).toFixed(1)}%`,
        );
      } catch (err) {
        // If audio extraction fails (e.g. silent/video-only), log a warning and proceed
        log('warn', jobId, `Audio extraction/Resemble skipped: ${(err as Error).message}`);
      }

      const resembleEvidence = resembleResult && resembleRan
        ? {
            ran:              true as const,
            sample_seconds:   resembleResult.resemble_raw.sample_seconds,
            label:            resembleResult.resemble_raw.label as 'fake' | 'real' | 'uncertain',
            aggregated_score: parseFloat(resembleResult.resemble_raw.aggregated_score),
            chunk_scores:     resembleResult.resemble_raw.chunk_scores,
            consistency:      resembleResult.resemble_raw.consistency,
            source_tracing:   resembleResult.resemble_raw.source_tracing,
            intelligence:     resembleResult.resemble_raw.intelligence,
          }
        : { ran: false as const, skip_reason: 'Audio extraction failed or video has no audio stream' };

      // Short-circuit: AI audio means the whole video is AI-generated
      if (resembleResult && resembleResult.verdict === 'AI_GENERATED') {
        log('info', jobId, '🚨 Resemble AI flagged audio as AI-generated — short-circuit verdict: AI_GENERATED');
        mlResult = {
          verdict:        'AI_GENERATED',
          confidence:     resembleResult.confidence,
          explanation:    `Audio deepfake detected: ${resembleResult.explanation}`,
          model_scores:   { resemble_detect: resembleResult.confidence },
          models_run:     ['resemble_detect'],
          models_skipped: ['sightengine_genai_video', 'grok_grok4fast', 'claude_haiku'],
          top_signals:    resembleResult.top_signals,
          caveat:         resembleResult.caveat,
          model_evidence: {
            resemble:         resembleEvidence,
            sightengine_video: { ran: false, skip_reason: 'Audio flagged as AI-generated — visual analysis skipped' },
            grok:              { ran: false, skip_reason: 'Audio flagged as AI-generated — visual analysis skipped' },
            claude:            { ran: false, skip_reason: 'Audio flagged as AI-generated — visual analysis skipped' },
          },
        };
      } else {
        // Phase 3: Visual pipeline — SightEngine video API + Grok (parallel), then Claude
        log('info', jobId, '🔍 Proceeding to visual analysis (SightEngine video + Grok + Claude)');

        // Extract key frames for Grok + Claude
        let keyFrames: Buffer[] = [];
        try {
          keyFrames = await extractKeyFrames(buffer, 3, videoDuration);
          log('info', jobId, `🖼  Extracted ${keyFrames.length} key frame(s) for Grok/Claude`);
        } catch (err) {
          log('warn', jobId, `Frame extraction failed: ${(err as Error).message}`);
        }
        const representativeFrame = keyFrames.length > 0
          ? keyFrames[Math.floor(keyFrames.length / 2)]  // middle frame
          : null;

        // SightEngine video + Grok in parallel
        log('info', jobId, '🔬 SightEngine video API + Grok running in parallel');

        // ── SightEngine: try video API, fall back to image analysis on frame ──
        type SeVideoOutcome =
          | { mode: 'video'; result: Awaited<ReturnType<typeof analyzeVideo>> }
          | { mode: 'frame'; result: Awaited<ReturnType<typeof analyzeImage>>; skipReason: string };

        const [seOutcome, grokOutcome] = await Promise.all([
          // SightEngine (video API with fallback to frame image)
          (async (): Promise<SeVideoOutcome> => {
            let lastErr: Error | null = null;
            for (let attempt = 0; attempt < API_MAX_ATTEMPTS; attempt++) {
              if (attempt > 0) {
                const delay = Math.min(Math.pow(2, attempt) * 1_000, 30_000);
                log('warn', jobId, `SightEngine video retry ${attempt + 1}/${API_MAX_ATTEMPTS} in ${delay}ms`);
                await sleep(delay);
              }
              const controller = new AbortController();
              const timer      = setTimeout(() => controller.abort(), API_TIMEOUT_MS * 3);
              try {
                const r = await analyzeVideo(buffer, filename, controller.signal);
                clearTimeout(timer);
                return { mode: 'video', result: r };
              } catch (err) {
                clearTimeout(timer);
                if ((err as Error).message?.includes('Missing SIGHTENGINE')) {
                  throw new UnrecoverableError((err as Error).message);
                }
                lastErr = err as Error;
              }
            }
            // Video API exhausted — fall back to image analysis on representative frame
            const skipReason = `SightEngine video API unavailable (${lastErr?.message ?? 'unknown'}); using frame image analysis instead.`;
            log('warn', jobId, `⚠️  SightEngine video failed — falling back to frame image analysis: ${lastErr?.message}`);
            if (representativeFrame) {
              const controller = new AbortController();
              const timer      = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
              try {
                const r = await analyzeImage(representativeFrame, `${filename}_frame.jpg`, controller.signal);
                clearTimeout(timer);
                return { mode: 'frame', result: r, skipReason };
              } catch {
                clearTimeout(timer);
              }
            }
            // Both video and fallback failed — return stub
            return {
              mode: 'frame',
              result: {
                verdict: 'UNCERTAIN' as const,
                confidence: 0,
                explanation: 'SightEngine video analysis unavailable and no representative frame could be analyzed.',
                model_scores: {},
                models_run: [],
                models_skipped: ['sightengine_genai_video'],
                top_signals: [],
                caveat: 'Visual analysis could not run.',
              },
              skipReason,
            };
          })(),
          // Grok on representative frame
          representativeFrame
            ? callGrok(representativeFrame, 'image/jpeg')
            : Promise.resolve({ ok: false as const, reason: 'No frames could be extracted from the video' }),
        ]);

        // Normalise SE outcome into a common shape for the rest of the pipeline
        const seIsVideo  = seOutcome.mode === 'video';
        const seMaxScore = seIsVideo
          ? (seOutcome.result as Awaited<ReturnType<typeof analyzeVideo>>).max_score
          : seOutcome.result.confidence;
        const seMeanScore = seIsVideo
          ? (seOutcome.result as Awaited<ReturnType<typeof analyzeVideo>>).mean_score
          : seOutcome.result.confidence;
        const seFrameScores = seIsVideo
          ? (seOutcome.result as Awaited<ReturnType<typeof analyzeVideo>>).frame_scores
          : [seOutcome.result.confidence];
        const seVerdict = seOutcome.result.verdict;

        if (seIsVideo) {
          log('info', jobId,
            `📊 SightEngine video done — max=${(seMaxScore * 100).toFixed(1)}% ` +
            `mean=${(seMeanScore * 100).toFixed(1)}% ` +
            `frames=${seFrameScores.length} verdict=${seVerdict}`,
          );
        } else {
          log('info', jobId,
            `📊 SightEngine frame fallback done — score=${(seMaxScore * 100).toFixed(1)}% verdict=${seVerdict}`,
          );
        }

        mlResult = { ...seOutcome.result };
        mlResult.models_run     = Array.isArray(mlResult.models_run) ? mlResult.models_run : [];
        mlResult.models_skipped = Array.isArray(mlResult.models_skipped) ? mlResult.models_skipped : [];

        const grokResult =
          grokOutcome.ok && isValidGrokResult(grokOutcome.data) ? grokOutcome.data : null;

        if (grokResult) {
          log('info', jobId,
            `🤖 Grok result — assessment=${grokResult.assessment} confidence=${grokResult.confidence_pct}% ` +
            `reasoning="${grokResult.reasoning}" ` +
            `event="${grokResult.event_description ?? 'none'}" ` +
            `event_verified=${grokResult.event_verified ?? 'null'} ` +
            `sources=${grokResult.event_sources.length}`,
          );
          mlResult.model_scores = { ...mlResult.model_scores, grok_grok4fast: grokResult.confidence_pct / 100 };
          mlResult.models_run   = [...mlResult.models_run, 'grok_grok4fast'];
        } else {
          const why = !grokOutcome.ok
            ? grokOutcome.reason
            : 'Grok payload invalid or empty';
          log('warn', jobId, `⏭  Grok skipped — ${why}`);
          mlResult.models_skipped = [...mlResult.models_skipped, 'grok_grok4fast'];
        }

        // Claude synthesis on representative frame
        let claudeOutcome: Awaited<ReturnType<typeof callClaudeForVideo>> =
          { ok: false, reason: 'No representative frame available for Claude' };

        if (representativeFrame) {
          claudeOutcome = await callClaudeForVideo(
            representativeFrame,
            'image/jpeg',
            seMaxScore,
            seMeanScore,
            seFrameScores.length,
            seVerdict,
            grokResult,
          );
        }

        if (claudeOutcome.ok) {
          const llm    = claudeOutcome.data;
          const proofN = (llm.proof_points ?? []).length;
          log('info', jobId,
            `🧠 Claude result — rate=${llm.confidence_pct}% verdict=${llm.verdict} proof_points=${proofN} ` +
            `explanation="${(llm.explanation ?? '').slice(0, 120)}…" caveat=${llm.caveat ?? 'none'}`,
          );
          mlResult.model_scores = { ...mlResult.model_scores, claude_haiku: llm.confidence_pct / 100 };
          mlResult.verdict      = llm.verdict;
          mlResult.explanation  = llm.explanation;
          mlResult.top_signals  = Array.isArray(llm.top_signals) ? llm.top_signals : [];
          mlResult.caveat       = llm.caveat;
          mlResult.models_run   = [...new Set([...mlResult.models_run, 'claude_haiku'])];
        } else {
          log('warn', jobId, `⏭  Claude skipped — ${claudeOutcome.reason}`);
          mlResult.models_skipped = [...mlResult.models_skipped, 'claude_haiku'];
        }

        // Final verdict: SE score threshold → Grok → Claude → SE verdict
        mlResult.verdict = resolveFinalVerdict(
          seMaxScore,
          seVerdict,
          grokResult,
          claudeOutcome.ok ? claudeOutcome.data.verdict : null,
        );

        mlResult.model_evidence = {
          resemble: resembleEvidence,
          sightengine_video: seIsVideo
            ? {
                ran:         true,
                frame_scores: seFrameScores,
                max_score:   seMaxScore,
                mean_score:  seMeanScore,
                verdict:     seVerdict,
              }
            : {
                ran: false,
                skip_reason: (seOutcome as { skipReason: string }).skipReason,
              },
          grok: grokResult
            ? {
                ran:               true,
                assessment:        grokResult.assessment,
                confidence_pct:    grokResult.confidence_pct,
                proof:             grokResult.reasoning,
                event_description: grokResult.event_description,
                event_verified:    grokResult.event_verified,
                event_sources:     grokResult.event_sources,
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

        // Blend confidence across video models
        const videoScores: Record<string, number | null> = {
          sightengine_genai_video: seMaxScore,
          ...('grok_grok4fast' in mlResult.model_scores ? { grok_grok4fast: mlResult.model_scores.grok_grok4fast } : {}),
          ...('claude_haiku' in mlResult.model_scores ? { claude_haiku: mlResult.model_scores.claude_haiku } : {}),
        };
        const blended = blendAiLikeness(videoScores);
        if (blended != null) mlResult.confidence = blended;

        // Add Resemble score if it ran
        if (resembleResult && resembleRan) {
          mlResult.model_scores = { ...mlResult.model_scores, resemble_detect: resembleResult.confidence };
          mlResult.models_run   = [...new Set([...mlResult.models_run, 'resemble_detect'])];
        }
      }
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
          `reasoning="${grokResult.reasoning}" ` +
          `event="${grokResult.event_description ?? 'none'}" ` +
          `event_verified=${grokResult.event_verified ?? 'null'} ` +
          `sources=${grokResult.event_sources.length}`,
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
              ran:               true,
              assessment:        grokResult.assessment,
              confidence_pct:    grokResult.confidence_pct,
              proof:             grokResult.reasoning,
              event_description: grokResult.event_description,
              event_verified:    grokResult.event_verified,
              event_sources:     grokResult.event_sources,
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

/** Mean AI-likeness (0–1) across known model keys when present. */
function blendAiLikeness(modelScores: Record<string, number | null>): number | null {
  const keys = [
    'sightengine_genai',
    'sightengine_genai_video',
    'grok_grok4fast',
    'claude_haiku',
  ] as const;
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
