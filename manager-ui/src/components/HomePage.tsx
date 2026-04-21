import { useState, useEffect } from 'react';
import type { AgentStatus } from '../types';
import Details from "../components/Details";
import { ApiService } from '../api';
import TankIcon from '../components/TankIcon';

export default function HomePage() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentStatus | null>(null);

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
        <p className="muted">לחץ על אייקון כדי לראות פרטים</p>
      </div>

      <div className="agents-grid">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={`agent-tile ${selectedAgent?.id === agent.id ? 'selected' : ''}`}
          >
            <button
              className={`agent-card ${agent.status}`}
              onClick={() => setSelectedAgent(agent)}
            >
              <div className="tank-icon">
                <TankIcon status={agent.status} />
              </div>
              <div className="agent-label">{getAgentLabel(agent)}</div>
              <div className="agent-info">
                <div className="info-item">יחידה: {agent.unit}</div>
                <div className="info-item">קוד יחידה: {agent.unit_code}</div>
                <div className="info-item">ציד ID: {agent.zayad_id}</div>
              </div>
            </button>

            {selectedAgent?.id === agent.id && (
              <Details
                agent={selectedAgent}
                onClose={() => setSelectedAgent(null)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
