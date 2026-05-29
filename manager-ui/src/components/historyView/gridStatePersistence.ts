// Persists the grid's column layout to localStorage: uniform across agents
// (one key), layout only (no sort — the server owns it), versioned key.

import type { GridApi, ColumnState } from 'ag-grid-community';

// Bump when the column set changes in a breaking way.
const STATE_VERSION = 2;
const STORAGE_KEY = `snc-col-state:v${STATE_VERSION}`;
const LEGACY_KEYS = ['snc-col-state', 'snc-col-state:v1'];

type PersistedColumnState = Pick<
  ColumnState,
  'colId' | 'width' | 'flex' | 'hide' | 'pinned'
>;

function pickLayout(s: ColumnState): PersistedColumnState {
  return {
    colId: s.colId,
    width: s.width,
    flex: s.flex,
    hide: s.hide,
    pinned: s.pinned,
  };
}

// Save the current layout. Caller debounces; no-ops on any storage error.
export function saveColumnState(api: GridApi): void {
  try {
    const full = api.getColumnState();
    if (!full) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(full.map(pickLayout)));
  } catch {
    /* ignore */
  }
}

// Apply the saved layout (if any), clean up legacy keys, never restore sort.
export function loadColumnState(api: GridApi): boolean {
  try {
    for (const k of LEGACY_KEYS) localStorage.removeItem(k);
  } catch {
    /* ignore */
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
      /* ignore */
    }
    return false;
  }
}

export function clearColumnState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
