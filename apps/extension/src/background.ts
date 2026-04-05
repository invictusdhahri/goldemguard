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
} from './types';

// ─── Config ───────────────────────────────────────────────────────────────────

const DEFAULT_API_BASE = 'https://api.veritasai.com/api';

async function getApiBase(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['api_base'], (result) => {
      resolve((result.api_base as string | undefined) ?? DEFAULT_API_BASE);
    });
  });
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

async function login(email: string, password: string): Promise<StoredAuth> {
  const apiBase = await getApiBase();
  const res = await fetch(`${apiBase}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password }),
  });

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

  const res = await fetch(`${apiBase}/analyze/contextual/url`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      Authorization:   `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((err as Record<string, string>).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<AnalysisResponse>;
}

// ─── Message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg: ExtMessage, _sender, sendResponse) => {
  (async () => {
    switch (msg.type) {
      case 'CHECK_AUTH': {
        const auth = await getStoredAuth();
        sendResponse({ type: 'AUTH_STATE', loggedIn: !!auth, email: auth?.email });
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
