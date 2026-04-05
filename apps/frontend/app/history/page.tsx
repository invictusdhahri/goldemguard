'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowLeft,
  ArrowRight,
  Upload,
  Eye,
  ImageIcon,
  Video,
  Music,
  FileText,
  RefreshCw,
} from 'lucide-react'
import InteractiveBackground from '@/components/InteractiveBackground'
import Button from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const API_HISTORY = 'http://localhost:4000/api/history'

interface Analysis {
  job_id: string
  media_type: string
  file_url?: string
  status: string
  verdict?: string
  confidence?: number
  created_at: string
  completed_at?: string
}

interface HistoryApiItem {
  id: string
  file_url?: string
  media_type: string
  status: string
  created_at: string
  completed_at?: string | null
  result?: {
    verdict: string
    confidence: number
    explanation?: string
    processing_ms?: number
  } | null
}

interface HistoryApiResponse {
  items: HistoryApiItem[]
  limit: number
  offset: number
}

function verdictForDisplay(apiVerdict?: string | null): string | undefined {
  if (!apiVerdict) return undefined
  if (apiVerdict === 'AI_GENERATED') return 'FAKE'
  if (apiVerdict === 'HUMAN') return 'REAL'
  if (apiVerdict === 'UNCERTAIN') return 'UNCERTAIN'
  return apiVerdict
}

function mapItemToAnalysis(item: HistoryApiItem): Analysis {
  const r = item.result
  return {
    job_id: item.id,
    media_type: item.media_type,
    file_url: item.file_url,
    status: item.status,
    verdict: verdictForDisplay(r?.verdict),
    confidence: typeof r?.confidence === 'number' ? r.confidence : undefined,
    created_at: item.created_at,
    completed_at: item.completed_at ?? undefined,
  }
}

function getVerdictBadgeVariant(verdict?: string) {
  if (!verdict) return 'muted' as const
  if (verdict === 'FAKE') return 'ai' as const
  if (verdict === 'REAL') return 'verified' as const
  return 'warning' as const
}

function getVerdictIcon(verdict?: string) {
  if (!verdict) return Clock
  if (verdict === 'FAKE') return XCircle
  if (verdict === 'REAL') return CheckCircle
  return AlertTriangle
}

function getMediaIcon(mediaType: string) {
  const t = mediaType.toLowerCase()
  if (t.includes('image')) return ImageIcon
  if (t.includes('video')) return Video
  if (t.includes('audio')) return Music
  return FileText
}

function AnalysisCardSkeleton() {
  return (
    <Card className="overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(18,18,32,0.9) 0%, rgba(13,13,26,0.95) 100%)" }}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="w-16 h-5 rounded-full" />
        </div>
        <Skeleton className="w-full h-36 rounded-lg" />
        <Skeleton className="w-24 h-7 rounded" />
        <Skeleton className="w-16 h-4 rounded" />
        <Skeleton className="w-20 h-3 rounded" />
      </CardContent>
    </Card>
  )
}

function AnalysisCard({ analysis, index }: { analysis: Analysis; index: number }) {
  const VerdictIcon = getVerdictIcon(analysis.verdict)
  const MediaIcon = getMediaIcon(analysis.media_type)
  const badgeVariant = getVerdictBadgeVariant(analysis.verdict)

  return (
    <Link href={`/result/${analysis.job_id}`}>
      <Card
        className="group overflow-hidden cursor-pointer hover:scale-[1.02] transition-all duration-200"
        style={{
          background: "linear-gradient(135deg, rgba(18,18,32,0.9) 0%, rgba(13,13,26,0.95) 100%)",
          animationDelay: `${index * 80}ms`,
        }}
      >
        <CardContent className="p-5 flex flex-col h-full gap-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <MediaIcon size={16} className="text-muted-foreground" />
            </div>
            <Badge variant="muted" className="capitalize text-[11px]">
              {analysis.media_type}
            </Badge>
          </div>

          {/* Media preview */}
          {analysis.file_url ? (
            <div className="h-36 w-full overflow-hidden rounded-lg bg-secondary/50 flex-shrink-0 relative">
              {analysis.media_type.toLowerCase().includes('video') ? (
                <video src={analysis.file_url} className="h-full w-full object-cover" muted loop playsInline />
              ) : analysis.media_type.toLowerCase().includes('audio') ? (
                <div className="flex h-full w-full items-center justify-center p-3">
                  <audio src={analysis.file_url} className="w-full" controls />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={analysis.file_url} alt="Media preview" className="h-full w-full object-cover" />
              )}
              {/* View overlay on hover */}
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Eye size={14} />
                  View Result
                </div>
              </div>
            </div>
          ) : (
            <div className="h-36 w-full rounded-lg bg-secondary/30 flex items-center justify-center border border-border/50">
              <MediaIcon size={32} className="text-muted-foreground/30" strokeWidth={1} />
            </div>
          )}

          {/* Verdict */}
          <div className="flex-1">
            {analysis.verdict ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <VerdictIcon
                    size={18}
                    className={cn(
                      analysis.verdict === 'FAKE' ? 'text-ai' :
                      analysis.verdict === 'REAL' ? 'text-verified' :
                      'text-warn'
                    )}
                  />
                  <Badge variant={badgeVariant} className="text-xs font-bold">
                    {analysis.verdict}
                  </Badge>
                </div>
                {analysis.confidence !== undefined && (
                  <p className="text-sm text-muted-foreground">
                    {Math.round(analysis.confidence * 100)}% confidence
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-muted-foreground" />
                <span className="text-sm capitalize text-muted-foreground">{analysis.status}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <Separator className="opacity-30" />
          <p className="text-xs text-muted-foreground/60">
            {new Date(analysis.created_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const router = useRouter()

  const LIMIT = 12

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      const offset = page * LIMIT
      const res = await fetch(`${API_HISTORY}?limit=${LIMIT}&offset=${offset}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? 'Failed to fetch history')
      }

      const data = (await res.json()) as HistoryApiResponse
      const items = Array.isArray(data.items) ? data.items : []
      setAnalyses(items.map(mapItemToAnalysis))
      setHasMore(items.length === LIMIT)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }, [page, router])

  useEffect(() => { void fetchHistory() }, [fetchHistory])

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <InteractiveBackground />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </Link>
            <h1 className="gradient-text-cyan text-4xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              Analysis History
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchHistory()}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Link href="/upload">
              <Button size="sm">
                <Upload className="h-4 w-4" />
                New Analysis
              </Button>
            </Link>
          </div>
        </div>

        {/* Content */}
        {loading && analyses.length === 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <AnalysisCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <Card className="p-10 text-center" style={{ background: "linear-gradient(135deg, rgba(18,18,32,0.9) 0%, rgba(13,13,26,0.95) 100%)" }}>
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-warn" />
            <p className="text-foreground font-semibold mb-1">Failed to load history</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => fetchHistory()}>
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </Card>
        ) : analyses.length === 0 ? (
          <Card className="p-14 text-center" style={{ background: "linear-gradient(135deg, rgba(18,18,32,0.9) 0%, rgba(13,13,26,0.95) 100%)" }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-secondary border border-border">
              <Clock className="h-8 w-8 text-muted-foreground" strokeWidth={1} />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              No Analyses Yet
            </h2>
            <p className="mb-6 text-muted-foreground">Upload your first file to get started.</p>
            <Link href="/upload">
              <Button>
                <Upload className="h-4 w-4" />
                Start Analyzing
              </Button>
            </Link>
          </Card>
        ) : (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {[
                { label: 'Total', value: page * LIMIT + analyses.length + (hasMore ? '+' : ''), color: '#00d4ff' },
                { label: 'AI Generated', value: analyses.filter(a => a.verdict === 'FAKE').length, color: '#f43f5e' },
                { label: 'Authentic', value: analyses.filter(a => a.verdict === 'REAL').length, color: '#10b981' },
                { label: 'Uncertain', value: analyses.filter(a => a.verdict === 'UNCERTAIN').length, color: '#f59e0b' },
              ].map((stat) => (
                <Card key={stat.label} className="p-4 text-center" style={{ background: "rgba(13,13,26,0.8)" }}>
                  <div className="text-2xl font-bold mb-0.5" style={{ color: stat.color, fontFamily: 'var(--font-display)' }}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {analyses.map((analysis, i) => (
                <AnalysisCard key={analysis.job_id} analysis={analysis} index={i} />
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-10 flex justify-center gap-3">
              <Button
                variant="secondary"
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center px-4 text-sm text-muted-foreground">
                Page {page + 1}
              </div>
              <Button
                variant="secondary"
                disabled={!hasMore || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
