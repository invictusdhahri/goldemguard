"""Claude Haiku 4.5 verdict engine — receives fused scores and returns structured verdict."""

import os

import anthropic

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

VERDICT_PROMPT = """You are VeritasAI's verdict engine. Analyze the detection scores below and return a structured JSON verdict.

Media type: {media_type}
Fused confidence score: {fused_score}
Models that ran: {models_run}
Models skipped (fallback triggered): {models_skipped}
Fallback reasons: {fallback_reasons}
Triggered signals: {triggered_signals}

Return ONLY this JSON:
{{
  "verdict": "FAKE" | "REAL" | "UNCERTAIN",
  "confidence_pct": 0-100,
  "explanation": "1-2 plain English sentences explaining the finding",
  "top_signals": ["signal 1", "signal 2", "signal 3"],
  "caveat": "Optional note if fallbacks affected confidence"
}}"""


async def get_verdict(
    media_type: str,
    fused_score: float,
    models_run: list[str],
    models_skipped: list[str],
    fallback_reasons: list[str],
    triggered_signals: list[str],
) -> dict:
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
    # TODO: parse structured JSON from response
    return {"raw": message.content[0].text}
