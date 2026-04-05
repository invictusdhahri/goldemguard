'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, ImageIcon, Video, Music, FileText, Zap, Shield, CheckCircle, Loader2, X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import InteractiveBackground from '../../components/InteractiveBackground'
import { useAuth } from '@/hooks/useAuth'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const SUPPORTED_TYPES = [
  { label: 'Images', ext: 'JPG, PNG, WebP', icon: ImageIcon, color: '#00d4ff' },
  { label: 'Videos', ext: 'MP4, MOV, WebM', icon: Video, color: '#8b5cf6' },
  { label: 'Audio', ext: 'MP3, WAV, FLAC', icon: Music, color: '#10b981' },
  { label: 'Documents', ext: 'PDF, DOCX', icon: FileText, color: '#f59e0b' },
]

const FEATURES = [
  { icon: Zap, title: 'Instant Analysis', desc: 'Results in under 2 seconds' },
  { icon: Shield, title: 'Secure & Private', desc: 'Zero data retention policy' },
  { icon: CheckCircle, title: '94%+ Accuracy', desc: 'Multi-model ensemble' },
]

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    supabase.auth.getSession().then((result: { data: { session: Session | null } }) => {
      const session = result.data.session
      if (session?.access_token) {
        localStorage.setItem('token', session.access_token)
      }
    })
  }, [user, authLoading, router])

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

  const validateFile = (selectedFile: File): boolean => {
    const maxSize = 100 * 1024 * 1024
    if (selectedFile.size > maxSize) {
      setError(`File too large. Maximum size is 100MB. Your file is ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`)
      return false
    }
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ]
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('File type not supported. Please upload an image, video, audio, PDF, or Word document.')
      return false
    }
    return true
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (validateFile(selectedFile)) {
        setFile(selectedFile)
        setError('')
      }
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0]
      if (validateFile(selectedFile)) {
        setFile(selectedFile)
        setError('')
      }
    }
  }

  const handleUpload = async () => {
    if (!file || !validateFile(file)) return

    setUploading(true)
    setError('')
    setUploadProgress(10)

    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'

    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = localStorage.getItem('token')
      setUploadProgress(30)

      const uploadRes = await fetch(`${apiBase}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })

      setUploadProgress(60)

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const uploadData = await uploadRes.json()

      const mediaType = file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('video/') ? 'video'
        : file.type.startsWith('audio/') ? 'audio'
        : 'document'

      const analyzeRes = await fetch(`${apiBase}/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ file_url: uploadData.file_url, media_type: mediaType })
      })

      setUploadProgress(90)

      if (!analyzeRes.ok) {
        const errorData = await analyzeRes.json()
        throw new Error(errorData.error || 'Analysis creation failed')
      }

      const analyzeData = await analyzeRes.json()
      setUploadProgress(100)

      setTimeout(() => router.push(`/result/${analyzeData.job_id}`), 300)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const getFileIcon = () => {
    if (!file) return Upload
    if (file.type.startsWith('image/')) return ImageIcon
    if (file.type.startsWith('video/')) return Video
    if (file.type.startsWith('audio/')) return Music
    return FileText
  }

  const getMediaBadgeVariant = () => {
    if (!file) return 'muted' as const
    if (file.type.startsWith('image/')) return 'cyan' as const
    if (file.type.startsWith('video/')) return 'purple' as const
    if (file.type.startsWith('audio/')) return 'verified' as const
    return 'warning' as const
  }

  const FileIcon = getFileIcon()

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <InteractiveBackground />

      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: "rgba(0,212,255,0.06)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: "rgba(139,92,246,0.06)", animationDelay: '1s' }} />
      </div>

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
          <h1 className="text-5xl font-bold gradient-text-cyan mb-3" style={{ fontFamily: 'var(--font-display)' }}>
            AI Detection Scanner
          </h1>
          <p className="text-muted-foreground text-lg">
            Upload your media for instant deepfake and AI-generation analysis
          </p>
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <X className="h-4 w-4 flex-shrink-0" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Upload progress */}
        {uploading && (
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Uploading and analyzing...</span>
              <span className="text-cyan font-mono">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} variant="gradient" />
          </div>
        )}

        {/* Main Upload Card */}
        <Card className="mb-6 overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(18,18,32,0.9) 0%, rgba(13,13,26,0.95) 100%)" }}>
          <CardContent className="p-6">
            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => document.getElementById('file-input')?.click()}
              className={`
                relative overflow-hidden rounded-xl p-12 text-center cursor-pointer
                transition-all duration-300 ease-out group
                ${isDragging
                  ? 'border-2 border-cyan scale-[1.01]'
                  : file
                    ? 'border-2 border-purple/30'
                    : 'border-2 border-dashed border-border hover:border-cyan/40'
                }
              `}
              style={{
                background: isDragging
                  ? 'rgba(0,212,255,0.04)'
                  : file
                    ? 'rgba(139,92,246,0.04)'
                    : 'transparent',
              }}
            >
              {/* Hover gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 via-transparent to-purple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* Scan line when file selected */}
              {file && !uploading && <div className="scan-line" />}

              {file ? (
                <div className="relative z-10 space-y-4">
                  <div className="flex justify-center" style={{ animation: uploading ? undefined : "float 4s ease-in-out infinite" }}>
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)" }}>
                      <FileIcon className="w-10 h-10 text-cyan" strokeWidth={1.5} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xl font-bold text-foreground truncate max-w-xs mx-auto">{file.name}</p>
                    <div className="flex items-center justify-center gap-3">
                      <Badge variant={getMediaBadgeVariant()}>
                        {file.type.split('/')[0]}
                      </Badge>
                      <span className={`text-sm ${file.size > 100 * 1024 * 1024 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); setError('') }}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-border/80 rounded-lg transition-all"
                  >
                    <X size={12} />
                    Remove
                  </button>
                </div>
              ) : (
                <div className="relative z-10 space-y-5">
                  <div className="flex justify-center" style={{ animation: "float 6s ease-in-out infinite" }}>
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.15)" }}>
                      <Upload className="w-10 h-10 text-cyan" strokeWidth={1.5} />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground mb-1">
                      {isDragging ? 'Drop it here!' : 'Drop your file here'}
                    </p>
                    <p className="text-muted-foreground">or click to browse your files</p>
                  </div>

                  {/* Supported formats */}
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {SUPPORTED_TYPES.map((type) => {
                      const Icon = type.icon
                      return (
                        <div key={type.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: `${type.color}0d`, border: `1px solid ${type.color}22`, color: type.color }}>
                          <Icon size={12} />
                          {type.label}
                        </div>
                      )
                    })}
                  </div>

                  <p className="text-xs text-muted-foreground/60">
                    Maximum: <span className="text-cyan font-semibold">100MB</span>
                  </p>
                </div>
              )}

              <input
                id="file-input"
                type="file"
                onChange={handleFileChange}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* Upload Button */}
        {file && !uploading && (
          <div className="text-center space-y-3 mb-8">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="relative group px-10 py-4 rounded-xl text-base font-bold bg-gradient-to-r from-cyan to-cyan-dim text-primary-foreground shadow-lg shadow-cyan/25 hover:shadow-cyan/45 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="relative z-10 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Start Analysis
              </span>
            </button>
            <p className="text-xs text-muted-foreground">
              Analyzed using multi-model AI detection — results in seconds
            </p>
          </div>
        )}

        {uploading && (
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-secondary/50 border border-border">
              <Loader2 className="w-5 h-5 text-cyan animate-spin" />
              <span className="font-semibold text-foreground">Analyzing your file...</span>
            </div>
          </div>
        )}

        {/* Feature cards */}
        {!file && (
          <>
            <Separator className="mb-8 opacity-30" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {FEATURES.map((feature) => {
                const Icon = feature.icon
                return (
                  <Card key={feature.title} className="p-5 text-center backdrop-blur-sm" style={{ background: "linear-gradient(135deg, rgba(18,18,32,0.8) 0%, rgba(13,13,26,0.9) 100%)" }}>
                    <div className="flex justify-center mb-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-cyan/10 border border-cyan/20">
                        <Icon className="w-6 h-6 text-cyan" strokeWidth={1.5} />
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-foreground mb-1">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
