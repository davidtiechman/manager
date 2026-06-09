// Top-level destinations + how to detect the active one from the path.
import type { ReactNode } from 'react';

export interface NavItem {
  key: string;
  to: string;
  labelKey: string; // key in the `common` namespace
  isActive: (pathname: string) => boolean;
  icon: ReactNode;
}

const RealtimeIcon = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 12h3l2-5 4 10 2-5h5" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HistoryIcon = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 5a7 7 0 1 1-6.3 4" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 5v4h4" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const NAV_ITEMS: NavItem[] = [
  {
    key: 'realtime',
    to: '/',
    labelKey: 'nav.realtime',
    isActive: (p) => p === '/' || p.startsWith('/agents'),
    icon: RealtimeIcon,
  },
  {
    key: 'history',
    to: '/history',
    labelKey: 'nav.history',
    isActive: (p) => p.startsWith('/history'),
    icon: HistoryIcon,
  },
];
