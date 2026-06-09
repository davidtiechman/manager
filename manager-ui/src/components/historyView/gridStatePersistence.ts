// Persists column layout to localStorage (layout only — never sort or pin), keyed per table.

import type { GridApi, ColumnState } from 'ag-grid-community';

type PersistedColumnState = Pick<ColumnState, 'colId' | 'width' | 'flex' | 'hide'>;

function pickLayout(s: ColumnState): PersistedColumnState {
  return { colId: s.colId, width: s.width, flex: s.flex, hide: s.hide };
}

// Save the current column layout (caller debounces).
export function saveColumnState(api: GridApi, key: string): void {
  try {
    const full = api.getColumnState();
    if (!full) return;
    localStorage.setItem(key, JSON.stringify(full.map(pickLayout)));
  } catch {
    //
  }
}

// Apply the saved layout; never restore sort or pin.
export function loadColumnState(api: GridApi, key: string): boolean {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return false;
  }
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw) as PersistedColumnState[];
    if (!Array.isArray(parsed) || parsed.length === 0) return false;
    const state = parsed.map(({ colId, width, flex, hide }) => ({ colId, width, flex, hide }));
    api.applyColumnState({ state, applyOrder: true, defaultState: { sort: null } });
    return true;
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      //
    }
    return false;
  }
}

// Remove the saved layout.
export function clearColumnState(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    //
  }
}
