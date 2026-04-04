from fastapi import APIRouter, UploadFile, File

router = APIRouter()


@router.post("/")
async def detect_audio(file: UploadFile = File(...)):
    """Run audio detection pipeline: AASIST3 -> Wav2Vec2 -> MFCC+RF + speaker verification."""
    # TODO: implement fallback chain
    return {"status": "not_implemented", "modality": "audio"}
