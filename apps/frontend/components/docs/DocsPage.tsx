'use client';

import { cn } from '@/lib/utils';
import { motion, useScroll, useSpring } from 'framer-motion';
import { ArrowLeft, Book, ChevronRight, Code, ExternalLink, Info, Layout, Rocket, Sparkles, Terminal } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CodeBlock } from './CodeBlock';
import { DocCallout } from './DocCallout';
import { DOCS_NAV, type DocsNavId } from './content';
import { DocsMobileNav, DocsSidebar } from './DocsSidebar';
import { DocsSection } from './DocsSection';
import { DocSteps } from './DocSteps';

const BACKEND_SETUP = `cd apps/backend
pnpm install
cp .env.example .env
# Fill in Supabase and Redis credentials
pnpm dev`;

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

const ARCH_DIAGRAM = `Frontend (Next.js) → Backend (Express) → ML Service (FastAPI)
        ↓
Supabase (DB + Storage)
        ↓
BullMQ (Job Queue)`;

export function DocsPage() {
  const [activeId, setActiveId] = useState<DocsNavId>('features');
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

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
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-cyan via-purple to-cyan"
        style={{ scaleX, transformOrigin: '0%' }}
      />

      <header className="relative overflow-hidden border-b border-white/5 py-20 lg:py-32">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute -left-1/4 -top-1/4 h-[100%] w-[100%] animate-spin-slow bg-[radial-gradient(circle_at_center,rgba(0,212,255,0.08)_0%,transparent_70%)]" />
          <div className="absolute -right-1/4 -bottom-1/4 h-[100%] w-[100%] animate-spin-slow bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.08)_0%,transparent_70%)]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link
              href="/"
              className="group mb-8 inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-1.5 text-sm font-medium text-slate-400 transition-all hover:border-cyan/30 hover:text-cyan"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to experience
            </Link>

            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex items-center gap-2 text-cyan">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-xs font-bold uppercase tracking-[0.3em]">Documentation portal</span>
                </div>
                <h1 className="font-[family-name:var(--font-display)] mt-6 text-5xl font-bold tracking-tight text-white md:text-7xl">
                  Master the <span className="gradient-text-cyan">Veritas</span> Pipeline
                </h1>
                <p className="mt-8 text-xl leading-relaxed text-slate-400">
                  A comprehensive guide to the multimodal AI detection ecosystem. 
                  Explore the architecture, models, and deep-tech behind VeritasAI.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <a href="https://github.com/invictusdhahri/clawy" target="_blank" className="btn-ghost group">
                  <Code className="h-5 w-5" />
                  Source Code
                  <ExternalLink className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
                <button className="btn-primary">
                  <Book className="h-5 w-5" />
                  Quick Start
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 pb-32 pt-16 lg:flex-row">
        {/* Navigation Sidebar */}
        <aside className="hidden shrink-0 lg:block lg:w-64">
          <div className="sticky top-32">
            <h3 className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Navigation</h3>
            <DocsSidebar activeId={activeId} />
            
            <div className="mt-12 rounded-2xl border border-border bg-obsidian-200/50 p-6">
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-2">Need help?</p>
              <p className="text-sm text-slate-400 mb-4">Join our developers on the truth-seeking mission.</p>
              <button className="text-cyan text-sm font-semibold flex items-center gap-2 hover:underline">
                Contact support <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="min-w-0 flex-1 lg:max-w-3xl">
          <div className="lg:hidden">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Jump to</h3>
            <DocsMobileNav activeId={activeId} />
          </div>

          <div className="space-y-4">
            <DocsSection id="features" title="🚀 System Features">
              <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                VeritasAI is engineered for maximum transparency in an era of digital deception. Our platform 
                leverages a multi-layered approach to content verification.
              </p>
              
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { title: "Multi-Modal", desc: "Native support for Images, Video, Audio, and Documents." },
                  { title: "Fallback Chain", desc: "Intelligent model sequencing ensures reliability even if primary models fail." },
                  { title: "AI Explainability", desc: "Plain-English verdict rationales powered by Claude 4.5." },
                  { title: "Enterprise Ready", desc: "Built with scalable BullMQ architecture and Supabase storage." }
                ].map((f, i) => (
                  <div key={i} className="glass-card p-6 rounded-2xl">
                    <h4 className="text-white font-bold mb-2">{f.title}</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>

              <DocCallout type="tip" className="mt-8">
                The entire platform is designed to run on free-tier infrastructure (Vercel, Railway, HF Spaces) 
                while maintaining industrial-grade detection accuracy.
              </DocCallout>
            </DocsSection>

            <DocsSection id="architecture" title="🏗️ Technical Architecture">
              <p className="mb-6">
                A distributed microservices architecture designed for high throughput and modular model updates. 
                The pipeline manages the flow from raw upload to authenticated verdict storage.
              </p>
              <CodeBlock code={ARCH_DIAGRAM} title="System Flow" />
            </DocsSection>

            <DocsSection id="tech-stack" title="🛠️ Technology Stack">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="glass-card p-6 rounded-2xl border-l-4 border-l-cyan">
                  <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                    <Layout className="h-4 w-4" /> Frontend
                  </h4>
                  <ul className="text-sm text-slate-400 space-y-2">
                    <li>• Next.js 16 (App Router)</li>
                    <li>• Tailwind CSS 4</li>
                    <li>• Framer Motion</li>
                    <li>• shadcn/ui</li>
                  </ul>
                </div>
                <div className="glass-card p-6 rounded-2xl border-l-4 border-l-purple">
                  <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                    <Terminal className="h-4 w-4" /> Backend
                  </h4>
                  <ul className="text-sm text-slate-400 space-y-2">
                    <li>• Express.js / TypeScript</li>
                    <li>• BullMQ (Redis)</li>
                    <li>• Supabase Auth & Storage</li>
                    <li>• Prisma ORM</li>
                  </ul>
                </div>
              </div>
            </DocsSection>

            <DocsSection id="installation" title="📦 Quick Installation">
              <DocSteps steps={[
                {
                  title: "Infrastructure Setup",
                  content: (
                    <>
                      <p>Ensure you have a running <strong>Redis</strong> instance and a <strong>Supabase</strong> project. 
                      VeritasAI uses Redis for the job queue and Supabase for authentication and large file storage.</p>
                      <DocCallout type="info">Download Docker Desktop to run Redis locally if needed.</DocCallout>
                    </>
                  )
                },
                {
                  title: "Backend Deployment",
                  content: (
                    <>
                      <p>Configure your environment variables for Supabase and Redis in the backend.</p>
                      <CodeBlock code={BACKEND_SETUP} title="bash" />
                    </>
                  )
                },
                {
                  title: "ML Service Initialisation",
                  content: (
                    <>
                      <p>The ML service requires Python 3.10+. It will download model weights on the first run (~4GB).</p>
                      <CodeBlock code={ML_SETUP} title="bash" />
                    </>
                  )
                },
                {
                  title: "Frontend Launch",
                  content: (
                    <>
                      <p>Connect the frontend to your backend API URL and start the development server.</p>
                      <CodeBlock code={FRONTEND_SETUP} title="bash" />
                    </>
                  )
                }
              ]} />
            </DocsSection>

            <DocsSection id="testing" title="🧪 Validation & Testing">
              <p className="mb-6">We maintain a rigorous testing suite covering both API endpoints and ML model fusions.</p>
              <div className="grid gap-6">
                <div>
                  <h4 className="text-white font-bold mb-3">Backend Suite</h4>
                  <CodeBlock code={TEST_BACKEND} title="npm" />
                </div>
                <div>
                  <h4 className="text-white font-bold mb-3">ML Inference Suite</h4>
                  <CodeBlock code={TEST_ML} title="pytest" />
                </div>
              </div>
            </DocsSection>

            <DocsSection id="models" title="📊 Detection Models">
              <div className="space-y-8">
                <div>
                  <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Rocket className="h-5 w-5 text-cyan" /> Image Detection
                  </h4>
                  <div className="grid gap-3 text-sm">
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-slate-300">SigLIP v1 (Primary)</span>
                      <span className="text-cyan font-mono">94.4% Accuracy</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-slate-300">UniversalFakeDetect</span>
                      <span className="text-cyan font-mono">91% AUC</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">ViT Deepfake</span>
                      <span className="text-cyan font-mono">98.7% Test</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/5 p-6 border border-white/5">
                  <h4 className="text-white font-bold mb-4">Document Detection (Beta)</h4>
                  <p className="text-sm text-slate-400 leading-relaxed mb-4">
                    Our document pipeline uses a unique heuristic analysis + metadata forensics approach to identify 
                    AI-generated text in PDF documents.
                  </p>
                  <ul className="text-xs text-slate-500 space-y-1">
                    <li>• Lexical diversity analysis</li>
                    <li>• Entropy-based repetition detection</li>
                    <li>• Creator metadata fingerprinting</li>
                  </ul>
                </div>
              </div>
            </DocsSection>

            <DocsSection id="team" title="👥 The Truth-Seekers">
              <p className="mb-8">VeritasAI was built by a dedicated team of engineers for the Menacraft 2025 Hackathon.</p>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {[
                  "Amen Allah Dhahri",
                  "Mohamed Yaassine Ncib",
                  "Rayen Oueslati",
                  "Alaa Elmir",
                  "Imen Nasr"
                ].map((name, i) => (
                  <div key={i} className="glass-card hover:bg-cyan/5 transition-colors p-4 rounded-xl text-center">
                    <p className="text-white text-sm font-semibold">{name}</p>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">Contributor</p>
                  </div>
                ))}
              </div>
            </DocsSection>
          </div>
        </div>

        {/* Right Sidebar - TOC (Optional/Implicit) */}
        <aside className="hidden shrink-0 xl:block xl:w-64">
           <div className="sticky top-32 p-6 rounded-2xl border border-white/5 bg-gradient-to-br from-white/5 to-transparent">
              <div className="flex items-center gap-2 text-white mb-4">
                <Sparkles className="h-4 w-4 text-cyan" />
                <span className="text-xs font-bold uppercase tracking-wider">Top Contributors</span>
              </div>
              <p className="text-[12px] text-slate-400 leading-relaxed italic">
                "The truth will set you free, but first it will make you miserable. VeritasAI makes the process 
                instantaneous."
              </p>
           </div>
        </aside>
      </div>

      <footer className="border-t border-white/5 py-12 mt-20">
        <div className="mx-auto max-w-7xl px-6 flex justify-between items-center text-slate-500 text-sm">
          <p>© 2025 VeritasAI Project</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
