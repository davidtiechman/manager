// Not authenticated: auto-redirect in progress, or a failed SSO attempt.
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import LanguageToggle from '../i18n/LanguageToggle';
import './AuthGate.css';

export default function AuthRetry() {
  const { t } = useTranslation('common');
  const { login } = useAuth();
  // ?error → SSO bounce failed; redirect was suppressed to avoid a loop.
  const failed = !!new URLSearchParams(window.location.search).get('error');

  return (
    <div className="auth-loading">
      <div className="auth-lang">
        <LanguageToggle />
      </div>
      {!failed && <span className="auth-loading-spinner" aria-hidden="true" />}
      <p className="auth-loading-text">
        {failed ? t('auth.retry.failed') : t('auth.retry.connecting')}
      </p>
      {failed && (
        <button type="button" className="auth-login-btn" onClick={login}>
          {t('auth.login')}
        </button>
      )}
    </div>
  );
}
