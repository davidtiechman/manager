// Shared hex-emblem brand mark. tone="color" for dark surfaces, "mono" inherits currentColor.
import { useId } from 'react';

interface BrandMarkProps {
  size?: number;
  tone?: 'color' | 'mono';
  className?: string;
}

export default function BrandMark({ size = 40, tone = 'color', className }: BrandMarkProps) {
  const id = useId();
  const accent = tone === 'mono' ? 'currentColor' : `url(#${id})`;
  const tick = tone === 'mono' ? 'currentColor' : '#60a5fa';
  const inner = tone === 'mono' ? 'currentColor' : '#3b82f6';

  return (
    <svg width={size} height={size} viewBox="0 0 150 150" fill="none" className={className} aria-hidden="true">
      {tone === 'color' && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#60a5fa" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      )}
      <polygon points="75,26 118,50 118,100 75,124 32,100 32,50" fill="none" stroke={accent} strokeWidth="6" strokeLinejoin="round" />
      <polygon points="75,44 102,59 102,91 75,106 48,91 48,59" fill={inner} opacity="0.18" />
      <line x1="75" y1="38" x2="75" y2="62" stroke={tick} strokeWidth="4" strokeLinecap="round" />
      <line x1="75" y1="88" x2="75" y2="112" stroke={tick} strokeWidth="4" strokeLinecap="round" />
      <line x1="38" y1="75" x2="62" y2="75" stroke={tick} strokeWidth="4" strokeLinecap="round" />
      <line x1="88" y1="75" x2="112" y2="75" stroke={tick} strokeWidth="4" strokeLinecap="round" />
      <circle cx="75" cy="75" r="9" fill={accent} />
    </svg>
  );
}
