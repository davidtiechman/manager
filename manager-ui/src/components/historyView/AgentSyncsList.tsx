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
      // Pinned — flex is not supported on pinned columns; keep fixed width
      field: 'createdAt',
      headerName: 'Created At',
      headerTooltip: 'Created At',
      pinned: 'left',
      width: 160,
      minWidth: 130,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
      sort: 'desc',
    },
    {
      field: 'id',
      headerName: 'ID',
      headerTooltip: 'ID',
      flex: 0.9,
      minWidth: 55,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
    },
    {
      field: 'status',
      headerName: 'Status',
      headerTooltip: 'Status',
      flex: 1.2,
      minWidth: 80,
      cellRenderer: StatusCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'selectedLink',
      headerName: 'Selected Link',
      headerTooltip: 'Selected Link',
      valueGetter: (p) => p.data?.details?.selectedLink,
      flex: 1.3,
      minWidth: 80,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'schedulerMode',
      headerName: 'Scheduler Mode',
      headerTooltip: 'Scheduler Mode',
      valueGetter: (p) => p.data?.details?.schedulerMode,
      flex: 1.5,
      minWidth: 95,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'messagesInQueue',
      headerName: 'Msgs In Queue',
      headerTooltip: 'Messages In Queue',
      valueGetter: (p) => p.data?.details?.messagesInQueue,
      flex: 1.1,
      minWidth: 80,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
    },
    {
      colId: 'nextDeliveryTime',
      headerName: 'Next Delivery',
      headerTooltip: 'Next Delivery Time',
      valueGetter: (p) => p.data?.details?.nextDeliveryTime,
      flex: 2.0,
      minWidth: 130,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
    },
    {
      colId: 'geoData',
      headerName: 'Geo Data',
      headerTooltip: 'Geo Data',
      valueGetter: (p) => p.data?.details?.geoData,
      flex: 1.2,
      minWidth: 80,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'serverLut',
      headerName: 'Server LUT',
      headerTooltip: 'Server Last Update Time',
      valueGetter: (p) => p.data?.details?.serverLut,
      flex: 2.0,
      minWidth: 130,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
    },
    {
      colId: 'linkType',
      headerName: 'Link Type',
      headerTooltip: 'Link Type',
      valueGetter: (p) => p.data?.link_quality?.type,
      flex: 1.1,
      minWidth: 75,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'linkAvailable',
      headerName: 'Available',
      headerTooltip: 'Link Available',
      valueGetter: (p) => p.data?.link_quality?.available,
      flex: 1.1,
      minWidth: 75,
      cellRenderer: AvailabilityCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'linkQuality',
      headerName: 'Quality',
      headerTooltip: 'Link Quality',
      valueGetter: (p) => p.data?.link_quality?.quality,
      flex: 0.9,
      minWidth: 65,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'latency',
      headerName: 'Latency (ms)',
      headerTooltip: 'Latency (ms)',
      valueGetter: (p) => p.data?.link_quality?.latency,
      flex: 1.0,
      minWidth: 75,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
    },
    {
      colId: 'reliability',
      headerName: 'Reliability',
      headerTooltip: 'Reliability',
      valueGetter: (p) => p.data?.link_quality?.reliability,
      flex: 0.9,
      minWidth: 70,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
    },
    {
      colId: 'linkTimestamp',
      headerName: 'Link Timestamp',
      headerTooltip: 'Link Quality Timestamp',
      valueGetter: (p) => p.data?.link_quality?.timestamp,
      flex: 2.0,
      minWidth: 130,
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
      unSortIcon: true,
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
            className="snc-back-btn"
            onClick={() => navigate(backTo ?? '/history')}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <path d="M9.5 3L5 7.5L9.5 12" stroke="currentColor"
                strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            History
          </button>
        </div>

        <div className="snc-header-center">
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
