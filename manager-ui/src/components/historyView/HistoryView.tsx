
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { HistoryAgent } from '../../types/history/historyAgent';
import { AgentHistoryRecord } from '../../types/history/agentHistoryRecord';
import { ApiService } from '../../api';

export default function HistoryView() {
  const [agents, setAgents] = useState<HistoryAgent[]>([]);
  const [records, setRecords] = useState<AgentHistoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [recordsLoading, setRecordsLoading] = useState<boolean>(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistoryAgents = async () => {
      try {
        const data: HistoryAgent[] = await ApiService.getHistoryAgents();
        setAgents(data);
      }
      catch (error) {
        console.error('Error fetching history agents:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistoryAgents();
  }, []);

  useEffect(() => {
    if (!selectedAgentId) {
      setRecords([]);
      return;
    }

    const fetchAgentHistory = async () => {
      try {
        setRecordsLoading(true);
        const data = await ApiService.getAgentHistory(selectedAgentId);
        setRecords(data);
      } catch (error) {
        console.error('Error fetching agent history:', error);
        setRecords([]);
      } finally {
        setRecordsLoading(false);
      }
    };

    fetchAgentHistory();
  }, [selectedAgentId]);

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>תצוגת היסטוריה סוכנים</h1>

          <Link to="/" className="nav-button">
            חזרה לניטור בזמן אמת
          </Link>
          <p className="muted">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>תצוגת היסטוריה סוכנים</h1>

        <Link to="/" className="nav-button">
          חזרה לניטור בזמן אמת
        </Link>
      </div>

      <div className="home-layout">
        <aside className="agents-pane">
          <div className="agents-grid agents-list">
            {agents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                className={`agent-card list-view ${selectedAgentId === agent.id ? 'selected' : ''}`}
                onClick={() => setSelectedAgentId(agent.id)}
              >
                <div className="agent-content">
                  <div className="agent-label">
                    {agent.callSign || agent.id}
                  </div>

                  <div className="agent-info">
                    <div className="info-item">ID: {agent.id}</div>
                    <div className="info-item">יחידה: {agent.unit}</div>
                    <div className="info-item">פלטפורמה: {agent.platform}</div>
                    <div className="info-item">נראה לאחרונה: {agent.lastSeenAt}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="details-pane">
          {selectedAgentId ? (
            <div className="details-panel">
              <div className="details-header">
                <h2>Agent History</h2>
              </div>

              {recordsLoading ? (
                <p className="muted">טוען רשומות...</p>
              ) : (
                <table className="details-table">
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id}>
                        <td>{record.createdAt}</td>
                        <td>{record.status}</td>
                        <td>{record.details.selectedLink}</td>
                        <td>{record.link_quality.quality}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="empty-details">
              <h2>Agent History</h2>
              <p className="muted">Select an agent to view sync records.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
