import { useEffect, useRef, useState } from 'react';
import {useLocation, useNavigate, useParams } from 'react-router-dom';
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
  const location = useLocation();
  const backTo = location.state?.backTo ?? '/history';

  const [records, setRecords] = useState<AgentHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [topScrollWidth, setTopScrollWidth] = useState(0);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

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

  function formatDateTime(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    const dateValue = typeof value === 'number' && value < 1_000_000_000_000 ? value * 1000 : value;
    const date = new Date(dateValue);

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

  function renderAvailability(value: boolean | null | undefined) {
    return displayValue(value);
  }

  function renderDateTime(value: string | number | null | undefined) {
    return (
      <span title={value === null || value === undefined ? undefined : String(value)}>
        {formatDateTime(value)}
      </span>
    );
  }

  function renderCompactValue(value: string | number | null | undefined) {
    return (
      <span title={value === null || value === undefined ? undefined : String(value)}>
        {displayValue(value)}
      </span>
    );
  }

  function syncHorizontalScroll(source: 'top' | 'table') {
    const topScroll = topScrollRef.current;
    const tableScroll = tableScrollRef.current;

    if (!topScroll || !tableScroll) {
      return;
    }

    if (source === 'top') {
      tableScroll.scrollLeft = topScroll.scrollLeft;
      return;
    }

    topScroll.scrollLeft = tableScroll.scrollLeft;
  }

  useEffect(() => {
    const tableScroll = tableScrollRef.current;

    if (!tableScroll || records.length === 0) {
      return;
    }

    const updateTopScrollWidth = () => {
      setTopScrollWidth(tableScroll.scrollWidth);
    };

    updateTopScrollWidth();

    const resizeObserver = new ResizeObserver(updateTopScrollWidth);
    resizeObserver.observe(tableScroll);

    return () => {
      resizeObserver.disconnect();
    };
  }, [records]);

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
          onClick={() => navigate(backTo ?? `/history`)}>
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
        <>
          <div
            className="history-syncs-top-scroll"
            ref={topScrollRef}
            onScroll={() => syncHorizontalScroll('top')}
            aria-hidden="true"
          >
            <div
              className="history-syncs-top-scroll-content"
              style={{ width: topScrollWidth }}
            />
          </div>

          <div
            className="history-syncs-table-wrapper"
            ref={tableScrollRef}
            onScroll={() => syncHorizontalScroll('table')}
          >
            <table className="details-table history-syncs-table">
              <thead>
                <tr>
                  <th className="history-syncs-id-column">ID</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th className="history-syncs-selected-link-column">Scheduled
                    <br />Link
                  </th>
                  <th className="history-syncs-mode-column" title="Scheduler Mode">scheduler
                    <br />
                    Mode</th>
                  <th className="history-syncs-number-column">Message
                    In
                    Queue</th>
                  <th>Next Delivery Time</th>
                  <th>Geo Data</th>
                  <th>Server LUT</th>
                  {/* <th className="history-syncs-id-column">Link Quality ID</th> */}
                  <th>Type</th>
                  <th className="history-syncs-availability-column">Availability</th>
                  <th className="history-syncs-number-column">Quality</th>
                  <th className="history-syncs-number-column">Latency</th>
                  <th className="history-syncs-number-column">Reliability</th>
                  <th>Timestamp</th>
                </tr>
              </thead>

              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td className="history-syncs-id-column">{renderCompactValue(record.id)}</td>
                    <td>{displayValue(record.status)}</td>
                    <td>{renderDateTime(record.createdAt)}</td>
                    <td className="history-syncs-selected-link-column">
                      {renderCompactValue(record.details?.selectedLink)}
                    </td>
                    <td className="history-syncs-mode-column">
                      {renderCompactValue(record.details?.schedulerMode)}
                    </td>
                    <td className="history-syncs-number-column">{displayValue(record.details?.messagesInQueue)}</td>
                    <td>{renderDateTime(record.details?.nextDeliveryTime)}</td>
                    <td>{displayValue(record.details?.geoData)}</td>
                    <td>{renderDateTime(record.details?.serverLut)}</td>
                    {/* <td className="history-syncs-id-column">{displayValue(record.link_quality?.id)}</td> */}
                    <td>{displayValue(record.link_quality?.type)}</td>
                    <td className="history-syncs-availability-column">
                      {renderAvailability(record.link_quality?.available)}
                    </td>
                    <td className="history-syncs-number-column">{displayValue(record.link_quality?.quality)}</td>
                    <td className="history-syncs-number-column">{displayValue(record.link_quality?.latency)}</td>
                    <td className="history-syncs-number-column">{displayValue(record.link_quality?.reliability)}</td>
                    <td>{renderDateTime(record.link_quality?.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
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
