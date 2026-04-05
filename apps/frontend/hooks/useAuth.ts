import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial check (check Supabase first, then fallback to LocalStorage)
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          if (session.access_token) localStorage.setItem('token', session.access_token);
        } else {
          // Fallback to manual localStorage set by our custom login page
          const savedUser = localStorage.getItem('user');
          if (savedUser) {
            try {
              setUser(JSON.parse(savedUser));
            } catch (e) {
              console.error('Failed to parse saved user', e);
            }
          }
        }
      } catch (err) {
        console.warn('Auth initialization error (likely missing Supabase config):', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // 2. Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        setUser(session.user);
        localStorage.setItem('token', session.access_token);
      } else if (!_event.includes('SIGNED_IN')) {
         // Only clear if we're explicitly not signed in via Supabase 
         // and we don't have a manual token? 
         // Actually, let's keep it simple: if Supabase says signed out, 
         // and we aren't using the manual backend token approach.
         // For now, let's just trust Supabase if it's initialized.
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
