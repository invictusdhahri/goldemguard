'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function DocSteps({
  steps,
  className,
}: {
  steps: { title: string; content: ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn('relative mt-10 space-y-12 pl-10', className)}>
      {/* Connector Line */}
      <div className="absolute left-[15px] top-2 h-[calc(100%-16px)] w-px bg-gradient-to-b from-cyan/30 via-purple/30 to-transparent" />

      {steps.map((step, idx) => (
        <div key={idx} className="relative">
          {/* Step Number Dot */}
          <div className="absolute -left-[45px] top-0 flex h-8 w-8 items-center justify-center rounded-full border border-cyan/30 bg-obsidian-200 text-xs font-bold text-cyan shadow-[0_0_12px_rgba(0,212,255,0.15)] glow-cyan">
            {idx + 1}
          </div>
          <h3 className="font-[family-name:var(--font-display)] mb-4 text-xl font-semibold text-white">
            {step.title}
          </h3>
          <div className="space-y-4 text-[15px] leading-relaxed text-slate-300">
            {step.content}
          </div>
        </div>
      ))}
    </div>
  );
}
