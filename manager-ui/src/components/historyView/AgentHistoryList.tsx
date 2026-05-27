import { useEffect, useState } from 'react';
import { ApiService } from '../../api';
import { HistoryAgent } from '../../types/history/historyAgent';
import { useNavigate } from 'react-router-dom';
import ModeNavigationLink from '../ModeNavigationLink';

export default function AgentHistoryList() {
  const [agents, setAgents] = useState<HistoryAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'icon' | 'list'>('icon');

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

  if (loading) {
    return (
      <div className="page">
        <div className="top-bar">
          <ModeNavigationLink to="/" label="למעבר לניטור זמן אמת" variant="real-time" />
          <h1 className="top-bar-title">תצוגת היסטוריה סוכנים</h1>
        </div>

        <div className="page-header">
          <p className="muted">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="top-bar">
        <ModeNavigationLink to="/" label="למעבר לניטור זמן אמת" variant="real-time" />
        <h1 className="top-bar-title">תצוגת היסטוריה סוכנים</h1>
      </div>

      <div className="page-header main-preview-header">
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

      <div className="history-agents-layout">
        <main className="agents-pane">
          <div className={`agents-grid history-agents-grid ${viewMode === 'list' ? 'agents-list' : ''}`}>
            {agents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                className={`agent-card ${
                  viewMode === 'icon' ? 'icon-view' : 'list-view'
                }`}
                onClick={() => {
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
                  </div>
                </div>
              </button>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
