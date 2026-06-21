// Shown when authenticated but without group access.
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthContext';
import LanguageToggle from '../../i18n/LanguageToggle';
import BrandMark from '../BrandMark';
import './AccessDenied.css';

export default function AccessDenied() {
  const { t } = useTranslation('common');
  const { refresh } = useAuth();

  return (
    <div className="acd-page">
      <div className="acd-lang">
        <LanguageToggle />
      </div>
      <div className="acd-card">
        <span className="acd-mark" aria-hidden="true">
          <BrandMark size={48} tone="mono" />
        </span>

        <p className="acd-eyebrow">{t('auth.accessDenied.welcome')}</p>
        <h1 className="acd-brand">tactic-spark</h1>
        <p className="acd-intro">{t('auth.accessDenied.intro')}</p>

        <div className="acd-divider" aria-hidden="true" />

        <p className="acd-message">{t('auth.accessDenied.message')}</p>
        <p className="acd-hint">{t('auth.accessDenied.retryHint')}</p>

        <button type="button" className="acd-refresh" onClick={refresh}>
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5V5h-2.5"
              stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t('auth.accessDenied.refresh')}
        </button>
      </div>
    </div>
  );
}
