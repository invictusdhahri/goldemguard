/**
 * Service worker (background script) for the VeritasAI extension.
 *
 * Responsibilities:
 *  - Persist auth token in chrome.storage.local
 *  - Handle LOGIN / LOGOUT / CHECK_AUTH from popup
 *  - Handle SCRAPE requests: forward to content script, return items to popup
 *  - Handle REVEAL requests: call /api/analyze/contextual/url, return result
 */

import type {
  ExtMessage,
  ScrapedItem,
  AnalysisResponse,
  MsgScrapeResult,
  MsgImportWebSession,
} from './types';

// ─── Config ───────────────────────────────────────────────────────────────────
// Vite replaces import.meta.env.VITE_API_BASE at build time (see apps/extension/.env.example).
// Runtime override: chrome.storage.local.api_base (set from extension service worker console only).

const BUILT_IN_API_BASE =
  typeof import.meta.env.VITE_API_BASE === 'string' && import.meta.env.VITE_API_BASE.trim() !== ''
    ? import.meta.env.VITE_API_BASE.trim()
    : 'https://api.veritasai.com/api';

async function getApiBase(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['api_base'], (result) => {
      const stored = result.api_base as string | undefined;
      resolve(stored?.trim() || BUILT_IN_API_BASE);
    });
  });
}

/** Origins where the Next.js app stores `token` / `user` in localStorage (build-time list). */
const BUILT_IN_WEB_APP_ORIGINS =
  typeof import.meta.env.VITE_WEB_APP_ORIGINS === 'string' &&
  import.meta.env.VITE_WEB_APP_ORIGINS.trim() !== ''
    ? import.meta.env.VITE_WEB_APP_ORIGINS.trim()
    : 'http://localhost:3000,http://127.0.0.1:3000,https://veritasai.com,https://www.veritasai.com';

function getWebAppOrigins(): string[] {
  return BUILT_IN_WEB_APP_ORIGINS.split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

function emailFromJwt(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64);
    const payload = JSON.parse(json) as { email?: string };
    return typeof payload.email === 'string' && payload.email ? payload.email : null;
  } catch {
    return null;
  }
}

/** If the user is signed in on an open web app tab, copy session into extension storage. */
async function trySyncAuthFromBrowserTabs(): Promise<StoredAuth | null> {
  const origins = getWebAppOrigins();
  for (const origin of origins) {
    let tabs: chrome.tabs.Tab[];
    try {
      tabs = await chrome.tabs.query({ url: `${origin}/*` });
    } catch {
      continue;
    }
    for (const tab of tabs) {
      if (!tab.id) continue;
      try {
        const [execResult] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          world: 'MAIN',
          func: () => {
            const token = localStorage.getItem('token');
            const userRaw = localStorage.getItem('user');
            return {
              token: token && token.trim().length > 0 ? token.trim() : null,
              userRaw,
            };
          },
        });
        const r = execResult?.result as { token: string | null; userRaw: string | null } | undefined;
        if (!r?.token) continue;
        let email: string | undefined;
        if (r.userRaw) {
          try {
            const u = JSON.parse(r.userRaw) as { email?: string };
            if (typeof u.email === 'string' && u.email) email = u.email;
          } catch {
            /* ignore */
          }
        }
        if (!email) email = emailFromJwt(r.token) ?? undefined;
        const finalEmail = email ?? 'user';
        await setStoredAuth(r.token, finalEmail);
        return { token: r.token, email: finalEmail };
      } catch {
        /* Tab inaccessible or restricted */
      }
    }
  }
  return null;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

interface StoredAuth {
  token: string;
  email: string;
}

async function getStoredAuth(): Promise<StoredAuth | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['auth_token', 'auth_email'], (result) => {
      if (result.auth_token && result.auth_email) {
        resolve({ token: result.auth_token as string, email: result.auth_email as string });
      } else {
        resolve(null);
      }
    });
  });
}

async function setStoredAuth(token: string, email: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ auth_token: token, auth_email: email }, resolve);
  });
}

async function clearStoredAuth(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['auth_token', 'auth_email'], resolve);
  });
}

// ─── Login ────────────────────────────────────────────────────────────────────

function networkHint(apiBase: string, original: string): string {
  const o = original.toLowerCase();
  if (
    original === 'Failed to fetch' ||
    o.includes('networkerror') ||
    o.includes('load failed') ||
    o.includes('network request failed')
  ) {
    return (
      `Cannot reach the API at ${apiBase}. Check internet/VPN/firewall, ` +
      'or rebuild the extension with VITE_API_BASE in apps/extension/.env pointing at …/api.'
    );
  }
  return original;
}

async function login(email: string, password: string): Promise<StoredAuth> {
  const apiBase = await getApiBase();
  let res: Response;
  try {
    res = await fetch(`${apiBase}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(networkHint(apiBase, msg));
  }

  const text = await res.text();
  let body: Record<string, unknown>;
  try { body = JSON.parse(text); } catch { throw new Error(`Login failed: ${text.slice(0, 200)}`); }

  if (!res.ok) {
    throw new Error((body.error as string) ?? `Login failed (${res.status})`);
  }

  const session = body.session as Record<string, unknown> | null;
  const token   = (session?.access_token ?? body.access_token) as string | undefined;
  const user    = body.user as Record<string, unknown> | undefined;
  const userEmail = (user?.email ?? email) as string;

  if (!token) throw new Error('No access token returned from server');

  await setStoredAuth(token, userEmail);
  return { token, email: userEmail };
}

// ─── Scrape ───────────────────────────────────────────────────────────────────

async function scrapeActiveTab(): Promise<ScrapedItem[]> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return [];

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id!, { type: 'SCRAPE' }, (response: MsgScrapeResult | undefined) => {
      if (chrome.runtime.lastError) {
        // Content script not yet injected — inject it programmatically
        chrome.scripting.executeScript(
          {
            target: { tabId: tab.id! },
            files:  ['src/content/scraper.ts'],
          },
          () => {
            // Retry once after injection
            chrome.tabs.sendMessage(tab.id!, { type: 'SCRAPE' }, (r2: MsgScrapeResult | undefined) => {
              resolve(r2?.items ?? []);
            });
          },
        );
        return;
      }
      resolve(response?.items ?? []);
    });
  });
}

// ─── Reveal ───────────────────────────────────────────────────────────────────

async function reveal(item: ScrapedItem, token: string): Promise<AnalysisResponse> {
  const apiBase = await getApiBase();

  // Use the /url variant so we can pass media_url as JSON (no file upload from extension)
  const payload: Record<string, string> = {
    source_url: item.sourceUrl,
  };
  if (item.mediaUrl)  payload.media_url = item.mediaUrl;
  if (item.text)      payload.context   = item.text;

  let res: Response;
  try {
    res = await fetch(`${apiBase}/analyze/contextual/url`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization:   `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(networkHint(apiBase, msg));
  }

  const raw = await res.text();
  let parsed: Record<string, unknown>;
  try {
    parsed = raw.trim() ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    const snippet = raw.slice(0, 120).replace(/\s+/g, ' ');
    throw new Error(
      !res.ok
        ? `Reveal failed (${res.status}): ${snippet}`
        : `Invalid JSON from server: ${snippet}`,
    );
  }

  if (!res.ok) {
    const code = parsed.code as string | undefined;
    if (res.status === 402 && code === 'INSUFFICIENT_CREDITS') {
      throw new Error(
        'Trial credits exhausted. Open GolemGuard in the browser to view plans and upgrade.',
      );
    }
    throw new Error((parsed.error as string) ?? `HTTP ${res.status}`);
  }

  return parsed as unknown as AnalysisResponse;
}

// ─── Message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg: ExtMessage, _sender, sendResponse) => {
  (async () => {
    switch (msg.type) {
      case 'CHECK_AUTH': {
        let auth = await getStoredAuth();
        if (!auth) auth = await trySyncAuthFromBrowserTabs();
        sendResponse({ type: 'AUTH_STATE', loggedIn: !!auth, email: auth?.email });
        break;
      }

      case 'IMPORT_WEB_SESSION': {
        const m = msg as MsgImportWebSession;
        if (m.token) {
          let email = m.email?.trim();
          if (!email) email = emailFromJwt(m.token) ?? 'user';
          await setStoredAuth(m.token, email);
        }
        break;
      }

      case 'LOGIN': {
        try {
          const auth = await login(msg.email, msg.password);
          sendResponse({ type: 'LOGIN_RESULT', token: auth.token, user: { id: '', email: auth.email } });
        } catch (err) {
          sendResponse({ type: 'LOGIN_ERROR', error: (err as Error).message });
        }
        break;
      }

      case 'LOGOUT': {
        await clearStoredAuth();
        sendResponse({ type: 'AUTH_STATE', loggedIn: false });
        break;
      }

      case 'SCRAPE': {
        try {
          const items = await scrapeActiveTab();
          sendResponse({ type: 'SCRAPE_RESULT', items });
        } catch (err) {
          sendResponse({ type: 'SCRAPE_RESULT', items: [] });
          console.error('[bg/SCRAPE]', err);
        }
        break;
      }

      case 'REVEAL': {
        try {
          const auth = await getStoredAuth();
          if (!auth) {
            sendResponse({ type: 'REVEAL_ERROR', itemId: msg.item.id, error: 'Not logged in' });
            break;
          }
          const result = await reveal(msg.item, auth.token);
          sendResponse({ type: 'REVEAL_RESULT', itemId: msg.item.id, result });
        } catch (err) {
          sendResponse({ type: 'REVEAL_ERROR', itemId: msg.item.id, error: (err as Error).message });
        }
        break;
      }

      default:
        break;
    }
  })();

  return true; // keep message channel open for async response
});
