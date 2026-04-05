# GolemGuard Deployment Guide

This document covers deploying GolemGuard to **Supabase** (database and storage), **Vercel** (Next.js frontend), and **Render** (Express API + Redis-compatible queue).

---

## Overview

| Service | Platform | Notes |
|---------|----------|--------|
| Frontend (Next.js) | [Vercel](https://vercel.com) | Root directory `apps/frontend`; see `apps/frontend/vercel.json` |
| Backend (Express + worker) | [Render](https://render.com) | Docker image from `Dockerfile.backend`; Blueprint `render.yaml` |
| Queue / cache | [Render Key Value](https://render.com/docs/key-value) | Redis®-compatible; `REDIS_URL` wired in Blueprint |
| Database & auth | [Supabase](https://supabase.com) | Postgres, Storage bucket `uploads`, Auth |

Optional: **HuggingFace Spaces** for the standalone Python ML app under `services/ml` (not required for the main product; detection runs in the Node backend).

---

## 1. Supabase

### 1.1 Create or select a project

1. In the [Supabase dashboard](https://supabase.com/dashboard), create a project (or use an existing one).
2. From **Settings → API**, copy:
   - **Project URL** → `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (backend only; never expose to the browser)

### 1.2 Apply database migrations

Schema lives in `supabase/migrations/`. Apply them in timestamp order:

- **CLI** (recommended): [Supabase CLI](https://supabase.com/docs/guides/cli) — `supabase db push` or link the project and run migrations.
- **Dashboard**: SQL Editor — paste each migration file’s contents in order.
- **MCP**: If you use the Supabase MCP in Cursor, `apply_migration` can run the same SQL.

The initial migration creates tables (`users`, `analysis_jobs`, `results`), RLS policies, the private **`uploads`** storage bucket (50MB limit), and follow-up migrations add auth sync, `model_evidence`, `content_hash`, and trial credits.

### 1.3 Auth providers

Under **Authentication → Providers**, keep **Email** enabled (and optionally **Google**).

### 1.4 Auth URLs (avoid localhost on production)

Supabase uses **Site URL** as the default redirect for email confirmation, magic links, and OAuth when no other URL is allowed. If it stays `http://localhost:3000`, users will land on localhost after confirming email—even from production.

1. Open **Authentication → [URL Configuration](https://supabase.com/dashboard/project/_/auth/url-configuration)**.
2. Set **Site URL** to your production app, e.g. `https://goldemguard.vercel.app` (no trailing slash required in the UI; the app sends redirects with a trailing `/` where needed).
3. Under **Redirect URLs**, add every origin you use, for example:
   - `https://goldemguard.vercel.app/**`
   - `http://localhost:3001/**` (this repo’s dev port; add `http://localhost:3000/**` if you run Next on 3000)
   - Preview URLs if needed, e.g. `https://*-yourteam.vercel.app/**` ([wildcards](https://supabase.com/docs/guides/auth/redirect-urls))

On **Vercel**, set **`NEXT_PUBLIC_SITE_URL`** in the Production environment to `https://goldemguard.vercel.app/` so server-side code and builds resolve the same canonical URL. The register flow passes **`emailRedirectTo`** using the current browser origin; confirmation links only work if that URL is in the redirect allow list above.

If you use **local Supabase** (`supabase start`), set the same values in `supabase/config.toml` under `[auth]` (`site_url`, `additional_redirect_urls`) so it matches the [CLI config](https://supabase.com/docs/guides/cli/config#auth).

**Email templates:** If links still ignore `emailRedirectTo`, update templates to use `{{ .RedirectTo }}` where appropriate instead of only `{{ .SiteURL }}` ([docs](https://supabase.com/docs/guides/auth/redirect-urls#email-templates-when-using-redirectto)).

---

## 2. Frontend (Vercel)

### 2.1 Import the repository

1. In [Vercel](https://vercel.com), **Add New → Project** and import this GitHub repo.
2. Set **Root Directory** to `apps/frontend`.
3. Framework: **Next.js** (auto-detected).  
   `apps/frontend/vercel.json` sets install/build to run the monorepo from the repo root with pnpm + Turborepo.

### 2.2 Environment variables

In **Settings → Environment Variables** (Production, Preview, Development as needed):

| Name | Example / notes |
|------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase **anon** key |
| `NEXT_PUBLIC_SITE_URL` | Production origin, e.g. `https://goldemguard.vercel.app/` (matches Supabase **Site URL** / redirects) |
| `NEXT_PUBLIC_API_URL` | Backend public URL ending in **`/api`** (e.g. `https://clawy-api.onrender.com/api`) |

Redeploy after changing env vars.

### 2.3 Deploy

Push to the connected branch; Vercel builds on every push.

---

## 3. Backend (Render)

The API needs **ffmpeg** on the host for video handling, so deployment uses **Docker** (`Dockerfile.backend`) rather than Render’s native Node runtime.

### 3.1 Blueprint (recommended)

1. In the [Render dashboard](https://dashboard.render.com), choose **New → Blueprint**.
2. Connect this repository and select **`render.yaml`** at the repo root.
3. On first apply, Render prompts for variables marked `sync: false` (Supabase URL and keys, optional API keys).
4. After deploy, note the service URL (e.g. `https://clawy-api.onrender.com`). Set **`NEXT_PUBLIC_API_URL`** on Vercel to `https://<your-service>.onrender.com/api`.

The Blueprint provisions:

- **Key Value** instance `clawy-cache` (private network only).
- **Web service** `clawy-api` with `REDIS_URL` from the Key Value **connection string**, plus a generated **`JWT_SECRET`**.

### 3.2 Manual Docker service (alternative)

If you prefer not to use a Blueprint:

1. **New → Web Service**, connect the repo.
2. **Environment**: **Docker**.
3. **Dockerfile path**: `Dockerfile.backend`, **Docker build context**: `.` (repository root).
4. Add the same environment variables as in `render.yaml` (see below). Create a [Key Value](https://render.com/docs/key-value) instance and set **`REDIS_URL`** to its internal connection string.

### 3.3 Environment variables (backend)

**Required:**

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Anon key (used where the API validates JWT + RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (worker, storage, bypass RLS where intended) |
| `JWT_SECRET` | At least 32 characters; signing user JWTs |
| `REDIS_URL` | From Render Key Value `connectionString` (or external Redis) |

**Optional (detectors skip gracefully if unset):**

`SIGHTENGINE_API_USER`, `SIGHTENGINE_API_SECRET`, `XAI_API_KEY`, `ANTHROPIC_API_KEY`, `RESEMBLE_API_KEY`, `SAPLING_API_KEY`

Render sets **`PORT`** automatically; the server reads `process.env.PORT`.

### 3.4 Free tier behavior

On Render’s free tier, services **spin down** after idle time; first request may cold-start. Upgrade or keep the service warm for demos.

---

## 4. ML service (HuggingFace Spaces) — optional

See the previous sections in the repo history or `services/ml` for a standalone FastAPI app. Core product analysis runs in **`@veritas/backend`**; this Space is optional for experiments.

---

## 5. Environment variables reference

### Backend (`apps/backend/.env`)

See `apps/backend/.env.example` for the full list.

### Frontend (`apps/frontend/.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

For production, `NEXT_PUBLIC_API_URL` must be the Render API base ending in `/api`.

---

## 6. Local development

### Prerequisites

```bash
node -v   # >= 20
pnpm -v   # >= 10
redis-server --version  # any recent version
```

### Commands

```bash
pnpm install
redis-server &
pnpm dev
```

### Ports

| Service | Port |
|---------|------|
| Frontend | 3001 |
| Backend | 4000 |
| Redis | 6379 |

---

## 7. CI/CD notes

- **Turborepo** builds `@veritas/shared` before app packages; caches live under `.turbo/`.
- **Vercel** and **Render** rebuild when files under the linked paths (or shared packages) change.
- **Docker**: `docker build -f Dockerfile.backend -t clawy-api .` from the repo root (requires Docker locally).

---

## 8. Troubleshooting

| Issue | Solution |
|-------|----------|
| `pnpm install` fails with EPERM | Fix filesystem permissions or run outside a restricted sandbox |
| Next.js cannot resolve `@veritas/shared` | Build shared first: `pnpm exec turbo build --filter=@veritas/shared` |
| Redis connection refused | Set `REDIS_URL` to your Render Key Value URL or run Redis locally |
| Video analysis errors mentioning ffmpeg | Use the Docker deployment on Render (`Dockerfile.backend` installs ffmpeg) |
| Claude / xAI 401 | Verify the corresponding API key in Render env |
| Browser cannot reach API | Set `NEXT_PUBLIC_API_URL` on Vercel to the Render URL with `/api`; check CORS (API uses open `cors()` by default) |
