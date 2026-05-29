/**
 * gridStatePersistence.ts
 *
 * Single, centralized place for persisting the sync-history grid's column
 * layout to localStorage. Scope decisions (intentional):
 *
 *   • UNIFORM across agents — one key, no agentId. The same column layout
 *     applies to every agent's history.
 *   • LAYOUT ONLY — width, visibility, pin, and order. Sort is NOT saved:
 *     it round-trips to the server via getRows(sortModel), so persisting it
 *     here would fight the server default (ID desc) on load.
 *   • VERSIONED KEY — bump STATE_VERSION whenever the column set changes in
 *     a way that should invalidate old saved state. Stale state under an old
 *     version key is simply ignored (and proactively cleaned up).
 *
 * All reads/writes are wrapped: localStorage can throw (quota, private mode,
 * disabled storage), and a persistence failure must never break the grid.
 */

import type { GridApi, ColumnState } from 'ag-grid-community';

/** Bump this when the column set changes in a breaking way. */
const STATE_VERSION = 2;

/** Versioned storage key. Old versions are cleaned up on load. */
const STORAGE_KEY = `snc-col-state:v${STATE_VERSION}`;

/** Legacy/older keys to remove if encountered (keeps localStorage tidy). */
const LEGACY_KEYS = ['snc-col-state', 'snc-col-state:v1'];

/** Fields we persist. Everything else (notably `sort`) is dropped. */
type PersistedColumnState = Pick<
  ColumnState,
  'colId' | 'width' | 'flex' | 'hide' | 'pinned'
>;

/** Keep only layout fields from a full ColumnState entry. */
function pickLayout(s: ColumnState): PersistedColumnState {
  return {
    colId: s.colId,
    width: s.width,
    flex: s.flex,
    hide: s.hide,
    pinned: s.pinned,
  };
}

/**
 * Save the current column layout. Debounced via the caller; this function
 * itself writes synchronously. Silently no-ops on any storage error.
 */
export function saveColumnState(api: GridApi): void {
  try {
    const full = api.getColumnState();
    if (!full) return;
    const layout = full.map(pickLayout);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* storage unavailable / quota — ignore, layout just won't persist */
  }
}

/**
 * Apply the saved column layout to the grid, if any. Order is applied too
 * (applyOrder), and `defaultState.sort = null` guarantees we never resurrect
 * a stale sort even if an old payload contained one. Cleans up legacy keys.
 * Returns true if a saved layout was applied.
 */
export function loadColumnState(api: GridApi): boolean {
  // Tidy up any pre-versioned keys first.
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
      // Never restore sort from storage — the server owns the sort default.
      defaultState: { sort: null },
    });
    return true;
  } catch {
    // Corrupt payload — drop it so we start clean next time.
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return false;
  }
}

/** Clear the saved layout (e.g. a future "reset columns" action). */
export function clearColumnState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
