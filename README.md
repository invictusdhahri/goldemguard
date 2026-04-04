# VeritasAI

**Detect. Explain. Trust.**

Multimodal AI-generated content detection platform. Upload images, videos, audio clips, or documents and get a plain-English verdict backed by multi-layered detection pipelines with automatic fallbacks.

Built for the **Menacraft 2025** hackathon — Content Authenticity track.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         VeritasAI Monorepo                      │
│                                                                 │
│  apps/                                                          │
│  ├── frontend/          Next.js 16 + Tailwind + shadcn/ui       │
│  └── backend/           Express 5 + BullMQ + Supabase           │
│                                                                 │
│  packages/                                                      │
│  ├── shared/            Shared TypeScript types & constants      │
│  └── tsconfig/          Shared TS compiler presets               │
│                                                                 │
│  services/                                                      │
│  └── ml/                Python FastAPI ML inference service      │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User uploads file
      │
      ▼
┌──────────┐     POST /api/upload      ┌──────────┐
│ Frontend │ ──────────────────────────▶│ Backend  │
│ (Next.js)│◀────── poll GET /status ───│(Express) │
└──────────┘                           └────┬─────┘
                                            │ BullMQ job
                                            ▼
                                      ┌──────────┐
                                      │  Redis   │
                                      └────┬─────┘
                                            │ Worker picks up job
                                            ▼
                                      ┌──────────┐
                                      │ML Service│
                                      │(FastAPI) │
                                      └────┬─────┘
                                            │ Fallback chain per modality
                                            ▼
                                      ┌──────────┐
                                      │  Claude  │  Fused scores → verdict
                                      │Haiku 4.5 │
                                      └──────────┘
```

### Detection Pipelines

| Modality | Primary Model | Fallbacks | Always-On Signal |
|----------|--------------|-----------|------------------|
| Image | SigLIP v1 (94.4%) | UniversalFakeDetect, ViT | EXIF forensics |
| Video | GenConViT (~93%) | EfficientViT, Xception, Frame-SigLIP | MediaPipe behavioral |
| Audio | AASIST3 (~96% F1) | Wav2Vec2, MFCC+RF | Spectral flatness |
| Document | GPTZero (~99%) | Perplexity scoring | PyMuPDF metadata |

Every modality runs a **fallback chain** — if the primary model fails (import error, OOM, timeout, or low confidence), the next model takes over automatically.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui, React Query |
| Backend | Express 5, TypeScript, BullMQ, Redis, Supabase JS |
| ML Service | Python FastAPI, PyTorch, HuggingFace Transformers |
| Database | Supabase (PostgreSQL + Storage + Auth + RLS) |
| AI Reasoning | Claude Haiku 4.5 (verdict engine) |
| Monorepo | pnpm workspaces + Turborepo |

---

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 10
- **Python** >= 3.11 (for ML service)
- **Redis** (for BullMQ job queue)
- **Supabase** project (database, storage, auth)

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/your-org/clawy.git
cd clawy
pnpm install

# 2. Set up environment variables (each app loads its own file)
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
# Fill in Supabase keys, Redis URL, JWT secret, etc.

# 3. Run all services in development
pnpm dev
```

This starts the frontend on `http://localhost:3000` and the backend on `http://localhost:4000`.

For the ML service:

```bash
cd services/ml
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000 --reload-dir app
```

---

## Project Structure

```
clawy/
├── apps/
│   ├── frontend/                 # Next.js frontend
│   │   ├── app/                  # App Router pages
│   │   ├── components/           # React components
│   │   ├── hooks/                # Custom hooks (useAuth, useAnalysis)
│   │   └── lib/                  # Utilities (api client, supabase, cn)
│   │
│   └── backend/                  # Express.js API server
│       └── src/
│           ├── routes/           # Auth, upload, analyze, results, history
│           ├── middleware/       # JWT auth, rate limiting, file upload
│           ├── services/         # Supabase, BullMQ queue, ML client, Claude
│           └── jobs/             # Background job workers
│
├── packages/
│   ├── shared/                   # @veritas/shared — types & constants
│   └── tsconfig/                 # @veritas/tsconfig — TS compiler presets
│
├── services/
│   └── ml/                       # Python FastAPI ML service
│       └── app/
│           ├── routers/          # Per-modality endpoints
│           ├── detectors/        # Model inference + fallback chains
│           ├── fallback/         # Fallback executor, timeout, logging
│           ├── fusion.py         # Weighted score fusion
│           └── claude_service.py # Claude verdict engine
│
├── package.json                  # Root workspace config
├── pnpm-workspace.yaml           # Workspace declarations
└── turbo.json                    # Turborepo pipeline config
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Lint all packages |
| `pnpm format` | Format all files with Prettier |
| `pnpm format:check` | Check formatting without writing |

More guides: [docs/TESTING.md](docs/TESTING.md) (local ML and full-stack checks), [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## API Endpoints

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/api/auth/register` | Register with email + password | Public |
| POST | `/api/auth/login` | Login, returns JWT | Public |
| POST | `/api/upload` | Upload file to Supabase Storage | JWT |
| POST | `/api/analyze` | Create analysis job | JWT |
| GET | `/api/status/:id` | Poll job status | JWT |
| GET | `/api/result/:id` | Fetch verdict + model scores | JWT |
| GET | `/api/history` | List user's past analyses | JWT |

---

## Database Schema

Three tables in Supabase PostgreSQL with Row Level Security:

- **users** — `id`, `email`, `created_at`, `plan`
- **analysis_jobs** — `id`, `user_id`, `file_url`, `media_type`, `status`, timestamps
- **results** — `id`, `job_id`, `verdict`, `confidence`, `explanation`, `model_scores`, `signals`, `processing_ms`

---

## Cost

| Component | Cost |
|-----------|------|
| All ML models | $0 (open-source) |
| Claude Haiku 4.5 | $0 ($5 free credits) |
| HuggingFace Spaces | $0 (free tier) |
| Supabase | $0 (free tier) |
| Vercel | $0 (free tier) |
| **Total** | **$0** |

---

## License

MIT — see [LICENSE](LICENSE).
