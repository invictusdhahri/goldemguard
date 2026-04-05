/**
 * xAI Grok service — second-opinion image analysis using grok-4.20-reasoning.
 *
 * Docs: https://docs.x.ai/docs/models
 * Docs: https://docs.x.ai/docs/api-reference  (Responses API)
 * Docs: https://docs.x.ai/developers/tools/web-search  (Agent Tools — web search)
 *
 * Uses the Responses API (/v1/responses) with the built-in web_search tool so
 * Grok can verify in real-time whether the depicted event actually happened.
 * The old Chat Completions `search_parameters` field is deprecated (HTTP 410).
 *
 * Image is sent as `input_image` with a data URI string + `detail: "high"` (Responses API shape).
 * Each user turn is `{ type: "message", role: "user", content: [...] }` (EasyInputMessage).
 * Citation URLs are read from `output_text.annotations` when present.
 */

import { parseJsonObject } from '../utils/jsonFromLlm';

const XAI_URL = 'https://api.x.ai/v1/responses';
// grok-4.20-reasoning: supports Responses API, web_search tool, and vision inputs
const MODEL   = 'grok-4.20-reasoning';
const TIMEOUT = 90_000;   // web search round-trips need extra headroom

// ─── Types ────────────────────────────────────────────────────────────────────

export type GrokAssessment = 'LIKELY_AI' | 'LIKELY_REAL' | 'UNCERTAIN';

/** "CONFIRMED" = event verified by live sources; "DISPUTED" = contradicted by evidence;
 *  "UNVERIFIABLE" = Grok searched but couldn't confirm; null = no identifiable event */
export type GrokEventVerified = 'CONFIRMED' | 'DISPUTED' | 'UNVERIFIABLE' | null;

export interface GrokResult {
  assessment:        GrokAssessment;
  confidence_pct:    number;
  reasoning:         string;
  /** What real-world event / person / place Grok identified in the image, or null */
  event_description: string | null;
  /** Whether Grok's live web search confirmed the depicted event happened */
  event_verified:    GrokEventVerified;
  /** News/web sources Grok cited when verifying the event (may be empty) */
  event_sources:     string[];
}

export type GrokOutcome =
  | { ok: true; data: GrokResult }
  | { ok: false; reason: string };

// ─── Responses API response shape ─────────────────────────────────────────────

interface XaiAnnotation {
  type:        string;
  url?:        string;
  title?:      string;
  start_index?: number;
  end_index?:   number;
}

interface XaiOutputContent {
  type:         string;
  text?:        string;
  annotations?: XaiAnnotation[];
}

interface XaiOutputItem {
  type:    string;
  role?:   string;
  content?: XaiOutputContent[];
}

interface XaiResponsesResponse {
  id?:     string;
  model?:  string;
  output?: XaiOutputItem[];
  error?:  { type?: string; message?: string; code?: string };
}

const ALLOWED_ASSESSMENT = new Set<string>(['LIKELY_AI', 'LIKELY_REAL', 'UNCERTAIN']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  return `You are an expert analyst combining AI-image forensics with real-world event verification.

For the image provided, perform TWO independent analyses:

1. **AI-Generation Detection** — examine for signs of synthetic content:
   - Unnatural skin texture, plastic-looking surfaces
   - Anatomical errors (hands, fingers, ears, teeth)
   - Impossible geometry or lighting
   - Repeating patterns, "AI slop" aesthetics
   - Hallmarks of diffusion models: blurry backgrounds, merged objects, text artefacts

2. **Real-World Event Verification** — identify and verify what real-world event or scene is depicted:
   - Describe the event, people, location, or scene shown
   - Use your web search tool to check whether this event actually occurred
   - Check if the timing, location, and context match verifiable news or facts
   - Determine if this image has appeared in credible, established news sources
   - Classify as CONFIRMED (event verifiably happened per current sources), DISPUTED (event contradicted or misrepresented by evidence), or UNVERIFIABLE (searched but could not confirm)
   - If the image shows no identifiable real-world event (e.g. generic portrait, abstract art), set event_verified to null

Respond with **only** valid JSON — no markdown fences, no extra text:
{
  "assessment": "LIKELY_AI" | "LIKELY_REAL" | "UNCERTAIN",
  "confidence_pct": <integer 0-100, where 0=definitely real, 100=definitely AI>,
  "reasoning": "<2-4 sentences with concrete visual AI-detection observations>",
  "event_description": "<one sentence describing what event/person/place is shown, or null>",
  "event_verified": "CONFIRMED" | "DISPUTED" | "UNVERIFIABLE" | null,
  "event_sources": ["<news source or URL cited>", "..."]
}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Call xAI Grok via the Responses API with the built-in web_search tool.
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
        // EasyInputMessage requires `type: "message"` or the server cannot pick a ModelInput variant (HTTP 422).
        // See: OpenAI/xAI Responses — input item { type, role, content }.
        input: [
          {
            type:    'message',
            role:    'user',
            content: [
              {
                type:      'input_image',
                image_url: dataUri,
                detail:    'high',
              },
              {
                type: 'input_text',
                text: buildPrompt(),
              },
            ],
          },
        ],
        tools: [
          { type: 'web_search' },
        ],
        max_output_tokens: 1_000,
        temperature:       0,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    rawBody = await res.text();

    if (!res.ok) {
      console.error(`[grokService] HTTP ${res.status} — body: ${rawBody.slice(0, 600)}`);
      return { ok: false, reason: `xAI HTTP ${res.status}: ${rawBody.slice(0, 300)}` };
    }

    let json: XaiResponsesResponse;
    try {
      json = JSON.parse(rawBody) as XaiResponsesResponse;
    } catch {
      console.error('[grokService] Non-JSON response body:', rawBody.slice(0, 600));
      return { ok: false, reason: 'xAI returned non-JSON body' };
    }

    if (json.error?.message) {
      console.error('[grokService] API error:', json.error);
      return { ok: false, reason: `xAI error (${json.error.code ?? json.error.type}): ${json.error.message}` };
    }

    // Extract text and citation annotations from the Responses API output
    let rawText       = '';
    const annotations: XaiAnnotation[] = [];

    for (const item of json.output ?? []) {
      if (item.type !== 'message') continue;
      for (const block of item.content ?? []) {
        if (block.type === 'output_text') {
          rawText += block.text ?? '';
          annotations.push(...(block.annotations ?? []));
        }
      }
    }

    // Collect citation URLs from annotations
    const citationUrls = annotations
      .filter((a) => a.type === 'url_citation' && typeof a.url === 'string')
      .map((a) => a.url as string);

    if (!rawText) {
      console.error('[grokService] No output_text in response:', rawBody.slice(0, 600));
      return { ok: false, reason: 'xAI Responses API returned no output_text content' };
    }

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

    const ALLOWED_EVENT_VERIFIED = new Set(['CONFIRMED', 'DISPUTED', 'UNVERIFIABLE']);
    const rawEventVerified       = typeof parsed.event_verified === 'string'
      ? parsed.event_verified.trim().toUpperCase()
      : null;
    const eventVerified: GrokEventVerified =
      rawEventVerified && ALLOWED_EVENT_VERIFIED.has(rawEventVerified)
        ? (rawEventVerified as Exclude<GrokEventVerified, null>)
        : null;

    // Prefer sources from the JSON field; fall back to annotation URLs
    const jsonSources: string[] = Array.isArray(parsed.event_sources)
      ? (parsed.event_sources as unknown[]).filter((s): s is string => typeof s === 'string')
      : [];
    const eventSources = jsonSources.length > 0 ? jsonSources : citationUrls.slice(0, 5);

    return {
      ok: true,
      data: {
        assessment:        assessment as GrokAssessment,
        confidence_pct:    Math.min(100, Math.max(0, Math.round(confNum))),
        reasoning:         typeof parsed.reasoning === 'string' ? parsed.reasoning.trim() : '',
        event_description: typeof parsed.event_description === 'string' ? parsed.event_description.trim() : null,
        event_verified:    eventVerified,
        event_sources:     eventSources,
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

// ─── Contextual verification ───────────────────────────────────────────────────

export interface GrokContextualResult {
  /** 0 = completely inconsistent, 100 = fully consistent */
  consistency_score: number;
  verdict: 'CONSISTENT' | 'MISLEADING' | 'UNVERIFIABLE';
  explanation: string;
  signals: string[];
  sources: string[];
  /** What the image/video actually shows — empty string if no media was provided */
  image_description: string;
}

export type GrokContextualOutcome =
  | { ok: true;  data: GrokContextualResult }
  | { ok: false; reason: string };

const ALLOWED_CONTEXTUAL_VERDICT = new Set(['CONSISTENT', 'MISLEADING', 'UNVERIFIABLE']);

function buildContextualPrompt(context: string, hasImage: boolean): string {
  const imageSection = hasImage
    ? `You have been given an image/frame. First describe exactly what it shows (people, location cues, text, objects, events). Then verify the claim below against that description using your web search tool.`
    : `No image was provided. Use your web search tool to verify the text claim below.`;

  return `${imageSection}

Claim being made: "${context}"

Search the web to verify:
1. Does the visual content (if any) match the claim in terms of location, date, people, and event?
2. Are the specific details in the claim accurate according to credible news sources?
3. Is this image/content known to have been used in a different or misleading context?

Respond with ONLY valid JSON — no markdown fences, no extra text:
{
  "consistency_score": <integer 0-100, where 0=completely inconsistent, 100=fully consistent>,
  "verdict": "CONSISTENT" | "MISLEADING" | "UNVERIFIABLE",
  "explanation": "<1-2 sentences explaining why the content matches or contradicts the claim>",
  "signals": ["<specific signal 1>", "<specific signal 2>"],
  "sources": ["<url1>", "<url2>"],
  "image_description": "<1-2 sentences describing what the image/video actually shows, or empty string if no image>"
}`;
}

/**
 * Call Grok to verify whether a piece of media matches a text claim.
 *
 * Pass `buffer = null` for text-only fact-checking (no image).
 * For video, pass a single extracted JPEG frame buffer with mimeType 'image/jpeg'.
 */
export async function callGrokContextual(
  buffer:   Buffer | null,
  mimeType: string | null,
  context:  string,
): Promise<GrokContextualOutcome> {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, reason: 'XAI_API_KEY is not set in apps/backend/.env' };
  }

  const hasImage = buffer !== null && mimeType !== null;
  const prompt   = buildContextualPrompt(context, hasImage);

  const contentBlocks: object[] = [];

  if (hasImage) {
    const base64  = buffer!.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64}`;
    contentBlocks.push({
      type:      'input_image',
      image_url: dataUri,
      detail:    'high',
    });
  }

  contentBlocks.push({ type: 'input_text', text: prompt });

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
        input: [
          {
            type:    'message',
            role:    'user',
            content: contentBlocks,
          },
        ],
        tools:             [{ type: 'web_search' }],
        max_output_tokens: 1_000,
        temperature:       0,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    rawBody = await res.text();

    if (!res.ok) {
      console.error(`[grokService/contextual] HTTP ${res.status} — body: ${rawBody.slice(0, 600)}`);
      return { ok: false, reason: `xAI HTTP ${res.status}: ${rawBody.slice(0, 300)}` };
    }

    let json: XaiResponsesResponse;
    try {
      json = JSON.parse(rawBody) as XaiResponsesResponse;
    } catch {
      return { ok: false, reason: 'xAI returned non-JSON body' };
    }

    if (json.error?.message) {
      return { ok: false, reason: `xAI error (${json.error.code ?? json.error.type}): ${json.error.message}` };
    }

    let rawText       = '';
    const annotations: XaiAnnotation[] = [];

    for (const item of json.output ?? []) {
      if (item.type !== 'message') continue;
      for (const block of item.content ?? []) {
        if (block.type === 'output_text') {
          rawText += block.text ?? '';
          annotations.push(...(block.annotations ?? []));
        }
      }
    }

    if (!rawText) {
      return { ok: false, reason: 'xAI Responses API returned no output_text content' };
    }

    console.log(`[grokService/contextual] Raw reply:`, rawText.slice(0, 800));

    const parsed = parseJsonObject<Partial<GrokContextualResult>>(rawText)
      ?? parseJsonObject<Partial<GrokContextualResult>>(rawBody);

    if (!parsed) {
      return { ok: false, reason: 'Could not parse Grok contextual JSON from reply' };
    }

    const verdict = typeof parsed.verdict === 'string'
      ? parsed.verdict.trim().toUpperCase()
      : '';

    if (!ALLOWED_CONTEXTUAL_VERDICT.has(verdict)) {
      return { ok: false, reason: `Invalid contextual verdict "${verdict}"` };
    }

    const scoreRaw = parsed.consistency_score;
    const score    = typeof scoreRaw === 'number' ? scoreRaw : Number(scoreRaw);

    if (!Number.isFinite(score)) {
      return { ok: false, reason: 'Grok contextual JSON missing numeric consistency_score' };
    }

    const citationUrls = annotations
      .filter((a) => a.type === 'url_citation' && typeof a.url === 'string')
      .map((a) => a.url as string);

    const jsonSources: string[] = Array.isArray(parsed.sources)
      ? (parsed.sources as unknown[]).filter((s): s is string => typeof s === 'string')
      : [];

    return {
      ok: true,
      data: {
        consistency_score: Math.min(100, Math.max(0, Math.round(score))),
        verdict:           verdict as GrokContextualResult['verdict'],
        explanation:       typeof parsed.explanation === 'string' ? parsed.explanation.trim() : '',
        signals:           Array.isArray(parsed.signals)
          ? (parsed.signals as unknown[]).filter((s): s is string => typeof s === 'string')
          : [],
        sources:           jsonSources.length > 0 ? jsonSources : citationUrls.slice(0, 5),
        image_description: typeof parsed.image_description === 'string' ? parsed.image_description.trim() : '',
      },
    };
  } catch (err) {
    clearTimeout(timer);
    const msg = (err as Error).message;
    if ((err as Error).name === 'AbortError') {
      return { ok: false, reason: `xAI contextual request timed out after ${TIMEOUT / 1000}s` };
    }
    console.error('[grokService/contextual] Unexpected error:', msg);
    return { ok: false, reason: msg };
  }
}
