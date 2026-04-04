const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';

export async function callMlService(endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(`${ML_SERVICE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`ML service error: ${res.status}`);
  }

  return res.json();
}
