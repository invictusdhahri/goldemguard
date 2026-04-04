'use client';

import { motion } from 'framer-motion';
import { memo, useMemo } from 'react';

export interface ModelBreakdownProps {
  modelScores: Record<string, number | null>;
  processingMs: number;
}

export const ModelBreakdown = memo(function ModelBreakdown({
  modelScores,
  processingMs,
}: ModelBreakdownProps) {
  const entries = useMemo(
    () =>
      Object.entries(modelScores).sort(([a], [b]) => a.localeCompare(b)),
    [modelScores],
  );

  if (entries.length === 0) {
    return (
      <p className="text-sm text-slate-500">No per-model scores available.</p>
    );
  }

  return (
    <div className="space-y-5">
      {entries.map(([model, score], i) => {
        const pct = score === null ? null : Math.round(score * 100);
        const widthPct = pct === null ? 0 : pct;

        return (
          <div key={model}>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
              <span className="font-medium capitalize text-slate-200">{model.replace(/_/g, ' ')}</span>
              <span className="font-mono text-slate-400">
                {pct === null ? '—' : `${pct}%`}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-obsidian-300/80">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-purple/90 to-cyan/90"
                initial={{ width: 0 }}
                animate={{ width: `${widthPct}%` }}
                transition={{ duration: 0.85, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        );
      })}
      <p className="border-t border-border pt-4 text-xs text-slate-500">
        Pipeline finished in{' '}
        <span className="font-mono text-slate-400">{processingMs.toLocaleString()} ms</span>
      </p>
    </div>
  );
});
