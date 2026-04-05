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
} from 'lucide-react'
import InteractiveBackground from '@/components/InteractiveBackground'
import Button from '@/components/ui/Button'
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

/** Map API verdicts to UI labels used by icons/colors. */
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
      const res = await fetch(
        `${API_HISTORY}?limit=${LIMIT}&offset=${offset}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

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

  useEffect(() => {
    void fetchHistory()
  }, [fetchHistory])

  const getVerdictIcon = (verdict?: string) => {
    if (!verdict) return Clock
    if (verdict === 'FAKE') return XCircle
    if (verdict === 'REAL') return CheckCircle
    return AlertTriangle
  }

  const getVerdictColor = (verdict?: string) => {
    if (!verdict) return 'text-slate-400'
    if (verdict === 'FAKE') return 'text-red-400'
    if (verdict === 'REAL') return 'text-green-400'
    return 'text-yellow-400'
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-grid">
      <InteractiveBackground />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className={cn(
              'btn-ghost inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-[15px] font-semibold no-underline'
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <h1 className="gradient-text-cyan mb-8 text-5xl font-bold">Analysis History</h1>

        {loading && analyses.length === 0 ? (
          <div className="py-20 text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
            <p className="mt-4 text-slate-400">Loading history...</p>
          </div>
        ) : error ? (
          <div className="glass-card rounded-xl p-8 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        ) : analyses.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <Clock className="mx-auto mb-4 h-16 w-16 text-slate-600" />
            <h2 className="mb-2 text-2xl font-bold text-white">No Analyses Yet</h2>
            <p className="mb-6 text-slate-400">Upload your first file to get started!</p>
            <Link
              href="/upload"
              className="btn-primary inline-flex items-center justify-center gap-2 rounded-lg px-7 py-3 no-underline"
            >
              Start Analyzing
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {analyses.map((analysis, i) => {
                const Icon = getVerdictIcon(analysis.verdict)
                const color = getVerdictColor(analysis.verdict)

                return (
                  <Link key={analysis.job_id} href={`/result/${analysis.job_id}`}>
                    <div
                      className="glass-card cursor-pointer rounded-xl p-6 transition-all duration-200 hover:scale-[1.02] flex flex-col h-full"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <Icon className={cn('h-8 w-8', color)} />
                        <span className="text-xs capitalize text-slate-500">
                          {analysis.media_type}
                        </span>
                      </div>

                      {analysis.file_url ? (
                        <div className="mb-4 h-40 w-full overflow-hidden rounded-lg bg-slate-800/50 flex-shrink-0">
                          {analysis.media_type.toLowerCase().includes('video') ? (
                            <video src={analysis.file_url} className="h-full w-full object-cover" muted loop playsInline />
                          ) : analysis.media_type.toLowerCase().includes('audio') ? (
                            <div className="flex h-full w-full items-center justify-center p-4">
                              <audio src={analysis.file_url} className="w-full" controls />
                            </div>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={analysis.file_url} alt="Media preview" className="h-full w-full object-cover" />
                          )}
                        </div>
                      ) : null}

                      <div className="flex-1">
                        {analysis.verdict ? (
                          <>
                            <h3 className={cn('mb-2 text-2xl font-bold', color)}>
                              {analysis.verdict}
                            </h3>
                            <p className="mb-4 text-slate-400">
                              {Math.round((analysis.confidence || 0) * 100)}% Confidence
                            </p>
                          </>
                        ) : (
                          <h3 className="mb-4 text-xl font-semibold capitalize text-slate-400">
                            {analysis.status}
                          </h3>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 mt-auto pt-4">
                        {new Date(analysis.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            <div className="mt-8 flex justify-center gap-4">
              <Button
                variant="secondary"
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
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
