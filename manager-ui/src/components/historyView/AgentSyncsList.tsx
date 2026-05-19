import { useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import {useLocation, useNavigate, useParams } from 'react-router-dom';
import { ApiService } from '../../api';
import { AgentHistoryRecord } from '../../types/history/agentHistoryRecord';
import ModeNavigationLink from '../ModeNavigationLink';

interface AgentSyncsListProps {
  agentId?: string;
  onClose?: () => void;
}

const syncColumnDefaults = [
  72,
  92,
  180,
  112,
  112,
  112,
  180,
  140,
  180,
  96,
  112,
  96,
  96,
  112,
  180,
];

const syncColumnMinWidth = 48;

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
  const topScrollContentRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const syncTableRef = useRef<HTMLTableElement>(null);
  const columnRefs = useRef<(HTMLTableColElement | null)[]>([]);
  const columnWidthsRef = useRef([...syncColumnDefaults]);
  const resizingColumnRef = useRef<{
    index: number;
    startX: number;
    startWidth: number;
  } | null>(null);

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

  function startColumnResize(
    index: number,
    event: ReactMouseEvent<HTMLSpanElement>
  ) {
    event.preventDefault();
    event.stopPropagation();

    resizingColumnRef.current = {
      index,
      startX: event.clientX,
      startWidth: columnWidthsRef.current[index],
    };
  }

  function renderResizableHeader(
    index: number,
    content: ReactNode,
    className?: string,
    title?: string
  ) {
    return (
      <th className={className} title={title}>
        <span className="history-syncs-header-content">{content}</span>
        <span
          className="history-syncs-column-resizer"
          onMouseDown={(event) => startColumnResize(index, event)}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize column"
        />
      </th>
    );
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
    function handleMouseMove(event: MouseEvent) {
      const resizingColumn = resizingColumnRef.current;

      if (!resizingColumn) {
        return;
      }

      const nextWidth = Math.max(
        syncColumnMinWidth,
        resizingColumn.startWidth + event.clientX - resizingColumn.startX
      );
      const nextWidths = [...columnWidthsRef.current];
      nextWidths[resizingColumn.index] = nextWidth;
      columnWidthsRef.current = nextWidths;

      const tableWidth = nextWidths.reduce((total, width) => total + width, 0);
      const column = columnRefs.current[resizingColumn.index];

      if (column) {
        column.style.width = `${nextWidth}px`;
      }

      if (syncTableRef.current) {
        syncTableRef.current.style.width = `${tableWidth}px`;
      }

      if (topScrollContentRef.current) {
        topScrollContentRef.current.style.width = `${tableWidth}px`;
      }
    }

    function handleMouseUp() {
      resizingColumnRef.current = null;
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

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

  const syncTableWidth = syncColumnDefaults.reduce((total, width) => total + width, 0);

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
              ref={topScrollContentRef}
              style={{ width: topScrollWidth }}
            />
          </div>

          <div
            className="history-syncs-table-wrapper"
            ref={tableScrollRef}
            onScroll={() => syncHorizontalScroll('table')}
          >
            <table
              className="details-table history-syncs-table"
              ref={syncTableRef}
              style={{ width: syncTableWidth }}
            >
              <colgroup>
                {syncColumnDefaults.map((width, index) => (
                  <col
                    key={index}
                    ref={(element) => {
                      columnRefs.current[index] = element;
                    }}
                    style={{ width }}
                  />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {renderResizableHeader(0, 'ID', 'history-syncs-id-column')}
                  {renderResizableHeader(1, 'Status')}
                  {renderResizableHeader(2, 'Created At')}
                  {renderResizableHeader(3, <>Scheduled<br />Link</>, 'history-syncs-selected-link-column')}
                  {renderResizableHeader(4, <>scheduler<br />Mode</>, 'history-syncs-mode-column', 'Scheduler Mode')}
                  {renderResizableHeader(5, <>Message<br />In<br />Queue</>, 'history-syncs-number-column')}
                  {renderResizableHeader(6, 'Next Delivery Time')}
                  {renderResizableHeader(7, 'Geo Data')}
                  {renderResizableHeader(8, 'Server LUT')}
                  {/* <th className="history-syncs-id-column">Link Quality ID</th> */}
                  {renderResizableHeader(9, 'Type')}
                  {renderResizableHeader(10, 'Availability', 'history-syncs-availability-column')}
                  {renderResizableHeader(11, 'Quality', 'history-syncs-number-column')}
                  {renderResizableHeader(12, 'Latency', 'history-syncs-number-column')}
                  {renderResizableHeader(13, 'Reliability', 'history-syncs-number-column')}
                  {renderResizableHeader(14, 'Timestamp')}
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
