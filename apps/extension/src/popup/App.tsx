import React, { useEffect } from 'react';
import { Scan, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useItems } from './hooks/useItems';
import { Login } from './components/Login';
import { ItemList } from './components/ItemList';

export default function App() {
  const { loggedIn, email, loading: authLoading, error: authError, login, logout } = useAuth();
  const { items, reveals, scraping, scrapeError, scrape, rescrape, reveal } = useItems();

  // Auto-scrape after login
  useEffect(() => {
    if (loggedIn && !authLoading) {
      scrape();
    }
  }, [loggedIn, authLoading, scrape]);

  // ── Auth loading ────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height: 120 }}>
        <Loader2 size={22} className="animate-spin-ext" style={{ color: '#00d4ff' }} />
      </div>
    );
  }

  // ── Not logged in ───────────────────────────────────────────────────────────

  if (!loggedIn) {
    return (
      <div className="bg-grid" style={{ background: '#07070e' }}>
        <Login onLogin={login} loading={authLoading} error={authError} />
      </div>
    );
  }

  // ── Logged in ───────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col bg-grid"
      style={{ background: '#07070e', width: 380, maxHeight: 580, overflow: 'hidden' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}
          >
            <Scan size={13} style={{ color: '#00d4ff' }} />
          </div>
          <span
            className="text-sm font-bold gradient-text-cyan"
            style={{ fontFamily: '"Space Grotesk", sans-serif' }}
          >
            GolemGuard
          </span>
        </div>

        <div className="flex items-center gap-3">
          {email && (
            <span className="text-[10px] max-w-[120px] truncate" style={{ color: '#475569' }}>
              {email}
            </span>
          )}
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            className="flex items-center gap-1 text-[11px] transition-colors"
            style={{ color: '#475569' }}
            onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
            onMouseOut={(e)  => { (e.currentTarget as HTMLElement).style.color = '#475569'; }}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-3" style={{ maxHeight: 530 }}>
        <ItemList
          items={items}
          reveals={reveals}
          scraping={scraping}
          scrapeError={scrapeError}
          onReveal={reveal}
          onRescrape={rescrape}
        />
      </div>
    </div>
  );
}
