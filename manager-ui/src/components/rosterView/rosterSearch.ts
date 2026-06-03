import type { HistoryAgent } from '../../types/history/historyAgent';

export type RosterScope =
  | 'callsign' | 'id' | 'zayadId' | 'unit' | 'platform' | 'platformId' | 'unitCode' | 'all';

export interface ScopeOption {
  value: RosterScope;
  label: string;       // shown in the selector
  placeholder: string; // rewrites the search placeholder
}

export const SCOPE_OPTIONS: ScopeOption[] = [
  { value: 'callsign',   label: 'Call Sign',   placeholder: 'Search call sign…' },
  { value: 'id',         label: 'Agent ID',    placeholder: 'Search agent id…' },
  { value: 'zayadId',    label: 'Zayad ID',    placeholder: 'Search zayad id…' },
  { value: 'unit',       label: 'Unit',        placeholder: 'Search unit…' },
  { value: 'platform',   label: 'Platform',    placeholder: 'Search platform…' },
  { value: 'platformId', label: 'Platform ID', placeholder: 'Search platform id…' },
  { value: 'unitCode',   label: 'Unit Code',   placeholder: 'Search unit code…' },
  { value: 'all',        label: 'All fields',  placeholder: 'Search all fields…' },
];

export const DEFAULT_SCOPE: RosterScope = 'callsign';

// ── Facets ────────────────────────────────────────────────────
export interface RosterFacets {
  unit: string[];
  platform: string[];
}

// Distinct, sorted values for a facet field — auto-populates the controls.
export function distinctFacetValues(
  agents: HistoryAgent[],
  field: 'unit' | 'platform'
): string[] {
  const set = new Set<string>();
  for (const a of agents) {
    const v = a.platfrom?.[field];
    if (v != null && v !== '') set.add(String(v));
  }
  return [...set].sort((x, y) => x.localeCompare(y));
}

// Within a facet: OR (any selected value matches). Between facets: AND.
function matchesFacets(agent: HistoryAgent, facets: RosterFacets): boolean {
  const p = agent.platfrom;
  if (facets.unit.length && !facets.unit.includes(p?.unit)) return false;
  if (facets.platform.length && !facets.platform.includes(p?.platform)) return false;
  return true;
}

// ── Group by ──────────────────────────────────────────────────
export type RosterGroupBy = 'none' | 'unit' | 'platform';

export const GROUP_BY_OPTIONS: { value: RosterGroupBy; label: string }[] = [
  { value: 'none',     label: 'None' },
  { value: 'unit',     label: 'Unit' },
  { value: 'platform', label: 'Platform' },
];

// ── Sort ──────────────────────────────────────────────────────
export type RosterSortKey = 'callsign' | 'id' | 'createdAt' | 'zayadId' | 'platformId' | 'unit' | 'platform';

export const SORT_OPTIONS: { value: RosterSortKey; label: string }[] = [
  { value: 'callsign',   label: 'Call Sign' },
  { value: 'id',         label: 'Agent ID' },
  { value: 'createdAt',  label: 'Created' },
  { value: 'zayadId',    label: 'Zayad ID' },
  { value: 'platformId', label: 'Platform ID' },
  { value: 'unit',       label: 'Unit' },
  { value: 'platform',   label: 'Platform' },
];

export const DEFAULT_SORT: RosterSortKey = 'callsign';

// Client-side sort by the chosen key + direction.
export function sortAgents(
  agents: HistoryAgent[],
  sortBy: RosterSortKey,
  dir: 'asc' | 'desc'
): HistoryAgent[] {
  const mul = dir === 'asc' ? 1 : -1;
  const val = (a: HistoryAgent): string | number => {
    switch (sortBy) {
      case 'callsign':   return a.callSign;
      case 'id':         return a.id;
      case 'createdAt':  return a.createdAt;
      case 'zayadId':    return a.platfrom?.zayadId ?? 0;
      case 'platformId': return a.platfrom?.platformId ?? 0;
      case 'unit':       return a.platfrom?.unit ?? '';
      case 'platform':   return a.platfrom?.platform ?? '';
      default:           return a.callSign;
    }
  };
  return [...agents].sort((a, b) => {
    const x = val(a), y = val(b);
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * mul;
    return String(x).localeCompare(String(y)) * mul;
  });
}

export interface AgentGroup { key: string; items: HistoryAgent[]; }

// Group agents by unit or platform; groups sorted by key (members keep their order).
export function groupAgents(agents: HistoryAgent[], by: 'unit' | 'platform'): AgentGroup[] {
  const map = new Map<string, HistoryAgent[]>();
  for (const a of agents) {
    const k = a.platfrom?.[by] ?? '—';
    let arr = map.get(k);
    if (!arr) { arr = []; map.set(k, arr); }
    arr.push(a);
  }
  return [...map.entries()]
    .map(([key, items]) => ({ key, items }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

// The string value(s) a given scope searches against (note nested `platfrom`).
function valuesForScope(agent: HistoryAgent, scope: RosterScope): string[] {
  const p = agent.platfrom;
  switch (scope) {
    case 'callsign':   return [agent.callSign];
    case 'id':         return [agent.id];
    case 'zayadId':    return [String(p?.zayadId ?? '')];
    case 'unit':       return [p?.unit ?? ''];
    case 'platform':   return [p?.platform ?? ''];
    case 'platformId': return [String(p?.platformId ?? '')];
    case 'unitCode':   return [p?.unitCode ?? ''];
    case 'all':
      return [agent.callSign, agent.id, p?.unit ?? '', p?.unitCode ?? '', p?.platform ?? '', String(p?.platformId ?? ''), String(p?.zayadId ?? '')];
    default:           return [];
  }
}

// Combined client-side filter: facets AND search (search scoped, substring,
// case-insensitive). Within a facet OR, between facets AND, and AND with search.
export function filterAgents(
  agents: HistoryAgent[],
  scope: RosterScope,
  query: string,
  facets: RosterFacets
): HistoryAgent[] {
  const needle = query.trim().toLowerCase();
  const hasFacets = facets.unit.length > 0 || facets.platform.length > 0;
  if (!needle && !hasFacets) return agents;
  return agents.filter((a) => {
    if (!matchesFacets(a, facets)) return false;
    if (needle && !valuesForScope(a, scope).some((v) => v.toLowerCase().includes(needle))) return false;
    return true;
  });
}
