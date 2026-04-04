/**
 * Reads access token from common storage keys (custom API auth or Supabase-style).
 */
export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;

  const direct =
    window.localStorage.getItem('token') ??
    window.localStorage.getItem('access_token') ??
    window.sessionStorage.getItem('token') ??
    window.sessionStorage.getItem('access_token');

  if (direct) return direct.trim() || null;

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.includes('-auth-token')) continue;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { access_token?: string };
      if (typeof parsed.access_token === 'string' && parsed.access_token.length > 0) {
        return parsed.access_token;
      }
    } catch {
      /* ignore malformed */
    }
  }

  return null;
}
