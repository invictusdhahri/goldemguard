/**
 * LLMs often wrap JSON in markdown fences or add prose — extract a parseable object.
 */
export function parseJsonObject<T = Record<string, unknown>>(raw: string): T | null {
  const cleaned = raw.replace(/```json\s*|```/gi, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf('{');
    const end   = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
