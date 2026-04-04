'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Image, Video, Music, FileText, AlertCircle, Zap, Shield, CheckCircle, Loader2 } from 'lucide-react'
import InteractiveBackground from '../../components/InteractiveBackground'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const router = useRouter()

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY })
  }

  const validateFile = (selectedFile: File): boolean => {
    const maxSize = 100 * 1024 * 1024 // 100MB in bytes
    
    // Check file size
    if (selectedFile.size > maxSize) {
      setError(`File too large. Maximum size is 100MB. Your file is ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`)
      return false
    }
    
    // Check file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac',
      'application/pdf'
    ]
    
    if (!allowedTypes.includes(selectedFile.type)) {
      setError(`File type not supported. Please upload an image, video, audio, or PDF file.`)
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

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleUpload = async () => {
    if (!file) return
    
    // Double-check file size before upload
    if (!validateFile(file)) {
      return
    }

    setUploading(true)
    setError('')

    try {
      // Step 1: Upload file
      const formData = new FormData()
      formData.append('file', file)

      const token = localStorage.getItem('token')
      const uploadRes = await fetch('http://localhost:4000/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const uploadData = await uploadRes.json()

      // Step 2: Create analysis job
      const mediaType = file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('video/') ? 'video'
        : file.type.startsWith('audio/') ? 'audio'
        : 'document'

      const analyzeRes = await fetch('http://localhost:4000/api/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file_url: uploadData.file_url,
          media_type: mediaType
        })
      })

      if (!analyzeRes.ok) {
        const errorData = await analyzeRes.json()
        throw new Error(errorData.error || 'Analysis creation failed')
      }

      const analyzeData = await analyzeRes.json()

      // Step 3: Redirect to result page
      router.push(`/result/${analyzeData.job_id}`)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const getFileIcon = () => {
    if (!file) return Upload
    if (file.type.startsWith('image/')) return Image
    if (file.type.startsWith('video/')) return Video
    if (file.type.startsWith('audio/')) return Music
    if (file.type.includes('pdf')) return FileText
    return FileText
  }

  return (
    <div className="min-h-screen bg-grid relative overflow-hidden" onMouseMove={handleMouseMove}>
      {/* Interactive particle background */}
      <InteractiveBackground />
      
      {/* Gradient orbs background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16 relative z-10">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <h1 
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const x = e.clientX - rect.left - rect.width / 2
              const y = e.clientY - rect.top - rect.height / 2
              e.currentTarget.style.transform = `perspective(1000px) rotateX(${-y / 30}deg) rotateY(${x / 30}deg)`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)'
            }}
            className="text-6xl font-bold gradient-text-cyan transition-all duration-200 cursor-default hover:drop-shadow-[0_0_30px_rgba(0,212,255,0.5)]"
            style={{ transformStyle: 'preserve-3d' }}
          >
            AI Detection Scanner
          </h1>
          <p 
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const x = e.clientX - rect.left - rect.width / 2
              const y = e.clientY - rect.top - rect.height / 2
              e.currentTarget.style.transform = `perspective(1000px) rotateX(${-y / 40}deg) rotateY(${x / 40}deg)`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)'
            }}
            className="text-xl text-slate-400 hover:text-slate-300 transition-all duration-200 cursor-default hover:drop-shadow-[0_0_20px_rgba(139,92,246,0.4)]"
            style={{ transformStyle: 'preserve-3d' }}
          >
            Upload your media for instant deepfake analysis
          </p>
        </div>

        {/* Main Upload Card */}
        <div className="glass-card rounded-2xl p-8 mb-6">
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById('file-input')?.click()}
            className={`
              relative overflow-hidden rounded-xl p-16 text-center cursor-pointer
              transition-all duration-300 ease-out group
              ${isDragging 
                ? 'border-2 border-cyan-500 bg-cyan-500/5 scale-[1.02]' 
                : file 
                  ? 'border-2 border-purple-500/30 bg-purple-500/5'
                  : 'border-2 border-dashed border-slate-700 hover:border-cyan-500/50 hover:bg-cyan-500/5'
              }
            `}
          >
            {/* Animated background effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Scan line effect when file is uploaded */}
            {file && !uploading && (
              <div className="scan-line" />
            )}

            {file ? (
              <div className="relative z-10 space-y-4">
                <div className="flex justify-center animate-bounce">
                  {(() => {
                    const Icon = getFileIcon()
                    return <Icon className="w-24 h-24 text-cyan-400" strokeWidth={1.5} />
                  })()}
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-white">{file.name}</p>
                  <div className="flex items-center justify-center gap-4 text-slate-400">
                    <span className={`text-lg ${file.size > 100 * 1024 * 1024 ? 'text-red-400 font-bold' : ''}`}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-lg capitalize">{file.type.split('/')[0]}</span>
                  </div>
                  {file.size > 100 * 1024 * 1024 && (
                    <p className="text-sm text-red-400 mt-2">
                      ⚠️ File exceeds 100MB limit
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                  }}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = e.clientX - rect.left - rect.width / 2
                    const y = e.clientY - rect.top - rect.height / 2
                    e.currentTarget.style.transform = `perspective(1000px) rotateX(${-y / 10}deg) rotateY(${x / 10}deg)`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)'
                  }}
                  className="mt-4 px-4 py-2 text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-cyan-500 hover:shadow-lg hover:shadow-cyan-500/30 rounded-lg transition-all duration-200"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  Remove File
                </button>
              </div>
            ) : (
              <div className="relative z-10 space-y-6">
                <div className="flex justify-center animate-float">
                  <Upload className="w-24 h-24 text-cyan-400" strokeWidth={1.5} />
                </div>
                <div className="space-y-3">
                  <p className="text-3xl font-bold text-white">
                    {isDragging ? 'Drop it here!' : 'Drop your file here'}
                  </p>
                  <p className="text-lg text-slate-400">
                    or click to browse your files
                  </p>
                </div>
                
                {/* Supported formats */}
                <div className="flex flex-wrap justify-center gap-3 pt-4">
                  {['Images', 'Videos', 'Audio', 'PDFs'].map((type) => (
                    <span
                      key={type}
                      className="px-4 py-2 text-sm bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300"
                    >
                      {type}
                    </span>
                  ))}
                </div>
                
                <p className="text-sm text-slate-500 pt-2">
                  Maximum file size: <span className="text-cyan-400 font-semibold">100MB</span>
                </p>
              </div>
            )}

            <input
              id="file-input"
              type="file"
              onChange={handleFileChange}
              accept="image/*,video/*,audio/*,.pdf"
              className="hidden"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-red-400">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Upload Button */}
        {file && (
          <div className="text-center space-y-6">
            <button
              onClick={handleUpload}
              disabled={uploading}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const x = e.clientX - rect.left - rect.width / 2
                const y = e.clientY - rect.top - rect.height / 2
                e.currentTarget.style.transform = `perspective(1000px) rotateX(${-y / 20}deg) rotateY(${x / 20}deg) scale(1.05)`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)'
              }}
              className={`
                relative group px-12 py-5 rounded-xl text-lg font-bold
                bg-gradient-to-r from-cyan-500 to-blue-500
                hover:from-cyan-400 hover:to-blue-400
                disabled:from-slate-700 disabled:to-slate-600
                text-black hover:text-black
                shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/80
                disabled:shadow-none
                transition-all duration-200 ease-out
                disabled:cursor-not-allowed
                overflow-hidden
              `}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Button shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              
              {/* Interactive glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 blur-xl" />
              </div>
              
              <span className="relative z-10 flex items-center gap-3">
                {uploading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6" />
                    Start Analysis
                  </>
                )}
              </span>
            </button>

            {/* Info text */}
            <p className="text-sm text-slate-500">
              Your file will be analyzed using advanced AI detection models
            </p>
          </div>
        )}

        {/* Features grid */}
        {!file && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
            {[
              { icon: Zap, title: 'Fast Analysis', desc: 'Results in seconds' },
              { icon: Shield, title: 'Secure Upload', desc: 'End-to-end encrypted' },
              { icon: CheckCircle, title: 'High Accuracy', desc: '99%+ detection rate' },
            ].map((feature, i) => {
              const Icon = feature.icon
              return (
                <div
                  key={i}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = e.clientX - rect.left - rect.width / 2
                    const y = e.clientY - rect.top - rect.height / 2
                    e.currentTarget.style.transform = `perspective(1000px) rotateX(${-y / 15}deg) rotateY(${x / 15}deg) scale(1.05)`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)'
                  }}
                  className="glass-card rounded-xl p-6 text-center space-y-2 transition-all duration-200"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="flex justify-center mb-3">
                    <Icon className="w-12 h-12 text-cyan-400" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-bold text-white">{feature.title}</h3>
                  <p className="text-sm text-slate-400">{feature.desc}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
