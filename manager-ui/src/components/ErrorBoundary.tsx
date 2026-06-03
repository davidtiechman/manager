// App-wide safety net: catches render crashes instead of a blank screen.
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  private reload = () => window.location.reload();

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f1f5f9', padding: 24,
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      }}>
        <div style={{
          maxWidth: 480, width: '100%', background: '#fff', border: '1px solid #e2e8f0',
          borderRadius: 14, boxShadow: '0 10px 30px rgba(15,23,42,0.1)',
          padding: '28px 26px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 38, marginBottom: 8 }}>⚠️</div>
          <h1 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
            Something went wrong
          </h1>
          <p style={{ margin: '0 0 18px', fontSize: 13, color: '#64748b', wordBreak: 'break-word' }}>
            {error.message}
          </p>
          <button
            type="button"
            onClick={this.reload}
            style={{
              padding: '9px 18px', border: 'none', borderRadius: 9, background: '#2563eb',
              color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
