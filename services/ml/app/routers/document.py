from fastapi import APIRouter, UploadFile, File

router = APIRouter()


@router.post("/")
async def detect_document(file: UploadFile = File(...)):
    """Run document detection pipeline: GPTZero -> perplexity scoring + PyMuPDF metadata."""
    # TODO: implement fallback chain
    return {"status": "not_implemented", "modality": "document"}
