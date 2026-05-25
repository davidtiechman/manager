import { useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import type {
  ColDef,
  IDatasource,
  IGetRowsParams,
  GridReadyEvent,
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
  if (value == null || value === '') {
    return <span className="syncs-null">—</span>;
  }
  const key = String(value).toLowerCase();
  return <span className={`syncs-status-badge syncs-status-badge--${key}`}>{value}</span>;
}

function AvailabilityCell({ value }: ICellRendererParams) {
  if (value == null) return <span className="syncs-null">—</span>;
  const isYes = value === true || value === 'true' || value === 'Yes';
  return (
    <span className={`syncs-avail-badge syncs-avail-badge--${isYes ? 'yes' : 'no'}`}>
      {isYes ? 'Yes' : 'No'}
    </span>
  );
}

function DateCell({ value }: ICellRendererParams) {
  if (value == null || value === '') return <span className="syncs-null">—</span>;
  const raw = typeof value === 'number' && value < 1_000_000_000_000 ? value * 1000 : value;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return <span title={String(value)}>{String(value)}</span>;
  const formatted = new Intl.DateTimeFormat('he-IL', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(date);
  return (
    <span className="syncs-date" title={String(value)}>
      {formatted}
    </span>
  );
}

function NullableCell({ value }: ICellRendererParams) {
  if (value == null || value === '') return <span className="syncs-null">—</span>;
  return <span title={String(value)}>{String(value)}</span>;
}

// ── Column definitions ──────────────────────────────────────────────

function buildColumnDefs(): ColDef<AgentHistoryRecord>[] {
  return [
    {
      field: 'createdAt',
      headerName: 'Created At',
      pinned: 'left',
      width: 180,
      minWidth: 160,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
      filterParams: { browserDatePicker: true },
      sort: 'desc',
    },
    {
      field: 'id',
      headerName: 'ID',
      width: 80,
      minWidth: 60,
      filter: 'agNumberColumnFilter',
      cellRenderer: NullableCell,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      minWidth: 90,
      cellRenderer: StatusCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'selectedLink',
      headerName: 'Selected Link',
      valueGetter: (p) => p.data?.details?.selectedLink,
      width: 130,
      minWidth: 90,
      cellRenderer: NullableCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'schedulerMode',
      headerName: 'Scheduler Mode',
      valueGetter: (p) => p.data?.details?.schedulerMode,
      width: 140,
      minWidth: 100,
      cellRenderer: NullableCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'messagesInQueue',
      headerName: 'Msgs In Queue',
      valueGetter: (p) => p.data?.details?.messagesInQueue,
      width: 120,
      minWidth: 90,
      type: 'numericColumn',
      filter: 'agNumberColumnFilter',
      cellRenderer: NullableCell,
    },
    {
      colId: 'nextDeliveryTime',
      headerName: 'Next Delivery',
      valueGetter: (p) => p.data?.details?.nextDeliveryTime,
      width: 180,
      minWidth: 140,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
    },
    {
      colId: 'geoData',
      headerName: 'Geo Data',
      valueGetter: (p) => p.data?.details?.geoData,
      width: 140,
      minWidth: 90,
      cellRenderer: NullableCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'serverLut',
      headerName: 'Server LUT',
      valueGetter: (p) => p.data?.details?.serverLut,
      width: 180,
      minWidth: 140,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
    },
    {
      colId: 'linkType',
      headerName: 'Link Type',
      valueGetter: (p) => p.data?.link_quality?.type,
      width: 100,
      minWidth: 80,
      cellRenderer: NullableCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'linkAvailable',
      headerName: 'Available',
      valueGetter: (p) => p.data?.link_quality?.available,
      width: 100,
      minWidth: 80,
      cellRenderer: AvailabilityCell,
      filter: 'agTextColumnFilter',
      filterParams: { filterOptions: ['equals'], textMatcher: ({ value, filterText }: { value: string; filterText: string }) => {
        const v = String(value ?? '').toLowerCase();
        const f = String(filterText ?? '').toLowerCase();
        return v.includes(f);
      }},
    },
    {
      colId: 'linkQuality',
      headerName: 'Quality',
      valueGetter: (p) => p.data?.link_quality?.quality,
      width: 90,
      minWidth: 70,
      cellRenderer: NullableCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'latency',
      headerName: 'Latency',
      valueGetter: (p) => p.data?.link_quality?.latency,
      width: 90,
      minWidth: 70,
      type: 'numericColumn',
      filter: 'agNumberColumnFilter',
      cellRenderer: NullableCell,
    },
    {
      colId: 'reliability',
      headerName: 'Reliability',
      valueGetter: (p) => p.data?.link_quality?.reliability,
      width: 100,
      minWidth: 70,
      type: 'numericColumn',
      filter: 'agNumberColumnFilter',
      cellRenderer: NullableCell,
    },
    {
      colId: 'linkTimestamp',
      headerName: 'Link Timestamp',
      valueGetter: (p) => p.data?.link_quality?.timestamp,
      width: 180,
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
  }), []);

  // AG Grid Infinite Row Model datasource
  const datasource = useMemo<IDatasource>(() => {
    return {
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
            console.error('Failed to load syncs:', err);
            params.failCallback();
          });
      },
    };
  }, [agentId]);

  const onGridReady = useCallback((event: GridReadyEvent) => {
    event.api.setGridOption('datasource', datasource);
  }, [datasource]);

  // ── Header ─────────────────────────────────────────────────────────

  const renderDetailsHeader = () => (
    <div className="details-header">
      <div className="details-title-block">
        <h2>Sync History</h2>
      </div>
      <div className="details-header-actions details-header-actions-left">
        <button
          type="button"
          className="details-back-button"
          onClick={() => navigate(backTo ?? '/history')}
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

  // ── No agentId ─────────────────────────────────────────────────────

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

  const grid = (
    <div className="syncs-grid-wrapper ag-theme-quartz">
      <AgGridReact<AgentHistoryRecord>
        ref={gridRef}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowModelType="infinite"
        cacheBlockSize={BLOCK_SIZE}
        cacheOverflowSize={2}
        maxConcurrentDatasourceRequests={2}
        infiniteInitialRowCount={BLOCK_SIZE}
        onGridReady={onGridReady}
        suppressCellFocus={false}
        enableCellTextSelection
        tooltipShowDelay={300}
        overlayNoRowsTemplate='<span class="syncs-no-rows">אין רשומות עבור agent זה</span>'
      />
    </div>
  );

  // ── Embedded mode (fixed height, inside a panel) ───────────────────
  if (isEmbedded) {
    return (
      <div className="details-panel">
        {renderDetailsHeader()}
        <div className="syncs-grid-outer syncs-embedded">
          {grid}
        </div>
      </div>
    );
  }

  // ── Full-page mode (fills viewport height) ─────────────────────────
  return (
    <div className="syncs-full-page">
      <div className="syncs-page-topbar">
        <button
          type="button"
          className="syncs-back-btn"
          onClick={() => navigate(backTo ?? '/history')}
        >
          ← Back
        </button>
        <h1 className="syncs-page-title">
          Sync History
          {agentId && <span className="syncs-agent-chip"> · {agentId}</span>}
        </h1>
        <ModeNavigationLink to="/" label="ניטור זמן אמת" variant="real-time" />
      </div>
      <div className="syncs-grid-outer">
        {grid}
      </div>
    </div>
  );
}
