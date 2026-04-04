'use client';

import { motion } from 'framer-motion';
import { memo } from 'react';

export interface SignalsListProps {
  signals: string[];
}

export const SignalsList = memo(function SignalsList({ signals }: SignalsListProps) {
  if (signals.length === 0) {
    return (
      <p className="text-sm text-slate-500">No individual signals were recorded for this run.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {signals.map((signal, i) => (
        <motion.li
          key={`${i}-${signal.slice(0, 24)}`}
          className="flex gap-3 rounded-xl border border-border bg-obsidian-200/40 px-4 py-3"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
        >
          <span className="mt-0.5 font-mono text-xs text-cyan" aria-hidden>
            {(i + 1).toString().padStart(2, '0')}
          </span>
          <span className="text-sm leading-relaxed text-slate-200">{signal}</span>
        </motion.li>
      ))}
    </ul>
  );
});
