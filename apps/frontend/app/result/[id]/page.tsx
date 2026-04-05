'use client';

import { useEffect } from 'react';
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
  Music,
  Radio,
  AudioLines,
  Film,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { useJobStatus, useResult } from '@/hooks/useAnalysis';
import type { Verdict, ModelEvidence, FinalResponse } from '@veritas/shared';
import { useAuth } from '@/hooks/useAuth';
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

function sightEngineVideoMaxScore(result: FinalResponse): number | undefined {
  const s = result.model_scores?.sightengine_genai_video;
  if (typeof s === 'number' && !Number.isNaN(s)) return s;
  const ev = result.model_evidence?.sightengine_video;
  if (ev && 'max_score' in ev && typeof ev.max_score === 'number') return ev.max_score;
  return undefined;
}

type MediaKind = 'image' | 'audio' | 'video';

function detectMediaKind(ev: ModelEvidence | undefined): MediaKind {
  if (ev?.sightengine_video) return 'video';
  if (ev?.resemble && 'ran' in ev.resemble && ev.resemble.ran) {
    // Resemble ran without sightengine_video → standalone audio file
    return 'audio';
  }
  return 'image';
}

/** Prefer stored verdict unless SightEngine score forces AI (covers stale `UNCERTAIN` rows). */
function effectiveVerdict(result: FinalResponse, kind: MediaKind): Verdict {
  if (kind === 'audio') return result.verdict;
  if (kind === 'video') {
    const vScore = sightEngineVideoMaxScore(result);
    if (vScore !== undefined && vScore >= SE_AI_DISPLAY_THRESHOLD) return 'AI_GENERATED';
    return result.verdict;
  }
  const se = sightEngineRawScore(result);
  if (se !== undefined && se >= SE_AI_DISPLAY_THRESHOLD) return 'AI_GENERATED';
  return result.verdict;
}

function verdictPresentation(v: Verdict, kind: MediaKind): {
  headline: string;
  subtitle: string;
  tone: 'ai' | 'human' | 'uncertain';
} {
  switch (v) {
    case 'AI_GENERATED':
      return {
        headline: 'Likely AI-generated',
        subtitle: kind === 'audio'
          ? 'This audio shows strong signals of synthetic or AI-generated speech.'
          : kind === 'video'
            ? 'This video shows strong signals of AI-generated or synthetic content.'
            : 'The image shows strong signals of synthetic or AI-produced content.',
        tone: 'ai',
      };
    case 'HUMAN':
      return {
        headline: 'Likely authentic',
        subtitle: kind === 'audio'
          ? 'This audio is consistent with real, human-recorded content.'
          : kind === 'video'
            ? 'This video is consistent with real, human-captured footage.'
            : 'The image is more consistent with real / human-created content.',
        tone: 'human',
      };
    default:
      return {
        headline: 'Uncertain',
        subtitle: kind === 'audio'
          ? 'The model could not confidently classify this audio.'
          : kind === 'video'
            ? 'The models could not confidently classify this video.'
            : 'The models could not confidently classify this image.',
        tone: 'uncertain',
      };
  }
}

function scoreBadge(score: number): { label: string; color: string } {
  if (score >= 0.75) return { label: 'AI-generated', color: 'text-rose-400' };
  if (score <= 0.35) return { label: 'Authentic',    color: 'text-emerald-400' };
  return                    { label: 'Uncertain',    color: 'text-amber-400' };
}

/** Friendly display label for Resemble source-tracing identifiers. */
function formatSourceLabel(label: string): string {
  const map: Record<string, string> = {
    resemble_ai:  'Resemble AI',
    elevenlabs:   'ElevenLabs',
    playht:       'Play.ht',
    murf:         'Murf AI',
    speechify:    'Speechify',
    descript:     'Descript',
    vall_e:       'VALL-E (Microsoft)',
    real:         'Human (authentic)',
  };
  return map[label] ?? label.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan animate-spin" />
      </div>
    );
  }

  if (!jobId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Invalid job link
      </div>
    );
  }

  const failed    = job?.status === 'failed';
  const processing = !job || job.status === 'pending' || job.status === 'processing';

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="max-w-2xl mx-auto px-4 py-12 relative z-10">
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-cyan transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          New analysis
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text-cyan font-[family-name:var(--font-display)]">
            Analysis result
          </h1>
          <p className="text-muted-foreground text-sm mt-2 font-mono truncate px-2">Job {jobId}</p>
        </div>

        {/* ── Loading / queued ── */}
        {(statusLoading || processing) && (
          <div className="liquid-glass-card rounded-2xl p-12 flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-cyan animate-spin" />
            <p className="text-lg text-foreground">
              {job?.status === 'processing' ? 'Analyzing your file…' : 'Waiting in queue…'}
            </p>
            <p className="text-sm text-muted-foreground">This usually takes a few seconds</p>
          </div>
        )}

        {/* ── Status error ── */}
        {statusError && (
          <div className="liquid-glass-card rounded-2xl p-6 border border-destructive/30 bg-destructive/5">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <p>{statusError instanceof Error ? statusError.message : 'Could not load job'}</p>
            </div>
          </div>
        )}

        {/* ── Failed ── */}
        {failed && (
          <div className="liquid-glass-card rounded-2xl p-8 border border-warn/30 bg-warn/5">
            <div className="flex items-center gap-3 text-warn mb-2">
              <XCircle className="w-8 h-8 shrink-0" />
              <h2 className="text-xl font-semibold">Analysis failed</h2>
            </div>
            <p className="text-muted-foreground">
              Something went wrong while processing this job. Try uploading again.
            </p>
          </div>
        )}

        {/* ── Result loading ── */}
        {resultEnabled && resultLoading && (
          <div className="liquid-glass-card rounded-2xl p-12 flex justify-center">
            <Loader2 className="w-10 h-10 text-cyan animate-spin" />
          </div>
        )}

        {/* ── Result error ── */}
        {resultEnabled && resultError && (
          <div className="liquid-glass-card rounded-2xl p-6 border border-destructive/30">
            <p className="text-destructive">
              {resultError instanceof Error ? resultError.message : 'Could not load result'}
            </p>
          </div>
        )}

        {/* ── Full result ── */}
        {resultEnabled && result && (() => {
          const ev   = result.model_evidence as ModelEvidence | undefined;
          const kind = detectMediaKind(ev);

          const isAudio = kind === 'audio';
          const isVideo = kind === 'video';

          const resembleEv = ev?.resemble && 'ran' in ev.resemble && ev.resemble.ran
            ? ev.resemble
            : null;

          const seVideoEv = ev?.sightengine_video && 'ran' in ev.sightengine_video && ev.sightengine_video.ran
            ? ev.sightengine_video
            : null;

          const { headline, subtitle, tone } = verdictPresentation(effectiveVerdict(result, kind), kind);
          const Icon      = tone === 'ai' ? Sparkles : tone === 'human' ? CheckCircle2 : HelpCircle;
          const ring      = tone === 'ai'
            ? 'from-rose-500/30 to-fuchsia-500/20 border-rose-500/40'
            : tone === 'human'
              ? 'from-emerald-500/30 to-cyan-500/20 border-emerald-500/40'
              : 'from-amber-500/30 to-orange-500/20 border-amber-500/40';
          const iconColor = tone === 'ai' ? 'text-rose-400' : tone === 'human' ? 'text-emerald-400' : 'text-amber-400';

          // Image-only model scores
          const seScore     = result.model_scores?.sightengine_genai as number | undefined;
          const grokScore   = result.model_scores?.grok_grok4fast   as number | undefined;
          const claudeScore = result.model_scores?.claude_haiku     as number | undefined;
          const hasGrok     = result.models_run?.includes('grok_grok4fast');
          const hasClaude   = result.models_run?.includes('claude_haiku');
          const hasSightEngine = result.models_run?.includes('sightengine_genai');

          // Video model scores
          const seVideoScore   = result.model_scores?.sightengine_genai_video as number | undefined;
          const hasSeVideo     = result.models_run?.includes('sightengine_genai_video');
          const hasVideoGrok   = isVideo && hasGrok;
          const hasVideoClaude = isVideo && hasClaude;

          return (
            <div className="space-y-5">
              {/* ── Verdict card ── */}
              <div className="liquid-glass-card rounded-2xl p-8">
                <div className={`rounded-2xl border bg-gradient-to-br p-8 text-center ${ring}`}>
                  <div className="flex justify-center mb-4">
                    <Icon className={`w-16 h-16 ${iconColor}`} strokeWidth={1.25} />
                  </div>
                  <h2 className="text-3xl font-bold text-foreground mb-2">{headline}</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">{subtitle}</p>
                  {isAudio && (
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan">
                      <Music className="w-3 h-3" />
                      Audio deepfake detection by Resemble AI
                    </div>
                  )}
                  {isVideo && (
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-xs text-violet-400">
                      <Film className="w-3 h-3" />
                      Video AI detection · audio + visual analysis
                    </div>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 mt-5">
                  <div className="rounded-xl bg-secondary/50 border border-border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                      {isAudio ? 'Deepfake score' : isVideo ? 'AI-likeness score' : 'AI-likeness score'}
                    </p>
                    <p className="text-2xl font-semibold text-cyan tabular-nums">
                      {(result.confidence * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isAudio
                        ? 'Aggregated score from Resemble AI (0 = authentic · 100 = deepfake)'
                        : 'Blend of detector rates (0 = authentic · 100 = AI) when multiple models run'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-secondary/50 border border-border p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Processing time</p>
                    <p className="text-2xl font-semibold text-foreground tabular-nums">
                      {result.processing_ms != null ? `${result.processing_ms} ms` : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Audio model breakdown (Resemble AI — standalone audio files) ── */}
              {isAudio && resembleEv && (
                <div className="liquid-glass-card rounded-2xl p-6 space-y-4">
                  <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                    Audio detection breakdown
                  </h3>

                  {/* Resemble Detect card */}
                  <div className="flex items-start gap-4 rounded-xl bg-secondary/50 border border-border p-4">
                    <AudioLines className="w-5 h-5 text-cyan shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <span className="text-sm font-semibold text-foreground">Resemble AI Detect</span>
                          {resembleEv.sample_seconds != null && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Uses the first {resembleEv.sample_seconds}s of the file (not full length)
                            </p>
                          )}
                        </div>
                        <span className={`text-sm font-bold tabular-nums shrink-0 ${scoreBadge(resembleEv.aggregated_score).color}`}>
                          {(resembleEv.aggregated_score * 100).toFixed(1)}% — {scoreBadge(resembleEv.aggregated_score).label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <p className="text-xs text-muted-foreground">
                          Neural deepfake detector · aggregated across {resembleEv.chunk_scores.length} chunk{resembleEv.chunk_scores.length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Consistency: <span className="text-foreground/80 tabular-nums">{(parseFloat(resembleEv.consistency) * 100).toFixed(1)}%</span>
                        </p>
                      </div>

                      {/* Per-chunk score bars */}
                      {resembleEv.chunk_scores.length > 0 && (
                        <div className="mt-3 border-t border-border pt-3">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                            Per-chunk scores
                          </p>
                          <div className="flex items-end gap-1 h-10">
                            {resembleEv.chunk_scores.map((s: string, i: number) => {
                              const val = parseFloat(s);
                              const pct = Math.round(val * 100);
                              const barColor = val >= 0.75
                                ? 'bg-rose-500'
                                : val <= 0.35
                                  ? 'bg-emerald-500'
                                  : 'bg-amber-400';
                              return (
                                <div
                                  key={i}
                                  title={`Chunk ${i + 1}: ${pct}%`}
                                  className={`rounded-sm flex-1 min-w-[4px] ${barColor} opacity-80 hover:opacity-100 transition-opacity`}
                                  style={{ height: `${Math.max(4, pct)}%` }}
                                />
                              );
                            })}
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-[10px] text-muted-foreground/60">Chunk 1</span>
                            <span className="text-[10px] text-muted-foreground/60">Chunk {resembleEv.chunk_scores.length}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Audio Source Tracing */}
                  {resembleEv.source_tracing && (
                    <div className={`flex items-start gap-4 rounded-xl border p-4 ${
                      resembleEv.label === 'fake'
                        ? 'bg-rose-500/5 border-rose-500/30'
                        : 'bg-secondary/50 border-border'
                    }`}>
                      <Radio className={`w-5 h-5 shrink-0 mt-0.5 ${resembleEv.label === 'fake' ? 'text-rose-400' : 'text-emerald-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">Audio Source Tracing</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            resembleEv.source_tracing === 'real'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-rose-500/15 text-rose-400'
                          }`}>
                            {formatSourceLabel(resembleEv.source_tracing)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {resembleEv.source_tracing === 'real'
                            ? 'No synthetic voice generator identified — audio appears to be human-recorded.'
                            : `Resemble AI identified the likely synthesis origin as ${formatSourceLabel(resembleEv.source_tracing)}.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Intelligence analysis */}
                  {resembleEv.intelligence && (
                    <div className="flex items-start gap-4 rounded-xl bg-secondary/50 border border-border p-4">
                      <BrainCircuit className="w-5 h-5 text-fuchsia-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground mb-1">
                          Intelligence analysis
                          <span className="ml-2 text-[11px] font-normal text-fuchsia-400/70">by Resemble AI</span>
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{resembleEv.intelligence}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Video model breakdown ── */}
              {isVideo && (
                <div className="liquid-glass-card rounded-2xl p-6 space-y-4">
                  <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                    Video analysis breakdown
                  </h3>

                  {/* Audio check card (always shown for video) */}
                  <div className={`flex items-start gap-4 rounded-xl border p-4 ${
                    resembleEv
                      ? resembleEv.label === 'fake'
                        ? 'bg-rose-500/5 border-rose-500/40'
                        : 'bg-emerald-500/5 border-emerald-500/30'
                      : 'bg-secondary/20 border-border/50'
                  }`}>
                    {resembleEv
                      ? resembleEv.label === 'fake'
                        ? <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        : <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      : <AudioLines className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <span className="text-sm font-semibold text-foreground">Audio check</span>
                          <p className="text-[11px] text-muted-foreground mt-0.5">by Resemble AI Detect</p>
                        </div>
                        {resembleEv ? (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                            resembleEv.label === 'fake'
                              ? 'bg-rose-500/15 text-rose-400'
                              : resembleEv.label === 'real'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-amber-500/15 text-amber-400'
                          }`}>
                            {resembleEv.label === 'fake'
                              ? `AI-generated audio (${(resembleEv.aggregated_score * 100).toFixed(0)}%)`
                              : resembleEv.label === 'real'
                                ? 'Audio passed'
                                : 'Uncertain'}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">not available</span>
                        )}
                      </div>
                      {resembleEv && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {resembleEv.label === 'fake'
                            ? 'AI-generated audio detected — full video flagged as AI-generated without visual analysis.'
                            : resembleEv.label === 'real'
                              ? `Audio appears authentic (score ${(resembleEv.aggregated_score * 100).toFixed(1)}%) — proceeding to visual analysis.`
                              : `Ambiguous audio result (${(resembleEv.aggregated_score * 100).toFixed(1)}%) — visual analysis ran.`}
                        </p>
                      )}
                      {!resembleEv && ev?.resemble && 'skip_reason' in ev.resemble && (
                        <p className="text-xs text-muted-foreground mt-1">{ev.resemble.skip_reason}</p>
                      )}
                    </div>
                  </div>

                  {/* SightEngine video */}
                  <div className={`flex items-start gap-4 rounded-xl border p-4 ${
                    hasSeVideo
                      ? 'bg-secondary/50 border-border'
                      : 'bg-secondary/20 border-border/50 opacity-50'
                  }`}>
                    <Eye className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">SightEngine video genai</span>
                        {seVideoScore !== undefined ? (
                          <span className={`text-sm font-bold tabular-nums ${scoreBadge(seVideoScore).color}`}>
                            {(seVideoScore * 100).toFixed(1)}% — {scoreBadge(seVideoScore).label}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">not run</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {hasSeVideo
                          ? `Dedicated AI-video detection · analyzed ${seVideoEv ? seVideoEv.frame_scores.length : '?'} frame(s) · score shown is max across all frames`
                          : (ev?.sightengine_video && 'skip_reason' in ev.sightengine_video
                            ? ev.sightengine_video.skip_reason
                            : 'Did not run')}
                      </p>
                      {seVideoEv && seVideoEv.frame_scores.length > 0 && (
                        <div className="mt-3 border-t border-border pt-3">
                          <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Per-frame scores ({seVideoEv.frame_scores.length} frame{seVideoEv.frame_scores.length !== 1 ? 's' : ''})
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Mean: <span className="text-foreground/80 tabular-nums">{(seVideoEv.mean_score * 100).toFixed(1)}%</span>
                            </p>
                          </div>
                          <div className="flex items-end gap-1 h-10">
                            {seVideoEv.frame_scores.map((s: number, i: number) => {
                              const pct = Math.round(s * 100);
                              const barColor = s >= 0.75 ? 'bg-rose-500' : s <= 0.35 ? 'bg-emerald-500' : 'bg-amber-400';
                              return (
                                <div
                                  key={i}
                                  title={`Frame ${i + 1}: ${pct}%`}
                                  className={`rounded-sm flex-1 min-w-[4px] ${barColor} opacity-80 hover:opacity-100 transition-opacity`}
                                  style={{ height: `${Math.max(4, pct)}%` }}
                                />
                              );
                            })}
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-[10px] text-muted-foreground/60">Frame 1</span>
                            <span className="text-[10px] text-muted-foreground/60">Frame {seVideoEv.frame_scores.length}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* xAI Grok (video) */}
                  <div className={`flex items-start gap-4 rounded-xl border p-4 ${
                    hasVideoGrok
                      ? 'bg-secondary/50 border-border'
                      : 'bg-secondary/20 border-border/50 opacity-50'
                  }`}>
                    <Zap className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">xAI Grok 4.1 Fast</span>
                        {grokScore !== undefined ? (
                          <span className={`text-sm font-bold tabular-nums ${scoreBadge(grokScore).color}`}>
                            {(grokScore * 100).toFixed(1)}% — {scoreBadge(grokScore).label}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">not run</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {hasVideoGrok
                          ? 'Vision LLM — analyzed a representative frame extracted from the video'
                          : (ev?.grok && 'skip_reason' in ev.grok
                            ? ev.grok.skip_reason
                            : 'Did not run — check server logs or apps/backend/.env')}
                      </p>
                      {ev?.grok && 'proof' in ev.grok && ev.grok.proof && (
                        <div className="mt-2 border-t border-border pt-2 space-y-1">
                          <p className="text-[11px] uppercase tracking-wide text-violet-400/90">
                            Grok assessment: {ev.grok.assessment.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            <span className="text-muted-foreground">Evidence: </span>
                            {ev.grok.proof}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Claude Haiku (video) */}
                  <div className={`flex items-start gap-4 rounded-xl border p-4 ${
                    hasVideoClaude
                      ? 'bg-secondary/50 border-border'
                      : 'bg-secondary/20 border-border/50 opacity-50'
                  }`}>
                    <BrainCircuit className="w-5 h-5 text-fuchsia-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">Anthropic Claude Haiku</span>
                        {hasVideoClaude && claudeScore !== undefined ? (
                          <span className={`text-sm font-bold tabular-nums ${scoreBadge(claudeScore).color}`}>
                            {(claudeScore * 100).toFixed(1)}% — {scoreBadge(claudeScore).label}
                          </span>
                        ) : hasVideoClaude ? (
                          <span className="text-xs text-fuchsia-400 font-medium">Reasoning synthesis</span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">not run</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {hasVideoClaude
                          ? 'Vision rate (frame) + reasoning synthesis — proof bullets explaining why the video was flagged'
                          : (ev?.claude && 'skip_reason' in ev.claude
                            ? ev.claude.skip_reason
                            : 'Did not run — check apps/backend/.env')}
                      </p>
                      {ev?.claude && 'proof_points' in ev.claude && ev.claude.proof_points.length > 0 && (
                        <ul className="mt-2 border-t border-border pt-2 space-y-1.5">
                          {ev.claude.proof_points.map((line: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                              <span className="text-fuchsia-500 shrink-0">{i + 1}.</span>
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Image model breakdown (SightEngine / Grok / Claude) ── */}
              {!isAudio && !isVideo && (hasSightEngine || hasGrok || hasClaude || ev?.sightengine) && (
                <div className="liquid-glass-card rounded-2xl p-6 space-y-4">
                  <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                    Model breakdown
                  </h3>

                  {/* SightEngine */}
                  <div className="flex items-start gap-4 rounded-xl bg-secondary/50 border border-border p-4">
                    <Eye className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">SightEngine genai</span>
                        {seScore !== undefined && (
                          <span className={`text-sm font-bold tabular-nums ${scoreBadge(seScore).color}`}>
                            {(seScore * 100).toFixed(1)}% — {scoreBadge(seScore).label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Dedicated AI-image detection model · raw score 0–100%
                      </p>
                      {ev?.sightengine?.proof && (
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed border-t border-border pt-2">
                          <span className="text-muted-foreground">Evidence: </span>
                          {ev.sightengine.proof}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* xAI Grok */}
                  <div className={`flex items-start gap-4 rounded-xl border p-4 ${
                    hasGrok
                      ? 'bg-secondary/50 border-border'
                      : 'bg-secondary/20 border-border/50 opacity-50'
                  }`}>
                    <Zap className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">xAI Grok 4.1 Fast</span>
                        {grokScore !== undefined ? (
                          <span className={`text-sm font-bold tabular-nums ${scoreBadge(grokScore).color}`}>
                            {(grokScore * 100).toFixed(1)}% — {scoreBadge(grokScore).label}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">not run</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {hasGrok
                          ? 'Vision LLM — independent assessment (runs in parallel with SightEngine)'
                          : (ev?.grok && 'skip_reason' in ev.grok
                            ? ev.grok.skip_reason
                            : 'Did not run — check server logs or apps/backend/.env')}
                      </p>
                      {ev?.grok && 'proof' in ev.grok && ev.grok.proof && (
                        <div className="mt-2 border-t border-border pt-2 space-y-1">
                          <p className="text-[11px] uppercase tracking-wide text-violet-400/90">
                            Grok assessment: {ev.grok.assessment.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            <span className="text-muted-foreground">Evidence: </span>
                            {ev.grok.proof}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Claude Haiku */}
                  <div className={`flex items-start gap-4 rounded-xl border p-4 ${
                    hasClaude
                      ? 'bg-secondary/50 border-border'
                      : 'bg-secondary/20 border-border/50 opacity-50'
                  }`}>
                    <BrainCircuit className="w-5 h-5 text-fuchsia-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">Anthropic Claude Haiku</span>
                        {hasClaude && claudeScore !== undefined ? (
                          <span className={`text-sm font-bold tabular-nums ${scoreBadge(claudeScore).color}`}>
                            {(claudeScore * 100).toFixed(1)}% — {scoreBadge(claudeScore).label}
                          </span>
                        ) : hasClaude ? (
                          <span className="text-xs text-fuchsia-400 font-medium">Reasoning synthesis</span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">not run</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {hasClaude
                          ? 'Vision rate (independent) plus reasoning synthesis — headline verdict, explanation, and proof bullets'
                          : (ev?.claude && 'skip_reason' in ev.claude
                            ? ev.claude.skip_reason
                            : 'Did not run — check apps/backend/.env')}
                      </p>
                      {ev?.claude && 'proof_points' in ev.claude && ev.claude.proof_points.length > 0 && (
                        <ul className="mt-2 border-t border-border pt-2 space-y-1.5">
                          {ev.claude.proof_points.map((line: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                              <span className="text-fuchsia-500 shrink-0">{i + 1}.</span>
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Explanation + signals ── */}
              <div className="liquid-glass-card rounded-2xl p-6 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                    Explanation
                    {!isAudio && !isVideo && hasClaude && (
                      <span className="ml-2 normal-case text-fuchsia-500/70">by Claude Haiku</span>
                    )}
                    {isVideo && hasClaude && (
                      <span className="ml-2 normal-case text-fuchsia-500/70">by Claude Haiku (frame analysis)</span>
                    )}
                    {isAudio && (
                      <span className="ml-2 normal-case text-cyan-500/70">by Resemble AI</span>
                    )}
                  </p>
                  <p className="text-foreground/80 leading-relaxed">{result.explanation}</p>
                </div>

                {result.top_signals && result.top_signals.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                      Top signals
                    </p>
                    <ul className="space-y-1">
                      {result.top_signals.map((s: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                          <span className="text-cyan-500 mt-0.5">›</span>
                          {s.startsWith('source:')
                            ? `Origin identified: ${formatSourceLabel(s.replace('source:', ''))}`
                            : s.replace(/_/g, ' ')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.caveat && (
                  <div className="rounded-xl border border-border bg-secondary/30 p-4">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">Note</p>
                    <p className="text-muted-foreground text-sm">{result.caveat}</p>
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
