import { useMemo, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import type {
  ColDef,
  IDatasource,
  IGetRowsParams,
  ICellRendererParams,
} from 'ag-grid-community';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import '../../styles/syncs-grid.css';

import { ApiService } from '../../api';
import type { AgentHistoryRecord } from '../../types/history/agentHistoryRecord';
import ModeNavigationLink from '../ModeNavigationLink';

const BLOCK_SIZE = 100;

interface AgentSyncsListProps {
  agentId?: string;
  onClose?: () => void;
}

// ── Cell renderers ──────────────────────────────────────────────────

function StatusCell({ value }: ICellRendererParams) {
  if (value == null || value === '') return <span className="snc-null">—</span>;
  const key = String(value).toLowerCase();
  return <span className={`snc-status snc-status--${key}`}>{value}</span>;
}

function AvailabilityCell({ value }: ICellRendererParams) {
  if (value == null) return <span className="snc-null">—</span>;
  const isYes = value === true || value === 'true';
  return (
    <span className={`snc-avail snc-avail--${isYes ? 'yes' : 'no'}`}>
      {isYes ? '✓ Yes' : '✗ No'}
    </span>
  );
}

function DateCell({ value }: ICellRendererParams) {
  if (value == null || value === '') return <span className="snc-null">—</span>;
  const raw = typeof value === 'number' && value < 1_000_000_000_000 ? value * 1000 : value;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return <span title={String(value)}>{String(value)}</span>;
  const formatted = new Intl.DateTimeFormat('he-IL', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(date);
  return <span className="snc-date" title={date.toISOString()}>{formatted}</span>;
}

function NumericCell({ value }: ICellRendererParams) {
  if (value == null || value === '') return <span className="snc-null">—</span>;
  return <span className="snc-num">{String(value)}</span>;
}

function TextCell({ value }: ICellRendererParams) {
  if (value == null || value === '') return <span className="snc-null">—</span>;
  return <span className="snc-text" title={String(value)}>{String(value)}</span>;
}

// ── Column definitions ──────────────────────────────────────────────

function buildColumnDefs(): ColDef<AgentHistoryRecord>[] {
  return [
    {
      field: 'createdAt',
      headerName: 'Created At',
      pinned: 'left',
      width: 175,
      minWidth: 150,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
      sort: 'desc',
    },
    {
      field: 'id',
      headerName: 'ID',
      width: 85,
      minWidth: 65,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 115,
      minWidth: 90,
      cellRenderer: StatusCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'selectedLink',
      headerName: 'Selected Link',
      valueGetter: (p) => p.data?.details?.selectedLink,
      width: 130,
      minWidth: 100,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'schedulerMode',
      headerName: 'Scheduler Mode',
      valueGetter: (p) => p.data?.details?.schedulerMode,
      width: 145,
      minWidth: 110,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'messagesInQueue',
      headerName: 'Msgs In Queue',
      valueGetter: (p) => p.data?.details?.messagesInQueue,
      width: 130,
      minWidth: 95,
      type: 'numericColumn',
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
    },
    {
      colId: 'nextDeliveryTime',
      headerName: 'Next Delivery',
      valueGetter: (p) => p.data?.details?.nextDeliveryTime,
      width: 175,
      minWidth: 140,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
    },
    {
      colId: 'geoData',
      headerName: 'Geo Data',
      valueGetter: (p) => p.data?.details?.geoData,
      width: 130,
      minWidth: 90,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'serverLut',
      headerName: 'Server LUT',
      valueGetter: (p) => p.data?.details?.serverLut,
      width: 175,
      minWidth: 140,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
    },
    {
      colId: 'linkType',
      headerName: 'Link Type',
      valueGetter: (p) => p.data?.link_quality?.type,
      width: 105,
      minWidth: 80,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'linkAvailable',
      headerName: 'Available',
      valueGetter: (p) => p.data?.link_quality?.available,
      width: 105,
      minWidth: 85,
      cellRenderer: AvailabilityCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'linkQuality',
      headerName: 'Quality',
      valueGetter: (p) => p.data?.link_quality?.quality,
      width: 90,
      minWidth: 75,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'latency',
      headerName: 'Latency (ms)',
      valueGetter: (p) => p.data?.link_quality?.latency,
      width: 115,
      minWidth: 85,
      type: 'numericColumn',
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
    },
    {
      colId: 'reliability',
      headerName: 'Reliability',
      valueGetter: (p) => p.data?.link_quality?.reliability,
      width: 105,
      minWidth: 80,
      type: 'numericColumn',
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
    },
    {
      colId: 'linkTimestamp',
      headerName: 'Link Timestamp',
      valueGetter: (p) => p.data?.link_quality?.timestamp,
      width: 175,
      minWidth: 140,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
    },
  ];
}

// ── Component ───────────────────────────────────────────────────────

export default function AgentSyncsList({ agentId: agentIdProp, onClose }: AgentSyncsListProps) {
  const { agentId: routeAgentId } = useParams<{ agentId: string }>();
  const agentId = agentIdProp ?? routeAgentId;
  const isEmbedded = Boolean(agentIdProp);
  const location = useLocation();
  const backTo = location.state?.backTo ?? '/history';
  const navigate = useNavigate();

  const gridRef = useRef<AgGridReact<AgentHistoryRecord>>(null);
  const columnDefs = useMemo(() => buildColumnDefs(), []);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    floatingFilter: true,
    suppressMovable: false,
    autoHeaderHeight: false,
  }), []);

  // Pass datasource directly as prop — this is the correct React pattern for AG Grid v32
  const datasource = useMemo<IDatasource>(() => ({
    getRows(params: IGetRowsParams) {
      if (!agentId) {
        params.successCallback([], 0);
        return;
      }
      ApiService.getHistorySyncsIrm(agentId, {
        startRow:    params.startRow,
        endRow:      params.endRow,
        sortModel:   params.sortModel as Array<{ colId: string; sort: 'asc' | 'desc' }>,
        filterModel: params.filterModel as Record<string, unknown>,
      })
        .then(({ rows, lastRow }) => {
          params.successCallback(rows, lastRow ?? undefined);
        })
        .catch((err) => {
          console.error('[SyncHistory] Failed to load rows:', err);
          params.failCallback();
        });
    },
  }), [agentId]);

  // ── No agentId guard ────────────────────────────────────────────────

  if (!agentId) {
    return (
      <div className="page">
        <p className="muted">לא נמצא מזהה agent בכתובת.</p>
      </div>
    );
  }

  // ── Shared grid element ─────────────────────────────────────────────

  const gridEl = (
    <div className="snc-grid-wrapper ag-theme-quartz">
      <AgGridReact<AgentHistoryRecord>
        ref={gridRef}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowModelType="infinite"
        datasource={datasource}
        cacheBlockSize={BLOCK_SIZE}
        cacheOverflowSize={2}
        maxConcurrentDatasourceRequests={2}
        infiniteInitialRowCount={BLOCK_SIZE}
        suppressCellFocus={false}
        enableCellTextSelection
        tooltipShowDelay={400}
        overlayNoRowsTemplate='<span class="snc-no-rows">אין רשומות עבור agent זה</span>'
      />
    </div>
  );

  // ── Embedded mode ──────────────────────────────────────────────────

  if (isEmbedded) {
    return (
      <div className="details-panel">
        <div className="details-header">
          <div className="details-title-block"><h2>Sync History</h2></div>
          <div className="details-header-actions details-header-actions-left">
            <button type="button" className="details-back-button"
              onClick={() => navigate(backTo ?? '/history')}>Back</button>
            {agentId && <p className="details-agent-id">Agent ID: {agentId}</p>}
          </div>
          {onClose && (
            <div className="details-header-actions details-header-actions-right">
              <button type="button" className="details-close-button" onClick={onClose}>Close</button>
            </div>
          )}
        </div>
        <div className="snc-grid-outer" style={{ height: 520 }}>
          {gridEl}
        </div>
      </div>
    );
  }

  // ── Full-page mode ─────────────────────────────────────────────────

  return (
    <div className="snc-page">

      {/* ── Top navigation bar ── */}
      <nav className="snc-nav">
        <button type="button" className="snc-nav-back" onClick={() => navigate(backTo ?? '/history')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          History
        </button>
        <div className="snc-nav-spacer" />
        <ModeNavigationLink to="/" label="ניטור זמן אמת" variant="real-time" />
      </nav>

      {/* ── Agent hero ── */}
      <header className="snc-hero">
        <div className="snc-hero-inner">
          <span className="snc-hero-eyebrow">Sync History</span>
          <h1 className="snc-hero-agent">{agentId}</h1>
        </div>
        <div className="snc-hero-badge">
          <span className="snc-hero-badge-dot" />
          Live feed
        </div>
      </header>

      {/* ── Grid ── */}
      <div className="snc-grid-outer">
        {gridEl}
      </div>

    </div>
  );
}
