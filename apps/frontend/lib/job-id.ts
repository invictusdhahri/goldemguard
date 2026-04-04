const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidJobId(id: string | undefined | null): id is string {
  return typeof id === 'string' && id.length > 0 && UUID_RE.test(id);
}
