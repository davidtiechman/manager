import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import type {
  ColDef,
  IDatasource,
  IGetRowsParams,
  GridReadyEvent,
  ColumnResizedEvent,
  RowDoubleClickedEvent,
  MenuItemDef,
  DefaultMenuItem,
  GetMainMenuItemsParams,
  SideBarDef,
} from 'ag-grid-community';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import './AgentSyncsList.css';
import './syncGrid.theme.css';
import './syncGrid.cells.css';
// Reused for the toolbar button styles (.snc-col-picker-btn).
import './ColumnPicker.css';

import { ApiService } from '../../api';
import type { AgentHistoryRecord } from '../../types/history/agentHistoryRecord';
import type { HistoryAgent } from '../../types/history/historyAgent';
import { formatRosterDate } from '../rosterView/rosterFormat';
import { unitDotColor } from '../rosterView/rosterColors';
import ModeNavigationLink from '../ModeNavigationLink';

import {
  BLOCK_SIZE,
  COLUMN_LABELS,
  GROUP_COLORS,
  buildColumnDefs,
} from './syncGrid.columns';
import { SyncDetailPanel } from './SyncDetailPanel';
import {
  loadColumnState,
  saveColumnState,
  clearColumnState,
} from './gridStatePersistence';

interface AgentSyncsListProps {
  agentId?: string;
  onClose?: () => void;
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

  // ── Agent identity: prefer nav state, fall back to fetching by id ──
  const [agent, setAgent] = useState<HistoryAgent | null>(
    (location.state?.agent as HistoryAgent | undefined) ?? null
  );

  useEffect(() => {
    if (!agentId || (agent && agent.id === agentId)) return;
    let cancelled = false;
    ApiService.getHistoryAgents()
      .then((agents) => {
        if (cancelled) return;
        setAgent(agents.find((a) => a.id === agentId) ?? null);
      })
      .catch((err) => {
        console.error('[SyncHistory] failed to load agent identity:', err);
      });
    return () => { cancelled = true; };
  }, [agentId, agent]);

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

  // ── Tool Panels (Columns + Filters sidebar) ───────────────────────
  const sideBar = useMemo<SideBarDef>(
    () => ({
      toolPanels: [
        {
          id: 'columns',
          labelDefault: 'Columns',
          labelKey: 'columns',
          iconKey: 'columns',
          toolPanel: 'agColumnsToolPanel',
          toolPanelParams: {
            suppressRowGroups: true,
            suppressValues: true,
            suppressPivots: true,
            suppressPivotMode: true,
          },
        },
        {
          id: 'filters',
          labelDefault: 'Filters',
          labelKey: 'filters',
          iconKey: 'filter',
          toolPanel: 'agFiltersToolPanel',
        },
      ],
    }),
    []
  );

  // ── Per-group color CSS, generated from GROUP_DEFS ─────────────────
  const groupColorCss = useMemo(
    () =>
      Object.entries(GROUP_COLORS)
        .map(
          ([slug, color]) =>
            `.snc-grid-wrapper .snc-hdr-group--${slug}{--snc-group-color:${color}}` +
            `.snc-grid-wrapper .snc-tp-group--${slug} .ag-column-select-column-label{color:${color}}`
        )
        .join('\n'),
    []
  );

  // ── State ──────────────────────────────────────────────────────────
  const [filterModel, setFilterModel] = useState<Record<string, unknown>>({});
  const [totalRows, setTotalRows] = useState<number | null>(null);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [detailRecord, setDetailRecord] = useState<AgentHistoryRecord | null>(null);

  // ── Refs ────────────────────────────────────────────────────────────
  const maxIdRef = useRef<number | null>(null);
  const gridWrapperRef = useRef<HTMLDivElement>(null);

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

  // ── Color the Filters tool-panel group titles by group name ────────
  useEffect(() => {
    const wrapper = gridWrapperRef.current;
    if (!wrapper) return;
    const paint = () => {
      wrapper
        .querySelectorAll<HTMLElement>('.ag-filter-toolpanel-group-title')
        .forEach((el) => {
          const slug = (el.textContent?.trim() ?? '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-');
          const color = GROUP_COLORS[slug];
          if (color) el.style.color = color;
        });
    };
    const observer = new MutationObserver(paint);
    observer.observe(wrapper, { childList: true, subtree: true });
    paint();
    return () => observer.disconnect();
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
        .then(({ rows, lastRow, rowCount }) => {
          const safeRows = Array.isArray(rows) ? rows : [];
          if (params.startRow === 0 && safeRows.length > 0 && maxIdRef.current === null) {
            maxIdRef.current = safeRows[0].id;
          }
          const blockSize = params.endRow - params.startRow;
          const knownEnd =
            safeRows.length < blockSize ? params.startRow + safeRows.length : undefined;
          // Server total (first block) → lastRow → short final block.
          const resolvedTotal = rowCount ?? lastRow ?? knownEnd;
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

  // ── Persist column layout to localStorage (debounced) ──────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveColState = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const api = gridRef.current?.api;
      if (api) saveColumnState(api);
    }, 200);
  }, []);

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  const onGridReady = useCallback(
    (event: GridReadyEvent) => {
      event.api.updateGridOptions({ datasource: buildDatasource() });
      loadColumnState(event.api);
      const cols = event.api.getColumns();
      if (cols) setHiddenCount(cols.filter((c) => !c.isVisible()).length);
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

  // ── Track hidden-column count for the "Columns" badge ──────────────
  const refreshHiddenCount = useCallback(() => {
    const cols = gridRef.current?.api?.getColumns();
    if (!cols) return;
    setHiddenCount(cols.filter((c) => !c.isVisible()).length);
  }, []);

  // ── Right-click context menu ───────────────────────────────────────
  const getContextMenuItems = useCallback(
    (): (DefaultMenuItem | MenuItemDef)[] => [
      'copy',
      'copyWithHeaders',
      'separator',
      'autoSizeThis',
      'autoSizeAll',
    ],
    []
  );

  // ── Reset columns to their default layout ──────────────────────────
  const resetColumns = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    api.resetColumnState();
    refreshHiddenCount();
    setTimeout(clearColumnState, 300);
  }, [refreshHiddenCount]);

  // ── Custom column header menu (the ☰ button) ───────────────────────
  const getMainMenuItems = useCallback(
    (params: GetMainMenuItemsParams): (DefaultMenuItem | MenuItemDef)[] => {
      const colId = params.column?.getColId();
      const isPinned = !!params.column?.isPinned();
      return [
        {
          name: isPinned ? 'Unpin Column' : 'Pin Left',
          icon: '<span class="ag-icon ag-icon-pin" role="presentation"></span>',
          action: () => {
            params.api.applyColumnState({
              state: [{ colId: colId!, pinned: isPinned ? null : 'left' }],
            });
          },
        },
        'separator',
        'autoSizeThis',
        'autoSizeAll',
        'separator',
        'columnChooser',
        {
          name: 'Reset Columns',
          icon: '<span class="ag-icon ag-icon-columns" role="presentation"></span>',
          action: resetColumns,
        },
      ];
    },
    [resetColumns]
  );

  // ── Detail side panel: double-click opens, single click closes ─────
  const onRowDoubleClicked = useCallback(
    (e: RowDoubleClickedEvent<AgentHistoryRecord>) => {
      if (e.data) setDetailRecord(e.data);
    },
    []
  );

  const onRowClicked = useCallback(() => {
    setDetailRecord((cur) => (cur ? null : cur));
  }, []);

  const closeDetail = useCallback(() => setDetailRecord(null), []);

  // ── Toggle a tool panel from the toolbar buttons ───────────────────
  const toggleToolPanel = useCallback((panelId: 'columns' | 'filters') => {
    const api = gridRef.current?.api;
    if (!api) return;
    if (api.getOpenedToolPanel() === panelId) api.closeToolPanel();
    else api.openToolPanel(panelId);
  }, []);

  // ── Persist column state + refresh hidden count on any change ──────
  const onColumnStateChanged = useCallback(() => {
    saveColState();
    refreshHiddenCount();
  }, [saveColState, refreshHiddenCount]);

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
    <div ref={gridWrapperRef} className="snc-grid-wrapper ag-theme-quartz">
      <style>{groupColorCss}</style>
      <AgGridReact<AgentHistoryRecord>
        ref={gridRef}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        theme="legacy"
        rowModelType="infinite"
        cacheBlockSize={BLOCK_SIZE}
        cacheOverflowSize={2}
        maxConcurrentDatasourceRequests={2}
        maxBlocksInCache={10}
        sideBar={sideBar}
        getContextMenuItems={getContextMenuItems}
        getMainMenuItems={getMainMenuItems}
        cellSelection
        groupHeaderHeight={0}
        onGridReady={onGridReady}
        onColumnResized={onColumnResized}
        onColumnVisible={onColumnStateChanged}
        onColumnPinned={onColumnStateChanged}
        onColumnMoved={onColumnStateChanged}
        onFilterChanged={onFilterChanged}
        onRowClicked={onRowClicked}
        onRowDoubleClicked={onRowDoubleClicked}
        suppressCellFocus={false}
        rowSelection={{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }}
        tooltipShowDelay={400}
        overlayNoRowsTemplate='<span class="snc-no-rows">אין רשומות עבור agent זה</span>'
      />
      <SyncDetailPanel record={detailRecord} onClose={closeDetail} />
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

      {/* ── Page header (single row) ────────────────────────────── */}
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
            Back
          </button>

          <div className="snc-header-sep" aria-hidden="true" />

          <span className="snc-agent-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="4" y="4.5" width="16" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
              <rect x="4" y="13.5" width="16" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="7.5" cy="7.5" r="0.95" fill="currentColor" />
              <circle cx="7.5" cy="16.5" r="0.95" fill="currentColor" />
            </svg>
          </span>

          <div className="snc-agent-identity">
            <div className="snc-agent-identity-line">
              <span className="snc-agent-callsign" title={agent?.callsign ?? undefined}>
                {agent?.callsign ?? 'Agent'}
              </span>
              <span className="snc-page-label">Sync History</span>
            </div>
            <span className="snc-agent-id-text" title={agentId}>{agentId}</span>
          </div>

          {/* ── Inline agent metadata ─────────────────────────── */}
          {agent && (
            <div className="snc-meta-row">
              <div className="snc-meta-item">
                <span className="snc-meta-label">Unit</span>
                <span className="snc-meta-value">
                  <span
                    className="snc-meta-dot"
                    style={{ backgroundColor: unitDotColor(agent.platfrom.unit) }}
                    aria-hidden="true"
                  />
                  {agent.platfrom.unit}
                </span>
              </div>
              <div className="snc-meta-item">
                <span className="snc-meta-label">Platform</span>
                <span className="snc-meta-value">{agent.platfrom.platform}</span>
              </div>
              <div className="snc-meta-item">
                <span className="snc-meta-label">Zayad ID</span>
                <span className="snc-meta-value snc-meta-num">{agent.platfrom.zayadId}</span>
              </div>
              <div className="snc-meta-item">
                <span className="snc-meta-label">Platform ID</span>
                <span className="snc-meta-value snc-meta-num">{agent.platfrom.platformId}</span>
              </div>
              <div className="snc-meta-item">
                <span className="snc-meta-label">Unit Code</span>
                <span className="snc-meta-value snc-meta-num">{agent.platfrom.unitCode}</span>
              </div>
              <div className="snc-meta-item snc-meta-item--created">
                <span className="snc-meta-label">Created</span>
                <span className="snc-meta-value">{formatRosterDate(agent.createdAt)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="snc-header-end">
          <ModeNavigationLink to="/" label="ניטור זמן אמת" variant="real-time" />
        </div>

      </header>

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className="snc-toolbar">

        <div className="snc-toolbar-start">

          {/* Columns tool-panel toggle */}
          <button
            type="button"
            className="snc-col-picker-btn"
            onClick={() => toggleToolPanel('columns')}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="1"  y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.4"/>
              <rect x="6"  y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.4"/>
              <rect x="11" y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.4"/>
            </svg>
            Columns
            {hiddenCount > 0 && (
              <span className="snc-col-picker-badge">{hiddenCount}</span>
            )}
          </button>

          {/* Filters tool-panel toggle */}
          <button
            type="button"
            className="snc-col-picker-btn"
            onClick={() => toggleToolPanel('filters')}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M1.5 3h13l-5 6v4l-3 1.5V9l-5-6z" stroke="currentColor"
                strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
            Filters
          </button>

          {/* Active filter chips (appear inline after buttons) */}
          {activeColIds.length > 0 && (
            <>
              <div className="snc-toolbar-vr" aria-hidden="true" />
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

        {/* Row count — right-aligned */}
        <div className="snc-toolbar-end">
          {totalRows !== null && (
            <div className="snc-row-count">
              {activeColIds.length > 0 ? (
                <>
                  <span className="snc-row-count-badge">Filtered</span>
                  <span className="snc-row-count-num">{totalRows.toLocaleString('en-US')}</span>
                  <span>rows</span>
                </>
              ) : (
                <>
                  <span>Total</span>
                  <span className="snc-row-count-num">{totalRows.toLocaleString('en-US')}</span>
                  <span>rows</span>
                </>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ── Grid ─────────────────────────────────────────────────── */}
      <div className="snc-grid-outer">{gridEl}</div>

    </div>
  );
}
