// Shared auth helpers (no React).
const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:9000';
const AUTH_BASE = `${API_ROOT}/manager/auth`;

const RETURN_PATH_KEY = 'auth.postLoginPath';

// Single-flight: concurrent 401s share one refresh.
let inFlight: Promise<boolean> | null = null;

// Renew auth_token via the refresh cookie.
export function refreshSession(): Promise<boolean> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const res = await fetch(`${AUTH_BASE}/refresh`, { credentials: 'include', cache: 'no-store' });
      return res.ok;
    } catch {
      return false;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

// Remember where to land after re-auth (SSO callback returns to /).
export function saveReturnPath(): void {
  const path = window.location.pathname + window.location.search;
  if (path && path !== '/') sessionStorage.setItem(RETURN_PATH_KEY, path);
}

// Consume the saved path (once).
export function takeReturnPath(): string | null {
  const path = sessionStorage.getItem(RETURN_PATH_KEY);
  if (path) sessionStorage.removeItem(RETURN_PATH_KEY);
  return path;
}

// Dead session → re-login via SSO (skip if ?error, avoid loop).
export function redirectToLogin(): void {
  if (new URLSearchParams(window.location.search).get('error')) return;
  saveReturnPath();
  window.location.assign(`${AUTH_BASE}/sso`);
}
