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

export async function callMlDetect(mediaType: string, fileBuffer: Buffer, filename: string) {
  const formData = new FormData();
  formData.append('file', new Blob([new Uint8Array(fileBuffer)]), filename);

  const res = await fetch(`${ML_SERVICE_URL}/detect/${mediaType}`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`ML service error ${res.status}: ${text}`);
  }

  return res.json();
}
