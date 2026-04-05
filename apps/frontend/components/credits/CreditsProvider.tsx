'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import { PaywallModal } from './PaywallModal';

type TrialCreditsContextValue = {
  /** Remaining trial credits, or null if not loaded / not signed in */
  credits: number | null;
  unlimited: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  openPaywall: () => void;
};

const TrialCreditsContext = createContext<TrialCreditsContextValue | null>(null);

export function TrialCreditsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [unlimited, setUnlimited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setCredits(null);
      setUnlimited(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<{ trial_credits: number; unlimited: boolean; plan: string }>(
        '/account/credits',
      );
      setCredits(data.trial_credits);
      setUnlimited(data.unlimited);
    } catch {
      setCredits(null);
      setUnlimited(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openPaywall = useCallback(() => setPaywallOpen(true), []);

  const value = useMemo(
    () => ({
      credits,
      unlimited,
      loading,
      refresh,
      openPaywall,
    }),
    [credits, unlimited, loading, refresh, openPaywall],
  );

  return (
    <TrialCreditsContext.Provider value={value}>
      {children}
      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} />
    </TrialCreditsContext.Provider>
  );
}

export function useTrialCredits() {
  const ctx = useContext(TrialCreditsContext);
  if (!ctx) {
    throw new Error('useTrialCredits must be used within TrialCreditsProvider');
  }
  return ctx;
}
