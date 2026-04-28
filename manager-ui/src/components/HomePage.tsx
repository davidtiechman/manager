import { useEffect, useState } from 'react';
import type { AgentStatus } from '../types';
import Details from './AgentDetails';
import { ApiService } from '../api';
import TankIcon from '../components/TankIcon';

type ViewMode = 'icon' | 'list';

export default function HomePage() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentStatus | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('icon');

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        const data = await ApiService.getAgents();
        setAgents(data);
      } catch (err) {
        console.error('Error fetching agents:', err);
        // Still show data from ApiService fallback
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchAgents, 30000);
    return () => clearInterval(interval);
  }, []);

  function getAgentLabel(agent: AgentStatus) {
    return agent.call_sign || agent.zayad_id || agent.unit_code;
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
            {agents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                className={`agent-card ${agent.status} ${viewMode === 'list' ? 'list-view' : ''} ${selectedAgent?.id === agent.id ? 'selected' : ''}`}
                onClick={() => setSelectedAgent(agent)}
              >
                <div className="tank-icon">
                  <TankIcon status={agent.status} />
                </div>
                <div className="agent-content">
                  <div className="agent-label">{getAgentLabel(agent)}</div>
                  <div className="agent-info">
                    <div className="info-item">יחידה: {agent.unit}</div>
                    <div className="info-item">קוד יחידה: {agent.unit_code}</div>
                    <div className="info-item">ציד ID: {agent.zayad_id}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="details-pane">
          {selectedAgent ? (
            <Details
              agent={selectedAgent}
              onClose={() => setSelectedAgent(null)}
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
