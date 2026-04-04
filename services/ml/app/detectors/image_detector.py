"""
Image detection fallback chain:
  1. SigLIP v1 (prithivMLmods/deepfake-detector-model-v1) — 94.4% acc
  2. UniversalFakeDetect (Ojha et al.) — ~91% AUC
  3. ViT Deepfake Detector (Wvolf/ViT_Deepfake_Detection) — ~98.7%
  + EXIF forensics (always runs)
"""

from app.fallback.runner import run_with_fallback


class SigLIPDetector:
    name = "siglip"

    async def detect(self, image_bytes: bytes) -> float:
        raise NotImplementedError


class UniversalFakeDetector:
    name = "universalfake"

    async def detect(self, image_bytes: bytes) -> float:
        raise NotImplementedError


class ViTDetector:
    name = "vit"

    async def detect(self, image_bytes: bytes) -> float:
        raise NotImplementedError


def check_exif(image_bytes: bytes) -> dict:
    """Rule-based EXIF metadata forensics. Always runs."""
    # TODO: implement EXIF analysis
    return {"exif_flag": False, "details": {}}


IMAGE_CHAIN = [SigLIPDetector(), UniversalFakeDetector(), ViTDetector()]


async def detect_image(image_bytes: bytes) -> dict:
    ml_results = await run_with_fallback(IMAGE_CHAIN, image_bytes, threshold=0.70, timeout=10)
    exif = check_exif(image_bytes)
    return {"ml_results": ml_results, "exif": exif}
