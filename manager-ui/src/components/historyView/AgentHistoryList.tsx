import { useEffect, useState } from 'react';
import { ApiService } from '../../api';
import { HistoryAgent } from '../../types/history/historyAgent';
import AgentSyncsList from './AgentSyncsList';
import { useNavigate, useParams } from 'react-router-dom';
import ModeNavigationLink from '../ModeNavigationLink';

export default function AgentHistoryList() {
  const [agents, setAgents] = useState<HistoryAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'icon' | 'list'>('icon');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const { agentId: routeAgentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistoryAgents = async () => {
      try {
        const data: HistoryAgent[] = await ApiService.getHistoryAgents();
        setAgents(data);
      } catch (error) {
        console.error('Error fetching history agents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoryAgents();
  }, []);

  useEffect(() => {
    if (routeAgentId) {
      setSelectedAgentId(routeAgentId);
    }
  }, [routeAgentId]);

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <ModeNavigationLink to="/" label="למעבר לניטור זמן אמת" variant="real-time" />
          <h1>תצוגת היסטוריה סוכנים</h1>
          <p className="muted">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <ModeNavigationLink to="/" label="למעבר לניטור זמן אמת" variant="real-time" />
        <h1>תצוגת היסטוריה סוכנים</h1>

        <p className="menu">
          {viewMode === 'icon'
            ? 'לחץ על אייקון כדי לראות היסטוריית syncs'
            : 'לחץ על שורה כדי לראות היסטוריית syncs'}
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

      <div className="home-layout history-layout">
        <aside className="agents-pane">
          <div className={`agents-grid history-agents-grid ${viewMode === 'list' ? 'agents-list' : ''}`}>
            {agents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                className={`agent-card ${
                  viewMode === 'icon' ? 'icon-view' : 'list-view'
                } ${selectedAgentId === agent.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedAgentId(agent.id);
                  navigate(`/history/${agent.id}`);
                }}
              >
                <div className="agent-content">
                  <div className="agent-label">
                    {agent.callSign || agent.id}
                  </div>

                  <div className="agent-info">
                    <div className="info-item">ID: {agent.id}</div>
                    <div className='info-item'>Created at: {agent.createdAt}</div>
                    {/* <div className="info-item">יחידה: {agent.unit}</div> */}
                    {/* <div className="info-item">פלטפורמה: {agent.platform}</div> */}
                    {/* <div className="info-item">נראה לאחרונה: {agent.lastSeenAt}</div> */}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="details-pane">
          {selectedAgent ? (
            <AgentSyncsList
              agentId={selectedAgent.id}
              onClose={() => {
                setSelectedAgentId(null);
                navigate('/history');
              }}
            />
          ) : (
            <div className="empty-details">
              <h2>Sync History</h2>
              <p className="muted">בחר סוכן כדי לראות היסטוריה</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
