'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CodeBlock } from './CodeBlock';
import { DOCS_NAV, type DocsNavId } from './content';
import { DocsMobileNav, DocsSidebar } from './DocsSidebar';
import { DocsSection } from './DocsSection';

const BACKEND_SETUP = `cd apps/backend
npm install
cp .env.example .env
# Fill in Supabase and Redis credentials
npm run dev`;

const FRONTEND_SETUP = `cd apps/frontend
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL
npm run dev`;

const ML_SETUP = `cd services/ml
pip install -r requirements.txt
cp .env.example .env
# Set ANTHROPIC_API_KEY
uvicorn app.main:app --reload`;

const TEST_BACKEND = `cd apps/backend
npm test`;

const TEST_ML = `cd services/ml
pytest`;

const ARCH_DIAGRAM = `Frontend (Next.js) → Backend (Express) → ML Service (FastAPI)
        ↓
Supabase (DB + Storage)
        ↓
BullMQ (Job Queue)`;

export function DocsPage() {
  const [activeId, setActiveId] = useState<DocsNavId>('features');

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
    <div className="bg-grid-sm min-h-screen bg-obsidian text-slate-200">
      <header className="relative overflow-hidden border-b border-border">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan/12 via-transparent to-purple/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-cyan/20 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 py-12 md:py-16">
          <Link
            href="/"
            className="mb-6 inline-flex text-sm font-medium text-slate-400 transition-colors hover:text-cyan"
          >
            ← Back to home
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan">Documentation</p>
          <h1 className="font-[family-name:var(--font-display)] mt-3 text-4xl font-bold tracking-tight text-white md:text-5xl">
            VeritasAI — Multimodal Deepfake Detection
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-400">
            <strong className="font-semibold text-white">Tagline:</strong> Detect. Explain. Trust.
          </p>
          <p className="mt-4 max-w-3xl text-pretty leading-relaxed text-slate-300">
            Multimodal AI-generated content detection platform built for Menacraft 2025 hackathon. Upload images,
            videos, audio, or documents to get instant deepfake analysis with plain-English explanations.
          </p>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-24 pt-8 md:flex-row md:gap-12">
        <aside className="hidden shrink-0 md:block md:w-56 lg:w-64">
          <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">On this page</p>
            <DocsSidebar activeId={activeId} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="md:hidden">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Jump to</p>
            <DocsMobileNav activeId={activeId} />
          </div>

          <article className="mt-6 md:mt-0">
            <DocsSection id="features" title="🚀 Features">
              <ul className="space-y-3 text-slate-300">
                <li>
                  <strong className="text-white">Multi-Modal Detection:</strong> Images, videos, audio, and documents
                </li>
                <li>
                  <strong className="text-white">Automatic Fallbacks:</strong> If one model fails, backups kick in
                  automatically
                </li>
                <li>
                  <strong className="text-white">Plain-English Explanations:</strong> Powered by Claude Haiku 4.5
                </li>
                <li>
                  <strong className="text-white">100% Open Source:</strong> Built with cutting-edge AI models
                </li>
                <li>
                  <strong className="text-white">Zero-Budget:</strong> Runs entirely on free tiers
                </li>
              </ul>
            </DocsSection>

            <DocsSection id="architecture" title="🏗️ Architecture">
              <CodeBlock code={ARCH_DIAGRAM} />
            </DocsSection>

            <DocsSection id="tech-stack" title="🛠️ Tech Stack">
              <ul className="grid gap-3 sm:grid-cols-2">
                <li className="rounded-xl border border-border bg-obsidian-200/40 px-4 py-3">
                  <strong className="text-white">Frontend:</strong> Next.js 14, Tailwind CSS, shadcn/ui
                </li>
                <li className="rounded-xl border border-border bg-obsidian-200/40 px-4 py-3">
                  <strong className="text-white">Backend:</strong> Express.js, BullMQ, Redis
                </li>
                <li className="rounded-xl border border-border bg-obsidian-200/40 px-4 py-3">
                  <strong className="text-white">ML Service:</strong> FastAPI, PyTorch, HuggingFace Transformers
                </li>
                <li className="rounded-xl border border-border bg-obsidian-200/40 px-4 py-3">
                  <strong className="text-white">Database:</strong> Supabase (PostgreSQL + Storage)
                </li>
                <li className="rounded-xl border border-border bg-obsidian-200/40 px-4 py-3">
                  <strong className="text-white">AI:</strong> Claude Haiku 4.5 (verdict generation)
                </li>
                <li className="rounded-xl border border-border bg-obsidian-200/40 px-4 py-3">
                  <strong className="text-white">Deployment:</strong> Vercel (frontend), HuggingFace Spaces (ML),
                  Railway (backend)
                </li>
              </ul>
            </DocsSection>

            <DocsSection id="installation" title="📦 Installation">
              <h3 className="text-lg font-semibold text-white">Prerequisites</h3>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-300">
                <li>Node.js 18+</li>
                <li>Python 3.10+</li>
                <li>Redis</li>
                <li>Supabase account</li>
              </ul>

              <h3 className="mt-10 text-lg font-semibold text-white">Backend Setup</h3>
              <CodeBlock code={BACKEND_SETUP} className="mt-4" />

              <h3 className="mt-10 text-lg font-semibold text-white">Frontend Setup</h3>
              <CodeBlock code={FRONTEND_SETUP} className="mt-4" />

              <h3 className="mt-10 text-lg font-semibold text-white">ML Service Setup</h3>
              <CodeBlock code={ML_SETUP} className="mt-4" />
            </DocsSection>

            <DocsSection id="testing" title="🧪 Testing">
              <h3 className="text-lg font-semibold text-white">Backend tests</h3>
              <CodeBlock code={TEST_BACKEND} className="mt-4" />
              <h3 className="mt-10 text-lg font-semibold text-white">ML service tests</h3>
              <CodeBlock code={TEST_ML} className="mt-4" />
            </DocsSection>

            <DocsSection id="models" title="📊 Models Used">
              <h3 className="text-lg font-semibold text-white" id="models-image">
                Image Detection
              </h3>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-300">
                <li>SigLIP v1 (94.4% accuracy) - Primary</li>
                <li>UniversalFakeDetect (91% AUC) - Fallback 1</li>
                <li>ViT Deepfake Detector (98.7% test) - Fallback 2</li>
                <li>EXIF Forensics - Always runs</li>
              </ul>

              <h3 className="mt-10 text-lg font-semibold text-white" id="models-video">
                Video Detection
              </h3>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-300">
                <li>GenConViT (93% AUC) - Spatial analysis</li>
                <li>MediaPipe - Behavioral signals</li>
                <li>SyncNet - Lip-sync detection</li>
                <li>AASIST3 - Audio deepfake detection</li>
              </ul>

              <h3 className="mt-10 text-lg font-semibold text-white" id="models-audio">
                Audio Detection
              </h3>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-300">
                <li>AASIST3 (96% F1) - Primary</li>
                <li>Wav2Vec2 - Fallback</li>
                <li>Resemblyzer - Speaker consistency</li>
              </ul>

              <h3 className="mt-10 text-lg font-semibold text-white" id="models-document">
                Document Detection
              </h3>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-300">
                <li>GPTZero API (99% RAID) - Primary</li>
                <li>PyMuPDF - Metadata forensics</li>
              </ul>
            </DocsSection>

            <DocsSection id="license" title="📄 License">
              <p className="text-slate-300">
                MIT License - see{' '}
                <code className="rounded bg-obsidian-300 px-1.5 py-0.5 font-mono text-sm">LICENSE</code> file
              </p>
            </DocsSection>

            <DocsSection id="hackathon" title="🏆 Hackathon">
              <p className="text-slate-300">Built for Menacraft 2025 - Content Authenticity Track</p>
            </DocsSection>

            <DocsSection id="acknowledgments" title="🙏 Acknowledgments">
              <ul className="list-disc space-y-1 pl-5 text-slate-300">
                <li>HuggingFace for model hosting</li>
                <li>Anthropic for Claude API credits</li>
                <li>Supabase for database and storage</li>
                <li>All open-source model creators</li>
              </ul>
            </DocsSection>

            <DocsSection id="team" title="👥 Team">
              <ul className="space-y-2 text-slate-300">
                <li>Amen Allah Dhahri</li>
                <li>Mohamed Yaassine Ncib</li>
                <li>Rayen Oueslati</li>
                <li>Alaa Elmir</li>
                <li>Imen Nasr</li>
              </ul>
              <p className="mt-6 text-slate-400">Made with ❤️ for truth and transparency</p>
            </DocsSection>
          </article>
        </div>
      </div>
    </div>
  );
}
