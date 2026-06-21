// Shared app top bar: brand, nav, contextual slot, profile, language.
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import LanguageToggle from '../../i18n/LanguageToggle';
import ProfileMenu from './ProfileMenu';
import BrandMark from '../BrandMark';
import { NAV_ITEMS } from './navConfig';
import './AppTopBar.css';

interface AppTopBarProps {
  children?: ReactNode; // contextual content
  className?: string;
}

export default function AppTopBar({ children, className }: AppTopBarProps) {
  const { t } = useTranslation('common');
  const { pathname } = useLocation();

  return (
    <header className={`atb${className ? ` ${className}` : ''}`}>
      <div className="atb-start">
        <Link to="/" className="atb-brand" title={t('topbar.brand')}>
          <span className="atb-brand-mark" aria-hidden="true">
            <BrandMark size={40} />
          </span>
          <span className="atb-brand-text">
            <span className="atb-brand-name">{t('topbar.brand')}</span>
            <span className="atb-brand-sub">{t('topbar.subtitle')}</span>
          </span>
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
        <ProfileMenu />
        <LanguageToggle />
      </div>
    </header>
  );
}
