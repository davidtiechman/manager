// Shared app shell bar: brand + page nav (start), contextual slot (center), profile + language (end).
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import LanguageToggle from '../../i18n/LanguageToggle';
import { useProfile, profileInitials } from '../../profile/ProfileProvider';
import { NAV_ITEMS } from './navConfig';
import './AppTopBar.css';

interface AppTopBarProps {
  // Page-specific content (e.g. agent identity, view toggles). Optional.
  children?: ReactNode;
  // Extra class on the root, e.g. to flush against a padded page.
  className?: string;
}

export default function AppTopBar({ children, className }: AppTopBarProps) {
  const { t } = useTranslation('common');
  const { pathname } = useLocation();
  const { displayName } = useProfile();

  return (
    <header className={`atb${className ? ` ${className}` : ''}`}>
      <div className="atb-start">
        <Link to="/" className="atb-brand" title={t('topbar.brand')}>
          <span className="atb-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="4" y="5" width="16" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
              <rect x="4" y="14" width="16" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="7.5" cy="8" r="1" fill="currentColor" />
              <circle cx="7.5" cy="17" r="1" fill="currentColor" />
            </svg>
          </span>
          <span className="atb-brand-name">{t('topbar.brand')}</span>
        </Link>

        <nav className="atb-nav" aria-label={t('topbar.navAria')}>
          {NAV_ITEMS.map((item) => {
            const active = item.isActive(pathname);
            return (
              <Link
                key={item.key}
                to={item.to}
                className={`atb-nav-link${active ? ' atb-nav-link--active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <span className="atb-nav-icon" aria-hidden="true">{item.icon}</span>
                <span className="atb-nav-label">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {children && <div className="atb-center">{children}</div>}

      <div className="atb-end">
        <div className="atb-profile" title={displayName}>
          <span className="atb-profile-avatar" aria-hidden="true">{profileInitials(displayName)}</span>
          <span className="atb-profile-name">{displayName}</span>
        </div>
        <LanguageToggle />
      </div>
    </header>
  );
}
