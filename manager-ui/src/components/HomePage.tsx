import { useEffect, useState } from 'react';
import type { AgentResponse } from '../types/agentResponse';
import type { AgentPreviewData } from '../types/tables';
import { toAgentPreview } from '../types/adapter';
import { socket } from '../socket';
import Details from './AgentDetails';
import { ApiService } from '../api';
import TankIcon from '../components/TankIcon';

type ViewMode = 'icon' | 'list';

export default function HomePage() {
  const [agents, setAgents] = useState<AgentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('icon');

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);

        const data: AgentResponse[] = await ApiService.getAgents();
        setAgents(data);
      } catch (err) {
        console.error('Error fetching agents:', err);
      } finally {
        setLoading(false);
      }
    };

    const handleAgentsSnapshot = (updatedAgents: AgentResponse[]) => {
      setAgents(updatedAgents);
      setLoading(false);
    };

    fetchAgents();

    socket.on('agents:snapshot', handleAgentsSnapshot);

    return () => {
      socket.off('agents:snapshot', handleAgentsSnapshot);
    };
  }, []);

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);

  function getAgentLabel(agent: AgentPreviewData) {
    return agent.call_sign || agent.zayad_id || agent.unit_code || agent.id;
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>ניטור סוכנים בזמן אמת</h1>
          <p className="muted">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>ניטור סוכנים בזמן אמת</h1>

        <p className="muted">
          {viewMode === 'icon'
            ? 'לחץ על אייקון כדי לראות פרטים'
            : 'לחץ על שורה כדי לראות פרטים'}
        </p>

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
      </div>

      <div className="home-layout">
        <aside className="agents-pane">
          <div className={`agents-grid ${viewMode === 'list' ? 'agents-list' : ''}`}>
            {agents.map((agent) => {
              const previewAgent = toAgentPreview(agent);

              return (
                <button
                  key={previewAgent.id}
                  type="button"
                  className={`agent-card ${previewAgent.status} ${
                    viewMode === 'list' ? 'list-view' : ''
                  } ${selectedAgentId === previewAgent.id ? 'selected' : ''}`}
                  onClick={() => setSelectedAgentId(previewAgent.id)}
                >
                  <div className="tank-icon">
                    <TankIcon status={previewAgent.status} />
                  </div>

                  <div className="agent-content">
                    <div className="agent-label">{getAgentLabel(previewAgent)}</div>

                    <div className="agent-info">
                      <div className="info-item">ID: {previewAgent.id}</div>
                      <div className="info-item">סטטוס: {previewAgent.status}</div>
                      <div className="info-item">שם סוכן: {previewAgent.call_sign}</div>
                      <div className="info-item">יחידה: {previewAgent.unit}</div>
                      <div className="info-item"> פלטפורמה ID: {previewAgent.platformId}</div>
                      <div className="info-item">ציד ID: {previewAgent.zayad_id}</div>
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
              onClose={() => setSelectedAgentId(null)}
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