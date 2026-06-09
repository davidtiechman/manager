// Auth state: reads GET /auth/me, exposes the current user.
import {
  createContext, useCallback, useContext, useEffect, useState, type ReactNode,
} from 'react';

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

  const fetchMe = useCallback(async () => {
    setStatus('loading');

    // Dev auth mode: mock | forbidden (else live).
    const mode = import.meta.env.VITE_AUTH_MODE;
    if (mode === 'mock') { setUser(mockUser()); setStatus('authenticated'); return; }
    if (mode === 'forbidden') { setUser(null); setStatus('forbidden'); return; }

    // Server access-denied redirect.
    const err = new URLSearchParams(window.location.search).get('error');
    if (err === 'access_denied') { setUser(null); setStatus('forbidden'); return; }

    try {
      const res = await fetch(`${API_ROOT}/auth/me`, {
        credentials: 'include',
        redirect: 'manual',
      });

      // Bounced to SSO → not logged in.
      if (res.type === 'opaqueredirect' || res.status === 0) {
        setStatus('unauthenticated');
        return;
      }
      if (res.status === 403) { setUser(null); setStatus('forbidden'); return; }
      if (res.ok) { setUser((await res.json()) as AuthUser); setStatus('authenticated'); return; }
      setStatus('unauthenticated');
    } catch (e) {
      console.error('[Auth] /auth/me failed', e);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => { void fetchMe(); }, [fetchMe]);

  // Prod redirects to SSO; dev shows a login button.
  useEffect(() => {
    if (status === 'unauthenticated' && import.meta.env.PROD) {
      window.location.assign(`${API_ROOT}/auth/sso`);
    }
  }, [status]);

  const login = useCallback(() => window.location.assign(`${API_ROOT}/auth/sso`), []);

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

// First letters → avatar monogram.
export function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return parts[0][0] + parts[parts.length - 1][0];
}
