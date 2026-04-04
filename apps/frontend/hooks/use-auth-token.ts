import { getStoredAccessToken } from '@/lib/auth-storage';
import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  const run = () => onChange();
  window.addEventListener('storage', run);
  window.addEventListener('focus', run);
  return () => {
    window.removeEventListener('storage', run);
    window.removeEventListener('focus', run);
  };
}

function getSnapshot(): string | null {
  if (typeof window === 'undefined') return null;
  return getStoredAccessToken();
}

function getServerSnapshot(): null {
  return null;
}

/** Safe across SSR; rechecks on window focus and cross-tab storage. */
export function useAuthToken(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
