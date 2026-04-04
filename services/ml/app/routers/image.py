from fastapi import APIRouter, UploadFile, File

router = APIRouter()


@router.post("/")
async def detect_image(file: UploadFile = File(...)):
    """Run image detection pipeline: SigLIP -> UniversalFakeDetect -> ViT + EXIF."""
    # TODO: implement fallback chain
    return {"status": "not_implemented", "modality": "image"}
