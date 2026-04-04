import '../loadEnv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function requireEnv(name: 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

const supabaseUrl = requireEnv('SUPABASE_URL');
const supabaseAnonKey = requireEnv('SUPABASE_ANON_KEY');

/**
 * Default anon client — use for auth helpers that accept a token argument
 * (e.g. getUser) or server-only auth routes (signUp / signIn).
 * Do not use for Storage or RLS-protected tables on behalf of a user;
 * use createSupabaseWithAccessToken instead.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** @deprecated Prefer createSupabaseWithAccessToken(req) for user-scoped RLS */
export function getSupabase(): SupabaseClient {
  return supabase;
}

/**
 * Supabase client that acts as the signed-in user so Postgres and Storage RLS
 * see auth.uid() = that user. Required for uploads and user-owned rows.
 */
export function createSupabaseWithAccessToken(accessToken: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let serviceRoleClient: SupabaseClient | null = null;

/**
 * Bypasses RLS — use only in trusted server code (e.g. BullMQ worker) for
 * job status updates, result inserts, and storage downloads without a user JWT.
 */
export function getSupabaseServiceRole(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY (required for analysis worker)');
  }
  if (!serviceRoleClient) {
    serviceRoleClient = createClient(supabaseUrl, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serviceRoleClient;
}

const UPLOADS_BUCKET = 'uploads';

/**
 * Extract object path within the bucket from a Storage public URL returned by getPublicUrl.
 */
export function storageObjectPathFromFileUrl(fileUrl: string): string {
  const u = new URL(fileUrl);
  const publicPrefix = `/storage/v1/object/public/${UPLOADS_BUCKET}/`;
  const authPrefix = `/storage/v1/object/authenticated/${UPLOADS_BUCKET}/`;
  if (u.pathname.startsWith(publicPrefix)) {
    return decodeURIComponent(u.pathname.slice(publicPrefix.length));
  }
  if (u.pathname.startsWith(authPrefix)) {
    return decodeURIComponent(u.pathname.slice(authPrefix.length));
  }
  throw new Error(`Cannot parse storage path from URL: ${fileUrl}`);
}
