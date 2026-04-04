'use client';

import { cn } from '@/lib/utils';
import { DOCS_NAV, type DocsNavId } from './content';

export function DocsSidebar({
  activeId,
  onNavigate,
}: {
  activeId: DocsNavId;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-1" aria-label="Documentation sections">
      {DOCS_NAV.map((item) => {
        const active = activeId === item.id;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={() => onNavigate?.()}
            className={cn(
              'block rounded-lg px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-cyan/15 font-medium text-cyan'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
            )}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}

export function DocsMobileNav({ activeId }: { activeId: DocsNavId }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
      {DOCS_NAV.map((item) => {
        const active = activeId === item.id;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              active
                ? 'border-cyan/40 bg-cyan/15 text-cyan'
                : 'border-border bg-obsidian-200/50 text-slate-400',
            )}
          >
            {item.label}
          </a>
        );
      })}
    </div>
  );
}
