'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, LogIn, UserPlus, ArrowLeft, Shield, Mail, Lock, CheckCircle } from 'lucide-react'
import InteractiveBackground from '@/components/InteractiveBackground'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Separator } from '@/components/ui/separator'

const FEATURES = [
  'Multi-model AI detection',
  'Zero data retention',
  'Real-time analysis',
]

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/+$/, '')
    const path = isLogin ? '/auth/login' : '/auth/register'

    try {
      const response = await fetch(`${apiBase}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const raw = await response.text()
      let data: { error?: string; session?: { access_token?: string }; user?: unknown }
      try {
        data = JSON.parse(raw) as typeof data
      } catch {
        throw new Error(
          !response.ok
            ? 'Server did not return JSON — check NEXT_PUBLIC_API_URL and that the backend is running.'
            : 'Invalid response from server',
        )
      }

      if (!response.ok) throw new Error(data.error || 'Authentication failed')

      if (isLogin) {
        localStorage.setItem('token', data.session?.access_token || '')
        localStorage.setItem('user', JSON.stringify(data.user || {}))
        setSuccess('Login successful! Redirecting...')
        setTimeout(() => router.push('/upload'), 1200)
      } else {
        setSuccess('Account created! Check your email for confirmation.')
        setIsLogin(true)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const isNetwork =
        msg === 'Failed to fetch' ||
        msg.includes('NetworkError') ||
        msg.includes('Load failed') ||
        (err instanceof TypeError && msg.toLowerCase().includes('fetch'))
      if (isNetwork) {
        setError(
          `Cannot reach the API at ${apiBase}. Start the backend (port 4000: run "pnpm dev" from the repo root or start @veritas/backend), then retry. If the API runs elsewhere, set NEXT_PUBLIC_API_URL in apps/frontend/.env.local and restart the dev server.`,
        )
      } else {
        setError(msg || 'Something went wrong')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <main className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
      <InteractiveBackground />

      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none" style={{ background: "rgba(0,212,255,0.07)" }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none" style={{ background: "rgba(139,92,246,0.07)", animationDelay: '2s' }} />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo & back */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-cyan transition-colors mb-6 group text-sm font-medium">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>

          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan/20 blur-xl rounded-full" />
              <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center bg-cyan/10 border border-cyan/25">
                <Shield className="w-7 h-7 text-cyan" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            <span className="gradient-text-cyan">Veritas</span>
            <span className="text-foreground">AI</span>
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            {isLogin ? 'Secure access to your dashboard' : 'Join the frontier of AI transparency'}
          </p>

          {/* Feature pills */}
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            {FEATURES.map((f) => (
              <span key={f} className="text-xs text-muted-foreground/60 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-cyan/50" />
                {f}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 120 }}
          className="relative rounded-2xl p-7 shadow-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(18,18,32,0.95) 0%, rgba(13,13,26,0.98) 100%)",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 0 60px rgba(0,212,255,0.06), 0 25px 50px rgba(0,0,0,0.4)",
          }}
        >
          {/* Top accent */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan/30 to-transparent" />

          {/* Tab switcher */}
          <div className="flex rounded-xl p-1 mb-6 bg-secondary/50">
            {['Sign In', 'Register'].map((tab, i) => (
              <button
                key={tab}
                type="button"
                onClick={() => { setIsLogin(i === 0); setError(''); setSuccess('') }}
                className={`flex-1 py-2 px-4 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  isLogin === (i === 0)
                    ? 'bg-card text-foreground shadow-sm border border-border/50'
                    : 'text-muted-foreground hover:text-secondary-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@company.com"
              icon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isLogin ? "current-password" : "new-password"}
              hint={!isLogin ? "At least 8 characters" : undefined}
            />

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, height: 0, y: -8 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl p-3.5 flex items-start gap-2.5 bg-destructive/10 border border-destructive/20 text-destructive"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </motion.div>
              )}

              {success && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, height: 0, y: -8 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl p-3.5 flex items-start gap-2.5 bg-verified/10 border border-verified/20 text-verified"
                >
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{success}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
              {isLogin
                ? <><LogIn className="w-4 h-4" /> Sign In</>
                : <><UserPlus className="w-4 h-4" /> Create Account</>
              }
            </Button>
          </form>

          <Separator className="my-5 opacity-30" />

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess('') }}
              className="ml-1.5 text-cyan font-semibold hover:text-cyan/80 transition-colors"
            >
              {isLogin ? 'Join Now' : 'Sign In'}
            </button>
          </p>
        </motion.div>

        {/* Legal links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 flex justify-center gap-6"
        >
          <Link href="/terms" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">Terms</Link>
          <span className="text-muted-foreground/20 text-xs">·</span>
          <Link href="/privacy" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">Privacy</Link>
        </motion.div>
      </div>
    </main>
  )
}
