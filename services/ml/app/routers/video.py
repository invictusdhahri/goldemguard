from fastapi import APIRouter, UploadFile, File

router = APIRouter()


@router.post("/")
async def detect_video(file: UploadFile = File(...)):
    """Run video detection pipeline: GenConViT -> EfficientViT -> Xception + behavioral signals."""
    # TODO: implement fallback chain
    return {"status": "not_implemented", "modality": "video"}
