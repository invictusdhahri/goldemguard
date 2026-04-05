# GolemGuard

**Detect. Explain. Trust.**

Multimodal AI-generated content detection platform. Upload images, videos, audio clips, or documents and get a plain-English verdict backed by multi-layered detection pipelines with automatic fallbacks.

Built for the **Menacraft 2025** hackathon — Content Authenticity track.

| | |
|:---|:---|
| **Version** | 0.1.0 |
| **License** | [MIT](LICENSE) |
| **Tools** | **Monorepo & runtime:** pnpm workspaces, Turborepo, Node.js ≥20 · **Quality:** TypeScript, ESLint, Prettier · **Frontend:** Next.js 16, Tailwind CSS v4, shadcn/ui, TanStack React Query · **Backend:** Express 5, BullMQ, Redis (ioredis), Supabase JS · **Extension:** Vite, `@crxjs/vite-plugin`, React 19 · **Detection APIs:** SightEngine, xAI Grok, Anthropic Claude Haiku, Resemble AI, Sapling AI |

See [Tech stack](#tech-stack) for a layer-by-layer breakdown.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         GolemGuard Monorepo                     │
│                                                                 │
│  apps/                                                          │
│  ├── frontend/          Next.js 16 + Tailwind + shadcn/ui       │
│  ├── backend/           Express 5 + BullMQ + Supabase           │
│  └── extension/         Chrome extension (Vite + CRX)           │
│                                                                 │
│  packages/                                                      │
│  ├── shared/            Shared TypeScript types & constants      │
│  └── tsconfig/          Shared TS compiler presets               │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

Analysis runs entirely in the **Node backend**: the BullMQ worker calls third-party APIs per modality and fuses results (no separate ML microservice).

```
User uploads file
      │
      ▼
┌──────────┐     POST /api/upload      ┌──────────┐
│ Frontend │ ─────────────────────────▶│ Backend  │
│ (Next.js)│◀────── poll GET /status ───│(Express) │
└──────────┘                           └────┬─────┘
                                            │ BullMQ job
                                            ▼
                                      ┌──────────┐
                                      │  Redis   │
                                      └────┬─────┘
                                            │ Worker (same process)
                                            ▼
                              ┌─────────────────────────────┐
                              │ Third-party APIs (per type) │
                              │ SightEngine · xAI Grok ·    │
                              │ Anthropic Claude · Resemble │
                              │ · Sapling                   │
                              └──────────────┬──────────────┘
                                             │ Fused scores → verdict
                                             ▼
                                      ┌──────────┐
                                      │ Supabase │
                                      │ (results)│
                                      └──────────┘
```

### Detection Pipelines

The **backend worker** (`apps/backend/src/jobs/analyzeJob.ts`) orchestrates these integrations. Missing API keys or failed calls are **skipped with a recorded reason**—the job still completes with whatever signals succeeded.

| Modality | Integrations | Role |
|----------|--------------|------|
| **Image** | SightEngine (generative-AI scores), xAI Grok (vision assessment), Anthropic Claude Haiku (independent rate + synthesis) | Parallel SE ∥ Grok, then Claude for reasoning and fused verdict |
| **Video** | Resemble AI (audio deepfake from extracted audio), SightEngine (video API or key-frame image), Grok, Claude | Audio-first short-circuit if AI; else visual pipeline with frame evidence |
| **Audio** | Resemble AI | Deepfake / synthetic-speech detection |
| **Document** | Sapling AI | AI-likeness on text extracted from PDF/DOCX (via `pdf-parse`, `mammoth`) |

**Infrastructure:** [Supabase](https://supabase.com) (PostgreSQL, Storage, Auth, RLS), [Redis](https://redis.io) (BullMQ queue). **Deployment:** frontend on Vercel, API + worker on Render — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack React Query |
| Backend | Express 5, TypeScript, BullMQ, Redis (ioredis), Supabase JS |
| Extension | Vite, `@crxjs/vite-plugin`, React 19 |
| Database | Supabase (PostgreSQL + Storage + Auth + RLS) |
| AI / detection APIs | SightEngine, xAI Grok, Anthropic Claude Haiku, Resemble AI, Sapling AI |
| Monorepo | pnpm workspaces + Turborepo |

---

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 10
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
# Fill in Supabase keys, Redis URL, JWT secret, and optional third-party API keys
# (see apps/backend/.env.example for SightEngine, xAI, Anthropic, Resemble, Sapling)

# 3. Run all workspace apps in development
pnpm dev
```

This starts the frontend on `http://localhost:3001`, the backend on `http://localhost:4000`, and the extension build in watch mode (see `apps/extension`).

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
│   ├── backend/                  # Express.js API + BullMQ worker
│   │   └── src/
│   │       ├── routes/           # Auth, upload, analyze, results, history
│   │       ├── middleware/       # JWT auth, rate limiting, file upload
│   │       ├── services/         # Supabase, queue, SightEngine, Grok, Claude, Resemble, Sapling
│   │       └── jobs/             # analyzeJob — multimodal detection orchestration
│   │
│   └── extension/                # Chrome extension (Vite)
│
├── packages/
│   ├── shared/                   # @veritas/shared — types & constants
│   └── tsconfig/                 # @veritas/tsconfig — TS compiler presets
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

More guides: [docs/FEATURES.md](docs/FEATURES.md) (feature overview for judges), [docs/GOLEM_GUARD.md](docs/GOLEM_GUARD.md) (what makes GolemGuard unique), [docs/TESTING.md](docs/TESTING.md) (local checks), [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

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

Hosting can often start on **free tiers** (e.g. Supabase, Vercel, Render) depending on usage. **Detection** uses third-party APIs (SightEngine, xAI, Anthropic, Resemble, Sapling)—cost follows each provider’s pricing and your call volume, not “$0 models” in aggregate.

---
Canva Link: https://canva.link/i5g7pu2w0xwbatc


## License

Licensed under the [MIT License](LICENSE).

Copyright (c) 2026 Amen Dhahri.
