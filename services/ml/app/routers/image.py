import logging
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.detectors.image_detector import detect_image
from app.fusion import fuse_image_scores
from app.claude_service import get_verdict

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/")
async def analyze_image(file: UploadFile = File(...)):
    """Run image detection pipeline: SigLIP -> UniversalFakeDetect -> ViT + EXIF."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail=f"Expected image file, got {file.content_type}")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    result = await detect_image(image_bytes)

    ml_results = result["ml_results"]
    exif = result["exif"]

    # Add EXIF as a score entry for fusion
    all_scores = ml_results + [{"model": "exif", "score": exif.get("score", 0.5), "status": "ok"}]
    fused_score = fuse_image_scores(all_scores)

    models_run = [r["model"] for r in ml_results if r["status"] == "ok"]
    models_skipped = [r["model"] for r in ml_results if r["status"] != "ok"]
    fallback_reasons = [r["status"] for r in ml_results if r["status"] != "ok"]

    signals = []
    if exif.get("exif_flag"):
        signals.append(f"EXIF: {exif.get('details', {}).get('reason', 'suspicious metadata')}")
    for r in ml_results:
        if r["status"] == "ok" and r["score"] is not None and r["score"] >= 0.70:
            signals.append(f"{r['model']} confidence: {r['score']:.2f}")

    verdict_response = await get_verdict(
        media_type="image",
        fused_score=fused_score,
        models_run=models_run,
        models_skipped=models_skipped,
        fallback_reasons=fallback_reasons,
        triggered_signals=signals,
    )

    model_scores = {r["model"]: r["score"] for r in ml_results}
    model_scores["exif"] = exif.get("score")

    return {
        "verdict": verdict_response.get("verdict", "UNCERTAIN"),
        "fused_score": fused_score,
        "confidence": verdict_response.get("confidence_pct", round(fused_score * 100)),
        "explanation": verdict_response.get("explanation", ""),
        "model_scores": model_scores,
        "models_run": models_run + ["exif"],
        "models_skipped": models_skipped,
        "signals": signals,
        "top_signals": verdict_response.get("top_signals", signals[:3]),
        "caveat": verdict_response.get("caveat"),
        "exif_details": exif.get("details", {}),
    }
