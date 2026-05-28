import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import type {
  ColDef,
  IDatasource,
  IGetRowsParams,
  GridReadyEvent,
  ColumnResizedEvent,
} from 'ag-grid-community';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import './AgentSyncsList.css';
import './syncGrid.theme.css';
import './syncGrid.cells.css';
import './ColumnPicker.css';

import { ApiService } from '../../api';
import type { AgentHistoryRecord } from '../../types/history/agentHistoryRecord';
import ModeNavigationLink from '../ModeNavigationLink';

import {
  BLOCK_SIZE,
  LS_COL_KEY,
  DEFAULT_HIDDEN,
  COLUMN_LABELS,
  COLUMN_GROUPS,
  buildColumnDefs,
} from './syncGrid.columns';
import { useColumnSelection } from './useColumnSelection';

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
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; colId: string } | null>(null);

  // ── Refs ────────────────────────────────────────────────────────────
  const gridWrapperRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
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

  // ── Column-selection strip (drag-select, CSS highlight, hide) ──────
  const onHideSelection = useCallback((ids: string[]) => {
    setHiddenCols((prev) => [...prev, ...ids.filter((id) => !prev.includes(id))]);
  }, []);

  const { selectedCols, onStripMouseDown, hideSelectedCols } = useColumnSelection({
    gridWrapperRef,
    gridRef,
    onHide: onHideSelection,
    saveColState,
  });

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
        rowSelection={{ mode: 'singleRow' }}
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
          <div className="snc-header-sep" aria-hidden="true" />
          <div className="snc-agent-identity">
            <span className="snc-agent-id-text">{agentId}</span>
            <span className="snc-page-label">Sync History</span>
          </div>
        </div>

        <div className="snc-header-end">
          <ModeNavigationLink to="/" label="ניטור זמן אמת" variant="real-time" />
        </div>

      </header>

      {/* ── Toolbar: columns · active filters · row count ──────── */}
      <div className="snc-toolbar">

        <div className="snc-toolbar-start">

          {/* Column picker */}
          <div className="snc-col-picker-wrap" ref={pickerRef}>
            <button
              type="button"
              className="snc-col-picker-btn"
              onClick={() => setPickerOpen((o) => !o)}
              aria-expanded={pickerOpen}
              aria-haspopup="true"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="1"  y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                <rect x="6"  y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.4"/>
                <rect x="11" y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.4"/>
              </svg>
              Columns
              {hiddenCols.length > 0 && (
                <span className="snc-col-picker-badge">{hiddenCols.length}</span>
              )}
              <svg className="snc-col-picker-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.7"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {pickerOpen && (
              <div className="snc-col-picker-panel">
                <div className="snc-col-picker-scroll">
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
                </div>
                <div className="snc-col-picker-footer">
                  <button
                    type="button"
                    className="snc-col-picker-reset"
                    onClick={resetColsToDefault}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M13 8A5 5 0 1 1 8 3c1.4 0 2.6.5 3.5 1.4L13 6V2"
                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Reset to default
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Active filter chips (appear inline after picker) */}
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
