# GolemGuard — Testing Guide

How to run and verify the **ML service** locally, and (optionally) the **full stack** (frontend + backend + Redis + ML).

---

## 1. ML service only (FastAPI)

Use this to validate inference, `/health`, and `curl` without the Next.js app or BullMQ.

### 1.1 Prerequisites

- **Python** 3.11+ recommended (see root [README.md](../README.md)). Older Python may not resolve every package version; if `pip` fails, upgrade Python or relax pins in `services/ml/requirements.txt` as needed.
- **Disk / RAM**: First request downloads model weights; allow several GB free disk and enough RAM for PyTorch.

### 1.2 Environment

From `services/ml`:

```bash
cp .env.example .env
```

Edit `.env` and set **`ANTHROPIC_API_KEY`** if you want full Claude verdict text. If it is empty, the service still returns scores and uses a [fallback verdict](../services/ml/app/claude_service.py).

### 1.3 Install and run

```bash
cd services/ml
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
python3 -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000 --reload-dir app
```

`--reload-dir app` limits the file watcher to the `app/` package so changes under `.venv` (e.g. imports touching `site-packages`) do not restart the server in a loop.

**Pre-download all image-model weights (optional, recommended before first `curl`)**

After `pip install -r requirements.txt`, run:

```bash
cd services/ml
source .venv/bin/activate
python scripts/prefetch_models.py
```

This downloads then loads the same three Hugging Face models as the image pipeline ([`image_detector.py`](../services/ml/app/detectors/image_detector.py)). You should see **download progress** for each repo; after that, **loading the pipeline on CPU** can take several minutes **with little output** — that is normal, not a hang. Total disk is often **~1–2 GB** under `~/.cache/huggingface/`. Then the first `POST /detect/image/` does not wait on large downloads.

Start the API with the `uvicorn` command in the block above and keep that terminal open. The API listens at **`http://localhost:8000`**.

### 1.4 Smoke tests

**Health**

```bash
curl -sS http://localhost:8000/health
```

Expect JSON with `"status": "ok"` and `"service": "golemguard-ml"`.

**OpenAPI**

- Browser: [http://localhost:8000/docs](http://localhost:8000/docs)
- Or: `curl -sS http://localhost:8000/openapi.json | head -c 800`

**Image detection (multipart upload)**

The route expects a form field named **`file`** and an image MIME type (`image/png`, `image/jpeg`, etc.).

A tiny PNG is committed for convenience:

```bash
# From repo root (adjust path if your clone differs)
curl -sS -X POST http://localhost:8000/detect/image/ \
  -H "Accept: application/json" \
  -F "file=@services/ml/test-fixtures/sample.png;type=image/png"
```

From inside `services/ml`:

```bash
curl -sS -X POST http://localhost:8000/detect/image/ \
  -F "file=@test-fixtures/sample.png;type=image/png"
```

Use any real image path on your machine instead of a placeholder like `/path/to/your/image.png` — `curl` error **26** means the file path could not be read.

**First `POST /detect/image/` request (why Python “goes busy” and `curl` seems stuck)**

The pipeline pulls **SigLIP and fallback** model weights from Hugging Face on first use. The uvicorn terminal will show downloads (`config.json`, `model.safetensors`, progress bars, often **hundreds of MB**). **`curl` does not print anything until the full request finishes**, so it may sit with no output for **several minutes** the first time. That is normal. After weights are cached under `~/.cache/huggingface/`, later requests start much faster. You may also see `NotOpenSSLWarning` from `urllib3` on macOS (LibreSSL vs OpenSSL); it is usually harmless for these downloads.

**Video / audio / document**

These routes accept the same `file` field but currently return a **not implemented**-style response until pipelines are wired. Example:

```bash
curl -sS -X POST http://localhost:8000/detect/video/ -F "file=@/path/to/video.mp4"
```

### 1.5 Troubleshooting (ML)

| Symptom | What to check |
|--------|----------------|
| `curl: (7) Failed to connect to localhost port 8000` | Start `uvicorn` first; ensure nothing else uses port 8000. |
| `curl: (26) Failed to open/read local data` | Use a real file path for `-F "file=@..."`. |
| `No matching distribution found for numpy>=...` | Upgrade pip; use Python 3.11+ if possible; see `requirements.txt` constraints. |
| First request very slow | Normal while models download/load. |
| Uvicorn keeps “Reloading…” (watching `.venv`) | Use `--reload-dir app` so only `app/` is watched (see §1.3). |
| 404 on `/detect/image/` vs `/detect/image` | Try with or without trailing slash to match FastAPI’s registered path. |

---

## 2. Full stack (optional)

To exercise uploads and jobs the same way production does:

1. **Redis** running (BullMQ), e.g. `redis://localhost:6379`.
2. **Supabase** project and **`apps/backend/.env`** filled (see [DEPLOYMENT.md](DEPLOYMENT.md) and `apps/backend/.env.example`). Minimum: **`SUPABASE_URL`**, **`SUPABASE_ANON_KEY`**, **`SUPABASE_SERVICE_ROLE_KEY`**, **`JWT_SECRET`**, **`REDIS_URL`**. For full multimodal behavior, set the third-party keys you need: **`SIGHTENGINE_API_USER`** / **`SIGHTENGINE_API_SECRET`**, **`XAI_API_KEY`**, **`ANTHROPIC_API_KEY`**, **`RESEMBLE_API_KEY`**, **`SAPLING_API_KEY`** (each gates its pipeline step). The BullMQ worker runs these integrations inside the backend; it does not call the optional Python service under `services/ml`.
3. Terminal A — ML (optional, for [§1](#1-ml-service-only-fastapi) only): `cd services/ml && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000 --reload-dir app`
4. Terminal B — monorepo: from repo root, `pnpm dev` (frontend ~3001, backend ~4000).
5. Open **http://localhost:3001**, register/login, upload, and run analysis; poll status until the job completes.

If Redis is unreachable or required env vars are missing, jobs may stay pending or fail — check backend logs and `REDIS_URL`.

---

## 3. Repo-wide checks (no E2E test suite)

There is no root `pnpm test` script today. Useful static checks:

```bash
pnpm lint
pnpm build
```

---

## Related docs

| Document | Use for |
|----------|---------|
| [README.md](../README.md) | Architecture, quick start, API table |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Env vars, hosting, Supabase, troubleshooting |
