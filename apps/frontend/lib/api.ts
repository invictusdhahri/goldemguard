import { normalizeApiBase, readJsonBody } from './readApiResponse';

const API_BASE = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL);

/** Thrown when trial credits are 0 and the API returns HTTP 402. */
export class InsufficientCreditsError extends Error {
  readonly code = 'INSUFFICIENT_CREDITS' as const;
  remaining: number;

  constructor(remaining: number, message?: string) {
    super(message ?? 'Trial credits exhausted');
    this.name = 'InsufficientCreditsError';
    this.remaining = remaining;
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const body = await readJsonBody<T & { error?: string; code?: string; remaining?: number }>(
    res,
    path,
  );

  if (!res.ok) {
    if (res.status === 402 && body.code === 'INSUFFICIENT_CREDITS') {
      throw new InsufficientCreditsError(body.remaining ?? 0, body.error);
    }
    throw new Error(body.error ?? `API error: ${res.status}`);
  }
  return body as T;
}
