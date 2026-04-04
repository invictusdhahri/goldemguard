#!/usr/bin/env python3
"""Pre-download Hugging Face weights used by the image detection chain.

Run from `services/ml` with the venv active:
  python scripts/prefetch_models.py

Uses ``transformers.pipeline`` only (same as production). Do **not** use a full
``snapshot_download`` of the repo — that pulls training artifacts and many
parallel files; the overall bar can sit at ``0/N`` for a long time.

Requires: pip install -r requirements.txt (transformers, torch, etc.)
"""

from __future__ import annotations

import logging
import os
import sys
import warnings

# Before any hub/transformers import that pulls in urllib3
try:
    from urllib3.exceptions import NotOpenSSLWarning

    warnings.simplefilter("ignore", NotOpenSSLWarning)
except Exception:
    pass

# Fewer parallel downloads can be more reliable on slow or flaky links (tune if needed).
os.environ.setdefault("HF_HUB_MAX_PARALLEL_DOWNLOADS", "2")

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

MODELS = [
    "prithivMLmods/deepfake-detector-model-v1",
    "Organika/sdxl-detector",
    "Wvolf/ViT_Deepfake_Detection",
]


def main() -> None:
    from transformers import pipeline

    for model_id in MODELS:
        logger.info(
            "Prefetch %s via transformers (inference files only; per-file tqdm may follow) ...",
            model_id,
        )
        logger.info(
            "If the bar looks stuck at 0%%: first shard is often slow; watch ~/.cache/huggingface/ size growing.",
        )
        pipeline("image-classification", model=model_id, device=-1)
        logger.info("Finished %s", model_id)
    logger.info("Done. Weights are under ~/.cache/huggingface/ (or HF_HOME).")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
