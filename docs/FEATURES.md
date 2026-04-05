# GolemGuard — Feature documentation (for judges)

This document describes **what we built** in the GolemGuard monorepo: user-facing flows, backend capabilities, and how detection pipelines fit together. It complements the root [README.md](../README.md), [TESTING.md](TESTING.md), and [DEPLOYMENT.md](DEPLOYMENT.md).

**Product positioning:** multimodal AI-generated content detection — upload media or verify claims in context, with plain-English verdicts backed by multiple models and traceable signals.

---

## Table of contents

1. [Authentication and user API](#1-authentication-and-user-api)
2. [File upload and job queue](#2-file-upload-and-job-queue)
3. [Multimodal analysis pipelines](#3-multimodal-analysis-pipelines)
4. [Contextual (three-axis) verification](#4-contextual-three-axis-verification)
5. [Browser extension](#5-browser-extension)
6. [Web application (landing, dashboard, results)](#6-web-application-landing-dashboard-results)
7. [Operational features](#7-operational-features)
8. [API quick reference](#8-api-quick-reference)

---

## 1. Authentication and user API

**What it does:** Users register and sign in with email and password. The backend integrates with **Supabase Auth** and issues **JWT**-protected API access.

**Endpoints:**

- `POST /api/auth/register` — create account (validated with Zod).
- `POST /api/auth/login` — returns session token used for subsequent calls.

**Middleware:** `requireAuth` verifies the bearer token via Supabase and attaches `userId` for row-scoped operations.

**Why it matters:** Every analysis job, upload, and history row is tied to the authenticated user, supporting fair use and auditability.

---

## 2. File upload and job queue

**What it does:**

- **Upload:** `POST /api/upload` accepts multipart uploads, stores files in **Supabase Storage** (bucket `uploads`), and returns a public URL for analysis.
- **Analyze:** `POST /api/analyze` creates an `analysis_jobs` row (`pending`) and enqueues a **BullMQ** job on **Redis**.
- **Polling:** `GET /api/status/:id` returns job status (`pending` → `processing` → `done` / `failed`).
- **Result:** `GET /api/result/:id` returns the full verdict and model evidence when the job completes.
- **History:** `GET /api/history` lists past jobs/results with pagination.

**Worker behavior:** A dedicated worker process downloads the file from storage, runs the appropriate pipeline (see below), **idempotently** writes to `results`, and marks the job `done`. Jobs that cannot succeed (e.g. missing file, invalid URL) are marked **unrecoverable** so they are not retried forever.

**Limits:** Uploads are guarded (e.g. **100 MB** max); video duration can be capped via environment (default short clips for cost/latency).

---

## 3. Multimodal analysis pipelines

All async pipelines produce a shared verdict type: **`AI_GENERATED`**, **`HUMAN`**, or **`UNCERTAIN`**, plus confidence, explanation, per-model scores, **models run / skipped**, **signals**, optional **caveat**, and structured **`model_evidence`** for the UI (proof, skip reasons, and tool-specific fields).

### 3.1 Images

**Signals:**

- **SightEngine** — primary generative-AI / deepfake-style signal for still images (with timeout and internal retries).
- **Grok (xAI)** — vision + reasoning, including optional **event description** and **web-grounded verification** (sources when available).
- **Claude Haiku** — independent visual AI-likeness estimate and narrative synthesis.

**Fusion logic (simplified):** If SightEngine’s raw score is at or above a fixed threshold, the final label is **AI_GENERATED**. Otherwise the system prefers Grok’s assessment when valid, then Claude’s verdict, with SightEngine as fallback. Per-model scores are **blended** into a headline confidence where applicable.

### 3.2 Video

**Phases:**

1. **Duration check** — rejects videos over a configurable max length (requires **ffmpeg/ffprobe** on the worker host).
2. **Audio-first check** — extracts a short audio segment and runs **Resemble AI** deepfake detection. If audio is classified as AI-generated, the job **short-circuits** (visual models skipped) to flag synthetic speech.
3. **Visual path** — **SightEngine video** API (per-frame scores) with **fallback** to analyzing a representative **key frame** as an image if the video API fails.
4. **Grok** — runs on a representative frame (parallel with SightEngine where applicable).
5. **Claude** — synthesizes using frame statistics and Grok context.

Evidence includes **frame-level scores**, Resemble audio evidence when run, and skip reasons when a step is bypassed.

### 3.3 Audio

**Resemble AI** analyzes uploaded audio (and extracted video audio) for deepfake characteristics, with structured evidence: labels, chunk scores, consistency, and optional source-tracing metadata from the API.

### 3.4 Documents

**Flow:** Text is **extracted** from PDF/DOCX (and similar) in the worker; **Sapling AI** scores AI-likeness at the document level. High-probability sentences can surface as **signals**. If extraction fails, the result is **UNCERTAIN** with a clear caveat.

---

## 4. Contextual (three-axis) verification

**Purpose:** Beyond “is this pixels AI?” — verify **claims** and **sources** in one synchronous request (no job queue).

**Endpoints:**

- `POST /api/analyze/contextual` — multipart: optional **`media`**, optional **`context`** (caption/claim), optional **`source_url`**.
- `POST /api/analyze/contextual/url` — JSON: optional **`media_url`** (fetched server-side), plus `context` and `source_url`. Intended for the **browser extension**, where direct file upload from arbitrary pages is awkward.

**Axes (run in parallel when inputs are present):**

| Axis | Role |
|------|------|
| **Authenticity** | SightEngine on image or video (key frame from video). |
| **Context match** | Grok compares media (when available) to the user’s **claim**; uses web search when configured. |
| **Source check** | Grok evaluates the **source URL** (and claim text if provided) for credibility / consistency. |

**Frontend:** The **`/chat`** route provides a guided UI for this flow (upload or URL, claim, source) with per-axis cards and verdict styling.

---

## 5. Browser extension

**Stack:** Vite, React popup, Manifest v3 **service worker** (`background`), **content scripts** for scraping.

**Capabilities:**

- **Login** against the same backend auth as the web app (session aligned with site cookies where configured).
- **Scrape** the current page for media/post items — **Twitter/X** has a tailored scraper; other sites use a **generic** heuristic scraper. Items are deduplicated by id.
- **Analyze** items via the API (including contextual URL flow) so users can check feed content without leaving the browser.
- **Reveal** / rescrape patterns for refreshing detected items.

**UX:** Compact popup (~380px wide) with list UI, verdict badges, and sign-out.

---

## 6. Web application (landing, dashboard, results)

**Landing (`/`):** Marketing sections — hero, partners, **bento features**, **extension showcase**, terminal-style demo, **fallback chain** explainer, CTA, watch demo, footer — oriented toward hackathon/demo storytelling.

**Dashboard (`/dashboard`):** Hub links to **Chat analysis** (`/chat`), **File scanner** (`/upload`), **Extension test** feed (`/extension-test`), and **History** (`/history`).

**Upload (`/upload`):** Multimodal file upload, job creation, polling, navigation to result pages.

**Result (`/result/[id]`):** Rich verdict view — overall verdict, confidence, explanation, **per-model evidence** (SightEngine, Grok, Claude, Resemble, Sapling, video frames), models skipped with reasons, and loading states.

**Docs (`/docs`):** In-app documentation page mirroring project structure (see frontend `components/docs`).

**Auth pages:** Login and register with Supabase-aligned flows.

**Theming:** Light/dark support via shared UI primitives (e.g. theme toggle).

---

## 7. Operational features

- **Global API rate limiting** — protects abuse on public/auth routes.
- **`GET /health`** — liveness for orchestration and demos.
- **Structured errors** — Multer and validation failures return JSON **400**s with clear messages; global handler avoids raw HTML error pages.
- **Graceful worker shutdown** — SIGTERM/SIGINT drains BullMQ jobs before exit.
- **Redis connection strategy** — BullMQ-compatible settings; supports `REDIS_URL` or host/port.

---

## 8. API quick reference

| Method | Route | Purpose |
|--------|--------|---------|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login → JWT |
| POST | `/api/upload` | Upload file → URL |
| POST | `/api/analyze` | Create async analysis job |
| GET | `/api/status/:id` | Job status |
| GET | `/api/result/:id` | Full result |
| GET | `/api/history` | Paginated history |
| POST | `/api/analyze/contextual` | Sync three-axis analysis (multipart) |
| POST | `/api/analyze/contextual/url` | Sync three-axis analysis (media URL + JSON) |
| GET | `/health` | Health check |

*All analysis routes except auth require a valid JWT unless noted otherwise in code.*

---

## Third-party and infrastructure (summary)

| Area | Technology |
|------|------------|
| Database, storage, auth | Supabase (PostgreSQL, Storage, Auth) |
| Job queue | BullMQ + Redis |
| Detection / LLM APIs | SightEngine, xAI Grok, Anthropic Claude, Resemble, Sapling (as wired in worker) |
| Frontend | Next.js App Router, Tailwind, shadcn-style UI |

### API keys and environment variables (names)

Configuration uses the same variable names as [`apps/backend/.env.example`](../apps/backend/.env.example). **Supabase** and **Redis** are required for a working API and worker; third-party detector keys are **optional** in the sense that missing keys cause that step to be skipped (with reasons surfaced in `models_skipped` / evidence), not a silent failure of the whole app.

| Variable(s) | Provider / role |
|-------------|-----------------|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase — URL, anon key (API routes / JWT + RLS), service role (worker, storage) |
| `JWT_SECRET` | Backend session signing |
| `REDIS_URL` | BullMQ job queue |
| `SIGHTENGINE_API_USER`, `SIGHTENGINE_API_SECRET` | SightEngine — image and video signals |
| `XAI_API_KEY` | xAI — Grok (vision, context, source checks) |
| `ANTHROPIC_API_KEY` | Anthropic — Claude Haiku verdicts and synthesis (`ANTHROPIC_MODEL` optional) |
| `RESEMBLE_API_KEY` | Resemble AI — audio deepfake and video audio segment |
| `SAPLING_API_KEY` | Sapling AI — PDF/DOCX AI-likeness |

**Frontend** ([`apps/frontend/.env.example`](../apps/frontend/.env.example)): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_API_URL` pointing at the backend.

**Optional Python ML service** ([`services/ml/.env.example`](../services/ml/.env.example)) for standalone FastAPI experiments: `ANTHROPIC_API_KEY`, `GPTZERO_API_KEY`, and optionally `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` if that service is configured to talk to Supabase directly.

---

## Document history

Written for **judge review**: summarizes implemented product and engineering features as of the repository state; when in doubt, source code in `apps/backend`, `apps/frontend`, and `apps/extension` is authoritative.
