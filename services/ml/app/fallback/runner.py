"""Central fallback executor — runs a prioritized chain of detectors."""

import asyncio
import logging
from typing import Any

from app.fallback.timeout import run_with_timeout

logger = logging.getLogger(__name__)


async def run_with_fallback(
    detectors: list[Any],
    input_data: bytes,
    threshold: float = 0.50,
    timeout: int = 30,
) -> list[dict]:
    results: list[dict] = []

    for detector in detectors:
        try:
            score = await run_with_timeout(detector.detect, input_data, timeout=timeout)
            results.append({"model": detector.name, "score": score, "status": "ok"})
            if score >= threshold:
                break
        except (ImportError, RuntimeError, asyncio.TimeoutError) as e:
            logger.warning("Fallback triggered for %s: %s", detector.name, e)
            results.append({"model": detector.name, "score": None, "status": str(e)})
            continue

    return results
