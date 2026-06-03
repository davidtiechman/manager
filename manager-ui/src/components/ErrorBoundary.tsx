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

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
        color: '#475569', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14,
      }}>
        <span>Something went wrong.</span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: '6px 14px', border: '1px solid #cbd5e1', borderRadius: 8,
            background: '#fff', color: '#334155', fontSize: 13, cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
