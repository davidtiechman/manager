// Minimal not-found screen (used for unknown routes and missing agents).
import { Link } from 'react-router-dom';

interface NotFoundProps {
  code?: string;          // e.g. "404"
  message?: string;
  to?: string;            // where the link goes
  linkLabel?: string;
}

export default function NotFound({
  code = '404',
  message = 'Page not found',
  to = '/',
  linkLabel = 'Go home',
}: NotFoundProps) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 10,
      color: '#475569', fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {code && <div style={{ fontSize: 40, fontWeight: 800, color: '#0f172a' }}>{code}</div>}
      <div style={{ fontSize: 14 }}>{message}</div>
      <Link to={to} style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>
        {linkLabel}
      </Link>
    </div>
  );
}
