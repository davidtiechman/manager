interface Props {
  status: 'online' | 'warning' | 'offline';
}

export default function TankIcon({ status }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={`tank-svg ${status}`}
    >
      {/* גוף */}
      <rect x="10" y="28" width="44" height="16" rx="4" />

      {/* צריח */}
      <rect x="22" y="18" width="20" height="10" rx="2" />

      {/* קנה */}
      <rect x="42" y="21" width="16" height="4" rx="2" />

      {/* גלגלים */}
      <circle cx="18" cy="48" r="4" />
      <circle cx="28" cy="48" r="4" />
      <circle cx="38" cy="48" r="4" />
      <circle cx="48" cy="48" r="4" />
    </svg>
  );
}