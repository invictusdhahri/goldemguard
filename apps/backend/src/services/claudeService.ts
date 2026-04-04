/**
 * Anthropic Claude Haiku — vision assessment (AI-likeness rate) plus synthesis of
 * SightEngine + Grok into verdict, explanation, evidence bullets, and caveat.
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

// ─── Prompt ───────────────────────────────────────────────────────────────────

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
    "<bullet: what Grok saw in the image, or note if Grok was unavailable>",
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
- proof_points must explicitly reference SightEngine (score) and Grok (when present), and your own assessment, and state this policy when relevant.`;
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

  let grokSection = 'Grok (xAI grok-4-1-fast): NOT AVAILABLE — no assessment.';
  if (grok) {
    grokSection =
      `Grok (xAI grok-4-1-fast): assessment=${grok.assessment}, confidence=${grok.confidence_pct}%\n` +
      `Grok visual reasoning: ${grok.reasoning}`;
  }

  return `The image is attached. Use it for confidence_pct and for synthesis.

SightEngine genai: ${sePct}% AI-likeness (${seLabel}). Threshold verdict: ${verdict}.

${grokSection}

Produce the JSON including confidence_pct (your own visual rate), verdict, explanation, and proof_points that cite SightEngine, Grok when present, and your assessment.`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

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

  const b64     = imageBuffer.toString('base64');
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
                type:         'image',
                source:       {
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

    const raw = json.content?.find((b) => b.type === 'text')?.text ?? '';
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
