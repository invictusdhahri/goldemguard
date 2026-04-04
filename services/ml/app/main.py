from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import image, video, audio, document

app = FastAPI(
    title="VeritasAI ML Service",
    description="Multimodal AI-generated content detection",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(image.router, prefix="/detect/image", tags=["image"])
app.include_router(video.router, prefix="/detect/video", tags=["video"])
app.include_router(audio.router, prefix="/detect/audio", tags=["audio"])
app.include_router(document.router, prefix="/detect/document", tags=["document"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "veritas-ml"}
