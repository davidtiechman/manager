import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { AgentResponse } from '../../types/realTimeAgents/agentResponse';
import type {
  AgentPreviewData,
  ConfigurationTableData,
} from '../../types/realTimeAgents/tables';
import { toAgentPreview } from '../../types/realTimeAgents/adapter';
import Details from './AgentDetails';
import FilterAgents from './FilterAgents';
import { ApiService } from '../../api';
import TankIcon from '../agent-details/TankIcon';
import ModeNavigationLink from '../ModeNavigationLink';

const intervalFetchManager = Number(import.meta.env.VITE_FETCH_INTERVAL) || 10_000;
const DEFAULT_SIDEBAR_WIDTH = Number(import.meta.env.VITE_DEFAULT_SIDEBAR_WIDTH) || 960;
const MIN_SIDEBAR_WIDTH = Number(import.meta.env.VITE_MIN_SIDEBAR_WIDTH) || 220;
const DETAILS_MIN_WIDTH = Number(import.meta.env.VITE_DETAILS_MIN_WIDTH) || 360;
const RESIZE_HANDLE_WIDTH = Number(import.meta.env.VITE_RESIZE_HANDLE_WIDTH) || 6;
const PAGE_HORIZONTAL_PADDING = Number(import.meta.env.VITE_PAGE_HORIZONTAL_PADDING) || 40;
const SELECTED_LAYOUT_GAPS = Number(import.meta.env.VITE_SELECTED_LAYOUT_GAPS) || 64;
const MAX_SIDEBAR_VIEWPORT_RATIO = Number(import.meta.env.VITE_MAX_SIDEBAR_VIEWPORT_RATIO) || 0.72;
const AGENT_CARD_MIN_SIZE = 118;
const AGENT_CARD_MAX_SIZE = 152;
const AGENT_CARD_GROWTH_RATIO = 0.14;

type ViewMode = 'icon' | 'list';

function getMaxSidebarWidth() {
  if (typeof window === 'undefined') {
    return DEFAULT_SIDEBAR_WIDTH;
  }

  const maxByDetails =
    window.innerWidth -
    PAGE_HORIZONTAL_PADDING -
    RESIZE_HANDLE_WIDTH -
    SELECTED_LAYOUT_GAPS -
    DETAILS_MIN_WIDTH;
  const maxByViewport = window.innerWidth * MAX_SIDEBAR_VIEWPORT_RATIO;

  return Math.max(
    MIN_SIDEBAR_WIDTH,
    Math.floor(Math.min(maxByDetails, maxByViewport))
  );
}

function clampSidebarWidth(width: number) {
  return Math.min(
    Math.max(width, MIN_SIDEBAR_WIDTH),
    getMaxSidebarWidth()
  );
}

function getSelectedAgentCardSize(sidebarWidth: number) {
  const extraWidth = Math.max(0, sidebarWidth - MIN_SIDEBAR_WIDTH);

  return Math.min(
    AGENT_CARD_MAX_SIZE,
    Math.round(AGENT_CARD_MIN_SIZE + extraWidth * AGENT_CARD_GROWTH_RATIO)
  );
}

export default function Preview() {
  const [agents, setAgents] = useState<AgentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('icon');
  const [isConfigurationEditing, setIsConfigurationEditing] = useState(false);
  const [configurationMessage, setConfigurationMessage] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    clampSidebarWidth(DEFAULT_SIDEBAR_WIDTH)
  );
  const isConfigurationEditingRef = useRef(isConfigurationEditing);
  const { agentId: routeAgentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    isConfigurationEditingRef.current = isConfigurationEditing;
  }, [isConfigurationEditing]);

  useEffect(() => {
    if (routeAgentId) {
      setSelectedAgentId(routeAgentId);
    }
  }, [routeAgentId]);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const data: AgentResponse[] = await ApiService.getAgents();
        if (isConfigurationEditingRef.current) {
          return;
        }

        setAgents(data);
      } catch (err) {
        console.error('Error fetching agents:', err);
      } finally {
        if (!isConfigurationEditingRef.current) {
          setLoading(false);
        }
      }
    };

    if (isConfigurationEditing) {
      return;
    }

    fetchAgents();

    const intervalId = setInterval(fetchAgents, intervalFetchManager);
    return () => {
      clearInterval(intervalId);
    };
  }, [isConfigurationEditing]);

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);

  const updateAgentConfiguration = (
    agentId: string,
    configuration: ConfigurationTableData
  ) => {
    setAgents((currentAgents) =>
      currentAgents.map((agent) => {
        if (agent.id !== agentId) {
          return agent;
        }

        return {
          ...agent,
          status: {
            ...agent.status,
            details: {
              ...agent.status.details,
              selectedLink: configuration.selectedLink,
              schedulerMode: configuration.schedulerMode,
            },
          },
          configuration,
        };
      })
    );
  };

  function getAgentLabel(agent: AgentPreviewData) {
    return agent.unit_code || agent.zayad_id || agent.id;
  }

  if (loading) {
    return (
      <div className="dashboard-layout">
        <div className="page-header">
          <ModeNavigationLink
            to="/history"
            label="למעבר להיסטוריה"
            variant="history"
          />
          <h1>ניטור סוכנים בזמן אמת</h1>
          <p className="muted">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`page ${selectedAgent ? 'has-selected-agent-page' : ''}`}>
      <FilterAgents agents={agents}>
        {(filteredAgents, statusFilter, filtersPanel) => (
          <>
            <div className="top-bar">
              <ModeNavigationLink
                to="/history"
                label="למעבר להיסטוריה"
                variant="history"
              />
              <div className="top-bar-status">{statusFilter}</div>
              <h1 className="top-bar-title">ניטור סוכנים בזמן אמת</h1>
              <div className="top-bar-actions">
                {!selectedAgent && (
                  <p className="top-bar-hint">
                    {viewMode === 'icon'
                      ? 'לחץ על אייקון כדי לראות פרטים'
                      : 'לחץ על שורה כדי לראות פרטים'}
                  </p>
                )}
                {!selectedAgent && (
                  <div className="view-toggle" role="group" aria-label="בחירת תצוגה">
                    <button
                      type="button"
                      className={`view-toggle-button ${viewMode === 'icon' ? 'active' : ''}`}
                      onClick={() => setViewMode('icon')}
                    >
                      אייקונים
                    </button>

                    <button
                      type="button"
                      className={`view-toggle-button ${viewMode === 'list' ? 'active' : ''}`}
                      onClick={() => setViewMode('list')}
                    >
                      רשימה
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div
              className={`home-layout ${
                selectedAgent ? 'has-selected-agent' : 'no-selected-agent'
              }`}
              style={
                selectedAgent
                  ? ({
                      gridTemplateColumns: `${sidebarWidth}px ${RESIZE_HANDLE_WIDTH}px minmax(${DETAILS_MIN_WIDTH}px, 1fr)`,
                      '--agent-card-size': `${getSelectedAgentCardSize(sidebarWidth)}px`,
                    } as CSSProperties)
                  : undefined
              }
            >
              <aside className="agents-sidebar">
                {filtersPanel}
                <div className="agents-sidebar-scroll">
                  <div
                    className={`agents-grid ${
                      !selectedAgent && viewMode === 'list' ? 'agents-list' : ''
                    }`}
                  >
                    {filteredAgents.map((agent) => {
                      const previewAgent = toAgentPreview(agent);

                      return (
                        <button
                          key={previewAgent.id}
                        type="button"
                        title={`ID: ${previewAgent.id}`}
                        className={`agent-card ${previewAgent.status} ${
                          !selectedAgent && viewMode === 'list' ? 'list-view' : ''
                        } ${selectedAgentId === previewAgent.id ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedAgentId(previewAgent.id);
                            setConfigurationMessage('');
                            navigate(`/agents/${previewAgent.id}`);
                          }}
                        >
                          <div className="tank-icon">
                            <TankIcon status={previewAgent.status} />
                          </div>

                          <div className="agent-content">
                            <div className="agent-label">{getAgentLabel(previewAgent)}</div>
                            <div className="agent-info">
                              <div className="info-item">
                                <span className="info-label">Call Sign:</span>
                                <span className="info-value">{previewAgent.call_sign}</span>
                              </div>
                              <div className="info-item">
                                <span className="info-label">Status:</span>
                                <span className="info-value">{previewAgent.status}</span>
                              </div>
                              <div className="info-item">
                                <span className="info-label">Unit:</span>
                                <span className="info-value">{previewAgent.unit}</span>
                              </div>
                              <div className="info-item">
                                <span className="info-label">Platform ID:</span>
                                <span className="info-value">{previewAgent.platformId}</span>
                              </div>
                              <div className="info-item">
                                <span className="info-label">Zayad ID:</span>
                                <span className="info-value">{previewAgent.zayad_id}</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </aside>

              {selectedAgent && (
                <>
                  <div
                    className="resize-handle"
                    onMouseDown={(event) => {
                      event.preventDefault();

                      const startX = event.clientX;
                      const startWidth = sidebarWidth;

                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const nextWidth = startWidth + (moveEvent.clientX - startX);
                        setSidebarWidth(clampSidebarWidth(nextWidth));
                      };

                      const handleMouseUp = () => {
                        window.removeEventListener('mousemove', handleMouseMove);
                        window.removeEventListener('mouseup', handleMouseUp);
                      };

                      window.addEventListener('mousemove', handleMouseMove);
                      window.addEventListener('mouseup', handleMouseUp);
                    }}
                  />

                  <main className="details-pane">
                    <Details
                      agent={selectedAgent}
                      onClose={() => {
                        setSelectedAgentId(null);
                        setIsConfigurationEditing(false);
                        setConfigurationMessage('');
                        navigate('/');
                      }}
                      onConfigurationEditChange={setIsConfigurationEditing}
                      onConfigurationSaved={updateAgentConfiguration}
                      configurationMessage={configurationMessage}
                      onConfigurationMessageChange={setConfigurationMessage}
                    />
                  </main>
                </>
              )}
            </div>
          </>
        )}
      </FilterAgents>
    </div>
  );
}
