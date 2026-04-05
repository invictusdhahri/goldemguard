/**
 * Parse JSON API responses safely. HTML error pages (wrong URL, 404 from CDN)
 * cause raw JSON.parse to throw "Unexpected token '<' / DOCTYPE".
 */

export function normalizeApiBase(raw: string | undefined): string {
  const fallback = 'http://localhost:4000/api'
  return (raw ?? fallback).trim().replace(/\/+$/, '')
}

function isProbablyHtml(text: string): boolean {
  const t = text.trimStart().toLowerCase()
  return t.startsWith('<!doctype') || t.startsWith('<html')
}

export function parseJsonBody<T extends Record<string, unknown>>(
  text: string,
  res: Response,
  label: string,
): T {
  const trimmed = text.trim()
  if (!trimmed) {
    if (!res.ok) {
      throw new Error(
        `${label} failed (HTTP ${res.status}). Empty body — check NEXT_PUBLIC_API_URL points at the backend (…/api), not the marketing site.`,
      )
    }
    return {} as T
  }
  if (isProbablyHtml(trimmed)) {
    throw new Error(
      `${label}: server returned HTML instead of JSON (HTTP ${res.status}). ` +
        'Set NEXT_PUBLIC_API_URL to your API base URL ending in /api (e.g. https://api.example.com/api).',
    )
  }
  try {
    return JSON.parse(trimmed) as T
  } catch {
    throw new Error(
      `${label}: invalid JSON from server (HTTP ${res.status}). First bytes: ${trimmed.slice(0, 80)}`,
    )
  }
}

export async function readJsonBody<T extends Record<string, unknown>>(
  res: Response,
  label: string,
): Promise<T> {
  const text = await res.text()
  return parseJsonBody<T>(text, res, label)
}
