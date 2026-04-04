# VeritasAI documentation

This folder holds project documentation beyond the root [README.md](../README.md).

## Contents

| Document | Description |
|----------|-------------|
| [TESTING.md](TESTING.md) | Local ML service (`uvicorn`, `curl`, `/health`, image upload), optional full-stack flow, troubleshooting |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deploying frontend (Vercel), backend (Railway), ML service (HuggingFace Spaces), Supabase setup, env vars, troubleshooting |

---

## Completed work (task log)

Use this as a checklist of what is implemented in the repo today. Pending items are called out explicitly.

### Monorepo and tooling

- [x] **pnpm workspaces** — Root [`package.json`](../package.json), [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) (`apps/*`, `packages/*`)
- [x] **Turborepo** — [`turbo.json`](../turbo.json) for `dev`, `build`, `lint`
- [x] **Shared TypeScript** — [`packages/tsconfig/`](../packages/tsconfig/) (`base.json`, `nextjs.json`)
- [x] **Shared types** — [`packages/shared/`](../packages/shared/) (`@veritas/shared`: jobs, results, verdicts)

### Apps layout

- [x] **Renamed apps** — `apps/web` → [`apps/frontend`](../apps/frontend/), `apps/api` → [`apps/backend`](../apps/backend/) (packages `@veritas/frontend`, `@veritas/backend`)

### Frontend (`apps/frontend`)

- [x] Next.js App Router, TypeScript, Tailwind CSS v4
- [x] Placeholder routes: `/`, `/upload`, `/result/[id]`, `/history`, `/dashboard`
- [x] `lib/` — API helper, Supabase client, `cn()` utility
- [x] `hooks/` — `useAnalysis` (React Query), `useAuth` (Supabase session)
- [ ] Full UI (upload zone, verdict cards, history table) — not built yet

### Backend (`apps/backend`)

- [x] **Auth** — `POST /api/auth/register`, `POST /api/auth/login` via Supabase Auth (Zod validation)
- [x] **Auth middleware** — `requireAuth` using `supabase.auth.getUser(token)`
- [x] **Upload** — `POST /api/upload` — multer + Supabase Storage bucket `uploads`, path `{userId}/{timestamp}_{filename}`
- [x] **Analyze** — `POST /api/analyze` — insert `analysis_jobs`, enqueue BullMQ job
- [x] **Status** — `GET /api/status/:id` — job row for authenticated user
- [x] **Result** — `GET /api/result/:id` — full result when job is `done`
- [x] **History** — `GET /api/history` — paginated (`limit`, `offset`) with joined results
- [x] **Rate limiting** — global `apiLimiter` in [`app.ts`](../apps/backend/src/app.ts)
- [x] **Job worker** — [`analyzeJob.ts`](../apps/backend/src/jobs/analyzeJob.ts): download file from storage, `POST` multipart to ML `/detect/{mediaType}`, persist `results`, update job status
- [x] **ML client** — [`mlService.ts`](../apps/backend/src/services/mlService.ts) multipart `callMlDetect`
- [x] **Claude in backend** — verdict produced inside ML service (Option A); [`claudeService.ts`](../apps/backend/src/services/claudeService.ts) documents that

**Local dev note:** The backend requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in [`apps/backend/.env`](../apps/backend/.env). If they are missing, `pnpm dev` fails with `supabaseUrl is required.` Load env before starting, or use hosted Supabase (see [DEPLOYMENT.md](DEPLOYMENT.md)).

### ML service (`services/ml`)

- [x] FastAPI app, CORS, `/health`
- [x] **Image pipeline (end-to-end)** — [`routers/image.py`](../services/ml/app/routers/image.py): upload → detect → fuse → Claude verdict → JSON response
- [x] **SigLIP** — primary classifier (`prithivMLmods/deepfake-detector-model-v1`)
- [x] **UniversalFakeDetect fallback** — CLIP-style detector (`Organika/sdxl-detector`)
- [x] **ViT fallback** — `Wvolf/ViT_Deepfake_Detection`
- [x] **EXIF forensics** — `exifread`, rule-based score + signals
- [x] **Fallback runner** — [`fallback/runner.py`](../services/ml/app/fallback/runner.py) catches `NotImplementedError` and other errors
- [x] **Fusion** — [`fusion.py`](../services/ml/app/fusion.py) weighted image (and stubs for video/audio)
- [x] **Claude verdict** — [`claude_service.py`](../services/ml/app/claude_service.py): JSON parse, fallback score-based verdict if API key missing
- [ ] **Video / audio / document routers** — still placeholders (`not_implemented` style)
- [ ] **Heavy models** — first run downloads weights; ensure disk and RAM for local runs

### Root documentation

- [x] Root [README.md](../README.md) — architecture, stack, quick start, API table
- [x] [DEPLOYMENT.md](DEPLOYMENT.md) — Supabase, Vercel, Railway, HuggingFace Spaces, env reference

### Infrastructure (your responsibility)

- [ ] Supabase project: tables `users`, `analysis_jobs`, `results`, RLS, Storage bucket `uploads`
- [ ] Redis running for BullMQ (local or cloud URL in `REDIS_URL`)
- [ ] Optional: `supabase start` requires **Docker Desktop** running locally

---

## Suggested next steps

1. Fill backend `.env` and ensure Redis + Supabase are reachable so `pnpm dev` starts the API.
2. Run ML service: `cd services/ml && uvicorn app.main:app --reload --port 8000 --reload-dir app` (after `pip install -r requirements.txt`).
3. Implement remaining ML modalities (video, audio, document) and wire frontend flows.

For environment variables, see the root [`.env.example`](../.env.example) and [DEPLOYMENT.md](DEPLOYMENT.md) § Environment Variables Reference.
