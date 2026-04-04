"""Claude Haiku 4.5 verdict engine — receives fused scores and returns structured verdict."""

import json
import os
import logging

import anthropic

logger = logging.getLogger(__name__)

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

VERDICT_PROMPT = """You are VeritasAI's verdict engine. Analyze the detection scores below and return a structured JSON verdict.

Media type: {media_type}
Fused confidence score: {fused_score}
Models that ran: {models_run}
Models skipped (fallback triggered): {models_skipped}
Fallback reasons: {fallback_reasons}
Triggered signals: {triggered_signals}

Return ONLY valid JSON (no markdown, no explanation outside JSON):
{{
  "verdict": "FAKE" or "REAL" or "UNCERTAIN",
  "confidence_pct": <number 0-100>,
  "explanation": "<1-2 plain English sentences>",
  "top_signals": ["<signal 1>", "<signal 2>", "<signal 3>"],
  "caveat": "<optional note or null>"
}}"""


DEFAULT_VERDICT = {
    "verdict": "UNCERTAIN",
    "confidence_pct": 50,
    "explanation": "Unable to generate AI verdict. Returning raw scores only.",
    "top_signals": [],
    "caveat": "Claude verdict unavailable — using fused score directly.",
}


async def get_verdict(
    media_type: str,
    fused_score: float,
    models_run: list[str],
    models_skipped: list[str],
    fallback_reasons: list[str],
    triggered_signals: list[str],
) -> dict:
    if not os.getenv("ANTHROPIC_API_KEY"):
        logger.warning("ANTHROPIC_API_KEY not set — returning score-based verdict")
        return _score_based_verdict(fused_score, triggered_signals)

    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20241022",
            max_tokens=512,
            messages=[
                {
                    "role": "user",
                    "content": VERDICT_PROMPT.format(
                        media_type=media_type,
                        fused_score=fused_score,
                        models_run=models_run,
                        models_skipped=models_skipped,
                        fallback_reasons=fallback_reasons,
                        triggered_signals=triggered_signals,
                    ),
                }
            ],
        )

        raw_text = message.content[0].text.strip()

        # Strip markdown code fences if present
        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            raw_text = "\n".join(lines)

        verdict = json.loads(raw_text)

        required_keys = {"verdict", "confidence_pct", "explanation", "top_signals"}
        if not required_keys.issubset(verdict.keys()):
            logger.warning("Claude response missing keys: %s", required_keys - verdict.keys())
            return {**DEFAULT_VERDICT, **verdict}

        if verdict["verdict"] not in ("FAKE", "REAL", "UNCERTAIN"):
            verdict["verdict"] = "UNCERTAIN"

        return verdict

    except (json.JSONDecodeError, anthropic.APIError, Exception) as e:
        logger.error("Claude verdict failed: %s", e)
        return _score_based_verdict(fused_score, triggered_signals)


def _score_based_verdict(fused_score: float, signals: list[str]) -> dict:
    """Fallback when Claude is unavailable — derive verdict from raw scores."""
    if fused_score >= 0.75:
        verdict = "FAKE"
    elif fused_score <= 0.35:
        verdict = "REAL"
    else:
        verdict = "UNCERTAIN"

    return {
        "verdict": verdict,
        "confidence_pct": round(fused_score * 100),
        "explanation": f"Score-based verdict (Claude unavailable). Fused detection score: {fused_score:.2f}.",
        "top_signals": signals[:3],
        "caveat": "AI explanation unavailable — verdict based on raw model scores only.",
    }
