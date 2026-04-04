'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowLeft,
  Sparkles,
  Eye,
  BrainCircuit,
  Zap,
} from 'lucide-react';
import { useJobStatus, useResult } from '@/hooks/useAnalysis';
import type { Verdict, ModelEvidence, FinalResponse } from '@veritas/shared';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import InteractiveBackground from '../../../components/InteractiveBackground';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Aligns with backend `SE_AI_SCORE_THRESHOLD`: strong SightEngine AI-likeness → AI headline. */
const SE_AI_DISPLAY_THRESHOLD = 0.5;

function sightEngineRawScore(result: FinalResponse): number | undefined {
  const s = result.model_scores?.sightengine_genai;
  if (typeof s === 'number' && !Number.isNaN(s)) return s;
  const ev = result.model_evidence?.sightengine?.ai_likeness;
  if (typeof ev === 'number' && !Number.isNaN(ev)) return ev;
  return undefined;
}

/** Prefer stored verdict unless SightEngine score forces AI (covers stale `UNCERTAIN` rows). */
function effectiveVerdict(result: FinalResponse): Verdict {
  const se = sightEngineRawScore(result);
  if (se !== undefined && se >= SE_AI_DISPLAY_THRESHOLD) return 'AI_GENERATED';
  return result.verdict;
}

function verdictPresentation(v: Verdict): {
  headline: string;
  subtitle: string;
  tone: 'ai' | 'human' | 'uncertain';
} {
  switch (v) {
    case 'AI_GENERATED':
      return {
        headline: 'Likely AI-generated',
        subtitle: 'The image shows strong signals of synthetic or AI-produced content.',
        tone: 'ai',
      };
    case 'HUMAN':
      return {
        headline: 'Likely authentic',
        subtitle: 'The image is more consistent with real / human-created content.',
        tone: 'human',
      };
    default:
      return {
        headline: 'Uncertain',
        subtitle: 'The models could not confidently classify this image.',
        tone: 'uncertain',
      };
  }
}

function scoreBadge(score: number): { label: string; color: string } {
  if (score >= 0.75) return { label: 'AI-generated', color: 'text-rose-400' };
  if (score <= 0.35) return { label: 'Authentic',    color: 'text-emerald-400' };
  return                    { label: 'Uncertain',    color: 'text-amber-400' };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const jobId  = typeof params.id === 'string' ? params.id : null;
  const { user, loading: authLoading } = useAuth();

  const { data: job, error: statusError, isLoading: statusLoading } = useJobStatus(jobId);
  const resultEnabled = job?.status === 'done';
  const {
    data:    result,
    error:   resultError,
    isLoading: resultLoading,
  } = useResult(resultEnabled ? jobId : null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-grid flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!jobId) {
    return (
      <div className="min-h-screen bg-grid flex items-center justify-center text-slate-400">
        Invalid job link
      </div>
    );
  }

  const failed    = job?.status === 'failed';
  const processing = !job || job.status === 'pending' || job.status === 'processing';

  return (
    <div className="min-h-screen bg-grid relative overflow-hidden">
      <InteractiveBackground />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12 relative z-10">
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          New analysis
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text-cyan font-[family-name:var(--font-display)]">
            Analysis result
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-mono truncate px-2">Job {jobId}</p>
        </div>

        {/* ── Loading / queued ── */}
        {(statusLoading || processing) && (
          <div className="glass-card rounded-2xl p-12 flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
            <p className="text-lg text-slate-300">
              {job?.status === 'processing' ? 'Analyzing your file…' : 'Waiting in queue…'}
            </p>
            <p className="text-sm text-slate-500">This usually takes a few seconds</p>
          </div>
        )}

        {/* ── Status error ── */}
        {statusError && (
          <div className="glass-card rounded-2xl p-6 border border-red-500/30 bg-red-500/5">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <p>{statusError instanceof Error ? statusError.message : 'Could not load job'}</p>
            </div>
          </div>
        )}

        {/* ── Failed ── */}
        {failed && (
          <div className="glass-card rounded-2xl p-8 border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center gap-3 text-amber-400 mb-2">
              <XCircle className="w-8 h-8 shrink-0" />
              <h2 className="text-xl font-semibold">Analysis failed</h2>
            </div>
            <p className="text-slate-400">
              Something went wrong while processing this job. Try uploading again.
            </p>
          </div>
        )}

        {/* ── Result loading ── */}
        {resultEnabled && resultLoading && (
          <div className="glass-card rounded-2xl p-12 flex justify-center">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          </div>
        )}

        {/* ── Result error ── */}
        {resultEnabled && resultError && (
          <div className="glass-card rounded-2xl p-6 border border-red-500/30">
            <p className="text-red-400">
              {resultError instanceof Error ? resultError.message : 'Could not load result'}
            </p>
          </div>
        )}

        {/* ── Full result ── */}
        {resultEnabled && result && (() => {
          const { headline, subtitle, tone } = verdictPresentation(effectiveVerdict(result));
          const Icon      = tone === 'ai' ? Sparkles : tone === 'human' ? CheckCircle2 : HelpCircle;
          const ring      = tone === 'ai'
            ? 'from-rose-500/30 to-fuchsia-500/20 border-rose-500/40'
            : tone === 'human'
              ? 'from-emerald-500/30 to-cyan-500/20 border-emerald-500/40'
              : 'from-amber-500/30 to-orange-500/20 border-amber-500/40';
          const iconColor = tone === 'ai' ? 'text-rose-400' : tone === 'human' ? 'text-emerald-400' : 'text-amber-400';

          const seScore     = result.model_scores?.sightengine_genai as number | undefined;
          const grokScore   = result.model_scores?.grok_grok4fast   as number | undefined;
          const claudeScore = result.model_scores?.claude_haiku     as number | undefined;
          const hasGrok     = result.models_run?.includes('grok_grok4fast');
          const hasClaude   = result.models_run?.includes('claude_haiku');
          const ev          = result.model_evidence as ModelEvidence | undefined;

          return (
            <div className="space-y-5">
              {/* ── Verdict card ── */}
              <div className="glass-card rounded-2xl p-8">
                <div className={`rounded-2xl border bg-gradient-to-br p-8 text-center ${ring}`}>
                  <div className="flex justify-center mb-4">
                    <Icon className={`w-16 h-16 ${iconColor}`} strokeWidth={1.25} />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">{headline}</h2>
                  <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">{subtitle}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 mt-5">
                  <div className="rounded-xl bg-slate-800/40 border border-slate-700/80 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">AI-likeness score</p>
                    <p className="text-2xl font-semibold text-cyan-400 tabular-nums">
                      {(result.confidence * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Blend of detector rates (0 = authentic · 100 = AI) when multiple models run
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-800/40 border border-slate-700/80 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Processing time</p>
                    <p className="text-2xl font-semibold text-white tabular-nums">
                      {result.processing_ms != null ? `${result.processing_ms} ms` : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Model breakdown ── */}
              <div className="glass-card rounded-2xl p-6 space-y-4">
                <h3 className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                  Model breakdown
                </h3>

                {/* SightEngine */}
                <div className="flex items-start gap-4 rounded-xl bg-slate-800/40 border border-slate-700/60 p-4">
                  <Eye className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-200">SightEngine genai</span>
                      {seScore !== undefined && (
                        <span className={`text-sm font-bold tabular-nums ${scoreBadge(seScore).color}`}>
                          {(seScore * 100).toFixed(1)}% — {scoreBadge(seScore).label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Dedicated AI-image detection model · raw score 0–100%
                    </p>
                    {ev?.sightengine?.proof && (
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed border-t border-slate-700/60 pt-2">
                        <span className="text-slate-500">Evidence: </span>
                        {ev.sightengine.proof}
                      </p>
                    )}
                  </div>
                </div>

                {/* xAI Grok */}
                <div className={`flex items-start gap-4 rounded-xl border p-4 ${
                  hasGrok
                    ? 'bg-slate-800/40 border-slate-700/60'
                    : 'bg-slate-800/20 border-slate-700/30 opacity-50'
                }`}>
                  <Zap className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-200">xAI Grok 4.1 Fast</span>
                      {grokScore !== undefined ? (
                        <span className={`text-sm font-bold tabular-nums ${scoreBadge(grokScore).color}`}>
                          {(grokScore * 100).toFixed(1)}% — {scoreBadge(grokScore).label}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">not run</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {hasGrok
                        ? 'Vision LLM — independent assessment (runs in parallel with SightEngine)'
                        : (ev?.grok && 'skip_reason' in ev.grok
                          ? ev.grok.skip_reason
                          : 'Did not run — check server logs or apps/backend/.env')}
                    </p>
                    {ev?.grok && 'proof' in ev.grok && ev.grok.proof && (
                      <div className="mt-2 border-t border-slate-700/60 pt-2 space-y-1">
                        <p className="text-[11px] uppercase tracking-wide text-violet-400/90">
                          Grok assessment: {ev.grok.assessment.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          <span className="text-slate-500">Evidence: </span>
                          {ev.grok.proof}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Claude Haiku */}
                <div className={`flex items-start gap-4 rounded-xl border p-4 ${
                  hasClaude
                    ? 'bg-slate-800/40 border-slate-700/60'
                    : 'bg-slate-800/20 border-slate-700/30 opacity-50'
                }`}>
                  <BrainCircuit className="w-5 h-5 text-fuchsia-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-200">Anthropic Claude Haiku</span>
                      {hasClaude && claudeScore !== undefined ? (
                        <span className={`text-sm font-bold tabular-nums ${scoreBadge(claudeScore).color}`}>
                          {(claudeScore * 100).toFixed(1)}% — {scoreBadge(claudeScore).label}
                        </span>
                      ) : hasClaude ? (
                        <span className="text-xs text-fuchsia-400 font-medium">Reasoning synthesis</span>
                      ) : (
                        <span className="text-xs text-slate-600">not run</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {hasClaude
                        ? 'Vision rate (independent) plus reasoning synthesis — headline verdict, explanation, and proof bullets'
                        : (ev?.claude && 'skip_reason' in ev.claude
                          ? ev.claude.skip_reason
                          : 'Did not run — check apps/backend/.env')}
                    </p>
                    {ev?.claude && 'proof_points' in ev.claude && ev.claude.proof_points.length > 0 && (
                      <ul className="mt-2 border-t border-slate-700/60 pt-2 space-y-1.5">
                        {ev.claude.proof_points.map((line: string, i: number) => (
                          <li key={i} className="text-xs text-slate-400 leading-relaxed flex gap-2">
                            <span className="text-fuchsia-500 shrink-0">{i + 1}.</span>
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Claude explanation + signals ── */}
              <div className="glass-card rounded-2xl p-6 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-2">
                    Explanation
                    {hasClaude && <span className="ml-2 normal-case text-fuchsia-500/70">by Claude Haiku</span>}
                  </p>
                  <p className="text-slate-300 leading-relaxed">{result.explanation}</p>
                </div>

                {result.top_signals && result.top_signals.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-2">
                      Top signals
                    </p>
                    <ul className="space-y-1">
                      {result.top_signals.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                          <span className="text-cyan-500 mt-0.5">›</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.caveat && (
                  <div className="rounded-xl border border-slate-600/50 bg-slate-800/30 p-4">
                    <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-1">Note</p>
                    <p className="text-slate-400 text-sm">{result.caveat}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
