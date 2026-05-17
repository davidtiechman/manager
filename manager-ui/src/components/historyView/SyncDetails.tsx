import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiService } from '../../api';
import { AgentHistoryRecord } from '../../types/history/agentHistoryRecord';

export default function SyncDetails() {
  const { agentId, syncId } = useParams<{
    agentId: string;
    syncId: string;
  }>();

  const [record, setRecord] = useState<AgentHistoryRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId || !syncId) {
      setLoading(false);
      return;
    }

    const fetchSyncDetails = async () => {
      try {
        setLoading(true);

        // כרגע אין לנו ApiService.getSyncById,
        // לכן שולפים את כל ההיסטוריה של ה-agent ומוצאים את ה-sync לפי id.
        const data: AgentHistoryRecord[] = await ApiService.getAgentHistory(agentId);
        const selectedRecord = data.find((item) => String(item.id) === syncId) ?? null;

        setRecord(selectedRecord);
      } catch (error) {
        console.error('Error fetching sync details:', error);
        setRecord(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSyncDetails();
  }, [agentId, syncId]);

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Sync Details</h1>
          <p className="muted">טוען פרטי sync...</p>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Sync Details</h1>

          <Link to={`/agents/${agentId}/history`} className="nav-button">
            חזרה להיסטוריית Syncs
          </Link>
        </div>

        <p className="muted">לא נמצא sync מתאים.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Sync Details</h1>

        <div>
          <Link to={`/agents/${agentId}/history`} className="nav-button">
            חזרה להיסטוריית Syncs
          </Link>

          <Link to="/" className="nav-button">
            חזרה לניטור בזמן אמת
          </Link>
        </div>
      </div>

      <div className="details-panel">
        <div className="details-header">
          <h2>Sync #{record.id}</h2>
        </div>

        <div className="details-tables-grid">
          <table className="details-table">
            <tbody>
              <tr>
                <td>Created At</td>
                <td>{record.createdAt}</td>
              </tr>

              <tr>
                <td>Status</td>
                <td>{record.status}</td>
              </tr>

              <tr>
                <td>Selected Link</td>
                <td>{record.details?.selectedLink}</td>
              </tr>

              <tr>
                <td>Link Quality</td>
                <td>{record.link_quality?.quality}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}