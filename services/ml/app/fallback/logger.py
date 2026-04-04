"""Logging utility for fallback chain execution — tracks which models ran and why fallbacks triggered."""

import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(f"veritas.{name}")
