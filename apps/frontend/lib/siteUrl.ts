/**
 * Public site URL for Supabase emailRedirectTo / OAuth redirectTo.
 * See https://supabase.com/docs/guides/auth/redirect-urls
 */
export function getPublicSiteUrl(): string {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    (typeof process.env.VERCEL_URL === 'string' ? process.env.VERCEL_URL : null) ??
    'http://localhost:3001/'
  url = url.startsWith('http') ? url : `https://${url}`
  return url.endsWith('/') ? url : `${url}/`
}
