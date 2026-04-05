import { normalizeApiBase, readJsonBody } from './readApiResponse';

const API_BASE = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL);

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

  const body = await readJsonBody<T & { error?: string }>(res, path);

  if (!res.ok) {
    throw new Error(body.error ?? `API error: ${res.status}`);
  }
  return body as T;
}
