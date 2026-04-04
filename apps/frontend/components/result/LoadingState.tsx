'use client';

import { motion } from 'framer-motion';
import { memo } from 'react';

export interface LoadingStateProps {
  status: 'pending' | 'processing' | 'done';
  jobLabel?: string;
}

const LABELS: Record<LoadingStateProps['status'], string> = {
  pending: 'Queued — waiting to start…',
  processing: 'Running multimodal detection…',
  done: 'Loading verdict…',
};

export const LoadingState = memo(function LoadingState({ status, jobLabel }: LoadingStateProps) {
  const label = LABELS[status];

  return (
    <motion.div
      className="mx-auto max-w-2xl px-4 py-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="glass-card scan-container relative overflow-hidden rounded-2xl p-10">
        <div className="scan-line" aria-hidden />
        <div className="relative z-[1] text-center">
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10"
            aria-hidden
          >
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan border-r-transparent" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white">
            Analyzing
          </h1>
          <p className="mt-2 text-slate-400">{label}</p>
          {jobLabel ? (
            <p className="mt-1 font-mono text-xs text-slate-500">
              Job <span className="text-cyan-dim/90">{jobLabel}</span>
            </p>
          ) : null}
        </div>

        <div className="relative z-[1] mt-10 space-y-3">
          <div className="h-3 overflow-hidden rounded-full bg-obsidian-300/80">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan to-purple"
              initial={{ width: '12%' }}
              animate={{ width: status === 'pending' ? '28%' : status === 'processing' ? '72%' : '92%' }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-obsidian-300/50"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
});
