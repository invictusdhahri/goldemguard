'use client';

import { useAnalysisJob } from '@/hooks/use-analysis-job';
import { useAuthToken } from '@/hooks/use-auth-token';
import { AnalysisApiError } from '@/lib/analysis-api';
import { isValidJobId } from '@/lib/job-id';
import { formatTimeAgo } from '@/lib/time-ago';
import type { FinalResponse } from '@veritas/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Share2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';
import { ModelBreakdown } from './ModelBreakdown';
import { ResultCard } from './ResultCard';
import { SignalsList } from './SignalsList';

function errorMessage(err: unknown): string {
  if (err instanceof AnalysisApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred.';
}

export function ResultPageClient({ jobId }: { jobId: string }) {
  const token = useAuthToken();
  const [copyOk, setCopyOk] = useState(false);

  const validId = isValidJobId(jobId);
  const { statusQuery, resultQuery, result, refetchAll, jobMeta } = useAnalysisJob(
    validId ? jobId : '',
    token,
  );

  const showLoading = useMemo(() => {
    if (!token || !validId) return false;
    if (statusQuery.isPending) return true;
    const st = statusQuery.data?.status;
    if (st === 'pending' || st === 'processing') return true;
    if (st === 'done' && resultQuery.isPending && !resultQuery.isError) return true;
    return false;
  }, [
    token,
    validId,
    statusQuery.isPending,
    statusQuery.data?.status,
    resultQuery.isPending,
    resultQuery.isError,
  ]);

  const blockingError = useMemo(() => {
    if (!validId) {
      return { title: 'Invalid link', message: 'This job ID is not valid.', retry: false as const };
    }
    if (!token) {
      return {
        title: 'Sign in required',
        message: 'You need an active session to view this analysis. Sign in and try again.',
        retry: false as const,
        secondary: { label: 'Go home', href: '/' } as const,
      };
    }
    if (statusQuery.isError) {
      const err = statusQuery.error;
      if (err instanceof AnalysisApiError && err.status === 401) {
        return {
          title: 'Unauthorized',
          message: 'Your session is missing or expired. Sign in again.',
          retry: true as const,
        };
      }
      return {
        title: 'Could not load job',
        message: errorMessage(err),
        retry: true as const,
      };
    }
    if (statusQuery.data?.status === 'failed') {
      return {
        title: 'Analysis failed',
        message:
          'The pipeline did not produce a result. You can retry the status check or upload again.',
        retry: true as const,
      };
    }
    if (statusQuery.data?.status === 'done' && resultQuery.isError) {
      return {
        title: 'Could not load verdict',
        message: errorMessage(resultQuery.error),
        retry: true as const,
      };
    }
    return null;
  }, [
    validId,
    token,
    statusQuery.isError,
    statusQuery.error,
    statusQuery.data?.status,
    resultQuery.isError,
    resultQuery.error,
  ]);

  const loadingPhase: 'pending' | 'processing' | 'done' =
    statusQuery.data?.status === 'processing'
      ? 'processing'
      : statusQuery.data?.status === 'done'
        ? 'done'
        : 'pending';

  const completedAgo = formatTimeAgo(jobMeta?.completed_at ?? null);
  const createdAgo = formatTimeAgo(jobMeta?.created_at);

  const handleCopy = useCallback(async (data: FinalResponse) => {
    const text = JSON.stringify(
      {
        verdict: data.verdict,
        confidence: data.confidence,
        explanation: data.explanation,
        top_signals: data.top_signals,
        model_scores: data.model_scores,
        processing_ms: data.processing_ms,
        caveat: data.caveat,
      },
      null,
      2,
    );
    try {
      await navigator.clipboard.writeText(text);
      setCopyOk(true);
      window.setTimeout(() => setCopyOk(false), 2000);
    } catch {
      /* clipboard denied */
    }
  }, []);

  const handleShare = useCallback(async (data: FinalResponse) => {
    const summary = `${data.verdict} (${Math.round(data.confidence * 100)}% confidence) — VeritasAI`;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'VeritasAI result', text: summary, url });
      } else {
        await navigator.clipboard.writeText(`${summary}\n${url}`);
        setCopyOk(true);
        window.setTimeout(() => setCopyOk(false), 2000);
      }
    } catch {
      /* user cancelled or unsupported */
    }
  }, []);

  return (
    <main className="bg-grid-sm min-h-screen">
      <div className="mx-auto max-w-4xl pb-20 pt-10 md:pt-14">
        <header className="mb-8 px-4 text-center md:mb-10">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-500">Analysis</p>
          <h1 className="font-[family-name:var(--font-display)] mt-1 text-3xl font-bold tracking-tight text-white md:text-4xl">
            <span className="gradient-text-cyan">Result</span>
          </h1>
        </header>

        <AnimatePresence mode="wait">
          {blockingError ? (
            <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ErrorState
                title={blockingError.title}
                message={blockingError.message}
                onRetry={blockingError.retry ? refetchAll : undefined}
                secondaryAction={
                  'secondary' in blockingError && blockingError.secondary
                    ? blockingError.secondary
                    : undefined
                }
              />
            </motion.div>
          ) : showLoading ? (
            <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LoadingState
                status={loadingPhase === 'done' ? 'done' : loadingPhase}
                jobLabel={jobId.slice(0, 8)}
              />
            </motion.div>
          ) : result ? (
            <motion.div
              key="ok"
              className="space-y-8 px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button type="button" className="btn-ghost text-sm" onClick={() => void handleCopy(result)}>
                  {copyOk ? (
                    <Check className="h-4 w-4 text-emerald-400" aria-hidden />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden />
                  )}
                  {copyOk ? 'Copied' : 'Copy JSON'}
                </button>
                <button type="button" className="btn-ghost text-sm" onClick={() => void handleShare(result)}>
                  <Share2 className="h-4 w-4" aria-hidden />
                  Share
                </button>
              </div>

              <ResultCard
                result={result}
                completedAgo={completedAgo}
                createdAgo={createdAgo}
              />

              <motion.section
                className="glass-card rounded-2xl p-6 md:p-8"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.35 }}
              >
                <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-white">
                  Detection signals
                </h2>
                <div className="mt-5">
                  <SignalsList signals={result.top_signals} />
                </div>
              </motion.section>

              <motion.section
                className="glass-card rounded-2xl p-6 md:p-8"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.35 }}
              >
                <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-white">
                  Model breakdown
                </h2>
                <div className="mt-5">
                  <ModelBreakdown
                    modelScores={result.model_scores}
                    processingMs={result.processing_ms}
                  />
                </div>
              </motion.section>
            </motion.div>
          ) : (
            <motion.div key="fallback" className="px-4">
              <ErrorState message="Unable to display this result." onRetry={refetchAll} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
