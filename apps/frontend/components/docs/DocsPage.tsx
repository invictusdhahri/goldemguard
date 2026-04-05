'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CodeBlock } from './CodeBlock';
import { DOCS_NAV, type DocsNavId } from './content';
import { DocsMobileNav, DocsSidebar } from './DocsSidebar';
import { DocsSection } from './DocsSection';

const BACKEND_SETUP = `cd apps/backend
pnpm install
cp .env.example .env
# Fill in Supabase, JWT, Redis, and optional detector API keys (see below)
pnpm dev`;

const BACKEND_API_KEYS = `# Required: Supabase + auth + queue
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
REDIS_URL=

# Third-party APIs (set what you use; missing keys skip that step)
SIGHTENGINE_API_USER=
SIGHTENGINE_API_SECRET=
XAI_API_KEY=
ANTHROPIC_API_KEY=
RESEMBLE_API_KEY=
SAPLING_API_KEY=`;

const FRONTEND_SETUP = `cd apps/frontend
pnpm install
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL
pnpm dev`;

const ML_SETUP = `cd services/ml
pip install -r requirements.txt
cp .env.example .env
# Set ANTHROPIC_API_KEY
uvicorn app.main:app --reload`;

const TEST_BACKEND = `cd apps/backend
pnpm test`;

const TEST_ML = `cd services/ml
pytest`;

const ARCH_DIAGRAM = `Browser (Next.js) → Express API + BullMQ worker
        ↓
Supabase (PostgreSQL + Storage + Auth)
        ↓
Redis (job queue)
        ↓
Detection APIs: SightEngine, Grok, Claude, Resemble, Sapling (per modality)`;

function ApiTable() {
  const rows = [
    { method: 'POST', route: '/api/auth/register', purpose: 'Register' },
    { method: 'POST', route: '/api/auth/login', purpose: 'Login → JWT' },
    { method: 'POST', route: '/api/upload', purpose: 'Upload file → URL' },
    { method: 'POST', route: '/api/analyze', purpose: 'Create async analysis job' },
    { method: 'GET', route: '/api/status/:id', purpose: 'Job status' },
    { method: 'GET', route: '/api/result/:id', purpose: 'Full result' },
    { method: 'GET', route: '/api/history', purpose: 'Paginated history' },
    { method: 'POST', route: '/api/analyze/contextual', purpose: 'Sync three-axis analysis (multipart)' },
    { method: 'POST', route: '/api/analyze/contextual/url', purpose: 'Sync analysis (media URL + JSON)' },
    { method: 'GET', route: '/health', purpose: 'Health check' },
  ];
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/50">
            <th className="px-3 py-2 font-semibold text-foreground">Method</th>
            <th className="px-3 py-2 font-semibold text-foreground">Route</th>
            <th className="px-3 py-2 font-semibold text-foreground">Purpose</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.route} className="border-b border-border/60 last:border-0">
              <td className="px-3 py-2 font-mono text-xs text-cyan">{r.method}</td>
              <td className="px-3 py-2 font-mono text-xs text-foreground/90">{r.route}</td>
              <td className="px-3 py-2 text-foreground/80">{r.purpose}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DocsPage() {
  const [activeId, setActiveId] = useState<DocsNavId>('repo-docs');

  const ids = useMemo(() => DOCS_NAV.map((n) => n.id), []);

  useEffect(() => {
    const updateActive = () => {
      const trigger = 160;
      let current: DocsNavId = ids[0] as DocsNavId;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= trigger) current = id;
      }
      setActiveId(current);
    };

    updateActive();
    window.addEventListener('scroll', updateActive, { passive: true });
    window.addEventListener('resize', updateActive, { passive: true });
    return () => {
      window.removeEventListener('scroll', updateActive);
      window.removeEventListener('resize', updateActive);
    };
  }, [ids]);

  return (
    <div className="bg-grid-sm min-h-screen bg-background text-foreground">
      <header className="relative overflow-hidden border-b border-border">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan/12 via-transparent to-purple/10"
          aria-hidden
        />
        <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-cyan/20 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-12 md:py-16">
          <Link
            href="/"
            className="mb-6 inline-flex text-sm font-medium text-muted-foreground transition-colors hover:text-cyan"
          >
            ← Back to home
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan">Documentation</p>
          <h1 className="font-[family-name:var(--font-display)] mt-3 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            VeritasAI — GolemGuard
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            <strong className="font-semibold text-foreground">Detect. Explain. Trust.</strong> Multimodal authenticity
            stack with contextual verification and a browser extension.
          </p>
          <p className="mt-4 max-w-3xl text-pretty leading-relaxed text-foreground/80">
            This page summarizes the same material as the markdown under <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-sm">docs/</code> in
            the repository — judge-facing feature notes, differentiation, testing, and deployment pointers.
          </p>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-24 pt-8 md:flex-row md:gap-12">
        <aside className="hidden shrink-0 md:block md:w-56 lg:w-64">
          <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">On this page</p>
            <DocsSidebar activeId={activeId} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="md:hidden">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jump to</p>
            <DocsMobileNav activeId={activeId} />
          </div>

          <article className="mt-6 md:mt-0">
            <DocsSection id="repo-docs" title="Repository documentation">
              <p className="text-foreground/80">
                Authoritative write-ups live next to the code. Open these files in the repo for full detail:
              </p>
              <ul className="mt-4 space-y-3 text-foreground/80">
                <li>
                  <strong className="text-foreground">FEATURES.md</strong> — Judge-facing walkthrough: auth, upload, async
                  jobs, multimodal pipelines, three-axis contextual verification, browser extension, web app surfaces,
                  operations, and API reference.
                </li>
                <li>
                  <strong className="text-foreground">GOLEM_GUARD.md</strong> — Why the GolemGuard approach is
                  differentiated: ensemble design, context beyond a single score, video/audio logic, explainability,
                  extension reach, production hygiene.
                </li>
                <li>
                  <strong className="text-foreground">TESTING.md</strong> — Local ML service, curl flows, optional
                  full-stack checks, troubleshooting.
                </li>
                <li>
                  <strong className="text-foreground">DEPLOYMENT.md</strong> — Frontend (e.g. Vercel), backend (e.g.
                  Railway), ML hosting, Supabase, environment variables.
                </li>
                <li>
                  <strong className="text-foreground">README.md</strong> (this folder) — Index of the above plus a task
                  checklist and suggested next steps.
                </li>
              </ul>
            </DocsSection>

            <DocsSection id="why-golemguard" title="Why GolemGuard">
              <p className="text-foreground/80">
                GolemGuard is the product identity for the stack: <strong className="text-foreground">defense in depth</strong>{' '}
                (specialized detectors per modality + independent LLM passes + documented fusion),{' '}
                <strong className="text-foreground">three-axis contextual mode</strong> (authenticity, claim match, source
                check), <strong className="text-foreground">audio-aware video</strong> with visual fallback,{' '}
                <strong className="text-foreground">explainable outputs</strong> (models run/skipped, evidence, signals),
                and a <strong className="text-foreground">browser extension</strong> for inline analysis in the feed. Auth,
                queues, and idempotent writes aim for a production-shaped demo.
              </p>
              <p className="text-foreground/80">
                See <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-sm">docs/GOLEM_GUARD.md</code> for
                the full judge narrative.
              </p>
            </DocsSection>

            <DocsSection id="features" title="Product features (summary)">
              <ul className="space-y-3 text-foreground/80">
                <li>
                  <strong className="text-foreground">Authentication:</strong> Register / login via Supabase Auth; JWT
                  protected routes with <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[13px]">requireAuth</code>.
                </li>
                <li>
                  <strong className="text-foreground">Upload & jobs:</strong> Multipart upload to Supabase Storage,
                  BullMQ jobs on Redis, poll status, fetch results and paginated history. Workers handle failures with a
                  clear unrecoverable path where appropriate.
                </li>
                <li>
                  <strong className="text-foreground">Multimodal pipelines:</strong> Images, video, audio, and documents
                  produce verdicts (<code className="rounded bg-secondary px-1 py-0.5 font-mono text-[13px]">AI_GENERATED</code>,{' '}
                  <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[13px]">HUMAN</code>,{' '}
                  <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[13px]">UNCERTAIN</code>) with confidence,
                  explanations, per-model evidence, and fusion logic (see Models & pipelines).
                </li>
                <li>
                  <strong className="text-foreground">Contextual (three-axis) API:</strong> Synchronous multimodal +
                  claim + source verification for chat-style flows and extension URL analysis.
                </li>
                <li>
                  <strong className="text-foreground">Browser extension:</strong> Manifest v3, popup UI, tailored X/Twitter
                  scraping plus generic page heuristics, same auth as the web app.
                </li>
                <li>
                  <strong className="text-foreground">Web app:</strong> Landing, dashboard hub, upload, rich result pages,
                  <code className="rounded bg-secondary px-1 py-0.5 font-mono text-[13px]">/chat</code>, history, this docs
                  route, themed UI.
                </li>
                <li>
                  <strong className="text-foreground">Operations:</strong> Rate limiting, health endpoint, structured
                  errors, graceful worker shutdown.
                </li>
              </ul>
              <p className="mt-4 text-sm text-muted-foreground">
                Full endpoint list and pipeline detail: <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">docs/FEATURES.md</code>.
              </p>
            </DocsSection>

            <DocsSection id="architecture" title="Architecture">
              <CodeBlock code={ARCH_DIAGRAM} />
              <p className="mt-4 text-foreground/80">
                The Express backend enqueues work to Redis; workers orchestrate third-party detectors and LLMs per
                modality. The optional <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-sm">services/ml</code>{' '}
                FastAPI app may be used for additional experiments — see repo README for the classic ML-service diagram.
              </p>
            </DocsSection>

            <DocsSection id="tech-stack" title="Tech stack">
              <ul className="grid gap-3 sm:grid-cols-2">
                <li className="rounded-xl border border-border bg-secondary/50 px-4 py-3">
                  <strong className="text-foreground">Frontend:</strong> Next.js 16, Tailwind CSS v4, React Query, themed UI
                </li>
                <li className="rounded-xl border border-border bg-secondary/50 px-4 py-3">
                  <strong className="text-foreground">Backend:</strong> Express 5, BullMQ, Redis, Supabase JS
                </li>
                <li className="rounded-xl border border-border bg-secondary/50 px-4 py-3">
                  <strong className="text-foreground">Database:</strong> Supabase (PostgreSQL + Storage + Auth)
                </li>
                <li className="rounded-xl border border-border bg-secondary/50 px-4 py-3">
                  <strong className="text-foreground">Detection & LLMs:</strong> SightEngine, xAI Grok, Anthropic Claude,
                  Resemble, Sapling (as wired in workers)
                </li>
                <li className="rounded-xl border border-border bg-secondary/50 px-4 py-3">
                  <strong className="text-foreground">Extension:</strong> Vite, React, Chrome MV3
                </li>
                <li className="rounded-xl border border-border bg-secondary/50 px-4 py-3">
                  <strong className="text-foreground">Deployment:</strong> Vercel (frontend), Railway or similar (backend),
                  managed Redis, Supabase cloud
                </li>
              </ul>
            </DocsSection>

            <DocsSection id="installation" title="Installation">
              <h3 className="text-lg font-semibold text-foreground">Prerequisites</h3>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-foreground/80">
                <li>Node.js 20+ and pnpm (see root <code className="rounded bg-secondary px-1 py-0.5 font-mono text-sm">packageManager</code>)</li>
                <li>Python 3.10+ (for optional ML service)</li>
                <li>Redis</li>
                <li>Supabase project</li>
              </ul>

              <h3 className="mt-10 text-lg font-semibold text-foreground">Backend setup</h3>
              <CodeBlock code={BACKEND_SETUP} className="mt-4" />

              <h3 className="mt-10 text-lg font-semibold text-foreground">Frontend setup</h3>
              <CodeBlock code={FRONTEND_SETUP} className="mt-4" />

              <h3 className="mt-10 text-lg font-semibold text-foreground">ML service setup (optional)</h3>
              <CodeBlock code={ML_SETUP} className="mt-4" />

              <h3 className="mt-10 text-lg font-semibold text-foreground">API keys (backend)</h3>
              <p className="mt-3 text-foreground/80">
                Variable names match <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-sm">apps/backend/.env.example</code>.
                Full tables and deploy notes: <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-sm">docs/FEATURES.md</code> and{' '}
                <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-sm">docs/DEPLOYMENT.md</code>.
              </p>
              <CodeBlock code={BACKEND_API_KEYS} className="mt-4" />
            </DocsSection>

            <DocsSection id="testing" title="Testing">
              <p className="text-foreground/80">
                For ML <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-sm">uvicorn</code>, curl uploads,
                and full-stack smoke tests, follow <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-sm">docs/TESTING.md</code>.
              </p>
              <h3 className="mt-6 text-lg font-semibold text-foreground">Backend tests</h3>
              <CodeBlock code={TEST_BACKEND} className="mt-4" />
              <h3 className="mt-10 text-lg font-semibold text-foreground">ML service tests</h3>
              <CodeBlock code={TEST_ML} className="mt-4" />
            </DocsSection>

            <DocsSection id="api-reference" title="API quick reference">
              <p className="text-foreground/80">
                Authenticated routes expect a valid JWT unless noted in code. Excerpt from{' '}
                <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-sm">docs/FEATURES.md</code>:
              </p>
              <ApiTable />
            </DocsSection>

            <DocsSection id="models" title="Models & pipelines">
              <p className="text-foreground/80">
                Pipelines are described in detail in <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-sm">docs/FEATURES.md</code>{' '}
                §3. At a glance:
              </p>
              <h3 className="mt-6 text-lg font-semibold text-foreground" id="models-image">
                Images
              </h3>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-foreground/80">
                <li>SightEngine — primary generative-AI / deepfake-style signal</li>
                <li>Grok (xAI) — vision + reasoning, optional web-grounded verification</li>
                <li>Claude Haiku — independent visual estimate and synthesis</li>
                <li>Documented fusion and blended confidence</li>
              </ul>

              <h3 className="mt-10 text-lg font-semibold text-foreground" id="models-video">
                Video
              </h3>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-foreground/80">
                <li>Duration limits (ffmpeg/ffprobe on worker)</li>
                <li>Resemble AI on extracted audio — can short-circuit if synthetic speech is detected</li>
                <li>SightEngine video with fallback to key-frame image analysis</li>
                <li>Grok and Claude for synthesis and context</li>
              </ul>

              <h3 className="mt-10 text-lg font-semibold text-foreground" id="models-audio">
                Audio
              </h3>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-foreground/80">
                <li>Resemble AI deepfake detection with structured evidence</li>
              </ul>

              <h3 className="mt-10 text-lg font-semibold text-foreground" id="models-document">
                Documents
              </h3>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-foreground/80">
                <li>Text extraction from PDF/DOCX, Sapling AI scoring, optional high-risk sentence signals</li>
              </ul>
            </DocsSection>

            <DocsSection id="license" title="License">
              <p className="text-foreground/80">
                MIT License — see <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-sm">LICENSE</code> in
                the repository root.
              </p>
            </DocsSection>

            <DocsSection id="hackathon" title="Hackathon">
              <p className="text-foreground/80">
                VeritasAI / GolemGuard was built for the <strong className="text-foreground">Menacraft 2025</strong>{' '}
                hackathon — Content Authenticity track.
              </p>
            </DocsSection>

            <DocsSection id="acknowledgments" title="Acknowledgments">
              <ul className="list-disc space-y-1 pl-5 text-foreground/80">
                <li>Detection and LLM API providers (SightEngine, xAI, Anthropic, Resemble, Sapling)</li>
                <li>Supabase for database, storage, and auth</li>
                <li>Open-source tooling across the monorepo</li>
              </ul>
            </DocsSection>

            <DocsSection id="team" title="Team">
              <ul className="space-y-2 text-foreground/80">
                <li>Amen Allah Dhahri</li>
                <li>Mohamed Yaassine Ncib</li>
                <li>Rayen Oueslati</li>
                <li>Alaa Elmir</li>
                <li>Imen Nasr</li>
              </ul>
              <p className="mt-6 text-muted-foreground">Made with care for truth and transparency</p>
            </DocsSection>
          </article>
        </div>
      </div>
    </div>
  );
}
