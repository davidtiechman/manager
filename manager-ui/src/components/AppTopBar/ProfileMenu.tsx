// TopBar profile: [personal number] | [display name] + details popup.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth, userInitials } from '../../auth/AuthContext';

export default function ProfileMenu() {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div className="atb-profile-wrap" ref={ref}>
      <button
        type="button"
        className={`atb-profile${open ? ' is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('profile.menuAria')}
      >
        <span className="atb-profile-avatar" aria-hidden="true">{userInitials(user.name)}</span>
        <span className="atb-profile-id">{user.upn}</span>
        <span className="atb-profile-divider" aria-hidden="true" />
        <span className="atb-profile-name">{user.name}</span>
        <svg className="atb-profile-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="atb-profile-pop" role="menu">
          <div className="atb-pop-head">
            <span className="atb-pop-avatar" aria-hidden="true">{userInitials(user.name)}</span>
            <div className="atb-pop-head-text">
              <span className="atb-pop-name">{user.name}</span>
              <span className="atb-pop-upn">{user.upn}</span>
            </div>
          </div>

          <dl className="atb-pop-rows">
            <div className="atb-pop-row">
              <dt>{t('profile.displayName')}</dt>
              <dd>{user.name}</dd>
            </div>
            <div className="atb-pop-row">
              <dt>{t('profile.personalNumber')}</dt>
              <dd className="atb-pop-num">{user.upn}</dd>
            </div>
            <div className="atb-pop-row">
              <dt>{t('profile.email')}</dt>
              <dd className="atb-pop-email" title={user.email}>{user.email}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
