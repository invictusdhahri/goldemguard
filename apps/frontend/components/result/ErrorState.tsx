'use client';

import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { memo } from 'react';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  secondaryAction?: { label: string; href: string };
}

export const ErrorState = memo(function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  secondaryAction,
}: ErrorStateProps) {
  return (
    <motion.div
      className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
        <AlertCircle className="h-10 w-10 text-red-400" aria-hidden />
      </div>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white">
        {title}
      </h1>
      <p className="mt-3 text-balance text-slate-400">{message}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {onRetry ? (
          <button type="button" className="btn-primary" onClick={onRetry}>
            Try again
          </button>
        ) : null}
        {secondaryAction ? (
          <a href={secondaryAction.href} className="btn-ghost">
            {secondaryAction.label}
          </a>
        ) : null}
      </div>
    </motion.div>
  );
});
