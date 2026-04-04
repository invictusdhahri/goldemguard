"""Score fusion — weighted combination of model outputs per modality."""


def fuse_image_scores(results: list[dict]) -> float:
    weights = {"siglip": 0.40, "universalfake": 0.35, "vit": 0.15, "exif": 0.10}
    total, w_sum = 0.0, 0.0
    for r in results:
        if r.get("score") is not None:
            w = weights.get(r["model"], 0.0)
            total += r["score"] * w
            w_sum += w
    return round(total / w_sum, 3) if w_sum > 0 else 0.5


def fuse_video_scores(
    spatial: float | None,
    behavioral: float | None,
    sync: float | None,
    audio: float | None,
    has_audio: bool,
) -> float:
    if has_audio:
        weights = {"spatial": 0.50, "behavioral": 0.20, "sync": 0.20, "audio": 0.10}
    else:
        weights = {"spatial": 0.65, "behavioral": 0.25, "sync": 0.0, "audio": 0.10}

    scores = {"spatial": spatial, "behavioral": behavioral, "sync": sync, "audio": audio}
    total, w_sum = 0.0, 0.0
    for key, w in weights.items():
        s = scores.get(key)
        if s is not None and w > 0:
            total += s * w
            w_sum += w
    return round(total / w_sum, 3) if w_sum > 0 else 0.5


def fuse_audio_scores(results: list[dict]) -> float:
    weights = {"aasist3": 0.50, "wav2vec2": 0.30, "mfcc_rf": 0.20}
    total, w_sum = 0.0, 0.0
    for r in results:
        if r.get("score") is not None:
            w = weights.get(r["model"], 0.0)
            total += r["score"] * w
            w_sum += w
    return round(total / w_sum, 3) if w_sum > 0 else 0.5
