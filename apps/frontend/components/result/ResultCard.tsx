'use client';

import type { FinalResponse, Verdict } from '@veritas/shared';
import { motion } from 'framer-motion';
import { memo, useMemo } from 'react';

export interface ResultCardProps {
  result: FinalResponse;
  completedAgo: string | null;
  createdAgo: string | null;
}

const verdictStyles: Record<
  Verdict,
  { ring: string; glow: string; label: string; emoji: string }
> = {
  FAKE: {
    ring: 'border-red-500/35',
    glow: 'shadow-[0_0_60px_-12px_rgba(244,63,94,0.45)]',
    label: 'text-red-400',
    emoji: '✕',
  },
  REAL: {
    ring: 'border-emerald-500/35',
    glow: 'shadow-[0_0_60px_-12px_rgba(16,185,129,0.4)]',
    label: 'text-emerald-400',
    emoji: '✓',
  },
  UNCERTAIN: {
    ring: 'border-amber-500/35',
    glow: 'shadow-[0_0_60px_-12px_rgba(245,158,11,0.35)]',
    label: 'text-amber-400',
    emoji: '?',
  },
};

export const ResultCard = memo(function ResultCard({
  result,
  completedAgo,
  createdAgo,
}: ResultCardProps) {
  const style = verdictStyles[result.verdict];
  const pct = Math.round(result.confidence * 100);

  const metaLine = useMemo(() => {
    const parts: string[] = [];
    if (completedAgo) parts.push(`Completed ${completedAgo}`);
    else if (createdAgo) parts.push(`Started ${createdAgo}`);
    return parts.join(' · ');
  }, [completedAgo, createdAgo]);

  return (
    <motion.article
      className={`glass-card relative overflow-hidden rounded-3xl border-2 p-8 md:p-10 ${style.ring} ${style.glow}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-cyan/10 to-purple/10 blur-3xl"
        aria-hidden
      />

      <div className="relative text-center">
        <motion.div
          className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-obsidian-200/80 text-3xl"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 24 }}
          aria-hidden
        >
          {style.emoji}
        </motion.div>

        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Verdict</p>
        <h1
          className={`font-[family-name:var(--font-display)] mt-2 text-4xl font-bold tracking-tight md:text-5xl ${style.label}`}
        >
          {result.verdict}
        </h1>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-center gap-2 text-sm text-slate-400">
            <span>Confidence</span>
            <span className="font-mono text-lg font-semibold text-white">{pct}%</span>
          </div>
          <div className="mx-auto h-3 max-w-md overflow-hidden rounded-full bg-obsidian-300/90">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan via-sky-400 to-purple"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>

        {metaLine ? (
          <p className="mt-4 text-xs text-slate-500">{metaLine}</p>
        ) : null}

        <motion.p
          className="mx-auto mt-8 max-w-2xl text-pretty text-lg leading-relaxed text-slate-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          {result.explanation}
        </motion.p>

        {result.caveat ? (
          <p className="mx-auto mt-6 max-w-2xl rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200/90">
            <span className="font-semibold text-amber-400">Caveat: </span>
            {result.caveat}
          </p>
        ) : null}
      </div>
    </motion.article>
  );
});
