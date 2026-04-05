import type { Verdict } from '@veritas/shared';

const SAPLING_API_KEY = process.env.SAPLING_API_KEY ?? '';
const SAPLING_URL = 'https://api.sapling.ai/api/v1/aidetect';

/** Minimum character count; below this the API result is unreliable. */
const MIN_TEXT_LENGTH = 100;

/**
 * Per-chunk cap to avoid gateway timeouts on long documents.
 * @see https://sapling.ai/docs/api/detector/ — chunk if latency is high or requests time out.
 */
const CHUNK_MAX_CHARS = 3_500;

/** Abort single request after this (Sapling may be slow; gateway often ~60s). */
const REQUEST_TIMEOUT_MS = 90_000;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = [2_000, 5_000, 10_000];

export interface SaplingResult {
  score: number;
  verdict: Verdict;
  sentence_count: number;
  sentence_scores: Array<{ score: number; sentence: string }>;
}

function scoreToVerdict(score: number): Verdict {
  if (score >= 0.5) return 'AI_GENERATED';
  if (score <= 0.3) return 'HUMAN';
  return 'UNCERTAIN';
}

/**
 * Split long text into chunks at natural breaks (newline / space) to stay under CHUNK_MAX_CHARS.
 */
function chunkTextForSapling(text: string, maxLen = CHUNK_MAX_CHARS): string[] {
  const t = text.trim();
  if (t.length <= maxLen) return [t];

  const chunks: string[] = [];
  let start = 0;
  while (start < t.length) {
    let end = Math.min(start + maxLen, t.length);
    if (end < t.length) {
      const slice = t.slice(start, end);
      const lastNl = slice.lastIndexOf('\n');
      const lastSp = slice.lastIndexOf(' ');
      const br = Math.max(lastNl, lastSp);
      if (br > maxLen * 0.4) end = start + br + 1;
    }
    const piece = t.slice(start, end).trim();
    if (piece.length >= MIN_TEXT_LENGTH) chunks.push(piece);
    start = end;
  }

  if (chunks.length === 0 && t.length >= MIN_TEXT_LENGTH) {
    return [t.slice(0, maxLen).trim()];
  }
  return chunks;
}

function parseSentenceScores(json: {
  sentence_scores?: unknown;
}): Array<{ score: number; sentence: string }> {
  const raw = json.sentence_scores;
  if (!Array.isArray(raw)) return [];

  const out: Array<{ score: number; sentence: string }> = [];
  for (const item of raw) {
    if (item && typeof item === 'object' && 'score' in item && 'sentence' in item) {
      const o = item as { score: number; sentence: string };
      out.push({ score: Number(o.score), sentence: String(o.sentence) });
    } else if (Array.isArray(item) && item.length >= 2) {
      out.push({ sentence: String(item[0]), score: Number(item[1]) });
    }
  }
  return out;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function callAidetectOnce(
  text: string,
  sentScores: boolean,
): Promise<{ score: number; sentence_scores: Array<{ score: number; sentence: string }> }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(SAPLING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: SAPLING_API_KEY,
        text,
        sent_scores: sentScores,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const err = new Error(`Sapling API error ${res.status}: ${body.slice(0, 500)}`) as Error & {
        status?: number;
      };
      err.status = res.status;
      throw err;
    }

    const json = (await res.json()) as { score?: number; sentence_scores?: unknown };
    const rawScore = typeof json.score === 'number' ? json.score : 0;
    return { score: rawScore, sentence_scores: parseSentenceScores(json) };
  } finally {
    clearTimeout(timer);
  }
}

async function callAidetectWithRetry(text: string, sentScores: boolean): Promise<ReturnType<typeof callAidetectOnce>> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await callAidetectOnce(text, sentScores);
    } catch (err) {
      lastErr = err as Error;
      const status = (err as Error & { status?: number }).status;
      const isAbort = (err as Error).name === 'AbortError';
      const retryable =
        isAbort ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        status === 429;

      if (!retryable || attempt === MAX_RETRIES - 1) throw err;

      const delay = RETRY_DELAY_MS[attempt] ?? RETRY_DELAY_MS[RETRY_DELAY_MS.length - 1];
      await sleep(delay);
    }
  }
  throw lastErr ?? new Error('Sapling request failed');
}

/**
 * Weighted average of chunk scores by character length (document-level estimate).
 */
function aggregateChunkScores(
  parts: Array<{ text: string; score: number; sentence_scores: Array<{ score: number; sentence: string }> }>,
): { score: number; sentence_scores: Array<{ score: number; sentence: string }> } {
  let totalW = 0;
  let sum = 0;
  const allSentences: Array<{ score: number; sentence: string }> = [];

  for (const p of parts) {
    const w = p.text.length;
    totalW += w;
    sum += p.score * w;
    allSentences.push(...p.sentence_scores);
  }

  const score = totalW > 0 ? sum / totalW : 0;
  const sentence_scores = allSentences
    .filter((s) => s.score >= 0.7)
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);
  return { score, sentence_scores };
}

export async function analyzeSaplingText(text: string): Promise<SaplingResult> {
  if (!SAPLING_API_KEY) {
    throw new Error('SAPLING_API_KEY is not configured');
  }

  if (text.trim().length < MIN_TEXT_LENGTH) {
    throw new Error(
      `Text too short for reliable detection (${text.trim().length} chars, minimum ${MIN_TEXT_LENGTH})`,
    );
  }

  const chunks = chunkTextForSapling(text);

  if (chunks.length === 1) {
    const { score: rawScore, sentence_scores: sentenceScores } = await callAidetectWithRetry(chunks[0], true);

    return {
      score: rawScore,
      verdict: scoreToVerdict(rawScore),
      sentence_count: sentenceScores.length,
      sentence_scores: sentenceScores,
    };
  }

  // Multi-chunk: `sent_scores: false` keeps each request fast (per Sapling detector docs).
  const parts: Array<{
    text: string;
    score: number;
    sentence_scores: Array<{ score: number; sentence: string }>;
  }> = [];

  for (const chunk of chunks) {
    const { score, sentence_scores } = await callAidetectWithRetry(chunk, false);
    parts.push({ text: chunk, score, sentence_scores });
  }

  const { score: aggScore, sentence_scores: mergedHigh } = aggregateChunkScores(parts);
  const estSentences = Math.max(
    1,
    text.split(/[.!?]+\s+/).filter((s) => s.trim().length > 0).length,
  );

  return {
    score: aggScore,
    verdict: scoreToVerdict(aggScore),
    sentence_count: estSentences,
    sentence_scores: mergedHigh,
  };
}
