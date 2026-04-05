# VeritasAI Deployment Guide

This document covers deploying all three VeritasAI services to their respective hosting platforms.

---

## Overview

| Service | Platform | URL |
|---------|----------|-----|
| Frontend (Next.js) | Vercel | `https://veritasai.vercel.app` |
| Backend (Express) | Railway | `https://veritasai-api.up.railway.app` |
| ML Service (FastAPI) | HuggingFace Spaces | `https://huggingface.co/spaces/<org>/veritasai-ml` |
| Database | Supabase | Dashboard at `https://supabase.com/dashboard` |

All platforms offer free tiers sufficient for the hackathon.

---

## 1. Supabase Setup

Supabase provides PostgreSQL, file storage, authentication, and row-level security.

### 1.1 Create Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **anon/public key** from Settings > API
3. Note the **service_role key** (used by the backend only, never exposed to the client)

### 1.2 Create Tables

Run the following SQL in the Supabase SQL Editor:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  plan TEXT DEFAULT 'free'
);

-- Analysis jobs table
CREATE TABLE analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  file_url TEXT NOT NULL,
  media_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Results table
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES analysis_jobs(id) NOT NULL,
  verdict TEXT NOT NULL,
  confidence FLOAT NOT NULL,
  explanation TEXT NOT NULL,
  model_scores JSONB NOT NULL,
  models_run JSONB NOT NULL,
  models_skipped JSONB NOT NULL,
  signals JSONB NOT NULL,
  caveat TEXT,
  processing_ms INTEGER
);
```

### 1.3 Enable Row Level Security

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- Users can only read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can only see their own jobs
CREATE POLICY "Users can read own jobs" ON analysis_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs" ON analysis_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only see results for their own jobs
CREATE POLICY "Users can read own results" ON results
  FOR SELECT USING (
    job_id IN (SELECT id FROM analysis_jobs WHERE user_id = auth.uid())
  );
```

### 1.4 Create Storage Bucket

1. Go to Storage in the Supabase dashboard
2. Create a new bucket called `uploads`
3. Set the bucket to **private** (authenticated access only)
4. Set max file size to **50MB**

### 1.5 Enable Auth Providers

1. Go to Authentication > Providers
2. Enable **Email** (enabled by default)
3. Optionally enable **Google OAuth** with your Google Cloud credentials

---

## 2. Frontend Deployment (Vercel)

### 2.1 Connect Repository

1. Go to [vercel.com](https://vercel.com) and import the GitHub repository
2. Set the **Root Directory** to `apps/frontend`
3. Framework preset will auto-detect as **Next.js**

### 2.2 Environment Variables

Add these in the Vercel dashboard under Settings > Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://veritasai-api.up.railway.app/api
```

### 2.3 Build Settings

Vercel auto-detects these, but verify:

- **Build Command**: `cd ../.. && pnpm build --filter=@veritas/frontend`
- **Output Directory**: `.next`
- **Install Command**: `cd ../.. && pnpm install`

### 2.4 Deploy

Push to `main` branch. Vercel deploys automatically on every push.

---

## 3. Backend Deployment (Railway)

### 3.1 Create Service

1. Go to [railway.app](https://railway.app) and create a new project
2. Connect the GitHub repository
3. Set the **Root Directory** to `apps/backend`

### 3.2 Environment Variables

```
PORT=4000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-random-secret-at-least-32-chars
REDIS_URL=redis://default:password@your-redis-host:6379
ML_SERVICE_URL=https://your-hf-space.hf.space
ANTHROPIC_API_KEY=your-anthropic-key
```

### 3.3 Add Redis

1. In the same Railway project, click **New Service** > **Database** > **Redis**
2. Copy the internal `REDIS_URL` and set it as an environment variable on the backend service
3. Railway provides a free Redis instance within the project

### 3.4 Build & Start Commands

```
# Build
cd ../.. && pnpm install && pnpm build --filter=@veritas/backend

# Start
node dist/server.js
```

### 3.5 Deploy

Railway deploys automatically on push. Check logs at `railway.app` dashboard.

---

## 4. ML Service Deployment (HuggingFace Spaces)

### 4.1 Create Space

1. Go to [huggingface.co/new-space](https://huggingface.co/new-space)
2. Select **Docker** as the Space SDK
3. Choose the **free CPU basic** tier (2 vCPU, 16GB RAM)

### 4.2 Push Code

```bash
cd services/ml

# Initialize HF repo (first time only)
git init
git remote add hf https://huggingface.co/spaces/<org>/veritasai-ml

# Push
git add .
git commit -m "Deploy ML service"
git push hf main
```

### 4.3 Environment Variables (Secrets)

In the Space settings, add:

```
ANTHROPIC_API_KEY=your-anthropic-key
GPTZERO_API_KEY=your-gptzero-key
```

### 4.4 Dockerfile

The `services/ml/Dockerfile` is pre-configured:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libgl1 libglib2.0-0
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

HuggingFace Spaces will automatically build and deploy from this Dockerfile.

### 4.5 Model Weights

Models are downloaded from HuggingFace Hub on first inference. For faster cold starts, you can pre-download weights in the Dockerfile:

```dockerfile
RUN python -c "from transformers import pipeline; pipeline('image-classification', model='prithivMLmods/deepfake-detector-model-v1')"
```

### 4.6 Performance Notes

- Video inference takes 25-45 seconds per 60-second clip on CPU
- Pre-process demo videos and cache results for the presentation
- For the live demo, use a 10-second clip to keep inference under 15 seconds

---

## 5. Environment Variables Reference

### Backend (`apps/backend/.env`)

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-random-secret-at-least-32-chars
REDIS_URL=redis://localhost:6379
ML_SERVICE_URL=http://localhost:8000
PORT=4000
```

### Frontend (`apps/frontend/.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### ML Service (`services/ml/.env`)

```bash
ANTHROPIC_API_KEY=sk-ant-...
GPTZERO_API_KEY=your-gptzero-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 6. Local Development Setup

### Prerequisites

```bash
node -v   # >= 20
pnpm -v   # >= 10
python3 --version  # >= 3.11
redis-server --version  # any recent version
```

### Step-by-step

```bash
# 1. Install JS dependencies
pnpm install

# 2. Start Redis locally
redis-server &

# 3. Start frontend + backend (via Turborepo)
pnpm dev

# 4. In a separate terminal, start the ML service
cd services/ml
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000 --reload-dir app
```

### Ports

| Service | Port |
|---------|------|
| Frontend | 3001 |
| Backend | 4000 |
| ML Service | 8000 |
| Redis | 6379 |

---

## 7. CI/CD Notes

### Turborepo Caching

Turborepo caches build outputs locally in `.turbo/`. For CI, enable remote caching:

```bash
npx turbo login
npx turbo link
```

### Build Order

Turborepo resolves the dependency graph automatically:

```
@veritas/tsconfig (no build)
       │
       ▼
@veritas/shared (tsc)
       │
       ├──────────────┐
       ▼              ▼
@veritas/frontend  @veritas/backend
  (next build)       (tsc)
```

### Monorepo-aware Deploys

Both Vercel and Railway support monorepo setups. They will only rebuild when files in the relevant app directory (or shared dependencies) change.

---

## 8. Troubleshooting

| Issue | Solution |
|-------|----------|
| `pnpm install` fails with EPERM | Run outside sandbox or check filesystem permissions |
| Next.js can't find `@veritas/shared` | Run `pnpm build --filter=@veritas/shared` first |
| Redis connection refused | Start Redis: `redis-server` or check `REDIS_URL` |
| ML service OOM on video | Reduce frame sampling rate or use a smaller model |
| Claude API returns 401 | Check `ANTHROPIC_API_KEY` is set correctly |
| HuggingFace Space stuck building | Check Dockerfile syntax and requirements.txt versions |
