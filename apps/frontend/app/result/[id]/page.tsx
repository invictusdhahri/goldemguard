'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(
  /\/$/,
  '',
)

interface Result {
  verdict: 'REAL' | 'FAKE' | 'UNCERTAIN'
  confidence: number
  explanation: string
  top_signals: string[]
  model_scores: Record<string, number>
  processing_ms: number
}

interface StatusPayload {
  status: 'pending' | 'processing' | 'done' | 'failed'
}

interface ApiResultPayload {
  verdict: string
  confidence: number
  explanation: string
  top_signals?: string[]
  model_scores?: Record<string, number>
  processing_ms?: number
}

function mapApiVerdictToDisplay(v: string): Result['verdict'] {
  if (v === 'AI_GENERATED') return 'FAKE'
  if (v === 'HUMAN') return 'REAL'
  return 'UNCERTAIN'
}

function normalizeResult(raw: ApiResultPayload): Result {
  const scores = raw.model_scores ?? {}
  const cleaned: Record<string, number> = {}
  for (const [k, v] of Object.entries(scores)) {
    if (typeof v === 'number' && !Number.isNaN(v)) cleaned[k] = v
  }
  return {
    verdict: mapApiVerdictToDisplay(raw.verdict),
    confidence: typeof raw.confidence === 'number' ? raw.confidence : 0,
    explanation: raw.explanation ?? '',
    top_signals: Array.isArray(raw.top_signals) ? raw.top_signals : [],
    model_scores: cleaned,
    processing_ms: typeof raw.processing_ms === 'number' ? raw.processing_ms : 0,
  }
}

export default function ResultPage() {
  const params = useParams()
  const jobId = typeof params.id === 'string' ? params.id : ''

  const [status, setStatus] = useState<'pending' | 'processing' | 'done' | 'failed'>('pending')
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!jobId) {
      setError('Invalid job link')
      return
    }

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const pollStatus = async () => {
      if (cancelled) return

      const token = localStorage.getItem('token')
      if (!token) {
        setError('Not signed in. Log in and open this page again.')
        return
      }

      try {
        const statusRes = await fetch(`${API_BASE}/status/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        const statusText = await statusRes.text()
        let statusData: StatusPayload & { error?: string } = { status: 'pending' }
        try {
          statusData = statusText
            ? (JSON.parse(statusText) as StatusPayload & { error?: string })
            : statusData
        } catch {
          throw new Error('Invalid status response')
        }

        if (!statusRes.ok) {
          throw new Error(statusData.error || `Request failed (${statusRes.status})`)
        }

        if (cancelled) return
        setStatus(statusData.status)

        if (statusData.status === 'done') {
          const resultRes = await fetch(`${API_BASE}/result/${jobId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          const resultText = await resultRes.text()
          let resultJson: ApiResultPayload & { error?: string } = {} as ApiResultPayload
          try {
            resultJson = resultText
              ? (JSON.parse(resultText) as ApiResultPayload & { error?: string })
              : resultJson
          } catch {
            throw new Error('Invalid result response')
          }
          if (!resultRes.ok) {
            throw new Error(resultJson.error || `Request failed (${resultRes.status})`)
          }
          if (!cancelled) setResult(normalizeResult(resultJson))
          return
        }

        if (statusData.status === 'failed') {
          if (!cancelled) setError('Analysis failed')
          return
        }

        timeoutId = setTimeout(pollStatus, 2000)
      } catch {
        if (!cancelled) setError('Failed to fetch result')
      }
    }

    pollStatus()

    return () => {
      cancelled = true
      if (timeoutId !== null) clearTimeout(timeoutId)
    }
  }, [jobId])

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <div className="mb-4 text-6xl">❌</div>
        <h1 className="mb-4 text-3xl font-bold text-red-600">Error</h1>
        <p className="text-gray-600">{error}</p>
      </div>
    )
  }

  if (status !== 'done' || !result) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <div className="mb-4 animate-pulse text-6xl">🔍</div>
        <h1 className="mb-4 text-3xl font-bold">Analyzing...</h1>
        <p className="text-gray-600">
          Status: <span className="font-semibold">{status}</span>
        </p>
        <div className="mt-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
        </div>
      </div>
    )
  }

  const verdictColor =
    result.verdict === 'FAKE'
      ? 'text-red-600'
      : result.verdict === 'REAL'
        ? 'text-green-600'
        : 'text-yellow-600'

  const verdictEmoji =
    result.verdict === 'FAKE' ? '🚫' : result.verdict === 'REAL' ? '✅' : '⚠️'

  const confidencePct = Math.min(100, Math.max(0, result.confidence * 100))

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          <div className="mb-4 text-6xl">{verdictEmoji}</div>
          <h1 className={`mb-4 text-5xl font-bold ${verdictColor}`}>{result.verdict}</h1>
          <div className="mb-4 text-3xl">{Math.round(confidencePct)}% Confidence</div>
          <div className="mb-6 h-4 w-full rounded-full bg-gray-200">
            <div
              className="h-4 rounded-full bg-blue-600"
              style={{ width: `${confidencePct}%` }}
            />
          </div>
          <p className="text-xl text-gray-700">{result.explanation}</p>
        </div>
      </div>

      <div className="mb-8 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold">Detection Signals</h2>
        <ul className="space-y-2">
          {result.top_signals.map((signal, i) => (
            <li key={i} className="flex items-start">
              <span className="mr-2 text-blue-600">•</span>
              <span>{signal}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold">Model Breakdown</h2>
        {Object.entries(result.model_scores).map(([model, score]) => {
          const pct = Math.min(100, Math.max(0, score * 100))
          return (
            <div key={model} className="mb-4">
              <div className="mb-1 flex justify-between">
                <span className="font-semibold capitalize">{model.replace(/_/g, ' ')}</span>
                <span>{Math.round(pct)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-blue-600"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
        <p className="mt-4 text-sm text-gray-600">
          Analysis completed in {result.processing_ms}ms
        </p>
      </div>
    </div>
  )
}
