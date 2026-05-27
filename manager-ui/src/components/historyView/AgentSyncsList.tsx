import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import type {
  ColDef,
  IDatasource,
  IGetRowsParams,
  GridReadyEvent,
  ColumnResizedEvent,
  ICellRendererParams,
} from 'ag-grid-community';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import '../../styles/syncs-grid.css';

import { ApiService } from '../../api';
import type { AgentHistoryRecord } from '../../types/history/agentHistoryRecord';
import ModeNavigationLink from '../ModeNavigationLink';

const BLOCK_SIZE = 100;
const LS_COL_KEY = 'snc-col-state';

/** Columns hidden by default (first load, no saved state) */
const DEFAULT_HIDDEN: string[] = [
  'nextDeliveryTime',
  'geoData',
  'serverLut',
  'reliability',
  'linkTimestamp',
];

/** Human-readable label for each column */
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

/** Column groups shown in the picker panel */
const COLUMN_GROUPS: Array<{ label: string; cols: string[] }> = [
  {
    label: 'General',
    cols: ['createdAt', 'id', 'status'],
  },
  {
    label: 'Sync Details',
    cols: ['selectedLink', 'schedulerMode', 'messagesInQueue', 'nextDeliveryTime', 'geoData', 'serverLut'],
  },
  {
    label: 'Link Quality',
    cols: ['linkType', 'linkAvailable', 'linkQuality', 'latency', 'reliability', 'linkTimestamp'],
  },
];

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
      headerTooltip: 'Created At',
      pinned: 'left',
      width: 160,
      minWidth: 130,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
    },
    {
      field: 'id',
      headerName: 'ID',
      headerTooltip: 'ID',
      width: 72,
      minWidth: 62,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
      sort: 'desc',
    },
    {
      field: 'status',
      headerName: 'Status',
      headerTooltip: 'Status',
      width: 95,
      minWidth: 80,
      cellRenderer: StatusCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'selectedLink',
      headerName: 'Selected Link',
      headerTooltip: 'Selected Link',
      valueGetter: (p) => p.data?.details?.selectedLink,
      flex: 1.5,
      minWidth: 85,
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
      flex: 1,
      minWidth: 80,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
    },
    {
      colId: 'nextDeliveryTime',
      headerName: 'Next Delivery',
      headerTooltip: 'Next Delivery Time',
      valueGetter: (p) => p.data?.details?.nextDeliveryTime,
      flex: 2,
      minWidth: 130,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
      hide: true,
    },
    {
      colId: 'geoData',
      headerName: 'Geo Data',
      headerTooltip: 'Geo Data',
      valueGetter: (p) => p.data?.details?.geoData,
      flex: 1,
      minWidth: 75,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
      hide: true,
    },
    {
      colId: 'serverLut',
      headerName: 'Server LUT',
      headerTooltip: 'Server Last Update Time',
      valueGetter: (p) => p.data?.details?.serverLut,
      flex: 2,
      minWidth: 130,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
      hide: true,
    },
    {
      colId: 'linkType',
      headerName: 'Link Type',
      headerTooltip: 'Link Type',
      valueGetter: (p) => p.data?.link_quality?.type,
      flex: 1,
      minWidth: 75,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'linkAvailable',
      headerName: 'Available',
      headerTooltip: 'Link Available',
      valueGetter: (p) => p.data?.link_quality?.available,
      flex: 1,
      minWidth: 75,
      cellRenderer: AvailabilityCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'linkQuality',
      headerName: 'Quality',
      headerTooltip: 'Link Quality',
      valueGetter: (p) => p.data?.link_quality?.quality,
      flex: 1,
      minWidth: 65,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'latency',
      headerName: 'Latency (ms)',
      headerTooltip: 'Latency in milliseconds',
      valueGetter: (p) => p.data?.link_quality?.latency,
      flex: 1,
      minWidth: 75,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
    },
    {
      colId: 'reliability',
      headerName: 'Reliability',
      headerTooltip: 'Link Reliability',
      valueGetter: (p) => p.data?.link_quality?.reliability,
      flex: 1,
      minWidth: 70,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
      hide: true,
    },
    {
      colId: 'linkTimestamp',
      headerName: 'Link Timestamp',
      headerTooltip: 'Link Quality Timestamp',
      valueGetter: (p) => p.data?.link_quality?.timestamp,
      flex: 2,
      minWidth: 130,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
      hide: true,
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

  // ── State ──────────────────────────────────────────────────────────
  const [filterModel, setFilterModel] = useState<Record<string, unknown>>({});
  const [totalRows, setTotalRows] = useState<number | null>(null);
  const [hiddenCols, setHiddenCols] = useState<string[]>(DEFAULT_HIDDEN);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; colId: string } | null>(null);

  // ── Refs ────────────────────────────────────────────────────────────
  const gridWrapperRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const stripDragStartRef = useRef<string | null>(null);
  const styleTagRef = useRef<HTMLStyleElement | null>(null);
  const maxIdRef = useRef<number | null>(null);

  // ── Filter callbacks ───────────────────────────────────────────────
  const onFilterChanged = useCallback(() => {
    const model = gridRef.current?.api?.getFilterModel() ?? {};
    setFilterModel(model as Record<string, unknown>);
  }, []);

  const clearFilter = useCallback((colId: string) => {
    const api = gridRef.current?.api;
    if (!api) return;
    if (!api.getFilterModel()[colId]) return;
    void api.setColumnFilterModel(colId, null).then(() => {
      api.onFilterChanged();
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    gridRef.current?.api?.setFilterModel(null);
  }, []);

  // ── Reset snapshot + count when agentId changes ────────────────────
  useEffect(() => {
    maxIdRef.current = null;
    setTotalRows(null);
  }, [agentId]);

  // ── Fix double scrollbar: lock html overflow on full-page mount ────
  useEffect(() => {
    if (isEmbedded) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => { html.style.overflow = prev; };
  }, [isEmbedded]);

  // ── Datasource ─────────────────────────────────────────────────────
  const buildDatasource = useCallback((): IDatasource => ({
    getRows(params: IGetRowsParams) {
      if (!agentId) {
        params.successCallback([], 0);
        return;
      }
      ApiService.getHistorySyncsIrm(agentId, {
        startRow: params.startRow,
        endRow: params.endRow,
        sortModel: params.sortModel as Array<{ colId: string; sort: 'asc' | 'desc' }>,
        filterModel: params.filterModel as Record<string, unknown>,
        maxId: maxIdRef.current,
      })
        .then(({ rows, lastRow }) => {
          const safeRows = Array.isArray(rows) ? rows : [];
          if (params.startRow === 0 && safeRows.length > 0 && maxIdRef.current === null) {
            maxIdRef.current = safeRows[0].id;
          }
          const blockSize = params.endRow - params.startRow;
          const knownEnd =
            safeRows.length < blockSize ? params.startRow + safeRows.length : undefined;
          const resolvedTotal = lastRow ?? knownEnd;
          if (params.startRow === 0 && resolvedTotal !== undefined) {
            setTotalRows(resolvedTotal);
          }
          params.successCallback(safeRows, lastRow ?? knownEnd);
        })
        .catch((err) => {
          console.error('[SyncHistory] getRows failed:', err);
          params.failCallback();
        });
    },
  }), [agentId]);

  // ── Persist column state to localStorage ───────────────────────────
  const saveColState = useCallback(() => {
    const state = gridRef.current?.api?.getColumnState();
    if (state) localStorage.setItem(LS_COL_KEY, JSON.stringify(state));
  }, []);

  const onGridReady = useCallback(
    (event: GridReadyEvent) => {
      event.api.updateGridOptions({ datasource: buildDatasource() });
      const saved = localStorage.getItem(LS_COL_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Array<{ colId: string; hide?: boolean }>;
          event.api.applyColumnState({ state: parsed, applyOrder: true });
          // Sync hiddenCols React state with restored column visibility
          const restored = parsed.filter((s) => s.hide === true).map((s) => s.colId);
          setHiddenCols(restored);
        } catch {
          localStorage.removeItem(LS_COL_KEY);
        }
      }
    },
    [buildDatasource]
  );

  const onColumnResized = useCallback(
    (e: ColumnResizedEvent) => {
      if (!e.finished) return;
      saveColState();
    },
    [saveColState]
  );

  // ── Close context menu on outside pointer-down ─────────────────────
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [ctxMenu]);

  // ── Close column picker on outside pointer-down ────────────────────
  useEffect(() => {
    if (!pickerOpen) return;
    const close = (e: PointerEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [pickerOpen]);

  // ── Remove injected style tag on unmount ───────────────────────────
  useEffect(() => () => { styleTagRef.current?.remove(); }, []);

  // ── Column selection highlight (CSS injection) ─────────────────────
  // Must be declared before any callback that calls it.
  const applyColSelection = useCallback((cols: Set<string>) => {
    setSelectedCols(cols);
    if (!styleTagRef.current) {
      const tag = document.createElement('style');
      document.head.appendChild(tag);
      styleTagRef.current = tag;
    }
    const tag = styleTagRef.current;
    if (cols.size === 0) { tag.textContent = ''; return; }
    const ids = Array.from(cols);
    const hdr  = ids.map((id) => `.snc-grid-wrapper .ag-header-cell[col-id="${id}"]`).join(',');
    const body = ids.map((id) => `.snc-grid-wrapper .ag-cell[col-id="${id}"]`).join(',');
    tag.textContent =
      `${hdr}{background:rgba(59,130,246,0.22)!important}` +
      `${body}{background:rgba(59,130,246,0.08)!important}`;
  }, []);

  // ── Column visibility helpers ───────────────────────────────────────

  /** Toggle a single column on/off from the picker panel */
  const toggleColVisibility = useCallback(
    (colId: string) => {
      const api = gridRef.current?.api;
      if (!api) return;
      const isHidden = hiddenCols.includes(colId);
      api.setColumnsVisible([colId], isHidden); // show if currently hidden
      const next = isHidden
        ? hiddenCols.filter((c) => c !== colId)
        : [...hiddenCols, colId];
      setHiddenCols(next);
      const state = api.getColumnState();
      if (state) localStorage.setItem(LS_COL_KEY, JSON.stringify(state));
    },
    [hiddenCols]
  );

  /** Restore all defaults via the picker's reset link */
  const resetColsToDefault = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    const allCols = COLUMN_GROUPS.flatMap((g) => g.cols);
    api.setColumnsVisible(allCols, true);
    api.setColumnsVisible(DEFAULT_HIDDEN, false);
    setHiddenCols([...DEFAULT_HIDDEN]);
    const state = api.getColumnState();
    if (state) localStorage.setItem(LS_COL_KEY, JSON.stringify(state));
  }, []);

  const showAllColumns = useCallback(() => {
    if (hiddenCols.length === 0) return;
    gridRef.current?.api?.setColumnsVisible(hiddenCols, true);
    setHiddenCols([]);
    saveColState();
  }, [hiddenCols, saveColState]);

  const showColumn = useCallback(
    (colId: string) => {
      gridRef.current?.api?.setColumnsVisible([colId], true);
      setHiddenCols((prev) => prev.filter((c) => c !== colId));
      saveColState();
    },
    [saveColState]
  );

  /** Hide columns selected via the drag-strip, then save */
  const hideSelectedCols = useCallback(() => {
    if (selectedCols.size === 0) return;
    const ids = Array.from(selectedCols);
    gridRef.current?.api?.setColumnsVisible(ids, false);
    setHiddenCols((prev) => [...prev, ...ids.filter((id) => !prev.includes(id))]);
    applyColSelection(new Set());
    saveColState();
  }, [selectedCols, applyColSelection, saveColState]);

  // ── Clear column selection on left-click anywhere ──────────────────
  useEffect(() => {
    if (selectedCols.size === 0) return;
    const clear = (e: PointerEvent) => {
      if (e.button === 2) return;
      const t = e.target as Element;
      if (t.closest('.snc-col-select-strip') || t.closest('.snc-ctx-menu')) return;
      applyColSelection(new Set());
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') applyColSelection(new Set()); };
    window.addEventListener('pointerdown', clear);
    window.addEventListener('keydown',     onKey);
    return () => {
      window.removeEventListener('pointerdown', clear);
      window.removeEventListener('keydown',     onKey);
    };
  }, [selectedCols.size, applyColSelection]);

  // ── Context menu on header right-click ─────────────────────────────
  const handleGridContextMenu = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const cell = (e.target as Element).closest('[col-id].ag-header-cell');
      if (!cell) return;
      e.preventDefault();
      const colId = cell.getAttribute('col-id') ?? '';
      if (!colId) return;
      setCtxMenu({ x: e.clientX, y: e.clientY, colId });
    },
    []
  );

  // ── Column-selection strip helpers ─────────────────────────────────

  const getSortedHeaderCells = useCallback((): HTMLElement[] => {
    const wrapper = gridWrapperRef.current;
    if (!wrapper) return [];
    return Array.from(wrapper.querySelectorAll<HTMLElement>('.ag-header-cell[col-id]'))
      .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
  }, []);

  const colIdAtClientX = useCallback(
    (x: number): string | null => {
      const cells = getSortedHeaderCells();
      if (cells.length === 0) return null;
      if (x <= cells[0].getBoundingClientRect().right)
        return cells[0].getAttribute('col-id');
      if (x >= cells[cells.length - 1].getBoundingClientRect().left)
        return cells[cells.length - 1].getAttribute('col-id');
      for (const cell of cells) {
        const rect = cell.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right) return cell.getAttribute('col-id');
      }
      return null;
    },
    [getSortedHeaderCells]
  );

  const colRangeBetween = useCallback(
    (startId: string, endId: string): string[] => {
      const ids = getSortedHeaderCells()
        .map((c) => c.getAttribute('col-id'))
        .filter(Boolean) as string[];
      const ai = ids.indexOf(startId);
      const bi = ids.indexOf(endId);
      if (ai === -1) return endId ? [endId] : [];
      if (bi === -1) return [startId];
      const [lo, hi] = ai <= bi ? [ai, bi] : [bi, ai];
      return ids.slice(lo, hi + 1);
    },
    [getSortedHeaderCells]
  );

  const onStripMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();

      const startId = colIdAtClientX(e.clientX);
      if (!startId) return;

      stripDragStartRef.current = startId;
      applyColSelection(new Set([startId]));

      const onMove = (ev: MouseEvent) => {
        const cur = colIdAtClientX(ev.clientX);
        if (!cur || !stripDragStartRef.current) return;
        applyColSelection(new Set(colRangeBetween(stripDragStartRef.current, cur)));
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup',   onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup',   onUp);
    },
    [colIdAtClientX, colRangeBetween, applyColSelection]
  );

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
    <div
      ref={gridWrapperRef}
      className="snc-grid-wrapper ag-theme-quartz"
      onContextMenu={handleGridContextMenu}
    >
      {/* Column-selection strip — 8px hover zone at top of header */}
      <div className="snc-col-select-strip" onMouseDown={onStripMouseDown} />
      <AgGridReact<AgentHistoryRecord>
        ref={gridRef}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowModelType="infinite"
        cacheBlockSize={BLOCK_SIZE}
        cacheOverflowSize={2}
        maxConcurrentDatasourceRequests={2}
        onGridReady={onGridReady}
        onColumnResized={onColumnResized}
        onFilterChanged={onFilterChanged}
        suppressCellFocus={false}
        rowSelection="single"
        enableCellTextSelection
        tooltipShowDelay={400}
        overlayNoRowsTemplate='<span class="snc-no-rows">אין רשומות עבור agent זה</span>'
      />
    </div>
  );

  // ── Embedded view ───────────────────────────────────────────────────

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

  // ── Full-page view ──────────────────────────────────────────────────

  const activeColIds = Object.keys(filterModel);

  return (
    <div className="snc-page">

      {/* ── Page header ─────────────────────────────────────────── */}
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

          {/* ── Column visibility picker ───────────────────────── */}
          <div className="snc-col-picker-wrap" ref={pickerRef}>

            <button
              type="button"
              className="snc-col-picker-btn"
              onClick={() => setPickerOpen((o) => !o)}
              aria-expanded={pickerOpen}
              aria-haspopup="true"
            >
              {/* Columns icon — three vertical bars */}
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="1"  y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                <rect x="6"  y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                <rect x="11" y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.4"/>
              </svg>
              Columns
              {hiddenCols.length > 0 && (
                <span className="snc-col-picker-badge">{hiddenCols.length}</span>
              )}
              {/* Chevron */}
              <svg
                className="snc-col-picker-chevron"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 6l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {pickerOpen && (
              <div className="snc-col-picker-panel">

                {COLUMN_GROUPS.map((group) => (
                  <div key={group.label} className="snc-col-picker-group">
                    <div className="snc-col-picker-group-label">{group.label}</div>
                    {group.cols.map((colId) => {
                      const isVisible = !hiddenCols.includes(colId);
                      return (
                        <div
                          key={colId}
                          className="snc-col-picker-row"
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleColVisibility(colId)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleColVisibility(colId);
                            }
                          }}
                        >
                          <span className="snc-col-picker-name">
                            {COLUMN_LABELS[colId] ?? colId}
                          </span>
                          <span
                            role="switch"
                            aria-checked={isVisible}
                            className={`snc-col-picker-toggle${isVisible ? ' snc-col-picker-toggle--on' : ''}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}

                <div className="snc-col-picker-footer">
                  <button
                    type="button"
                    className="snc-col-picker-reset"
                    onClick={resetColsToDefault}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="M13 8A5 5 0 1 1 8 3c1.4 0 2.6.5 3.5 1.4L13 6V2"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Reset to default
                  </button>
                </div>

              </div>
            )}
          </div>
          {/* ── /Column picker ──────────────────────────────────── */}

          <ModeNavigationLink to="/" label="ניטור זמן אמת" variant="real-time" />
        </div>

      </header>

      {/* ── Toolbar bar — hidden columns · active filters ──────── */}
      {(activeColIds.length > 0 || hiddenCols.length > 0) && (
        <div className="snc-filter-bar" role="status" aria-label="Active filters">

          {hiddenCols.length > 0 && (
            <>
              <span className="snc-filter-bar-label">Hidden:</span>
              {hiddenCols.map((colId) => (
                <button
                  key={colId}
                  type="button"
                  className="snc-hidden-chip"
                  onClick={() => showColumn(colId)}
                  title={`Show ${COLUMN_LABELS[colId] ?? colId}`}
                >
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M1.5 8C3 4.5 5.5 2.5 8 2.5S13 4.5 14.5 8C13 11.5 10.5 13.5 8 13.5S3 11.5 1.5 8z"
                      stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                  {COLUMN_LABELS[colId] ?? colId}
                </button>
              ))}
              {hiddenCols.length > 1 && (
                <button
                  type="button"
                  className="snc-filter-clear-all"
                  onClick={showAllColumns}
                >
                  Show all
                </button>
              )}
            </>
          )}

          {hiddenCols.length > 0 && activeColIds.length > 0 && (
            <div className="snc-filter-bar-vr" aria-hidden="true" />
          )}

          {activeColIds.length > 0 && (
            <>
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
            </>
          )}

        </div>
      )}

      {/* ── Row count status bar ─────────────────────────────────── */}
      {totalRows !== null && (
        <div className="snc-count-bar">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M4 5h8M4 8h8M4 11h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {activeColIds.length > 0 ? (
            <>
              <span className="snc-count-bar-badge">Filtered</span>
              <span>
                <span className="snc-count-bar-num">{totalRows.toLocaleString('en-US')}</span>
                {' '}matching rows
              </span>
            </>
          ) : (
            <span>
              Total{' '}
              <span className="snc-count-bar-num">{totalRows.toLocaleString('en-US')}</span>
              {' '}rows
            </span>
          )}
        </div>
      )}

      {/* ── Grid ─────────────────────────────────────────────────── */}
      <div className="snc-grid-outer">{gridEl}</div>

      {/* ── Right-click context menu ─────────────────────────────── */}
      {ctxMenu && (
        <div
          className="snc-ctx-menu"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="snc-ctx-item"
            onClick={() => {
              gridRef.current?.api?.applyColumnState({
                state: [{ colId: ctxMenu.colId, sort: 'asc', sortIndex: 0 }],
                defaultState: { sort: null },
              });
              setCtxMenu(null);
            }}
          >
            <svg className="snc-ctx-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 13V3M4.5 6.5L8 3l3.5 3.5"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sort Ascending
          </button>
          <button
            type="button"
            className="snc-ctx-item"
            onClick={() => {
              gridRef.current?.api?.applyColumnState({
                state: [{ colId: ctxMenu.colId, sort: 'desc', sortIndex: 0 }],
                defaultState: { sort: null },
              });
              setCtxMenu(null);
            }}
          >
            <svg className="snc-ctx-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 3v10M4.5 9.5L8 13l3.5-3.5"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sort Descending
          </button>
          <div className="snc-ctx-sep" />
          <button
            type="button"
            className="snc-ctx-item"
            onClick={() => { clearFilter(ctxMenu.colId); setCtxMenu(null); }}
          >
            <svg className="snc-ctx-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 4h12M5 8h6M7 12h2"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            Clear Filter
          </button>
          <div className="snc-ctx-sep" />
          {selectedCols.size > 0 && (
            <button
              type="button"
              className="snc-ctx-item snc-ctx-item--muted"
              onClick={() => { hideSelectedCols(); setCtxMenu(null); }}
            >
              <svg className="snc-ctx-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2 2l12 12M6.8 6.9a2.5 2.5 0 0 0 2.3 2.3M4 4.3A7.5 7.5 0 0 0 1.5 8c1.3 2.7 4 4.5 6.5 4.5 1 0 2-.3 2.8-.7M10.6 5.4A7.4 7.4 0 0 1 14.5 8c-1.3 2.7-4 4.5-6.5 4.5"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Hide {selectedCols.size} selected columns
            </button>
          )}
          <button
            type="button"
            className="snc-ctx-item snc-ctx-item--muted"
            onClick={() => {
              gridRef.current?.api?.setColumnsVisible([ctxMenu.colId], false);
              setHiddenCols((prev) => [...prev, ctxMenu.colId]);
              saveColState();
              setCtxMenu(null);
            }}
          >
            <svg className="snc-ctx-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 2l12 12M6.8 6.9a2.5 2.5 0 0 0 2.3 2.3M4 4.3A7.5 7.5 0 0 0 1.5 8c1.3 2.7 4 4.5 6.5 4.5 1 0 2-.3 2.8-.7M10.6 5.4A7.4 7.4 0 0 1 14.5 8c-1.3 2.7-4 4.5-6.5 4.5"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Hide Column
          </button>
        </div>
      )}

    </div>
  );
}
