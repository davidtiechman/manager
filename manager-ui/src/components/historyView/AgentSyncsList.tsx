import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiService } from '../../api';
import { AgentHistoryRecord } from '../../types/history/agentHistoryRecord';
import ModeNavigationLink from '../ModeNavigationLink';

interface AgentSyncsListProps {
  agentId?: string;
  onClose?: () => void;
}

export default function AgentSyncsList({ agentId: agentIdProp, onClose }: AgentSyncsListProps) {
  const { agentId: routeAgentId } = useParams<{ agentId: string }>();
  const agentId = agentIdProp ?? routeAgentId;
  const isEmbedded = Boolean(agentIdProp);

  const [records, setRecords] = useState<AgentHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  function displayValue(value: string | number | boolean | null | undefined) {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    return value;
  }

  function formatDateTime(value: string | null | undefined) {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  }

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

  const renderDetailsHeader = (title: string) => (
    <div className="details-header">
      <div className="details-title-block">
        <h2>{title}</h2>
      </div>

      <div className="details-header-actions details-header-actions-left">
        <button
          type="button"
          className="details-back-button"
          onClick={() => agentId && navigate(`/agents/${agentId}`)}
        >
          Back
        </button>
        {agentId && <p className="details-agent-id">Agent ID: {agentId}</p>}
      </div>

      {onClose && (
        <div className="details-header-actions details-header-actions-right">
          <button type="button" className="details-close-button" onClick={onClose}>
            Close
          </button>
        </div>
      )}
    </div>
  );

  if (!agentId) {
    return (
      <div className="page">
        <div className="page-header">
          <ModeNavigationLink to="/" label="למעבר לניטור זמן אמת" variant="real-time" />
          <h1>Agent History</h1>
          <p className="muted">לא נמצא מזהה agent בכתובת.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    if (isEmbedded) {
      return (
        <div className="details-panel">
          {renderDetailsHeader('Sync History')}
          <p className="muted">טוען רשומות...</p>
        </div>
      );
    }

    return (
      <div className="page">
        <div className="page-header">
          <ModeNavigationLink to="/" label="למעבר לניטור זמן אמת" variant="real-time" />
          <h1>Sync History</h1>
          <p className="muted">טוען רשומות...</p>
        </div>
      </div>
    );
  }

  const detailsContent = (
    <div className="details-panel">
      {renderDetailsHeader('Sync History')}

      {records.length === 0 ? (
        <div className="empty-details">
          <h2>אין רשומות</h2>
          <p className="muted">לא נמצאו syncs עבור ה-agent הזה.</p>
        </div>
      ) : (
        <div className="history-syncs-table-wrapper">
          <table className="details-table history-syncs-table">
            <thead>
              <tr>
                <th>Sync ID</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Details ID</th>
                <th>Selected Link</th>
                <th>Scheduler Mode</th>
                <th>Messages In Queue</th>
                <th>Next Delivery Time</th>
                <th>Geo Data</th>
                <th>Server LUT</th>
                <th>Link Quality ID</th>
                <th>Link Type</th>
                <th>Available</th>
                <th>Quality</th>
                <th>Latency</th>
                <th>Reliability</th>
                <th>Timestamp</th>
              </tr>
            </thead>

            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{displayValue(record.id)}</td>
                  <td>{displayValue(record.status)}</td>
                  <td>{formatDateTime(record.createdAt)}</td>
                  <td>{displayValue(record.details?.id)}</td>
                  <td>{displayValue(record.details?.selectedLink)}</td>
                  <td>{displayValue(record.details?.schedulerMode)}</td>
                  <td>{displayValue(record.details?.messagesInQueue)}</td>
                  <td>{displayValue(record.details?.nextDeliveryTime)}</td>
                  <td>{displayValue(record.details?.geoData)}</td>
                  <td>{displayValue(record.details?.serverLut)}</td>
                  <td>{displayValue(record.link_quality?.id)}</td>
                  <td>{displayValue(record.link_quality?.type)}</td>
                  <td>{displayValue(record.link_quality?.available)}</td>
                  <td>{displayValue(record.link_quality?.quality)}</td>
                  <td>{displayValue(record.link_quality?.latency)}</td>
                  <td>{displayValue(record.link_quality?.reliability)}</td>
                  <td>{displayValue(record.link_quality?.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (isEmbedded) {
    return detailsContent;
  }

  return (
    <div className="page">
      <div className="page-header">
        <ModeNavigationLink to="/" label="למעבר לניטור זמן אמת" variant="real-time" />
      </div>

      {detailsContent}
    </div>
  );
}
