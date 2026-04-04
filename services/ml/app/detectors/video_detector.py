"""
Video detection fallback chain:
  Spatial: GenConViT -> EfficientViT-Face -> Xception -> Frame-level SigLIP
  Behavioral: MediaPipe Face Mesh -> dlib -> OpenCV Haarcascade
  Lip Sync: SyncNet -> MFCC offset
"""


async def detect_video(video_bytes: bytes) -> dict:
    # TODO: implement spatial, behavioral, and lip sync fallback chains
    raise NotImplementedError
