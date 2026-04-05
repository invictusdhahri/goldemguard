'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, LogIn, UserPlus, ArrowLeft, Shield, Mail, Lock } from 'lucide-react'
import InteractiveBackground from '@/components/InteractiveBackground'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // Prevent hydration mismatch for animations
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

    try {
      const response = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed')
      }

      if (isLogin) {
        // Save token and user info
        localStorage.setItem('token', data.session?.access_token || '')
        localStorage.setItem('user', JSON.stringify(data.user || {}))
        
        // Success feedback then redirect
        setSuccess('Login successful! Redirecting...')
        setTimeout(() => router.push('/upload'), 1500)
      } else {
        setSuccess('Registration successful! Check your email for confirmation.')
        setIsLogin(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <main className="min-h-screen bg-[#07070e] relative overflow-hidden flex items-center justify-center p-4">
      {/* Dynamic Backgrounds */}
      <InteractiveBackground />
      
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Header / Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors mb-6 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>
          
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full" />
              <Shield className="relative w-14 h-14 text-cyan-400" strokeWidth={1.5} />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="gradient-text-cyan">Veritas</span>
            <span className="text-white">AI</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            {isLogin ? 'Secure access to your dashboard' : 'Join the frontier of AI transparency'}
          </p>
        </motion.div>

        {/* glass-card container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className="glass-card rounded-3xl p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle top border glow for the card */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <Input
              label="Email Address"
              type="email"
              placeholder="name@company.com"
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
            />

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3 text-green-400"
                >
                  <Shield className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-medium">{success}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <Button type="submit" loading={loading} className="w-full h-12">
              {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          {/* Footer of the card */}
          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-slate-400 text-sm">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError('')
                  setSuccess('')
                }}
                className="ml-2 text-cyan-400 font-semibold hover:text-cyan-300 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded px-1"
              >
                {isLogin ? 'Join Now' : 'Sign In'}
              </button>
            </p>
          </div>
        </motion.div>

        {/* Legal / Extra Links */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex justify-center gap-6"
        >
          <Link href="/terms" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Privacy Policy</Link>
        </motion.div>
      </div>
    </main>
  )
}
