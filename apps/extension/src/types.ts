// Shared types for the GolemGuard extension

// ─── Scraped content from the active page ─────────────────────────────────────

export type ItemType = 'post' | 'image' | 'video' | 'document';
export type Platform = 'twitter' | 'generic';
export type MediaType = 'image' | 'video' | null;

export interface ScrapedItem {
  id: string;
  type: ItemType;
  platform: Platform;
  text: string | null;
  /** Absolute URL to the image or video source */
  mediaUrl: string | null;
  mediaType: MediaType;
  /** Permalink or current page URL */
  sourceUrl: string;
  /** Small image URL for preview (may equal mediaUrl for images) */
  thumbnailUrl: string | null;
}

// ─── Analysis results from /api/analyze/contextual ───────────────────────────

export interface AuthenticityResult {
  verdict: 'AI_GENERATED' | 'HUMAN' | 'UNCERTAIN';
  confidence: number;
  explanation: string;
  frame_scores?: number[];
  max_score?: number;
  top_signals?: string[];
  caveat?: string | null;
  error?: string;
}

export interface ContextualResult {
  consistency_score: number;
  verdict: 'CONSISTENT' | 'MISLEADING' | 'UNVERIFIABLE';
  explanation: string;
  signals: string[];
  sources: string[];
  image_description: string;
  error?: string;
}

export interface AnalysisResponse {
  authenticity?: AuthenticityResult;
  contextual?: ContextualResult;
  source?: ContextualResult;
  /** Trial balance after this contextual/reveal run */
  remaining?: number;
}

// ─── Reveal state per item ─────────────────────────────────────────────────────

export type RevealStatus = 'idle' | 'loading' | 'done' | 'error';

export interface RevealResult {
  status: RevealStatus;
  data?: AnalysisResponse;
  error?: string;
}

// ─── Headline verdict derived from all axes ────────────────────────────────────

export type OverallHeadline = 'FAKE' | 'REAL' | 'UNCLEAR';

export interface OverallSummary {
  headline: OverallHeadline;
  summary: string;
  showAiCriticalWarning: boolean;
  showMisleadingDetail: boolean;
}

// ─── Messages between popup ↔ service worker ─────────────────────────────────

export interface MsgScrape {
  type: 'SCRAPE';
}

export interface MsgScrapeResult {
  type: 'SCRAPE_RESULT';
  items: ScrapedItem[];
}

export interface MsgReveal {
  type: 'REVEAL';
  item: ScrapedItem;
}

export interface MsgRevealResult {
  type: 'REVEAL_RESULT';
  itemId: string;
  result: AnalysisResponse;
}

export interface MsgRevealError {
  type: 'REVEAL_ERROR';
  itemId: string;
  error: string;
}

export interface MsgLogin {
  type: 'LOGIN';
  email: string;
  password: string;
}

export interface MsgLoginResult {
  type: 'LOGIN_RESULT';
  token: string;
  user: { id: string; email: string };
}

export interface MsgLoginError {
  type: 'LOGIN_ERROR';
  error: string;
}

export interface MsgLogout {
  type: 'LOGOUT';
}

export interface MsgCheckAuth {
  type: 'CHECK_AUTH';
}

/** Sent from content script when the web app has (or cleared) a session in localStorage */
export interface MsgImportWebSession {
  type: 'IMPORT_WEB_SESSION';
  token: string | null;
  email?: string;
}

export interface MsgAuthState {
  type: 'AUTH_STATE';
  loggedIn: boolean;
  email?: string;
}

export type ExtMessage =
  | MsgScrape
  | MsgScrapeResult
  | MsgReveal
  | MsgRevealResult
  | MsgRevealError
  | MsgLogin
  | MsgLoginResult
  | MsgLoginError
  | MsgLogout
  | MsgCheckAuth
  | MsgImportWebSession
  | MsgAuthState;
