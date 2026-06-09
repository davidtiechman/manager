// Gate the app on auth status.
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import AccessDenied from '../components/AccessDenied/AccessDenied';
import LanguageToggle from '../i18n/LanguageToggle';
import './AuthGate.css';

export default function AuthGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common');
  const { status, login } = useAuth();

  if (status === 'authenticated') return <>{children}</>;
  if (status === 'forbidden') return <AccessDenied />;

  // Dev login button (prod redirects to SSO).
  if (status === 'unauthenticated') {
    return (
      <div className="auth-loading">
        <div className="auth-lang">
          <LanguageToggle />
        </div>
        <p className="auth-loading-text">{t('auth.signInHint')}</p>
        <button type="button" className="auth-login-btn" onClick={login}>
          {t('auth.signIn')}
        </button>
      </div>
    );
  }

  // loading
  return (
    <div className="auth-loading">
      <div className="auth-lang">
        <LanguageToggle />
      </div>
      <span className="auth-loading-spinner" aria-hidden="true" />
      <p className="auth-loading-text">{t('auth.loading')}</p>
    </div>
  );
}
