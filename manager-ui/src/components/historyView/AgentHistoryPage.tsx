import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import './AgentSyncsList.css';

import { ApiService } from '../../api';
import type { HistoryAgent } from '../../types/history/historyAgent';
import { formatRosterDate } from '../rosterView/rosterFormat';
import { unitDotColor } from '../rosterView/rosterColors';
import ModeNavigationLink from '../ModeNavigationLink';

import HistoryDataGrid from './grid/HistoryDataGrid';
import { syncsConfig } from './syncsConfig';
import { messagesConfig } from './messagesConfig';

type HistoryTab = 'syncs' | 'messages';

const TABS: Array<{ id: HistoryTab; label: string }> = [
  { id: 'syncs', label: 'Syncs' },
  { id: 'messages', label: 'Messages' },
];

function TabIcon({ tab }: { tab: HistoryTab }) {
  if (tab === 'syncs') {
    return (
      <span className="snc-tab-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none">
          <path d="M2.5 6.5A5.5 5.5 0 0 1 13 5M13.5 9.5A5.5 5.5 0 0 1 3 11"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M11.5 2v3h-3M4.5 14v-3h3" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  return (
    <span className="snc-tab-icon" aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="none">
        <rect x="1.75" y="3.25" width="12.5" height="9.5" rx="1.6"
          stroke="currentColor" strokeWidth="1.5" />
        <path d="M2.5 4.5l5.5 4 5.5-4" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

// Count-only block for tab badges.
export default function AgentHistoryPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const location = useLocation();
  const backTo = location.state?.backTo ?? '/history';
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<HistoryTab>('syncs');

  // ── Agent identity (nav state, else fetch) ──
  const [agent, setAgent] = useState<HistoryAgent | null>(
    (location.state?.agent as HistoryAgent | undefined) ?? null
  );

  useEffect(() => {
    if (!agentId || (agent && agent.id === agentId)) return;
    let cancelled = false;
    ApiService.getHistoryAgents()
      .then((agents) => {
        if (cancelled) return;
        setAgent(agents.find((a) => a.id === agentId) ?? null);
      })
      .catch((err) => {
        console.error('[History] failed to load agent identity:', err);
      });
    return () => { cancelled = true; };
  }, [agentId, agent]);

  // ── Lock html overflow (full-page) ──
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => { html.style.overflow = prev; };
  }, []);

  // ── No agentId guard ────────────────────────────────────────────────
  if (!agentId) {
    return (
      <div className="page">
        <p className="muted">No agent id in the URL.</p>
      </div>
    );
  }

  // Switcher lives inside the grid toolbar (no dedicated row).
  const tabSwitcher = (
    <div className="snc-tabs" role="tablist" aria-label="History tables">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`snc-tab${activeTab === tab.id ? ' snc-tab--active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <TabIcon tab={tab.id} />
          <span className="snc-tab-label">{tab.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="snc-page">

      {/* ── Page header (single row) ────────────────────────────── */}
      <header className="snc-header">

        <div className="snc-header-start">
          <button
            type="button"
            className="snc-back-btn"
            onClick={() => navigate(backTo ?? '/history')}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <path d="M9.5 3L5 7.5L9.5 12" stroke="currentColor"
                strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>

          <div className="snc-header-sep" aria-hidden="true" />

          <span className="snc-agent-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="4" y="4.5" width="16" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
              <rect x="4" y="13.5" width="16" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="7.5" cy="7.5" r="0.95" fill="currentColor" />
              <circle cx="7.5" cy="16.5" r="0.95" fill="currentColor" />
            </svg>
          </span>

          <div className="snc-agent-identity">
            <div className="snc-agent-identity-line">
              <span className="snc-agent-callsign" title={agent?.callSign ?? undefined}>
                {agent?.callSign ?? 'Agent'}
              </span>
              <span className="snc-page-label">History</span>
            </div>
            <span className="snc-agent-id-text" title={agentId}>{agentId}</span>
          </div>

          {/* ── Inline agent metadata ─────────────────────────── */}
          {agent && (
            <div className="snc-meta-row">
              <div className="snc-meta-item">
                <span className="snc-meta-label">Unit</span>
                <span className="snc-meta-value">
                  <span
                    className="snc-meta-dot"
                    style={{ backgroundColor: unitDotColor(agent.platfrom.unit) }}
                    aria-hidden="true"
                  />
                  {agent.platfrom.unit}
                </span>
              </div>
              <div className="snc-meta-item">
                <span className="snc-meta-label">Platform</span>
                <span className="snc-meta-value">{agent.platfrom.platform}</span>
              </div>
              <div className="snc-meta-item">
                <span className="snc-meta-label">Zayad ID</span>
                <span className="snc-meta-value snc-meta-num">{agent.platfrom.zayadId}</span>
              </div>
              <div className="snc-meta-item">
                <span className="snc-meta-label">Platform ID</span>
                <span className="snc-meta-value snc-meta-num">{agent.platfrom.platformId}</span>
              </div>
              <div className="snc-meta-item">
                <span className="snc-meta-label">Unit Code</span>
                <span className="snc-meta-value snc-meta-num">{agent.platfrom.unitCode}</span>
              </div>
              <div className="snc-meta-item snc-meta-item--created">
                <span className="snc-meta-label">Created</span>
                <span className="snc-meta-value">{formatRosterDate(agent.createdAt)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="snc-header-end">
          <ModeNavigationLink to="/" label="ניטור זמן אמת" variant="real-time" />
        </div>

      </header>

      {/* ── Active table (switcher sits in its toolbar) ────────── */}
      {activeTab === 'syncs' ? (
        <HistoryDataGrid key="syncs" agentId={agentId} config={syncsConfig} leftSlot={tabSwitcher} />
      ) : (
        <HistoryDataGrid key="messages" agentId={agentId} config={messagesConfig} leftSlot={tabSwitcher} />
      )}

    </div>
  );
}
