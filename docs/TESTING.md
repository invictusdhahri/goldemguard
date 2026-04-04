# VeritasAI — Testing Guide

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

Keep this terminal open. The API listens at **`http://localhost:8000`**.

### 1.4 Smoke tests

**Health**

```bash
curl -sS http://localhost:8000/health
```

Expect JSON with `"status": "ok"` and `"service": "veritas-ml"`.

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
2. **Supabase** project and **`apps/backend/.env`** filled (see [DEPLOYMENT.md](DEPLOYMENT.md) and `apps/backend/.env.example`).
3. Set **`ML_SERVICE_URL=http://localhost:8000`** in `apps/backend/.env`.
4. Terminal A — ML: `cd services/ml && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000 --reload-dir app`
5. Terminal B — monorepo: from repo root, `pnpm dev` (frontend ~3000, backend ~4000).
6. Open **http://localhost:3000**, register/login, upload, and run analysis; poll status until the job completes.

If the backend cannot reach the ML URL or Redis, jobs may stay pending or fail — check backend logs and `REDIS_URL`.

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
