import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { AgentResponse } from '../../types/realTimeAgents/agentResponse';
import type {AgentPreviewData,ConfigurationTableData,} from '../../types/realTimeAgents/tables';
import { getFieldValue, toAgentPreview } from '../../types/realTimeAgents/adapter';
import Details from './AgentDetails';
import { ApiService } from '../../api';
import TankIcon from '../agent-details/TankIcon';
import ModeNavigationLink from '../ModeNavigationLink';
import type { PlatformSearchState } from '../../types/realTimeAgents/PlatformSearchField';
import {AgentsFilter,filterAgents,getIsCustomSearchFieldMissing,
} from './filterAgents';

const intervalFetchManager =
  Number(import.meta.env.VITE_FETCH_INTERVAL) || 10_000;

type ViewMode = 'icon' | 'list';

export default function Preview() {
  const [agents, setAgents] = useState<AgentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('icon');
  const [isConfigurationEditing, setIsConfigurationEditing] = useState(false);
  const [configurationMessage, setConfigurationMessage] = useState('');
  const [search, setSearch] = useState<PlatformSearchState>({
    field: 'unit',
    customField: '',
    text: '',
  });

  const isConfigurationEditingRef = useRef(isConfigurationEditing);
  const { agentId: routeAgentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();


  const filteredAgents = useMemo(() => {
    return filterAgents(agents, search);
  }, [agents, search]);

  const isCustomSearchFieldMissing = useMemo(() => {
    return getIsCustomSearchFieldMissing(agents, search);
  }, [agents, search]);

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
    const selectedLink = getFieldValue<string>(configuration, 'selectedLink');
    const schedulerMode = getFieldValue<string>(configuration, 'schedulerMode');
    const intervalMs = getFieldValue<number>(configuration, 'intervalMs');
    const maxRetries = getFieldValue<number>(configuration, 'maxRetries');
    const sparkProxyUrl = getFieldValue<string>(configuration, 'sparkProxyUrl');
    const token = getFieldValue<string>(configuration, 'token');
    const batchSize = getFieldValue<number>(configuration, 'batchSize');
    const isManualMode = getFieldValue<boolean>(configuration, 'isManualMode');

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
              selectedLink,
              schedulerMode,
            },
          },
          configuration: {
            schedulerMode,
            selectedLink,
            intervalMs,
            maxRetries,
            sparkProxyUrl,
            token,
            batchSize,
            isManualMode,
          },
        };
      })
    );
  };

  function getAgentLabel(agent: AgentPreviewData) {
    return agent.call_sign || agent.zayad_id || agent.unit_code || agent.id;
  }

  if (loading) {
    return (
      <div className="page">
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
    <div className="page">
      <div className="page-header">
        <ModeNavigationLink
          to="/history"
          label="למעבר להיסטוריה"
          variant="history"
        />

        <h1>ניטור סוכנים בזמן אמת</h1>

        <p className="muted">
          {viewMode === 'icon'
            ? 'לחץ על אייקון כדי לראות פרטים'
            : 'לחץ על שורה כדי לראות פרטים'}
        </p>

        <div className="view-toggle" role="group" aria-label="בחירת תצוגה">
          <button
            type="button"
            className={`view-toggle-button ${
              viewMode === 'icon' ? 'active' : ''
            }`}
            onClick={() => setViewMode('icon')}
          >
            אייקונים
          </button>

          <button
            type="button"
            className={`view-toggle-button ${
              viewMode === 'list' ? 'active' : ''
            }`}
            onClick={() => setViewMode('list')}
          >
            רשימה
          </button>
        </div>
      </div>

      <div className="home-layout">
        <aside className="agents-pane">
          <AgentsFilter
  search={search}
  onSearchChange={setSearch}
  isCustomSearchFieldMissing={isCustomSearchFieldMissing}
/>
          <div
            className={`agents-grid ${
              viewMode === 'list' ? 'agents-list' : ''
            }`}
          >
            {filteredAgents.map((agent) => {
              const previewAgent = toAgentPreview(agent);

              return (
                <button
                  key={previewAgent.id}
                  type="button"
                  className={`agent-card ${previewAgent.status} ${
                    viewMode === 'list' ? 'list-view' : ''
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
                    <div className="agent-label">
                      {getAgentLabel(previewAgent)}
                    </div>

                    <div className="agent-info">
                      <div className="info-item">ID: {previewAgent.id}</div>
                      <div className="info-item">
                        סטטוס: {previewAgent.status}
                      </div>
                      <div className="info-item">
                        שם סוכן: {previewAgent.call_sign}
                      </div>
                      <div className="info-item">
                        יחידה: {previewAgent.unit}
                      </div>
                      <div className="info-item">
                        פלטפורמה ID: {previewAgent.platformId}
                      </div>
                      <div className="info-item">
                        צייד ID: {previewAgent.zayad_id}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="details-pane">
          {selectedAgent ? (
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
          ) : (
            <div className="empty-details">
              <h2>Agent Details</h2>
              <p className="muted">Select an agent to view details.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}