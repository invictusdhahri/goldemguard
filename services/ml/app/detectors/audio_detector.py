"""
Audio detection fallback chain:
  1. AASIST3 (MTUCI/AASIST3) — ~96% F1
  2. Wav2Vec2-base classifier — ~90% F1
  3. MFCC + Random Forest — ~82% acc
  + Resemblyzer / SpeechBrain ECAPA speaker consistency (additive)
  + MFCC spectral flatness pre-filter
"""


async def detect_audio(audio_bytes: bytes) -> dict:
    # TODO: implement MFCC pre-filter + fallback chain + speaker verification
    raise NotImplementedError
