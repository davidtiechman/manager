import { Link } from 'react-router-dom';

interface ModeNavigationLinkProps {
  to: string;
  label: string;
  variant: 'history' | 'real-time';
}

function ModeNavigationIcon({ variant }: { variant: ModeNavigationLinkProps['variant'] }) {
  if (variant === 'history') {
    return (
      <svg viewBox="0 0 24 24" className="mode-navigation-svg" aria-hidden="true">
        <path d="M12 5a7 7 0 1 1-6.3 4" />
        <path d="M5 5v4h4" />
        <path d="M12 8v4l3 2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="mode-navigation-svg" aria-hidden="true">
      <path d="M4 12h3l2-5 4 10 2-5h5" />
      <path d="M5 5a10 10 0 0 1 14 0" />
      <path d="M8 8a6 6 0 0 1 8 0" />
    </svg>
  );
}

export default function ModeNavigationLink({ to, label, variant }: ModeNavigationLinkProps) {
  return (
    <Link
      to={to}
      className={`mode-navigation-link ${variant}`}
      aria-label={label}
      title={label}
    >
      <span className="mode-navigation-icon" aria-hidden="true">
        <ModeNavigationIcon variant={variant} />
      </span>
      <span>{label}</span>
    </Link>
  );
}
