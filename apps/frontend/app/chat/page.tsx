'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload,
  ImageIcon,
  Video,
  X,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Globe,
  Eye,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  ExternalLink,
  Sparkles,
  MessageSquare,
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useFakeAnalysisProgress, useRotatingLoadingMessage } from '@/lib/loadingFun'
import { useTrialCredits } from '@/components/credits/CreditsProvider'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AuthenticityResult {
  verdict: 'AI_GENERATED' | 'HUMAN' | 'UNCERTAIN'
  confidence: number
  explanation: string
  frame_scores?: number[]
  max_score?: number
  mean_score?: number
  error?: string
}

interface ContextualResult {
  consistency_score: number
  verdict: 'CONSISTENT' | 'MISLEADING' | 'UNVERIFIABLE'
  explanation: string
  signals: string[]
  sources: string[]
  image_description: string
  error?: string
}

interface AnalysisResponse {
  authenticity?: AuthenticityResult
  contextual?: ContextualResult
  source?: ContextualResult
  /** Present when trial credit was consumed; balance after this run */
  remaining?: number
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function verdictColor(verdict: string) {
  if (verdict === 'AI_GENERATED' || verdict === 'MISLEADING') return 'text-rose-400'
  if (verdict === 'HUMAN' || verdict === 'CONSISTENT') return 'text-emerald-400'
  return 'text-amber-400'
}

function verdictBg(verdict: string) {
  if (verdict === 'AI_GENERATED' || verdict === 'MISLEADING') return 'rgba(244,63,94,0.08)'
  if (verdict === 'HUMAN' || verdict === 'CONSISTENT') return 'rgba(16,185,129,0.08)'
  return 'rgba(245,158,11,0.08)'
}

function verdictBorder(verdict: string) {
  if (verdict === 'AI_GENERATED' || verdict === 'MISLEADING') return 'rgba(244,63,94,0.25)'
  if (verdict === 'HUMAN' || verdict === 'CONSISTENT') return 'rgba(16,185,129,0.25)'
  return 'rgba(245,158,11,0.25)'
}

function AuthenticityIcon({ verdict }: { verdict: string }) {
  if (verdict === 'AI_GENERATED') return <ShieldX className="w-6 h-6 text-rose-400" />
  if (verdict === 'HUMAN') return <ShieldCheck className="w-6 h-6 text-emerald-400" />
  return <ShieldAlert className="w-6 h-6 text-amber-400" />
}

function ContextIcon({ verdict }: { verdict: string }) {
  if (verdict === 'CONSISTENT') return <CheckCircle2 className="w-6 h-6 text-emerald-400" />
  if (verdict === 'MISLEADING') return <AlertTriangle className="w-6 h-6 text-rose-400" />
  return <HelpCircle className="w-6 h-6 text-amber-400" />
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#f43f5e'
  return (
    <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${score}%`, background: color }}
      />
    </div>
  )
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  const color = pct >= 75 ? '#f43f5e' : pct <= 35 ? '#10b981' : '#f59e0b'
  return (
    <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

/** Top-line verdict: AI-first, then context mismatch. */
type OverallHeadline = 'FAKE' | 'REAL' | 'UNCLEAR'

interface OverallSummary {
  headline: OverallHeadline
  /** Short copy under the headline */
  summary: string
  /** Axis 1 flagged synthetic content — show critical warning */
  showAiCriticalWarning: boolean
  /** Axis 2 misleading — explain how (not AI) */
  showMisleadingDetail: boolean
}

function deriveOverallSummary(r: AnalysisResponse): OverallSummary {
  const auth = r.authenticity
  const ctx  = r.contextual
  const src  = r.source

  const authIsAi     = auth && !auth.error && auth.verdict === 'AI_GENERATED'
  const ctxMisleading = ctx && !ctx.error && ctx.verdict === 'MISLEADING'
  const srcBad       = src && !src.error && src.verdict === 'MISLEADING'

  // 1) Synthetic media → FAKE + critical warning (do not trust caption)
  if (authIsAi) {
    return {
      headline:              'FAKE',
      summary:
        'This media is flagged as likely AI-generated or synthetic. Treat it as inauthentic even if the caption sounds plausible.',
      showAiCriticalWarning:   true,
      showMisleadingDetail:    false,
    }
  }

  // 2) Not (flagged as) synthetic → check claim / source
  if (ctxMisleading) {
    const how =
      ctx!.explanation?.trim() ||
      'What is shown does not match the claim, or the claim misrepresents the scene.'
    return {
      headline:              'FAKE',
      summary:               how,
      showAiCriticalWarning:   false,
      showMisleadingDetail:    true,
    }
  }

  if (srcBad) {
    return {
      headline:              'FAKE',
      summary:
        src!.explanation?.trim() ||
        'The source or URL does not reliably support the claim.',
      showAiCriticalWarning:   false,
      showMisleadingDetail:    true,
    }
  }

  const uncertainAuth =
    auth && !auth.error && auth.verdict === 'UNCERTAIN'
  const unverifiedCtx =
    ctx && !ctx.error && ctx.verdict === 'UNVERIFIABLE'
  const uncertainSrc =
    src && !src.error && src.verdict === 'UNVERIFIABLE'

  if (uncertainAuth || unverifiedCtx || uncertainSrc) {
    return {
      headline:              'UNCLEAR',
      summary:
        'We could not fully confirm authenticity or the facts. Do not treat this as verified.',
      showAiCriticalWarning: false,
      showMisleadingDetail:  false,
    }
  }

  // REAL: no AI signal, no misleading context/source
  const ctxConsistent = ctx && !ctx.error && ctx.verdict === 'CONSISTENT'
  let summary = ''
  if (ctxConsistent && ctx) {
    summary =
      ctx.explanation?.trim() ||
      'The claim lines up with what the media shows and what we could verify online.'
  } else if (auth && !auth.error && auth.verdict === 'HUMAN') {
    summary =
      'No strong AI-generation signal in the media. Add a caption or claim to check whether the story matches the image.'
  } else {
    summary =
      'No major red flags from the checks we ran. Still use judgment and corroborate with trusted outlets.'
  }

  return {
    headline:              'REAL',
    summary,
    showAiCriticalWarning: false,
    showMisleadingDetail:  false,
  }
}

function getMisleadingExplanation(r: AnalysisResponse): { primary: string; secondary?: string } | null {
  const ctxWhy =
    r.contextual && !r.contextual.error && r.contextual.verdict === 'MISLEADING'
      ? r.contextual.explanation.trim()
      : ''
  const srcWhy =
    r.source && !r.source.error && r.source.verdict === 'MISLEADING'
      ? r.source.explanation.trim()
      : ''
  if (!ctxWhy && !srcWhy) return null
  if (ctxWhy && srcWhy && ctxWhy !== srcWhy) return { primary: ctxWhy, secondary: srcWhy }
  return { primary: ctxWhy || srcWhy }
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { credits, unlimited, refresh: refreshCredits, openPaywall } = useTrialCredits()

  const [context, setContext]       = useState('')
  const [sourceUrl, setSourceUrl]   = useState('')
  const [file, setFile]             = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [analyzing, setAnalyzing]   = useState(false)
  const [error, setError]           = useState('')
  const [result, setResult]         = useState<AnalysisResponse | null>(null)
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null)
  const fileInputRef                = useRef<HTMLInputElement>(null)

  const [analyzeProgress, setAnalyzeProgress] = useFakeAnalysisProgress(analyzing)
  const funLoadingMessage = useRotatingLoadingMessage(analyzing)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  /** Local preview for selected image/video (blob URL; revoked when file changes or unmounts). */
  useEffect(() => {
    if (!file) {
      setMediaPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setMediaPreviewUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file])

  const overall = useMemo(
    () => (result ? deriveOverallSummary(result) : null),
    [result],
  )

  const misleadingExplain = useMemo(
    () => (result ? getMisleadingExplanation(result) : null),
    [result],
  )

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-cyan animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const validateFile = (f: File): boolean => {
    if (f.size > 100 * 1024 * 1024) {
      setError(`File too large. Maximum size is 100 MB.`)
      return false
    }
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
    ]
    if (!allowed.includes(f.type)) {
      setError('Only images and videos are supported in the Chat mode.')
      return false
    }
    return true
  }

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && validateFile(dropped)) { setFile(dropped); setError('') }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected && validateFile(selected)) { setFile(selected); setError('') }
  }

  const canSubmit = !analyzing && (!!context.trim() || !!file)

  const handleAnalyze = async () => {
    if (!canSubmit) return
    setAnalyzing(true)
    setError('')
    setResult(null)

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'
      const token   = localStorage.getItem('token') ?? ''

      const formData = new FormData()
      if (file)              formData.append('media',      file)
      if (context.trim())    formData.append('context',    context.trim())
      if (sourceUrl.trim())  formData.append('source_url', sourceUrl.trim())

      const res = await fetch(`${apiBase}/analyze/contextual`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => ({ error: 'Request failed' }))) as {
          error?: string
          code?: string
        }
        if (res.status === 402 && err.code === 'INSUFFICIENT_CREDITS') {
          openPaywall()
        }
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      const data: AnalysisResponse = await res.json()
      setResult(data)
      void refreshCredits()
      setAnalyzeProgress(100)
      await new Promise((r) => setTimeout(r, 420))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const fileIsImage = file?.type.startsWith('image/')
  const fileIsVideo = file?.type.startsWith('video/')

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="max-w-3xl mx-auto px-4 py-12 relative z-10">

        {/* Back link */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4 bg-cyan/10 border border-cyan/20 text-cyan">
            <Sparkles size={12} />
            Contextual Fact-Check
          </div>
          <h1 className="text-5xl font-bold gradient-text-cyan mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            Chat Analysis
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Submit an image or video together with a claim or caption to verify whether the content matches the context.
          </p>
          {credits !== null && (
            <p className="text-sm text-muted-foreground mt-3 max-w-xl mx-auto">
              {unlimited ? (
                <span className="text-cyan font-medium">Pro: unlimited Verify Chat</span>
              ) : (
                <>
                  Trial credits: <span className="font-mono text-foreground font-semibold">{credits}</span> — each run
                  uses 1 credit.{' '}
                  <a href="/#pricing" className="text-cyan hover:underline">
                    Pricing
                  </a>
                </>
              )}
            </p>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <X className="h-4 w-4 flex-shrink-0" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ── Input form ── */}
        <Card className="mb-4 overflow-hidden liquid-glass-card">
          <CardContent className="p-6 space-y-5">

            {/* Context textarea */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                <MessageSquare size={14} className="text-cyan" />
                Claim or caption
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Paste a caption, headline, social media post, or any claim you want to verify…"
                rows={3}
                className="w-full rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none outline-none transition-all duration-200 bg-input border border-border focus:border-cyan/40"
              />
            </div>

            {/* File drop zone */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                <ImageIcon size={14} className="text-cyan" />
                Image or video
                <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </label>

              {file ? (
                <div
                  className="relative rounded-xl overflow-hidden bg-purple/5 border border-purple/20"
                >
                  {file && !mediaPreviewUrl && (
                    <div className="flex items-center justify-center min-h-[140px] bg-black/30">
                      <Loader2 className="w-7 h-7 text-cyan animate-spin" aria-hidden />
                    </div>
                  )}
                  {mediaPreviewUrl && fileIsImage && (
                    <div className="relative w-full bg-black/40 flex items-center justify-center min-h-[140px] max-h-[min(56vh,360px)]">
                      {/* Blob URLs: use native img (next/image does not apply to object URLs). */}
                      <img
                        src={mediaPreviewUrl}
                        alt={file.name ? `Preview: ${file.name}` : 'Selected image preview'}
                        className="w-full h-full max-h-[min(56vh,360px)] object-contain"
                      />
                    </div>
                  )}
                  {mediaPreviewUrl && fileIsVideo && (
                    <div className="relative w-full bg-black/50 flex items-center justify-center">
                      <video
                        src={mediaPreviewUrl}
                        controls
                        playsInline
                        muted
                        className="w-full max-h-[min(56vh,360px)] object-contain"
                        preload="metadata"
                      />
                    </div>
                  )}
                  <div className="px-4 py-3 flex items-center gap-3 border-t border-border">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fileIsImage ? 'Image' : 'Video'} · {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setFile(null); setError('') }}
                      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
                      aria-label="Remove file"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDrop={handleFileDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`rounded-xl p-8 text-center cursor-pointer transition-all duration-200 bg-input border border-dashed ${isDragging ? 'border-cyan scale-[1.01]' : 'border-border hover:border-cyan/40'}`}
                >
                  <div className="flex justify-center mb-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-cyan/10 border border-cyan/20">
                      <Upload className="w-6 h-6 text-cyan" strokeWidth={1.5} />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">
                    {isDragging ? 'Drop it here!' : 'Drop image or video'}
                  </p>
                  <p className="text-xs text-muted-foreground">or click to browse · max 100 MB</p>
                  <div className="flex justify-center gap-2 mt-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-cyan/5 text-cyan border border-cyan/15">
                      <ImageIcon size={10} /> JPG / PNG / WebP
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-purple/5 text-purple border border-purple/15">
                      <Video size={10} /> MP4 / MOV / WebM
                    </span>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Source URL */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                <Globe size={14} className="text-cyan" />
                Source URL
                <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="w-full rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-all duration-200 bg-input border border-border focus:border-cyan/40"
              />
            </div>

            {/* Submit button */}
            <div className="pt-1">
              <button
                onClick={handleAnalyze}
                disabled={!canSubmit}
                className="relative group w-full py-3.5 rounded-xl text-base font-bold transition-all duration-200 overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: canSubmit
                    ? 'linear-gradient(135deg, var(--color-cyan) 0%, var(--color-cyan-dim) 100%)'
                    : 'var(--secondary)',
                  color: canSubmit ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                  boxShadow: canSubmit ? '0 4px 24px var(--color-cyan-glow)' : 'none',
                }}
              >
                {analyzing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Eye className="w-5 h-5" />
                    Analyze
                  </span>
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        {analyzing && (
          <div className="mb-6 rounded-xl border border-border bg-secondary/40 px-4 py-4 space-y-3">
            <div className="flex items-start gap-3">
              <Loader2 className="w-5 h-5 text-cyan animate-spin shrink-0 mt-0.5" aria-hidden />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-semibold text-foreground">Fact-checking in progress</span>
                  <span className="text-cyan font-mono tabular-nums shrink-0">{analyzeProgress}%</span>
                </div>
                <p className="text-xs text-muted-foreground leading-snug font-mono">{funLoadingMessage}</p>
              </div>
            </div>
            <Progress value={analyzeProgress} variant="gradient" className="h-2" />
          </div>
        )}

        {/* ── Results ── */}
        {result && overall && (
          <div className="space-y-5 mt-8">

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Analysis results</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Submitted claim */}
            {context.trim() && (
              <div className="rounded-xl px-4 py-3 text-sm bg-muted border border-border">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Submitted claim</p>
                <p className="text-foreground leading-relaxed">&ldquo;{context.trim()}&rdquo;</p>
              </div>
            )}

            {/* Top summary: FAKE | REAL | UNCLEAR */}
            <div
              className={`rounded-2xl p-6 sm:p-8 text-center space-y-3 border ${
                overall.headline === 'FAKE'
                  ? 'border-ai/35 bg-ai/8'
                  : overall.headline === 'REAL'
                    ? 'border-verified/35 bg-verified/8'
                    : 'border-warn/35 bg-warn/8'
              }`}
            >
              <p
                className="text-4xl sm:text-5xl font-black tracking-tight"
                style={{
                  fontFamily: 'var(--font-display)',
                  color:
                    overall.headline === 'FAKE'
                      ? '#fb7185'
                      : overall.headline === 'REAL'
                        ? '#34d399'
                        : '#fbbf24',
                }}
              >
                {overall.headline === 'FAKE' ? 'Fake' : overall.headline === 'REAL' ? 'Real' : 'Unclear'}
              </p>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                {overall.summary}
              </p>
            </div>

            {/* Critical: AI-generated */}
            {overall.showAiCriticalWarning && (
              <Alert
                variant="destructive"
                className="border-rose-500/50 bg-rose-950/30 text-rose-100 [&>svg]:text-rose-400"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <AlertDescription className="text-sm leading-relaxed">
                  <span className="font-semibold text-rose-200">Critical: synthetic media. </span>
                  This content is flagged as likely AI-generated. Do not share it as evidence of a real event, and do not trust the pairing with any caption or headline.
                </AlertDescription>
              </Alert>
            )}

            {/* Why it&apos;s misleading (not AI — context and/or source) */}
            {overall.showMisleadingDetail && misleadingExplain && (
              <div className="rounded-xl p-5 space-y-2 bg-ai/5 border border-ai/20">
                <p className="text-xs font-bold uppercase tracking-widest text-ai/90">Why it&apos;s misleading</p>
                <p className="text-sm text-foreground leading-relaxed">{misleadingExplain.primary}</p>
                {misleadingExplain.secondary && (
                  <p className="text-xs text-muted-foreground leading-relaxed pt-1 border-t border-border mt-2">
                    Source note: {misleadingExplain.secondary}
                  </p>
                )}
              </div>
            )}

            {/* What the content shows */}
            {result.contextual && !result.contextual.error && result.contextual.image_description && (
              <div className="rounded-xl p-5 space-y-2 bg-muted border border-border">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Eye size={12} className="text-cyan" />
                  What the content actually shows
                </p>
                <p className="text-sm text-foreground leading-relaxed">{result.contextual.image_description}</p>
              </div>
            )}

            {/* Signals + sources */}
            {result.contextual && !result.contextual.error && result.contextual.signals.length > 0 && (
              <div className="rounded-xl p-5 space-y-3 bg-muted border border-border">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Key signals</p>
                <div className="flex flex-wrap gap-2">
                  {result.contextual.signals.map((signal, i) => (
                    <Badge key={i} variant="muted" className="text-xs">{signal}</Badge>
                  ))}
                </div>
              </div>
            )}

            {result.contextual && !result.contextual.error && result.contextual.sources.length > 0 && (
              <div className="rounded-xl p-5 space-y-3 bg-muted border border-border">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sources</p>
                <div className="flex flex-col gap-1.5">
                  {result.contextual.sources.map((src, i) => {
                    let hostname = src
                    try { hostname = new URL(src).hostname.replace('www.', '') } catch { /* keep raw */ }
                    return (
                      <a
                        key={i}
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-cyan hover:underline"
                      >
                        <ExternalLink size={11} />
                        {hostname}
                      </a>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Axis detail cards (no prominent scores — those go below) */}
            {(result.authenticity || result.contextual) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.authenticity && (
                  <div className="rounded-xl p-5 space-y-3 border" style={{
                    background: result.authenticity.error ? 'var(--muted)' : verdictBg(result.authenticity.verdict),
                    borderColor: result.authenticity.error ? 'var(--border)' : verdictBorder(result.authenticity.verdict),
                  }}>
                    <div className="flex items-center gap-2">
                      {result.authenticity.error
                        ? <ShieldAlert className="w-5 h-5 text-amber-400" />
                        : <AuthenticityIcon verdict={result.authenticity.verdict} />
                      }
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Axis 1 — Authenticity</span>
                    </div>

                    {result.authenticity.error ? (
                      <p className="text-xs text-muted-foreground">{result.authenticity.error}</p>
                    ) : (
                      <>
                        <p className={`text-lg font-bold ${verdictColor(result.authenticity.verdict)}`}>
                          {result.authenticity.verdict === 'AI_GENERATED' ? 'Likely AI-generated'
                            : result.authenticity.verdict === 'HUMAN' ? 'Likely authentic'
                            : 'Uncertain'}
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{result.authenticity.explanation}</p>
                        {result.authenticity.frame_scores && result.authenticity.frame_scores.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Frames: {result.authenticity.frame_scores.length} · Peak AI score: {Math.round((result.authenticity.max_score ?? 0) * 100)}%
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {result.contextual && (
                  <div className="rounded-xl p-5 space-y-3 border" style={{
                    background: result.contextual.error ? 'var(--muted)' : verdictBg(result.contextual.verdict),
                    borderColor: result.contextual.error ? 'var(--border)' : verdictBorder(result.contextual.verdict),
                  }}>
                    <div className="flex items-center gap-2">
                      {result.contextual.error
                        ? <HelpCircle className="w-5 h-5 text-amber-400" />
                        : <ContextIcon verdict={result.contextual.verdict} />
                      }
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Axis 2 — Context</span>
                    </div>

                    {result.contextual.error ? (
                      <p className="text-xs text-muted-foreground">{result.contextual.error}</p>
                    ) : (
                      <>
                        <p className={`text-lg font-bold ${verdictColor(result.contextual.verdict)}`}>
                          {result.contextual.verdict === 'CONSISTENT' ? 'Claim matches content'
                            : result.contextual.verdict === 'MISLEADING' ? 'Claim does not match'
                            : 'Could not verify'}
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {overall.showMisleadingDetail && result.contextual.verdict === 'MISLEADING'
                            ? 'Full reasoning is in the summary above.'
                            : result.contextual.explanation}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {result.source && (
              <div className="rounded-xl p-5 space-y-3 border" style={{
                  background: result.source.error ? 'var(--muted)' : verdictBg(result.source.verdict),
                  borderColor: result.source.error ? 'var(--border)' : verdictBorder(result.source.verdict),
                }}>
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-cyan" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Axis 3 — Source</span>
                </div>
                {result.source.error ? (
                  <p className="text-xs text-muted-foreground">{result.source.error}</p>
                ) : (
                  <>
                    <p className={`text-lg font-bold ${verdictColor(result.source.verdict)}`}>
                      {result.source.verdict === 'CONSISTENT' ? 'Source looks credible'
                        : result.source.verdict === 'MISLEADING' ? 'Source unreliable'
                        : 'Could not verify source'}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{result.source.explanation}</p>
                    {result.source.signals.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {result.source.signals.map((s, i) => (
                          <Badge key={i} variant="muted" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Scores at bottom */}
            <div className="rounded-xl p-5 space-y-5 bg-muted border border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Detailed scores</p>

              {result.authenticity && !result.authenticity.error && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">AI-generation likelihood (Axis 1)</span>
                    <span className="font-mono text-foreground">{Math.round(result.authenticity.confidence * 100)}%</span>
                  </div>
                  <ConfidenceBar confidence={result.authenticity.confidence} />
                </div>
              )}

              {result.contextual && !result.contextual.error && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Claim vs. content match (Axis 2)</span>
                    <span className="font-mono text-foreground">{result.contextual.consistency_score}/100</span>
                  </div>
                  <ScoreBar score={result.contextual.consistency_score} />
                </div>
              )}

              {result.source && !result.source.error && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Source credibility (Axis 3)</span>
                    <span className="font-mono text-foreground">{result.source.consistency_score}/100</span>
                  </div>
                  <ScoreBar score={result.source.consistency_score} />
                </div>
              )}
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setResult(null); setFile(null); setContext(''); setSourceUrl(''); setError('') }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
              >
                Start a new analysis
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
