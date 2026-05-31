// Persists grid column layout to localStorage (layout only, never sort).

import type { GridApi, ColumnState } from 'ag-grid-community';

// Bump when the column set changes in a breaking way.
const STATE_VERSION = 3;
const STORAGE_KEY = `snc-col-state:v${STATE_VERSION}`;
const LEGACY_KEYS = ['snc-col-state', 'snc-col-state:v1', 'snc-col-state:v2'];

type PersistedColumnState = Pick<
  ColumnState,
  'colId' | 'width' | 'flex' | 'hide' | 'pinned'
>;

// Keep only the layout fields we persist.
function pickLayout(s: ColumnState): PersistedColumnState {
  return {
    colId: s.colId,
    width: s.width,
    flex: s.flex,
    hide: s.hide,
    pinned: s.pinned,
  };
}

// Save the current column layout (caller debounces).
export function saveColumnState(api: GridApi): void {
  try {
    const full = api.getColumnState();
    if (!full) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(full.map(pickLayout)));
  } catch {
    //
  }
}

// Apply the saved layout, drop legacy keys, never restore sort.
export function loadColumnState(api: GridApi): boolean {
  try {
    for (const k of LEGACY_KEYS) localStorage.removeItem(k);
  } catch {
    //
  }

  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw) as PersistedColumnState[];
    if (!Array.isArray(parsed) || parsed.length === 0) return false;
    api.applyColumnState({
      state: parsed,
      applyOrder: true,
      defaultState: { sort: null },
    });
    return true;
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      //
    }
    return false;
  }
}

// Remove the saved layout.
export function clearColumnState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    //
  }
}
