import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

/** Human-readable label for each column's filter chip */
const COLUMN_LABELS: Record<string, string> = {
  createdAt:        'Created At',
  id:               'ID',
  status:           'Status',
  selectedLink:     'Selected Link',
  schedulerMode:    'Scheduler Mode',
  messagesInQueue:  'Msgs In Queue',
  nextDeliveryTime: 'Next Delivery',
  geoData:          'Geo Data',
  serverLut:        'Server LUT',
  linkType:         'Link Type',
  linkAvailable:    'Available',
  linkQuality:      'Quality',
  latency:          'Latency',
  reliability:      'Reliability',
  linkTimestamp:    'Link Timestamp',
};

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
      {isYes ? 'Yes' : 'No'}
    </span>
  );
}

function DateCell({ value }: ICellRendererParams) {
  if (value == null || value === '') return <span className="snc-null">—</span>;
  const raw =
    typeof value === 'number' && value < 1_000_000_000_000 ? value * 1000 : value;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime()))
    return <span title={String(value)}>{String(value)}</span>;
  const formatted = new Intl.DateTimeFormat('he-IL', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(date);
  return (
    <span className="snc-date" title={date.toISOString()}>
      {formatted}
    </span>
  );
}

function NumericCell({ value }: ICellRendererParams) {
  if (value == null || value === '') return <span className="snc-null">—</span>;
  return <span className="snc-num">{String(value)}</span>;
}

function TextCell({ value }: ICellRendererParams) {
  if (value == null || value === '') return <span className="snc-null">—</span>;
  return (
    <span className="snc-text" title={String(value)}>
      {String(value)}
    </span>
  );
}

// ── Column definitions ──────────────────────────────────────────────

function buildColumnDefs(): ColDef<AgentHistoryRecord>[] {
  return [
    {
      field: 'createdAt',
      headerName: 'Created At',
      pinned: 'left',
      width: 170,
      minWidth: 150,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
      sort: 'desc',
    },
    {
      field: 'id',
      headerName: 'ID',
      width: 80,
      minWidth: 60,
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
      width: 170,
      minWidth: 140,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
    },
    {
      colId: 'geoData',
      headerName: 'Geo Data',
      valueGetter: (p) => p.data?.details?.geoData,
      width: 125,
      minWidth: 90,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'serverLut',
      headerName: 'Server LUT',
      valueGetter: (p) => p.data?.details?.serverLut,
      width: 170,
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
      minWidth: 90,
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
      width: 170,
      minWidth: 140,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
    },
  ];
}

// ── Component ───────────────────────────────────────────────────────

export default function AgentSyncsList({
  agentId: agentIdProp,
  onClose,
}: AgentSyncsListProps) {
  const { agentId: routeAgentId } = useParams<{ agentId: string }>();
  const agentId = agentIdProp ?? routeAgentId;
  const isEmbedded = Boolean(agentIdProp);
  const location = useLocation();
  const backTo = location.state?.backTo ?? '/history';
  const navigate = useNavigate();

  const gridRef = useRef<AgGridReact<AgentHistoryRecord>>(null);
  const columnDefs = useMemo(() => buildColumnDefs(), []);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: true,
      floatingFilter: false,
      suppressMovable: false,
    }),
    []
  );

  // ── Active-filter state (drives the chip bar) ──────────────────────
  const [filterModel, setFilterModel] = useState<Record<string, unknown>>({});

  const onFilterChanged = useCallback(() => {
    const model = gridRef.current?.api?.getFilterModel() ?? {};
    setFilterModel(model as Record<string, unknown>);
  }, []);

  const clearFilter = useCallback((colId: string) => {
    const api = gridRef.current?.api;
    if (!api) return;
    void api.setColumnFilterModel(colId, null).then(() => {
      api.onFilterChanged();
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    gridRef.current?.api?.setFilterModel(null);
  }, []);

  // ── Fix double scrollbar: lock html overflow on full-page mount ────
  useEffect(() => {
    if (isEmbedded) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => { html.style.overflow = prev; };
  }, [isEmbedded]);

  // Build datasource — re-created only when agentId changes
  const buildDatasource = useCallback((): IDatasource => ({
    getRows(params: IGetRowsParams) {
      if (!agentId) {
        params.successCallback([], 0);
        return;
      }
      ApiService.getHistorySyncsIrm(agentId, {
        startRow: params.startRow,
        endRow: params.endRow,
        sortModel: params.sortModel as Array<{
          colId: string;
          sort: 'asc' | 'desc';
        }>,
        filterModel: params.filterModel as Record<string, unknown>,
      })
        .then(({ rows, lastRow }) => {
          const safeRows = Array.isArray(rows) ? rows : [];
          const blockSize = params.endRow - params.startRow;
          const knownEnd =
            safeRows.length < blockSize
              ? params.startRow + safeRows.length
              : undefined;
          params.successCallback(safeRows, lastRow ?? knownEnd);
        })
        .catch((err) => {
          console.error('[SyncHistory] getRows failed:', err);
          params.failCallback();
        });
    },
  }), [agentId]);

  const onGridReady = useCallback(
    (event: GridReadyEvent) => {
      event.api.updateGridOptions({ datasource: buildDatasource() });
    },
    [buildDatasource]
  );

  // ── No agentId guard ────────────────────────────────────────────────

  if (!agentId) {
    return (
      <div className="page">
        <p className="muted">לא נמצא מזהה agent בכתובת.</p>
      </div>
    );
  }

  // ── Shared grid ─────────────────────────────────────────────────────

  const gridEl = (
    <div className="snc-grid-wrapper ag-theme-quartz">
      <AgGridReact<AgentHistoryRecord>
        ref={gridRef}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowModelType="infinite"
        cacheBlockSize={BLOCK_SIZE}
        cacheOverflowSize={2}
        maxConcurrentDatasourceRequests={2}
        onGridReady={onGridReady}
        onFilterChanged={onFilterChanged}
        suppressCellFocus={false}
        enableCellTextSelection
        tooltipShowDelay={400}
        overlayNoRowsTemplate='<span class="snc-no-rows">אין רשומות עבור agent זה</span>'
      />
    </div>
  );

  // ── Embedded ────────────────────────────────────────────────────────

  if (isEmbedded) {
    return (
      <div className="details-panel">
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
            {agentId && (
              <p className="details-agent-id">Agent ID: {agentId}</p>
            )}
          </div>
          {onClose && (
            <div className="details-header-actions details-header-actions-right">
              <button
                type="button"
                className="details-close-button"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          )}
        </div>
        <div className="snc-grid-outer" style={{ height: 520 }}>
          {gridEl}
        </div>
      </div>
    );
  }

  // ── Active filter chips (full-page only) ────────────────────────────

  const activeColIds = Object.keys(filterModel);

  // ── Full-page ───────────────────────────────────────────────────────

  return (
    <div className="snc-page">

      {/* Page header */}
      <header className="snc-header">

        <div className="snc-header-start">
          <button
            type="button"
            className="snc-back"
            onClick={() => navigate(backTo ?? '/history')}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 2.5L4.5 7L9 11.5" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            History
          </button>
          <div className="snc-header-vr" aria-hidden="true" />
        </div>

        <div className="snc-header-center">
          <nav className="snc-header-subnav" aria-label="breadcrumb">
            <span className="snc-crumb snc-crumb--ancestor">History</span>
            <span className="snc-crumb-sep" aria-hidden="true">·</span>
            <span className="snc-crumb snc-crumb--section">Sync History</span>
          </nav>
          <p className="snc-header-entity">{agentId}</p>
        </div>

        <div className="snc-header-end">
          <ModeNavigationLink to="/" label="ניטור זמן אמת" variant="real-time" />
        </div>

      </header>

      {/* Active-filter chip bar — only visible when ≥1 filter is set */}
      {activeColIds.length > 0 && (
        <div className="snc-filter-bar" role="status" aria-label="Active filters">
          <span className="snc-filter-bar-label">Filters:</span>
          {activeColIds.map((colId) => (
            <button
              key={colId}
              type="button"
              className="snc-filter-chip"
              onClick={() => clearFilter(colId)}
              title={`Clear ${COLUMN_LABELS[colId] ?? colId} filter`}
            >
              {COLUMN_LABELS[colId] ?? colId}
              <span className="snc-filter-chip-x" aria-hidden="true">×</span>
            </button>
          ))}
          <button
            type="button"
            className="snc-filter-clear-all"
            onClick={clearAllFilters}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="snc-grid-outer">{gridEl}</div>

    </div>
  );
}
