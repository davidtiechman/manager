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
const COUNT_PARAMS = { startRow: 0, endRow: 1, sortModel: [], filterModel: {} };

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

  // ── Tab row counts (badges) ────────────────────────────────────────
  const [counts, setCounts] = useState<{ syncs: number | null; messages: number | null }>({
    syncs: null,
    messages: null,
  });

  useEffect(() => {
    if (!agentId) return;
    let cancelled = false;
    const total = (r: { rowCount?: number; lastRow: number | null; rows: unknown[] }) =>
      r.rowCount ?? r.lastRow ?? r.rows.length;
    Promise.all([
      ApiService.getHistorySyncsIrm(agentId, COUNT_PARAMS).then(total).catch(() => null),
      ApiService.getHistoryMessagesIrm(agentId, COUNT_PARAMS).then(total).catch(() => null),
    ]).then(([syncs, messages]) => {
      if (!cancelled) setCounts({ syncs, messages });
    });
    return () => { cancelled = true; };
  }, [agentId]);

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
        <p className="muted">לא נמצא מזהה agent בכתובת.</p>
      </div>
    );
  }

  const tabs: Array<{ id: HistoryTab; label: string; count: number | null }> = [
    { id: 'syncs', label: 'Syncs', count: counts.syncs },
    { id: 'messages', label: 'Messages', count: counts.messages },
  ];

  // Switcher lives inside the grid toolbar (no dedicated row).
  const tabSwitcher = (
    <div className="snc-tabs" role="tablist" aria-label="History tables">
      {tabs.map((tab) => (
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
          {tab.count !== null && (
            <span className="snc-tab-count">{tab.count.toLocaleString('en-US')}</span>
          )}
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
              <span className="snc-agent-callsign" title={agent?.callsign ?? undefined}>
                {agent?.callsign ?? 'Agent'}
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
