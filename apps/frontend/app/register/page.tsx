'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { UserPlus, AlertCircle, Loader2, ArrowLeft, CheckCircle } from 'lucide-react'
export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) throw signUpError

      if (data.session) {
        localStorage.setItem('token', data.session.access_token)
        router.push('/upload')
      } else {
        setSuccess('Account created! Check your email to confirm, then sign in.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="relative z-10 mx-auto w-full max-w-md px-4">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-cyan"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="liquid-glass-card rounded-2xl p-8">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <UserPlus className="h-12 w-12 text-cyan" strokeWidth={1.5} />
            </div>
            <h1 className="gradient-text-cyan text-3xl font-bold">Create account</h1>
            <p className="mt-2 text-muted-foreground">Sign up to analyze media with GolemGuard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="register-email" className="mb-1.5 block text-sm font-medium text-foreground/80">
                Email
              </label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-input px-4 py-3 text-foreground placeholder-muted-foreground transition-colors focus:border-cyan focus:ring-1 focus:ring-cyan focus:outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="register-password" className="mb-1.5 block text-sm font-medium text-foreground/80">
                Password
              </label>
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-border bg-input px-4 py-3 text-foreground placeholder-muted-foreground transition-colors focus:border-cyan focus:ring-1 focus:ring-cyan focus:outline-none"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label
                htmlFor="register-confirm"
                className="mb-1.5 block text-sm font-medium text-foreground/80"
              >
                Confirm password
              </label>
              <input
                id="register-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-border bg-input px-4 py-3 text-foreground placeholder-muted-foreground transition-colors focus:border-cyan focus:ring-1 focus:ring-cyan focus:outline-none"
                placeholder="Re-enter password"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-verified/30 bg-verified/10 p-3">
                <div className="flex items-start gap-2 text-sm text-verified">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{success}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-xl px-6 py-3.5 text-base font-bold text-primary-foreground shadow-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              style={{ background: 'linear-gradient(135deg, var(--color-cyan) 0%, var(--color-cyan-dim) 100%)', boxShadow: '0 4px 24px var(--color-cyan-glow)' }}
            >
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <UserPlus className="h-5 w-5" />
                )}
                {loading ? 'Creating account...' : 'Create account'}
              </span>
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-cyan hover:text-cyan/80">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
