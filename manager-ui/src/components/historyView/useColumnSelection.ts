/**
 * useColumnSelection.ts
 *
 * Manages the drag-to-select column strip at the top of the AG Grid header:
 *   - CSS highlight injection (header + body cells)
 *   - Range selection via mousedown + drag
 *   - Clear on outside click / Escape
 *   - Hide selected columns (calls onHide so parent updates hiddenCols state)
 *
 * Returns { selectedCols, onStripMouseDown, applyColSelection, hideSelectedCols }
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject, MouseEvent as ReactMouseEvent } from 'react';
import type { AgGridReact } from 'ag-grid-react';
import type { AgentHistoryRecord } from '../../types/history/agentHistoryRecord';

// ── Public types ────────────────────────────────────────────────────

interface UseColumnSelectionParams {
  gridWrapperRef: RefObject<HTMLDivElement>;
  gridRef: RefObject<AgGridReact<AgentHistoryRecord>>;
  /** Called with the ids to hide; parent is responsible for updating hiddenCols state */
  onHide: (ids: string[]) => void;
  saveColState: () => void;
}

interface UseColumnSelectionResult {
  selectedCols: Set<string>;
  onStripMouseDown: (e: ReactMouseEvent<HTMLDivElement>) => void;
  applyColSelection: (cols: Set<string>) => void;
  hideSelectedCols: () => void;
}

// ── Hook ────────────────────────────────────────────────────────────

export function useColumnSelection({
  gridWrapperRef,
  gridRef,
  onHide,
  saveColState,
}: UseColumnSelectionParams): UseColumnSelectionResult {
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());
  const stripDragStartRef = useRef<string | null>(null);
  const styleTagRef = useRef<HTMLStyleElement | null>(null);

  // ── Cleanup injected <style> on unmount ────────────────────────────
  useEffect(() => () => { styleTagRef.current?.remove(); }, []);

  // ── CSS injection: highlight selected column headers + cells ───────
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

  // ── Clear selection on outside left-click or Escape ────────────────
  useEffect(() => {
    if (selectedCols.size === 0) return;
    const clear = (e: PointerEvent) => {
      if (e.button === 2) return;
      const t = e.target as Element;
      if (t.closest('.snc-col-select-strip') || t.closest('.snc-ctx-menu')) return;
      applyColSelection(new Set());
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') applyColSelection(new Set());
    };
    window.addEventListener('pointerdown', clear);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', clear);
      window.removeEventListener('keydown', onKey);
    };
  }, [selectedCols.size, applyColSelection]);

  // ── Hide selected columns ──────────────────────────────────────────
  const hideSelectedCols = useCallback(() => {
    if (selectedCols.size === 0) return;
    const ids = Array.from(selectedCols);
    gridRef.current?.api?.setColumnsVisible(ids, false);
    onHide(ids);
    applyColSelection(new Set());
    saveColState();
  }, [selectedCols, gridRef, onHide, applyColSelection, saveColState]);

  // ── Header-cell geometry helpers ───────────────────────────────────

  const getSortedHeaderCells = useCallback((): HTMLElement[] => {
    const wrapper = gridWrapperRef.current;
    if (!wrapper) return [];
    return Array.from(wrapper.querySelectorAll<HTMLElement>('.ag-header-cell[col-id]'))
      .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
  }, [gridWrapperRef]);

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

  // ── Strip mousedown — single click or drag range ───────────────────
  const onStripMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
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
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [colIdAtClientX, colRangeBetween, applyColSelection]
  );

  return { selectedCols, onStripMouseDown, applyColSelection, hideSelectedCols };
}
