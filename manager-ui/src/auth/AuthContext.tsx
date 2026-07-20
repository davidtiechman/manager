// Auth state: /auth/me, auto-login, silent refresh.
import {
  createContext, useCallback, useContext, useEffect, useState, type ReactNode,
} from 'react';
import { refreshSession, saveReturnPath } from './refreshSession';

export interface AuthUser {
  upn: string; // personal number
  name: string; // display name
  email: string;
  given_name?: string;
  family_name?: string;
  groups?: string[];
}

export type AuthStatus = 'loading' | 'authenticated' | 'forbidden' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  refresh: () => void;
  login: () => void;
}

const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:9000';
const AUTH_BASE = `${API_ROOT}/manager/auth`;
// Proactive refresh interval (< 30m SSO refresh-token life).
const REFRESH_MINUTES = Number(import.meta.env.VITE_AUTH_REFRESH_MINUTES) || 15;

// Dev mock user (override via VITE_AUTH_MOCK_USER JSON).
function mockUser(): AuthUser {
  const raw = import.meta.env.VITE_AUTH_MOCK_USER;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as AuthUser;
    } catch {
      // ignore bad JSON
    }
  }
  return { upn: 'test', name: 'test', email: 'test@test.com', groups: ['aderet'] };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  const loadMe = useCallback(async (): Promise<Response | null> => {
    try {
      return await fetch(`${AUTH_BASE}/me`, {
        credentials: 'include',
        redirect: 'manual',
        cache: 'no-store',
      });
    } catch {
      return null;
    }
  }, []);

  const fetchMe = useCallback(async () => {
    setStatus('loading');

    // Dev auth mode: mock | forbidden (else live).
    const mode = import.meta.env.VITE_AUTH_MODE;
    if (mode === 'mock') { setUser(mockUser()); setStatus('authenticated'); return; }
    if (mode === 'forbidden') { setUser(null); setStatus('forbidden'); return; }

    // Server access-denied redirect.
    const err = new URLSearchParams(window.location.search).get('error');
    if (err === 'access_denied') { setUser(null); setStatus('forbidden'); return; }

    let res = await loadMe();
    // Expired → refresh, re-check.
    if (res && res.status === 401 && (await refreshSession())) {
      res = await loadMe();
    }

    if (!res || res.type === 'opaqueredirect' || res.status === 0) { setStatus('unauthenticated'); return; }
    if (res.status === 403) { setUser(null); setStatus('forbidden'); return; }
    if (res.ok) { setUser((await res.json()) as AuthUser); setStatus('authenticated'); return; }
    setStatus('unauthenticated');
  }, [loadMe]);

  useEffect(() => { void fetchMe(); }, [fetchMe]);

  // Not logged in → auto SSO (skip if ?error, avoid loop).
  useEffect(() => {
    if (status !== 'unauthenticated') return;
    if (new URLSearchParams(window.location.search).get('error')) return;
    saveReturnPath();
    window.location.assign(`${AUTH_BASE}/sso`);
  }, [status]);

  // Keep the 30m SSO session alive: renew on a timer + on tab focus.
  useEffect(() => {
    if (status !== 'authenticated') return;
    const mode = import.meta.env.VITE_AUTH_MODE;
    if (mode === 'mock' || mode === 'forbidden') return; // no real backend in dev modes
    const id = window.setInterval(() => { void refreshSession(); }, REFRESH_MINUTES * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') void refreshSession(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [status]);

  const login = useCallback(() => {
    saveReturnPath();
    window.location.assign(`${AUTH_BASE}/sso`);
  }, []);

  return (
    <AuthContext.Provider value={{ status, user, refresh: fetchMe, login }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Monogram: given + family initials (fallback to display name).
export function userInitials(user: Pick<AuthUser, 'name' | 'given_name' | 'family_name'>): string {
  const g = user.given_name?.trim();
  const f = user.family_name?.trim();
  if (g && f) return g[0] + f[0];
  const parts = (user.name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return parts[0][0] + parts[parts.length - 1][0];
}
