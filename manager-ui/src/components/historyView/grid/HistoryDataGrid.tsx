// Generic infinite-scroll grid for a per-agent history table (one GridConfig).

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import '../AgentSyncsList.css';
import '../syncGrid.theme.css';
import '../syncGrid.cells.css';
import '../ColumnPicker.css';
import '../json/jsonViewer.css';

import { useTranslation } from 'react-i18next';

import type { GridConfig } from './gridConfig';
import {
  loadColumnState,
  saveColumnState,
  clearColumnState,
} from '../gridStatePersistence';
import { useLang } from '../../../i18n/LanguageProvider';
import { AG_GRID_LOCALE_HE } from '../../../i18n/agGridLocale';

interface HistoryDataGridProps<T> {
  agentId: string;
  config: GridConfig<T>;
  leftSlot?: ReactNode; // rendered at the start of the toolbar (e.g. tab switcher)
}

export default function HistoryDataGrid<T>({ agentId, config, leftSlot }: HistoryDataGridProps<T>) {
  const gridRef = useRef<AgGridReact<T>>(null);
  const columnDefs = config.columnDefs;
  const { t } = useTranslation('history');
  const { dir } = useLang();

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
          labelDefault: t('toolbar.columns'),
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
          labelDefault: t('toolbar.filters'),
          labelKey: 'filters',
          iconKey: 'filter',
          toolPanel: 'agFiltersToolPanel',
        },
      ],
    }),
    [t]
  );

  // ── Per-group color CSS ──
  const groupColorCss = useMemo(
    () =>
      Object.entries(config.groupColors)
        .map(
          ([slug, color]) =>
            `.snc-grid-wrapper .snc-hdr-group--${slug}{--snc-group-color:${color}}` +
            `.snc-grid-wrapper .snc-tp-group--${slug} .ag-column-select-column-label{color:${color}}`
        )
        .join('\n'),
    [config.groupColors]
  );

  // ── State ──────────────────────────────────────────────────────────
  const [filterModel, setFilterModel] = useState<Record<string, unknown>>({});
  const [totalRows, setTotalRows] = useState<number | null>(null);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [detailRecord, setDetailRecord] = useState<T | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [maxVisibleChips, setMaxVisibleChips] = useState(99);

  const gridWrapperRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const filterRowRef = useRef<HTMLDivElement>(null);
  const filterMeasureRef = useRef<HTMLDivElement>(null);

  // Close the "+N" filter popover on outside click.
  useEffect(() => {
    if (!overflowOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setOverflowOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [overflowOpen]);

  // Fit as many filter chips as the row allows; the rest collapse into "+N".
  const filterKey = Object.keys(filterModel).join('|');
  useLayoutEffect(() => {
    const row = filterRowRef.current;
    const measure = filterMeasureRef.current;
    if (!row || !measure) return;
    const GAP = 6;
    const MORE_BTN = 52; // reserve for the "+N" button + gap

    const compute = () => {
      const avail = row.clientWidth;
      const widths = Array.from(measure.children).map((c) => (c as HTMLElement).offsetWidth);
      let total = 0;
      let count = 0;
      for (let i = 0; i < widths.length; i += 1) {
        const w = widths[i] + (i > 0 ? GAP : 0);
        if (total + w <= avail) { total += w; count += 1; } else break;
      }
      if (count < widths.length) {
        while (count > 0 && total + MORE_BTN > avail) {
          total -= widths[count - 1] + (count > 1 ? GAP : 0);
          count -= 1;
        }
      }
      setMaxVisibleChips(Math.max(1, count));
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(row);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [filterKey]);

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

  // ── Color the Filters tool-panel group titles ──
  useEffect(() => {
    const wrapper = gridWrapperRef.current;
    if (!wrapper) return;
    const paint = () => {
      wrapper
        .querySelectorAll<HTMLElement>('.ag-filter-toolpanel-group-title')
        .forEach((el) => {
          const color = config.groupLabelColors[el.textContent?.trim() ?? ''];
          if (color) el.style.color = color;
        });
    };
    const observer = new MutationObserver(paint);
    observer.observe(wrapper, { childList: true, subtree: true });
    paint();
    return () => observer.disconnect();
  }, [config.groupLabelColors]);

  // ── Reset count when agentId changes ───────────────────────────────
  useEffect(() => {
    setTotalRows(null);
  }, [agentId]);

  // ── Datasource ─────────────────────────────────────────────────────
  const buildDatasource = useCallback((): IDatasource => ({
    getRows(params: IGetRowsParams) {
      if (!agentId) {
        params.successCallback([], 0);
        return;
      }
      config
        .fetchRows(agentId, {
          startRow: params.startRow,
          endRow: params.endRow,
          sortModel: params.sortModel as Array<{ colId: string; sort: 'asc' | 'desc' }>,
          filterModel: params.filterModel as Record<string, unknown>,
        })
        .then(({ rows, lastRow, rowCount }) => {
          const safeRows = Array.isArray(rows) ? rows : [];
          const blockSize = params.endRow - params.startRow;
          const knownEnd =
            safeRows.length < blockSize ? params.startRow + safeRows.length : undefined;
          const resolvedTotal = rowCount ?? lastRow ?? knownEnd;
          if (params.startRow === 0 && resolvedTotal !== undefined) {
            setTotalRows(resolvedTotal);
          }
          params.successCallback(safeRows, lastRow ?? knownEnd);
        })
        .catch((err) => {
          console.error('[HistoryDataGrid] getRows failed:', err);
          params.failCallback();
        });
    },
  }), [agentId, config]);

  // ── Persist column layout (debounced) ──
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveColState = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const api = gridRef.current?.api;
      if (api) saveColumnState(api, config.storageKey);
    }, 200);
  }, [config.storageKey]);

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  const onGridReady = useCallback(
    (event: GridReadyEvent) => {
      event.api.updateGridOptions({ datasource: buildDatasource() });
      loadColumnState(event.api, config.storageKey);
      const cols = event.api.getColumns();
      if (cols) setHiddenCount(cols.filter((c) => !c.isVisible()).length);
    },
    [buildDatasource, config.storageKey]
  );

  const onColumnResized = useCallback(
    (e: ColumnResizedEvent) => {
      if (!e.finished) return;
      saveColState();
    },
    [saveColState]
  );

  // ── Hidden-column count for the badge ──
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
    setTimeout(() => clearColumnState(config.storageKey), 300);
  }, [refreshHiddenCount, config.storageKey]);

  // ── Column header menu ──
  const getMainMenuItems = useCallback(
    (params: GetMainMenuItemsParams): (DefaultMenuItem | MenuItemDef)[] => {
      const colId = params.column?.getColId();
      const isPinned = !!params.column?.isPinned();
      const pinStart = dir === 'rtl' ? 'right' : 'left'; // leading edge
      const pinLabel = dir === 'rtl' ? t('toolbar.pinRight') : t('toolbar.pinLeft');
      return [
        {
          name: isPinned ? t('toolbar.unpinColumn') : pinLabel,
          icon: '<span class="ag-icon ag-icon-pin" role="presentation"></span>',
          action: () => {
            params.api.applyColumnState({
              state: [{ colId: colId!, pinned: isPinned ? null : pinStart }],
            });
          },
        },
        'separator',
        'autoSizeThis',
        'autoSizeAll',
        'separator',
        'columnChooser',
        {
          name: t('toolbar.resetColumns'),
          icon: '<span class="ag-icon ag-icon-columns" role="presentation"></span>',
          action: resetColumns,
        },
      ];
    },
    [resetColumns, t, dir]
  );

  // ── Detail panel: dbl-click opens, click closes ──
  const onRowDoubleClicked = useCallback(
    (e: RowDoubleClickedEvent<T>) => {
      if (e.data) setDetailRecord(e.data);
    },
    []
  );

  const onRowClicked = useCallback(() => {
    setDetailRecord((cur) => (cur ? null : cur));
  }, []);

  const closeDetail = useCallback(() => setDetailRecord(null), []);

  // ── Toggle a tool panel ──
  const toggleToolPanel = useCallback((panelId: 'columns' | 'filters') => {
    const api = gridRef.current?.api;
    if (!api) return;
    if (api.getOpenedToolPanel() === panelId) api.closeToolPanel();
    else api.openToolPanel(panelId);
  }, []);

  // ── Persist + refresh hidden count on change ──
  const onColumnStateChanged = useCallback(() => {
    saveColState();
    refreshHiddenCount();
  }, [saveColState, refreshHiddenCount]);

  const activeColIds = Object.keys(filterModel);
  const visibleColIds = activeColIds.slice(0, maxVisibleChips);
  const hiddenColIds = activeColIds.slice(maxVisibleChips);

  const renderChip = (colId: string) => (
    <button
      key={colId}
      type="button"
      className="snc-filter-chip"
      onClick={() => clearFilter(colId)}
      title={t('toolbar.clearFilter', { label: config.columnLabels[colId] ?? colId })}
    >
      {config.columnLabels[colId] ?? colId}
      <span className="snc-filter-chip-x" aria-hidden="true">×</span>
    </button>
  );

  return (
    <>
      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className="snc-toolbar">

        <div className="snc-toolbar-start">

          {leftSlot && (
            <>
              {leftSlot}
              <div className="snc-toolbar-vr" aria-hidden="true" />
            </>
          )}

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
            {t('toolbar.columns')}
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
            {t('toolbar.filters')}
          </button>

          {/* Active filter chips; extras beyond the row width collapse into "+N" */}
          {activeColIds.length > 0 && (
            <>
              <div className="snc-toolbar-vr" aria-hidden="true" />
              <span className="snc-filter-bar-label">{t('toolbar.filtersLabel')}</span>
              <div className="snc-filter-row" ref={filterRowRef}>
                {visibleColIds.map(renderChip)}
                {hiddenColIds.length > 0 && (
                  <div className="snc-filter-more" ref={moreRef}>
                    <button
                      type="button"
                      className="snc-filter-more-btn"
                      aria-expanded={overflowOpen}
                      onClick={() => setOverflowOpen((o) => !o)}
                    >
                      +{hiddenColIds.length}
                    </button>
                    {overflowOpen && (
                      <div className="snc-filter-more-panel">
                        {hiddenColIds.map(renderChip)}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="snc-filter-clear-all"
                onClick={clearAllFilters}
              >
                {t('toolbar.clearAll')}
              </button>

              {/* Hidden row used only to measure each chip's natural width */}
              <div className="snc-filter-measure" ref={filterMeasureRef} aria-hidden="true">
                {activeColIds.map((colId) => (
                  <span key={colId} className="snc-filter-chip">
                    {config.columnLabels[colId] ?? colId}
                    <span className="snc-filter-chip-x">×</span>
                  </span>
                ))}
              </div>
            </>
          )}

        </div>

        {/* Row count — right-aligned */}
        <div className="snc-toolbar-end">
          {totalRows !== null && (
            <div className="snc-row-count">
              {activeColIds.length > 0 ? (
                <>
                  <span className="snc-row-count-badge">{t('toolbar.filtered')}</span>
                  <span className="snc-row-count-num">{totalRows.toLocaleString('en-US')}</span>
                  <span>{t('toolbar.rows')}</span>
                </>
              ) : (
                <>
                  <span>{t('toolbar.total')}</span>
                  <span className="snc-row-count-num">{totalRows.toLocaleString('en-US')}</span>
                  <span>{t('toolbar.rows')}</span>
                </>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ── Grid ─────────────────────────────────────────────────── */}
      <div className="snc-grid-outer">
        <div ref={gridWrapperRef} className="snc-grid-wrapper ag-theme-quartz">
          <style>{groupColorCss}</style>
          <AgGridReact<T>
            ref={gridRef}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            theme="legacy"
            enableRtl={dir === 'rtl'}
            localeText={dir === 'rtl' ? AG_GRID_LOCALE_HE : undefined}
            rowModelType="infinite"
            cacheBlockSize={config.blockSize}
            cacheOverflowSize={2}
            maxConcurrentDatasourceRequests={4}
            maxBlocksInCache={50}
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
            tooltipInteraction
            overlayNoRowsTemplate={`<span class="snc-no-rows">${config.noRowsText}</span>`}
          />
          {config.renderDetail(detailRecord, closeDetail)}
        </div>
      </div>
    </>
  );
}
