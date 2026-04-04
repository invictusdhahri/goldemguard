/**
 * xAI Grok service — second-opinion image analysis using grok-4-1-fast.
 *
 * Docs: https://docs.x.ai/docs/models  (vision: grok-4-1-fast-non-reasoning)
 * Docs: https://docs.x.ai/docs/api-reference  (Chat Completions)
 *
 * Image is sent as a base64 data URI with `detail: "high"` per xAI spec.
 * We use the non-reasoning variant so output is direct JSON (no reasoning_content).
 */

import { parseJsonObject } from '../utils/jsonFromLlm';

const XAI_URL = 'https://api.x.ai/v1/chat/completions';
// grok-4-1-fast-non-reasoning: vision + structured output, no reasoning overhead
const MODEL   = 'grok-4-1-fast-non-reasoning';
const TIMEOUT = 45_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export type GrokAssessment = 'LIKELY_AI' | 'LIKELY_REAL' | 'UNCERTAIN';

export interface GrokResult {
  assessment:     GrokAssessment;
  confidence_pct: number;
  reasoning:      string;
}

export type GrokOutcome =
  | { ok: true; data: GrokResult }
  | { ok: false; reason: string };

interface XaiMessage {
  role:              string;
  content:           string | null;
  reasoning_content: string | null;
  refusal:           string | null;
}

interface XaiChatResponse {
  id?:      string;
  model?:   string;
  choices?: Array<{
    index:         number;
    message:       XaiMessage;
    finish_reason: string | null;
  }>;
  error?: { type?: string; message?: string; code?: string };
}

const ALLOWED_ASSESSMENT = new Set<string>(['LIKELY_AI', 'LIKELY_REAL', 'UNCERTAIN']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract text from content which can be a string, array-of-parts, or object. */
function normalizeChatContent(content: unknown): string {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part: unknown) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) {
          return String((part as { text?: unknown }).text ?? '');
        }
        return '';
      })
      .join('');
  }
  if (typeof content === 'object' && 'text' in content) {
    return String((content as { text?: unknown }).text ?? '');
  }
  return '';
}

/** Guard used in analyzeJob — rejects ok:true payloads with invalid fields. */
export function isValidGrokResult(data: unknown): data is GrokResult {
  if (!data || typeof data !== 'object') return false;
  const o = data as Partial<GrokResult>;
  return (
    typeof o.assessment === 'string' &&
    ALLOWED_ASSESSMENT.has(o.assessment) &&
    typeof o.confidence_pct === 'number' &&
    Number.isFinite(o.confidence_pct)
  );
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(): string {
  return `You are an expert forensic analyst specialising in detecting AI-generated images.

Examine the image carefully. Look for:
- Unnatural skin texture, plastic-looking surfaces
- Anatomical errors (hands, fingers, ears, teeth)
- Impossible geometry or lighting
- Repeating patterns, watermarks, "AI slop" aesthetics
- Hallmarks of diffusion models: blurry backgrounds, merged objects, text artefacts

Respond with **only** valid JSON — no markdown fences, no extra text:
{
  "assessment": "LIKELY_AI" | "LIKELY_REAL" | "UNCERTAIN",
  "confidence_pct": <integer 0-100, where 0=definitely real, 100=definitely AI>,
  "reasoning": "<2-4 sentences with concrete visual observations>"
}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Call xAI Grok vision model.
 * Returns structured outcome — never throws, always returns ok: true or ok: false.
 */
export async function callGrok(
  buffer:   Buffer,
  mimeType: string,
): Promise<GrokOutcome> {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, reason: 'XAI_API_KEY is not set in apps/backend/.env' };
  }

  const base64  = buffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${base64}`;

  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), TIMEOUT);

  let rawBody = '';

  try {
    const res = await fetch(XAI_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role:    'user',
            content: [
              {
                type:      'image_url',
                image_url: {
                  url:    dataUri,
                  detail: 'high',
                },
              },
              {
                type: 'text',
                text: buildPrompt(),
              },
            ],
          },
        ],
        max_completion_tokens: 600,
        temperature:           0,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    rawBody = await res.text();

    if (!res.ok) {
      console.error(`[grokService] HTTP ${res.status} — body: ${rawBody.slice(0, 600)}`);
      return { ok: false, reason: `xAI HTTP ${res.status}: ${rawBody.slice(0, 300)}` };
    }

    let json: XaiChatResponse;
    try {
      json = JSON.parse(rawBody) as XaiChatResponse;
    } catch {
      console.error('[grokService] Non-JSON response body:', rawBody.slice(0, 600));
      return { ok: false, reason: 'xAI returned non-JSON body' };
    }

    if (json.error?.message) {
      console.error('[grokService] API error:', json.error);
      return { ok: false, reason: `xAI error (${json.error.code ?? json.error.type}): ${json.error.message}` };
    }

    const choice = json.choices?.[0];
    if (!choice) {
      console.error('[grokService] No choices in response:', rawBody.slice(0, 600));
      return { ok: false, reason: 'xAI response missing choices array' };
    }

    if (choice.finish_reason === 'content_filter') {
      return { ok: false, reason: 'xAI content filter blocked the request' };
    }

    const refusal = choice.message?.refusal;
    if (typeof refusal === 'string' && refusal.trim()) {
      return { ok: false, reason: `xAI refused: ${refusal.slice(0, 200)}` };
    }

    // Extract text — prefer content, fall back to reasoning_content (for reasoning variants)
    const rawText =
      normalizeChatContent(choice.message?.content) ||
      normalizeChatContent(choice.message?.reasoning_content) ||
      '';

    console.log(`[grokService] Raw reply (model=${json.model ?? MODEL}):`, rawText.slice(0, 800));

    const parsed =
      parseJsonObject<Partial<GrokResult>>(rawText) ??
      parseJsonObject<Partial<GrokResult>>(rawBody);

    if (!parsed) {
      console.error('[grokService] Could not extract JSON from reply:', rawText.slice(0, 600));
      return { ok: false, reason: 'Could not parse Grok JSON (no JSON object found in reply)' };
    }

    const assessment = typeof parsed.assessment === 'string' ? parsed.assessment.trim().toUpperCase() : '';
    const confRaw    = parsed.confidence_pct;
    const confNum    = typeof confRaw === 'number' ? confRaw : Number(confRaw);

    if (!ALLOWED_ASSESSMENT.has(assessment)) {
      console.error(`[grokService] Invalid assessment "${assessment}" — full reply: ${rawText.slice(0, 400)}`);
      return { ok: false, reason: `Invalid Grok assessment "${assessment}" — expected LIKELY_AI | LIKELY_REAL | UNCERTAIN` };
    }

    if (!Number.isFinite(confNum)) {
      console.error(`[grokService] Invalid confidence_pct "${confRaw}" — full reply: ${rawText.slice(0, 400)}`);
      return { ok: false, reason: 'Grok JSON missing a numeric confidence_pct' };
    }

    return {
      ok: true,
      data: {
        assessment:     assessment as GrokAssessment,
        confidence_pct: Math.min(100, Math.max(0, Math.round(confNum))),
        reasoning:      typeof parsed.reasoning === 'string' ? parsed.reasoning.trim() : '',
      },
    };
  } catch (err) {
    clearTimeout(timer);
    const msg = (err as Error).message;
    if ((err as Error).name === 'AbortError') {
      return { ok: false, reason: `xAI request timed out after ${TIMEOUT / 1000}s` };
    }
    console.error('[grokService] Unexpected error:', msg, rawBody.slice(0, 300));
    return { ok: false, reason: msg };
  }
}
