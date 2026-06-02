// Persists column layout to localStorage (layout only, never sort), keyed per table.

import type { GridApi, ColumnState } from 'ag-grid-community';

// Bump when the column set changes in a breaking way.
const STATE_VERSION = 3;
const versionedKey = (base: string) => `${base}:v${STATE_VERSION}`;
const legacyKeys = (base: string) => [base, `${base}:v1`, `${base}:v2`];

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
export function saveColumnState(api: GridApi, baseKey: string): void {
  try {
    const full = api.getColumnState();
    if (!full) return;
    localStorage.setItem(versionedKey(baseKey), JSON.stringify(full.map(pickLayout)));
  } catch {
    //
  }
}

// Apply the saved layout, drop legacy keys, never restore sort.
export function loadColumnState(api: GridApi, baseKey: string): boolean {
  try {
    for (const k of legacyKeys(baseKey)) localStorage.removeItem(k);
  } catch {
    //
  }

  let raw: string | null = null;
  try {
    raw = localStorage.getItem(versionedKey(baseKey));
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
      localStorage.removeItem(versionedKey(baseKey));
    } catch {
      //
    }
    return false;
  }
}

// Remove the saved layout.
export function clearColumnState(baseKey: string): void {
  try {
    localStorage.removeItem(versionedKey(baseKey));
  } catch {
    //
  }
}
