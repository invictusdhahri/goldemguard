import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only initialize if we have the credentials, otherwise export a placeholder
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : { 
      auth: { 
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Supabase not configured on frontend') }),
        signUp: async () => ({ data: { user: null, session: null }, error: new Error('Supabase not configured on frontend') }),
        signOut: async () => ({ error: null }),
      }
    } as any;
