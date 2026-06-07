import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import './AgentSyncsList.css';

import { ApiService } from '../../api';
import { useLang } from '../../i18n/LanguageProvider';
import type { HistoryAgent } from '../../types/history/historyAgent';
import { formatRosterDate } from '../rosterView/rosterFormat';
import { unitDotColor } from '../rosterView/rosterColors';
import ModeNavigationLink from '../ModeNavigationLink';
import NotFound from '../NotFound';
import LanguageToggle from '../../i18n/LanguageToggle';

import HistoryDataGrid from './grid/HistoryDataGrid';
import { syncsConfig } from './syncsConfig';
import { messagesConfig } from './messagesConfig';

type HistoryTab = 'syncs' | 'messages';

const TAB_IDS: HistoryTab[] = ['syncs', 'messages'];

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
  const { t, i18n } = useTranslation('history');
  const { lang, dir } = useLang();

  // Rebuild table configs on language change (freeze side follows direction).
  const syncs = useMemo(() => syncsConfig(t, dir), [i18n.language, dir]);
  const messages = useMemo(() => messagesConfig(t, dir), [i18n.language, dir]);

  const [activeTab, setActiveTab] = useState<HistoryTab>('syncs');

  // ── Agent identity (nav state, else fetch) ──
  const [agent, setAgent] = useState<HistoryAgent | null>(
    (location.state?.agent as HistoryAgent | undefined) ?? null
  );
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!agentId || (agent && agent.id === agentId)) return;
    let cancelled = false;
    setNotFound(false);
    ApiService.getHistoryAgents()
      .then((agents) => {
        if (cancelled) return;
        const found = agents.find((a) => a.id === agentId) ?? null;
        setAgent(found);
        setNotFound(found === null);
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
        <p className="muted">{t('header.noAgentId')}</p>
      </div>
    );
  }

  // ── Agent doesn't exist ──────────────────────────────────────────────
  if (notFound) {
    return (
      <NotFound
        code=""
        message={t('header.agentNotFound', { id: agentId })}
        to={backTo}
        linkLabel={t('header.backToHistory')}
      />
    );
  }

  // Switcher lives inside the grid toolbar (no dedicated row).
  const tabSwitcher = (
    <div className="snc-tabs" role="tablist" aria-label={t('header.historyTables')}>
      {TAB_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={activeTab === id}
          className={`snc-tab${activeTab === id ? ' snc-tab--active' : ''}`}
          onClick={() => setActiveTab(id)}
        >
          <TabIcon tab={id} />
          <span className="snc-tab-label">{t(`tabs.${id}`)}</span>
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
            {t('header.back')}
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
                {agent?.callSign ?? t('header.agent')}
              </span>
              <span className="snc-page-label">{t('header.history')}</span>
            </div>
            <span className="snc-agent-id-text" title={agentId}>{agentId}</span>
          </div>

          {/* ── Inline agent metadata ─────────────────────────── */}
          {agent && (
            <div className="snc-meta-row">
              <div className="snc-meta-item">
                <span className="snc-meta-label">{t('meta.unit')}</span>
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
                <span className="snc-meta-label">{t('meta.platform')}</span>
                <span className="snc-meta-value">{agent.platfrom.platform}</span>
              </div>
              <div className="snc-meta-item">
                <span className="snc-meta-label">{t('meta.zayadId')}</span>
                <span className="snc-meta-value snc-meta-num">{agent.platfrom.zayadId}</span>
              </div>
              <div className="snc-meta-item">
                <span className="snc-meta-label">{t('meta.platformId')}</span>
                <span className="snc-meta-value snc-meta-num">{agent.platfrom.platformId}</span>
              </div>
              <div className="snc-meta-item">
                <span className="snc-meta-label">{t('meta.unitCode')}</span>
                <span className="snc-meta-value snc-meta-num">{agent.platfrom.unitCode}</span>
              </div>
              <div className="snc-meta-item snc-meta-item--created">
                <span className="snc-meta-label">{t('meta.created')}</span>
                <span className="snc-meta-value">{formatRosterDate(agent.createdAt)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="snc-header-end">
          <ModeNavigationLink to="/" label={t('header.realtimeLink')} variant="real-time" />
          <LanguageToggle />
        </div>

      </header>

      {/* ── Active table (switcher sits in its toolbar) ────────── */}
      {activeTab === 'syncs' ? (
        <HistoryDataGrid key={`syncs-${lang}`} agentId={agentId} config={syncs} leftSlot={tabSwitcher} />
      ) : (
        <HistoryDataGrid key={`messages-${lang}`} agentId={agentId} config={messages} leftSlot={tabSwitcher} />
      )}

    </div>
  );
}
