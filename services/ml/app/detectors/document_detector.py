"""
Document detection fallback chain:
  1. GPTZero API — ~99% RAID
  2. Perplexity scoring (GPT-2) — ~70%
  + PyMuPDF metadata forensics (always runs)
"""


async def detect_document(doc_bytes: bytes, filename: str) -> dict:
    # TODO: implement GPTZero -> perplexity fallback + PyMuPDF forensics
    raise NotImplementedError
