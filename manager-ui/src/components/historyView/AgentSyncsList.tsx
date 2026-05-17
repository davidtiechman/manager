import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiService } from '../../api';
import { AgentHistoryRecord } from '../../types/history/agentHistoryRecord';

export default function AgentSyncsList({ agentId: agentIdProp }: { agentId?: string }) {
  const { agentId: routeAgentId } = useParams<{ agentId: string }>();
  const agentId = agentIdProp ?? routeAgentId;

  const [records, setRecords] = useState<AgentHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    if (!agentId) {
      setLoading(false);
      return;
    }

    const fetchAgentHistory = async () => {
      try {
        setLoading(true);
        const data: AgentHistoryRecord[] = await ApiService.getAgentHistory(agentId);
        setRecords(data);
      } catch (error) {
        console.error('Error fetching agent history:', error);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentHistory();
  }, [agentId]);

  if (!agentId) {
    return (
      <div className="page">
        <h1>Agent History</h1>
        <p className="muted">לא נמצא מזהה agent בכתובת.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Sync History</h1>
          <p className="muted">טוען רשומות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Sync History</h1>
        <p className="muted">Agent ID: {agentId}</p>

        <div>
          <Link to="/history" className="nav-button">
            חזרה לרשימת Agents
          </Link>

          <Link to="/" className="nav-button">
            חזרה לניטור בזמן אמת
          </Link>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="empty-details">
          <h2>אין רשומות</h2>
          <p className="muted">לא נמצאו syncs עבור ה-agent הזה.</p>
        </div>
      ) : (
        <div className="details-panel">
          <div className="details-header">
            <h2>רשימת Syncs</h2>
          </div>

          <table className="details-table">
            <thead>
              <tr>
                <th>Created At</th>
                <th>Status</th>
                <th>Selected Link</th>
                <th>Link Quality</th>
              </tr>
            </thead>

            <tbody>
              {records.map((record) => (
                <tr
                  key={record.id}
                  onClick={() => navigate(`/agents/${agentId}/history/${record.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{record.createdAt}</td>
                  <td>{record.status}</td>
                  <td>{record.details?.selectedLink}</td>
                  <td>{record.link_quality?.quality}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
