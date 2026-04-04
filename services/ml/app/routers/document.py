import logging
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.detectors.document_detector import detect_document
from app.fusion import fuse_document_scores
from app.claude_service import get_verdict

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/")
async def analyze_document(file: UploadFile = File(...)):
    """Run document detection pipeline: Metadata forensics -> Heuristic AI scoring -> Claude verdict."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF documents are supported currently")

    doc_bytes = await file.read()
    if not doc_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    result = await detect_document(doc_bytes, file.filename)

    ml_results = result["ml_results"]
    metadata = result["metadata"]
    signals = result["signals"]

    fused_score = fuse_document_scores(ml_results)

    models_run = [r["model"] for r in ml_results if r["status"] == "ok"]
    models_skipped = [r["model"] for r in ml_results if r["status"] != "ok"]
    fallback_reasons = [r["status"] for r in ml_results if r["status"] != "ok"]

    verdict_response = await get_verdict(
        media_type="document",
        fused_score=fused_score,
        models_run=models_run,
        models_skipped=models_skipped,
        fallback_reasons=fallback_reasons,
        triggered_signals=signals,
    )

    model_scores = {r["model"]: r["score"] for r in ml_results}

    return {
        "verdict": verdict_response.get("verdict", "UNCERTAIN"),
        "fused_score": fused_score,
        "confidence": verdict_response.get("confidence_pct", round(fused_score * 100)),
        "explanation": verdict_response.get("explanation", ""),
        "model_scores": model_scores,
        "models_run": models_run,
        "models_skipped": models_skipped,
        "signals": signals,
        "top_signals": verdict_response.get("top_signals", signals[:3]),
        "caveat": verdict_response.get("caveat"),
        "metadata": metadata,
    }
