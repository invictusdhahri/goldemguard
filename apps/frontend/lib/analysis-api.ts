const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export class AnalysisApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload: unknown = null,
  ) {
    super(message);
    this.name = 'AnalysisApiError';
  }
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { _raw: text };
  }
}

function errorMessage(status: number, body: unknown): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const e = (body as { error?: unknown }).error;
    if (typeof e === 'string') return e;
  }
  if (status === 401) return 'Session expired or not signed in.';
  if (status === 404) return 'Job not found or you do not have access.';
  if (status === 409) return 'Analysis is not finished yet.';
  if (status >= 500) return 'Server error. Please try again later.';
  return 'Request failed.';
}

export interface JobStatusPayload {
  id: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  media_type?: string;
  created_at?: string;
  completed_at?: string | null;
}

export async function fetchJobStatus(jobId: string, token: string): Promise<JobStatusPayload> {
  const res = await fetch(`${API_BASE}/status/${encodeURIComponent(jobId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const body = await readBody(res);
  if (!res.ok) {
    throw new AnalysisApiError(errorMessage(res.status, body), res.status, body);
  }
  if (!body || typeof body !== 'object') {
    throw new AnalysisApiError('Unexpected response from server.', res.status, body);
  }
  const o = body as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : jobId;
  const status = o.status;
  if (status !== 'pending' && status !== 'processing' && status !== 'done' && status !== 'failed') {
    throw new AnalysisApiError('Invalid job status in response.', res.status, body);
  }
  return {
    id,
    status,
    media_type: typeof o.media_type === 'string' ? o.media_type : undefined,
    created_at: typeof o.created_at === 'string' ? o.created_at : undefined,
    completed_at: o.completed_at === null || typeof o.completed_at === 'string' ? o.completed_at : null,
  };
}

export async function fetchJobResult(jobId: string, token: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}/result/${encodeURIComponent(jobId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const body = await readBody(res);
  if (!res.ok) {
    throw new AnalysisApiError(errorMessage(res.status, body), res.status, body);
  }
  return body;
}
