// Shared auth helpers (no React).
const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:9000';
const AUTH_BASE = `${API_ROOT}/manager/auth`;

// Renew auth_token via the refresh cookie.
export async function refreshSession(): Promise<boolean> {
  try {
    const res = await fetch(`${AUTH_BASE}/refresh`, { credentials: 'include', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

// Dead session → re-login via SSO (skip if ?error, avoid loop).
export function redirectToLogin(): void {
  if (new URLSearchParams(window.location.search).get('error')) return;
  window.location.assign(`${AUTH_BASE}/sso`);
}
