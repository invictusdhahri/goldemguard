import { useState, useEffect, useCallback } from 'react';
import type { ExtMessage } from '../../types';

export interface AuthState {
  loggedIn: boolean;
  email: string | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    loggedIn: false,
    email: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'CHECK_AUTH' }, (res: ExtMessage | undefined) => {
      if (res?.type === 'AUTH_STATE') {
        setState({ loggedIn: res.loggedIn, email: res.email ?? null, loading: false, error: null });
      } else {
        setState((s) => ({ ...s, loading: false }));
      }
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    return new Promise<void>((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'LOGIN', email, password }, (res: ExtMessage | undefined) => {
        if (res?.type === 'LOGIN_RESULT') {
          setState({ loggedIn: true, email: res.user.email, loading: false, error: null });
          resolve();
        } else if (res?.type === 'LOGIN_ERROR') {
          setState((s) => ({ ...s, loading: false, error: res.error }));
          reject(new Error(res.error));
        } else {
          const msg = 'Unexpected response from background';
          setState((s) => ({ ...s, loading: false, error: msg }));
          reject(new Error(msg));
        }
      });
    });
  }, []);

  const logout = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => {
      setState({ loggedIn: false, email: null, loading: false, error: null });
    });
  }, []);

  return { ...state, login, logout };
}
