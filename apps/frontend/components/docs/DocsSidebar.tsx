'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Activity,
  AppWindow,
  BookMarked,
  CheckCircle2,
  Code2,
  Cpu,
  Layers,
  Layout,
  Terminal,
  Trophy,
  Users,
} from 'lucide-react';
import { DOCS_NAV, type DocsNavId } from './content';

const SECTION_ICONS: Record<DocsNavId, any> = {
  features: Activity,
  architecture: Layers,
  'tech-stack': Cpu,
  installation: Terminal,
  testing: CheckCircle2,
  models: Code2,
  license: BookMarked,
  hackathon: Trophy,
  acknowledgments: Users,
  team: Users,
};

export function DocsSidebar({
  activeId,
  onNavigate,
}: {
  activeId: DocsNavId;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-1.5" aria-label="Documentation sections">
      {DOCS_NAV.map((item) => {
        const active = activeId === item.id;
        const Icon = SECTION_ICONS[item.id] || Layout;

        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={() => onNavigate?.()}
            className={cn(
              'group relative flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm transition-all duration-300',
              active
                ? 'text-cyan shadow-[0_0_15px_rgba(0,212,255,0.08)]'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
            )}
          >
            {active && (
              <motion.div
                layoutId="active-nav-bg"
                className="absolute inset-0 rounded-lg border border-cyan/20 bg-cyan/10"
                transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
              />
            )}
            <Icon
              className={cn(
                'relative h-4.5 w-4.5 transition-colors duration-300',
                active ? 'text-cyan' : 'text-slate-500 group-hover:text-slate-300',
              )}
            />
            <span className="relative font-medium">{item.label}</span>
            {active && (
              <motion.span
                layoutId="active-indicator"
                className="absolute -left-1 top-1/4 h-1/2 w-1 rounded-r-full bg-cyan"
                transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              />
            )}
          </a>
        );
      })}
    </nav>
  );
}

export function DocsMobileNav({ activeId }: { activeId: DocsNavId }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-4 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
      {DOCS_NAV.map((item) => {
        const active = activeId === item.id;
        const Icon = SECTION_ICONS[item.id] || Layout;

        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-300',
              active
                ? 'border-cyan/40 bg-cyan/15 text-cyan shadow-[0_0_15px_rgba(0,212,255,0.1)]'
                : 'border-border bg-obsidian-200/50 text-slate-400 hover:border-slate-700',
            )}
          >
            <Icon className={cn('h-3.5 w-3.5', active ? 'text-cyan' : 'text-slate-500')} />
            {item.label}
          </a>
        );
      })}
    </div>
  );
}
