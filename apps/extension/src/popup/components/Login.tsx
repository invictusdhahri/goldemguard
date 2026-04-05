import React, { useState } from 'react';
import { Scan, Loader2, Eye, EyeOff } from 'lucide-react';

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function Login({ onLogin, loading, error }: Props) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      await onLogin(email, password);
    } catch {
      // error displayed via props
    }
  };

  return (
    <div className="flex flex-col items-center px-5 pt-8 pb-6 gap-6">
      {/* Logo */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)' }}
        >
          <Scan size={20} style={{ color: '#00d4ff' }} />
        </div>
        <p className="text-lg font-bold gradient-text-cyan" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
          GolemGuard
        </p>
        <p className="text-xs text-center max-w-[280px] leading-relaxed" style={{ color: '#64748b' }}>
          Sign in to analyze the current tab — works on Twitter/X, Facebook, and any site.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#e2e8f0',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.4)'; }}
          onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
        />

        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full rounded-lg px-3 py-2.5 pr-10 text-sm outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#e2e8f0',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.4)'; }}
            onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
            tabIndex={-1}
            style={{ color: '#64748b' }}
          >
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        {error && (
          <p className="text-xs px-1" style={{ color: '#fb7185' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !email || !password}
          className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
            color: '#07070e',
            boxShadow: '0 4px 20px rgba(0,212,255,0.25)',
          }}
        >
          {loading
            ? <><Loader2 size={15} className="animate-spin-ext" /> Signing in…</>
            : 'Sign in'
          }
        </button>
      </form>

      <p className="text-[10px] text-center" style={{ color: '#475569' }}>
        Don&apos;t have an account?{' '}
        <a
          href="https://goldemguard.vercel.app/register"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#00d4ff' }}
        >
          Sign up
        </a>
      </p>
    </div>
  );
}
