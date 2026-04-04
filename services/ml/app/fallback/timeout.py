"""Async timeout wrapper for model inference."""

import asyncio
from typing import Any, Callable, Coroutine


async def run_with_timeout(
    fn: Callable[..., Coroutine[Any, Any, float]],
    *args: Any,
    timeout: int = 30,
) -> float:
    return await asyncio.wait_for(fn(*args), timeout=timeout)
