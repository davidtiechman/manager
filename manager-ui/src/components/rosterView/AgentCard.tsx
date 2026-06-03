import type { HistoryAgent } from '../../types/history/historyAgent';
import { formatRosterDate } from './rosterFormat';
import { unitDotColor } from './rosterColors';
import FitText from './FitText';

interface AgentCardProps {
  agent: HistoryAgent;
  onOpen: (id: string) => void;
  hideUnit?: boolean;      // hidden when grouped by unit (header already shows it)
  hidePlatform?: boolean;  // hidden when grouped by platform
}

// One agent as a navigational card. The whole card is the click target.
export default function AgentCard({ agent, onOpen, hideUnit, hidePlatform }: AgentCardProps) {
  const p = agent.platfrom;
  return (
    <button type="button" className="rstr-card" onClick={() => onOpen(agent.id)}>
      <div className="rstr-card-top">
        <span className="rstr-card-monogram" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <rect x="4" y="4.5" width="16" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
            <rect x="4" y="13.5" width="16" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="7.5" cy="7.5" r="0.95" fill="currentColor" />
            <circle cx="7.5" cy="16.5" r="0.95" fill="currentColor" />
          </svg>
        </span>
        <div className="rstr-card-heading">
          <span className="rstr-card-callsign" title={agent.callSign}>{agent.callSign}</span>
          <span className="rstr-card-uuid" title={agent.id}>{agent.id}</span>
        </div>
        <svg className="rstr-card-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="rstr-card-pills">
        {!hideUnit && p?.unit && (
          <span className="rstr-chip" title={p.unit}>
            <span className="rstr-chip-dot" style={{ backgroundColor: unitDotColor(p.unit) }} />
            <span className="rstr-chip-text">{p.unit}</span>
          </span>
        )}
        {!hidePlatform && p?.platform && (
          <span className="rstr-chip rstr-chip--outline" title={p.platform}>
            <span className="rstr-chip-text">{p.platform}</span>
          </span>
        )}
      </div>

      <div className="rstr-card-footer">
        <div className="rstr-card-specs">
          <div className="rstr-spec"><span className="rstr-spec-label">Zayad ID</span><span className="rstr-spec-val"><FitText>{p?.zayadId ?? '—'}</FitText></span></div>
          <div className="rstr-spec"><span className="rstr-spec-label">Platform ID</span><span className="rstr-spec-val"><FitText>{p?.platformId ?? '—'}</FitText></span></div>
          <div className="rstr-spec"><span className="rstr-spec-label">Unit Code</span><span className="rstr-spec-val"><FitText>{p?.unitCode ?? '—'}</FitText></span></div>
        </div>
        <div className="rstr-card-created">
          <span className="rstr-spec-label">Created</span>
          <span className="rstr-card-created-val">{formatRosterDate(agent.createdAt)}</span>
        </div>
      </div>
    </button>
  );
}
