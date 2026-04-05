/**
 * Anthropic Claude Haiku — vision assessment (AI-likeness rate) plus synthesis of
 * SightEngine + Grok into verdict, explanation, evidence bullets, and caveat.
 *
 * Provides two entry points:
 *   callClaude()         — for images (existing pipeline)
 *   callClaudeForVideo() — for a representative frame extracted from a video
 */

import type { GrokResult } from './grokService';
import { parseJsonObject } from '../utils/jsonFromLlm';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL         = process.env.ANTHROPIC_MODEL?.trim() || 'claude-haiku-4-5';
const TIMEOUT       = 45_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClaudeVerdict = 'AI_GENERATED' | 'HUMAN' | 'UNCERTAIN';

export interface ClaudeExplanation {
  /** 0–100: independent visual estimate that the image is AI-generated */
  confidence_pct: number;
  verdict:        ClaudeVerdict;
  explanation:    string;
  top_signals:    string[];
  proof_points:   string[];
  caveat:         string | null;
}

export type ClaudeOutcome =
  | { ok: true; data: ClaudeExplanation }
  | { ok: false; reason: string };

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>;
  error?:   { type?: string; message?: string };
}

// ─── Image prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are an AI content verification analyst. You **look at the image** and give your own AI-likeness estimate, then combine that with automated detectors and cite what each source contributed.

Respond with **valid JSON only** — no markdown fences. Shape:
{
  "confidence_pct": <number 0–100: your independent estimate that the image is AI-generated / synthetic>,
  "verdict": "AI_GENERATED" | "HUMAN" | "UNCERTAIN",
  "explanation": "<2–4 sentences for a non-technical reader — this is the reasoning synthesis>",
  "top_signals": ["<short label>", "..."],
  "proof_points": [
    "<bullet: what SightEngine's score implies>",
    "<bullet: what Grok saw in the image — AI-detection reasoning, or note if Grok was unavailable>",
    "<bullet: Grok real-world event verification result — whether the depicted event was CONFIRMED/DISPUTED/UNVERIFIABLE by live sources, or note if no event was identified>",
    "<bullet: how your own visual assessment compares, and how you reconciled disagreement if any>"
  ],
  "caveat": "<one sentence on limits, or null>"
}

Rules:
- confidence_pct: judge the **image pixels** yourself (artifacts, lighting, anatomy, texture). 0 = confident authentic photo, 100 = confident synthetic/AI.
- verdict (mandatory policy — your JSON must follow this):
  - If SightEngine genai **raw score** (0–1 AI-likeness) is **≥ 0.5**, your verdict **must** be **AI_GENERATED** — no UNCERTAIN, regardless of Grok.
  - Else if SightEngine's threshold verdict is **AI_GENERATED**, your verdict **must** be **AI_GENERATED**.
  - Else Grok is the tie-breaker when present: **LIKELY_AI** → AI_GENERATED, **LIKELY_REAL** → HUMAN; if Grok is **UNCERTAIN** or missing, use your own assessment.
- When Grok's event verification is DISPUTED (live sources contradict the event), treat this as a strong additional signal toward AI_GENERATED or fabricated content.
- proof_points must explicitly reference SightEngine (score), Grok AI-detection (when present), Grok event verification (when present), and your own assessment, and state this policy when relevant.`;
}

function buildUserMessage(
  sightEngineScore: number,
  verdict:          ClaudeVerdict,
  grok:             GrokResult | null,
): string {
  const sePct = (sightEngineScore * 100).toFixed(1);
  const seLabel =
    sightEngineScore >= 0.75
      ? 'HIGH (likely AI-generated)'
      : sightEngineScore <= 0.35
        ? 'LOW (likely authentic)'
        : 'AMBIGUOUS (borderline)';

  let grokSection = 'Grok (xAI grok-2-vision-1212): NOT AVAILABLE — no assessment.';
  if (grok) {
    grokSection =
      `Grok AI-detection (xAI grok-2-vision-1212): assessment=${grok.assessment}, confidence=${grok.confidence_pct}%\n` +
      `Grok visual reasoning: ${grok.reasoning}`;

    if (grok.event_description) {
      grokSection += `\nGrok event identification: ${grok.event_description}`;
      if (grok.event_verified) {
        grokSection += `\nGrok real-world event verification (via live web search): ${grok.event_verified}`;
        if (grok.event_sources?.length) {
          grokSection += ` — sources: ${grok.event_sources.slice(0, 3).join('; ')}`;
        }
      } else {
        grokSection += '\nGrok event verification: event could not be identified or is non-specific (UNVERIFIABLE)';
      }
    } else {
      grokSection += '\nGrok event verification: no specific real-world event identified in the image';
    }
  }

  return `The image is attached. Use it for confidence_pct and for synthesis.

SightEngine genai: ${sePct}% AI-likeness (${seLabel}). Threshold verdict: ${verdict}.

${grokSection}

Produce the JSON including confidence_pct (your own visual rate), verdict, explanation, and proof_points that cite SightEngine, Grok when present, and your assessment.`;
}

// ─── Image public API ─────────────────────────────────────────────────────────

export async function callClaude(
  imageBuffer:      Buffer,
  imageMediaType:   string,
  sightEngineScore: number,
  verdict:          ClaudeVerdict,
  grok:             GrokResult | null,
): Promise<ClaudeOutcome> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, reason: 'ANTHROPIC_API_KEY is not set in apps/backend/.env' };
  }

  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), TIMEOUT);

  const b64      = imageBuffer.toString('base64');
  const userText = buildUserMessage(sightEngineScore, verdict, grok);

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 1_024,
        system:     buildSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: [
              {
                type:   'image',
                source: {
                  type:       'base64',
                  media_type: imageMediaType,
                  data:       b64,
                },
              },
              { type: 'text', text: userText },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    const errText = await res.text();
    if (!res.ok) {
      console.warn(`[claudeService] HTTP ${res.status}: ${errText.slice(0, 400)}`);
      return { ok: false, reason: `Anthropic HTTP ${res.status}: ${errText.slice(0, 200)}` };
    }

    let json: AnthropicResponse;
    try {
      json = JSON.parse(errText) as AnthropicResponse;
    } catch {
      return { ok: false, reason: 'Anthropic returned non-JSON body' };
    }

    if (json.error?.message) {
      return { ok: false, reason: `Anthropic error: ${json.error.message}` };
    }

    const raw    = json.content?.find((b) => b.type === 'text')?.text ?? '';
    const parsed = parseJsonObject<Partial<ClaudeExplanation>>(raw);

    const pctRaw = parsed?.confidence_pct;
    const pctNum =
      typeof pctRaw === 'number' && Number.isFinite(pctRaw)
        ? Math.min(100, Math.max(0, pctRaw))
        : NaN;

    if (!parsed?.verdict || !parsed.explanation || Number.isNaN(pctNum)) {
      console.warn('[claudeService] Unexpected response shape:', raw.slice(0, 400));
      return { ok: false, reason: 'Could not parse Claude JSON (unexpected shape)' };
    }

    return {
      ok: true,
      data: {
        confidence_pct: pctNum,
        verdict:        parsed.verdict as ClaudeVerdict,
        explanation:    parsed.explanation,
        top_signals:    Array.isArray(parsed.top_signals) ? parsed.top_signals : [],
        proof_points:   Array.isArray(parsed.proof_points) ? parsed.proof_points : [],
        caveat:         parsed.caveat ?? null,
      },
    };
  } catch (err) {
    clearTimeout(timer);
    const msg = (err as Error).message;
    console.warn('[claudeService] Failed:', msg);
    return {
      ok: false,
      reason: (err as Error).name === 'AbortError' ? `Timed out after ${TIMEOUT}ms` : msg,
    };
  }
}

// ─── Video prompt variant ─────────────────────────────────────────────────────

function buildVideoSystemPrompt(): string {
  return `You are an AI content verification analyst. You **look at the video frame** and give your own AI-likeness estimate, then combine that with automated detectors and cite what each source contributed.

The input is a single representative frame extracted from a short video (≤ 10 seconds). Use it to reason about the entire video's authenticity.

Respond with **valid JSON only** — no markdown fences. Shape:
{
  "confidence_pct": <number 0–100: your independent estimate that the video is AI-generated / synthetic>,
  "verdict": "AI_GENERATED" | "HUMAN" | "UNCERTAIN",
  "explanation": "<2–4 sentences for a non-technical reader — this is the reasoning synthesis>",
  "top_signals": ["<short label>", "..."],
  "proof_points": [
    "<bullet: what SightEngine video frame analysis implies>",
    "<bullet: what Grok saw in the frame — AI-detection reasoning, or note if Grok was unavailable>",
    "<bullet: Grok real-world event verification — whether the depicted event was CONFIRMED/DISPUTED/UNVERIFIABLE by live web sources, or note if no event was identified>",
    "<bullet: how your own visual assessment of the frame compares, and how you reconciled disagreement if any>"
  ],
  "caveat": "<one sentence on limits — e.g. single-frame analysis of a video, or null>"
}

Rules:
- confidence_pct: judge the **frame pixels** yourself (artifacts, temporal inconsistency clues, lighting, anatomy, texture, diffusion-model telltales). 0 = confident authentic, 100 = confident synthetic/AI.
- Look specifically for video-AI artifacts: unnatural motion blur, flickering edges, inconsistent lighting across the frame, warped or unstable backgrounds, faces with subtle morphing artifacts, impossibly smooth skin or hair.
- verdict (mandatory policy — your JSON must follow this):
  - If SightEngine video **max frame score** (0–1 AI-likeness) is **≥ 0.5**, your verdict **must** be **AI_GENERATED** — no UNCERTAIN, regardless of Grok.
  - Else if SightEngine's threshold verdict is **AI_GENERATED**, your verdict **must** be **AI_GENERATED**.
  - Else Grok is the tie-breaker when present: **LIKELY_AI** → AI_GENERATED, **LIKELY_REAL** → HUMAN; if Grok is **UNCERTAIN** or missing, use your own assessment.
- When Grok's event verification is DISPUTED (live sources contradict the event), treat this as a strong additional signal toward AI_GENERATED or fabricated content.
- proof_points must explicitly reference SightEngine video score, Grok AI-detection (when present), Grok event verification (when present), and your own frame assessment, and state this policy when relevant.
- Always mention in caveat that this is a frame-based analysis of a video, not a full temporal analysis.`;
}

function buildVideoUserMessage(
  sightEngineScore: number,
  verdict:          ClaudeVerdict,
  grok:             GrokResult | null,
  frameCount:       number,
  meanScore:        number,
): string {
  const maxPct  = (sightEngineScore * 100).toFixed(1);
  const meanPct = (meanScore * 100).toFixed(1);
  const seLabel =
    sightEngineScore >= 0.75
      ? 'HIGH (likely AI-generated)'
      : sightEngineScore <= 0.35
        ? 'LOW (likely authentic)'
        : 'AMBIGUOUS (borderline)';

  let grokSection = 'Grok (xAI grok-2-vision-1212): NOT AVAILABLE — no frame assessment.';
  if (grok) {
    grokSection =
      `Grok AI-detection (xAI grok-2-vision-1212): assessment=${grok.assessment}, confidence=${grok.confidence_pct}%\n` +
      `Grok visual reasoning: ${grok.reasoning}`;

    if (grok.event_description) {
      grokSection += `\nGrok event identification: ${grok.event_description}`;
      if (grok.event_verified) {
        grokSection += `\nGrok real-world event verification (via live web search): ${grok.event_verified}`;
        if (grok.event_sources?.length) {
          grokSection += ` — sources: ${grok.event_sources.slice(0, 3).join('; ')}`;
        }
      } else {
        grokSection += '\nGrok event verification: event could not be identified or is non-specific (UNVERIFIABLE)';
      }
    } else {
      grokSection += '\nGrok event verification: no specific real-world event identified in the frame';
    }
  }

  return `The image is a representative frame extracted from a video (${frameCount} frames were analyzed in total by SightEngine). Use it for confidence_pct and synthesis.

SightEngine video genai: max frame score ${maxPct}% AI-likeness (${seLabel}), mean across all frames: ${meanPct}%. Threshold verdict: ${verdict}.

${grokSection}

Produce the JSON including confidence_pct (your own visual rate of this frame), verdict, explanation, and proof_points that cite SightEngine video scores, Grok when present, and your frame assessment.`;
}

// ─── Video public API ─────────────────────────────────────────────────────────

/**
 * Call Claude Haiku for video frame-based analysis.
 * Accepts the middle representative frame as a JPEG buffer + SightEngine video results + Grok.
 * Returns the same ClaudeOutcome shape as callClaude().
 */
export async function callClaudeForVideo(
  frameBuffer:           Buffer,
  frameMediaType:        string,
  sightEngineScore:      number,
  sightEngineMean:       number,
  sightEngineFrameCount: number,
  verdict:               ClaudeVerdict,
  grok:                  GrokResult | null,
): Promise<ClaudeOutcome> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, reason: 'ANTHROPIC_API_KEY is not set in apps/backend/.env' };
  }

  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), TIMEOUT);

  const b64      = frameBuffer.toString('base64');
  const userText = buildVideoUserMessage(
    sightEngineScore,
    verdict,
    grok,
    sightEngineFrameCount,
    sightEngineMean,
  );

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 1_024,
        system:     buildVideoSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: [
              {
                type:   'image',
                source: {
                  type:       'base64',
                  media_type: frameMediaType,
                  data:       b64,
                },
              },
              { type: 'text', text: userText },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    const errText = await res.text();
    if (!res.ok) {
      console.warn(`[claudeService/video] HTTP ${res.status}: ${errText.slice(0, 400)}`);
      return { ok: false, reason: `Anthropic HTTP ${res.status}: ${errText.slice(0, 200)}` };
    }

    let json: AnthropicResponse;
    try {
      json = JSON.parse(errText) as AnthropicResponse;
    } catch {
      return { ok: false, reason: 'Anthropic returned non-JSON body' };
    }

    if (json.error?.message) {
      return { ok: false, reason: `Anthropic error: ${json.error.message}` };
    }

    const raw    = json.content?.find((b) => b.type === 'text')?.text ?? '';
    const parsed = parseJsonObject<Partial<ClaudeExplanation>>(raw);

    const pctRaw = parsed?.confidence_pct;
    const pctNum =
      typeof pctRaw === 'number' && Number.isFinite(pctRaw)
        ? Math.min(100, Math.max(0, pctRaw))
        : NaN;

    if (!parsed?.verdict || !parsed.explanation || Number.isNaN(pctNum)) {
      console.warn('[claudeService/video] Unexpected response shape:', raw.slice(0, 400));
      return { ok: false, reason: 'Could not parse Claude JSON (unexpected shape)' };
    }

    return {
      ok: true,
      data: {
        confidence_pct: pctNum,
        verdict:        parsed.verdict as ClaudeVerdict,
        explanation:    parsed.explanation,
        top_signals:    Array.isArray(parsed.top_signals) ? parsed.top_signals : [],
        proof_points:   Array.isArray(parsed.proof_points) ? parsed.proof_points : [],
        caveat:         parsed.caveat ?? null,
      },
    };
  } catch (err) {
    clearTimeout(timer);
    const msg = (err as Error).message;
    console.warn('[claudeService/video] Failed:', msg);
    return {
      ok: false,
      reason: (err as Error).name === 'AbortError' ? `Timed out after ${TIMEOUT}ms` : msg,
    };
  }
}
