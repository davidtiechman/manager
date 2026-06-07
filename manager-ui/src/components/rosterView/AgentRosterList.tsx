import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './roster.css';

import { ApiService } from '../../api';
import type { HistoryAgent } from '../../types/history/historyAgent';
import AgentCard from './AgentCard';
import { unitDotColor } from './rosterColors';
import RosterCommandBar from './RosterCommandBar';
import RosterActiveFilters from './RosterActiveFilters';
import LanguageToggle from '../../i18n/LanguageToggle';
import {
  filterAgents, sortAgents, groupAgents, distinctFacetValues,
  DEFAULT_SCOPE, DEFAULT_SORT,
  type RosterScope, type RosterGroupBy, type RosterFacets, type RosterSortKey,
} from './rosterSearch';

// Gallery metrics (px)
const MIN_CARD_W = 240;
const GAP = 14;
const CARD_H = 158;
const ROW_H = CARD_H + GAP;   // vertical stride per card row
const GROUP_H = 52;           // group-header row height
const OVERSCAN = 4;

type FlatRow =
  | { type: 'group'; key: string; count: number; collapsed: boolean }
  | { type: 'cards'; items: HistoryAgent[] };

// Roster page: a virtualized card gallery over the client-side agent list, with search, facets, sort, and grouping.
export default function AgentRosterList() {
  const navigate = useNavigate();

  const [agents, setAgents] = useState<HistoryAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [scope, setScope] = useState<RosterScope>(DEFAULT_SCOPE);
  const [groupBy, setGroupBy] = useState<RosterGroupBy>('none');
  const [facets, setFacets] = useState<RosterFacets>({ unit: [], platform: [] });
  const [sortBy, setSortBy] = useState<RosterSortKey>(DEFAULT_SORT);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // viewport / scroll
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    let cancelled = false;
    ApiService.getHistoryAgents()
      .then((data) => { if (!cancelled) setAgents(data); })
      .catch((err) => {
        console.error('[Roster] failed to load history agents:', err);
        if (!cancelled) setError('Failed to load agents');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Lock document scroll so only the gallery scrolls (no double scrollbar).
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => { html.style.overflow = prev; };
  }, []);

  // Debounce the search input (~120ms).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 120);
    return () => clearTimeout(t);
  }, [search]);

  const unitOptions = useMemo(() => distinctFacetValues(agents, 'unit'), [agents]);
  const platformOptions = useMemo(() => distinctFacetValues(agents, 'platform'), [agents]);

  // filter → sort (client-side pipeline).
  const filtered = useMemo(
    () => filterAgents(agents, scope, debouncedSearch, facets),
    [agents, scope, debouncedSearch, facets]
  );
  const sorted = useMemo(() => sortAgents(filtered, sortBy, sortDir), [filtered, sortBy, sortDir]);

  // responsive column count from the container width.
  const cols = useMemo(() => {
    const w = viewport.width;
    if (!w) return 1;
    return Math.max(1, Math.floor((w + GAP) / (MIN_CARD_W + GAP)));
  }, [viewport.width]);

  // Build the flat row list (group headers + card rows) and their offsets.
  const { rows, offsets, totalH } = useMemo(() => {
    const built: FlatRow[] = [];
    const heights: number[] = [];
    const pushCards = (items: HistoryAgent[]) => {
      for (let i = 0; i < items.length; i += cols) {
        built.push({ type: 'cards', items: items.slice(i, i + cols) });
        heights.push(ROW_H);
      }
    };
    if (groupBy === 'none') {
      pushCards(sorted);
    } else {
      for (const g of groupAgents(sorted, groupBy)) {
        const isCollapsed = collapsed.has(g.key);
        built.push({ type: 'group', key: g.key, count: g.items.length, collapsed: isCollapsed });
        heights.push(GROUP_H);
        if (!isCollapsed) pushCards(g.items);
      }
    }
    const offs = [0];
    for (let i = 0; i < heights.length; i += 1) offs.push(offs[i] + heights[i]);
    return { rows: built, offsets: offs, totalH: offs[offs.length - 1] };
  }, [sorted, groupBy, cols, collapsed]);

  // Windowing: first/last visible row index.
  const { startIndex, endIndex } = useMemo(() => {
    if (rows.length === 0) return { startIndex: 0, endIndex: -1 };
    const top = scrollTop;
    const bottom = scrollTop + (viewport.height || 800);
    let lo = 0, hi = rows.length - 1, start = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (offsets[mid + 1] > top) { start = mid; hi = mid - 1; } else { lo = mid + 1; }
    }
    let end = start;
    while (end < rows.length && offsets[end] < bottom) end += 1;
    return {
      startIndex: Math.max(0, start - OVERSCAN),
      endIndex: Math.min(rows.length - 1, end + OVERSCAN),
    };
  }, [rows, offsets, scrollTop, viewport.height]);

  // Measure the scroll container (width → columns, height → window).
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setViewport({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (el) setScrollTop(el.scrollTop);
  }, []);

  // filter handlers
  const setFacet = (key: keyof RosterFacets, values: string[]) =>
    setFacets((prev) => ({ ...prev, [key]: values }));
  const removeFacetValue = (key: keyof RosterFacets, value: string) =>
    setFacets((prev) => ({ ...prev, [key]: prev[key].filter((v) => v !== value) }));
  const clearAllFacets = () => setFacets({ unit: [], platform: [] });
  const clearAllFilters = () => { setSearch(''); clearAllFacets(); };

  // grouping handlers
  const toggleGroup = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => {
    if (groupBy === 'none') return;
    setCollapsed(new Set(groupAgents(sorted, groupBy).map((g) => g.key)));
  };

  const openAgent = (id: string) =>
    navigate(`/history/${id}`, {
      state: { backTo: '/history', agent: agents.find((a) => a.id === id) },
    });

  const hasFilters =
    debouncedSearch.trim() !== '' || facets.unit.length > 0 || facets.platform.length > 0;

  return (
    <div className="rstr-page">
      <header className="rstr-topbar">
        <div className="rstr-topbar-title">
          <span className="rstr-topbar-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="4" y="5" width="16" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
              <rect x="4" y="14" width="16" height="6" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="7.5" cy="8" r="1" fill="currentColor" />
              <circle cx="7.5" cy="17" r="1" fill="currentColor" />
            </svg>
          </span>
          <span className="rstr-topbar-name">Agent History</span>
        </div>
        <div className="rstr-topbar-end">
          <Link to="/" className="rstr-topbar-link">
            <span className="rstr-live-dot" aria-hidden="true" />
            Real-time monitoring
          </Link>
          <LanguageToggle />
        </div>
      </header>
      <RosterCommandBar
        search={search}
        scope={scope}
        onSearchChange={setSearch}
        onScopeChange={setScope}
        facets={facets}
        unitOptions={unitOptions}
        platformOptions={platformOptions}
        onFacetChange={setFacet}
        sortBy={sortBy}
        sortDir={sortDir}
        onSortByChange={setSortBy}
        onToggleSortDir={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        total={agents.length}
        shown={filtered.length}
        loading={loading}
        error={error}
      />
      <RosterActiveFilters facets={facets} onRemove={removeFacetValue} onClearAll={clearAllFacets} />

      <div className="rstr-gallery" ref={scrollRef} onScroll={onScroll}>
        {!loading && filtered.length > 0 && (
          <div className="rstr-gallery-inner" style={{ height: totalH }}>
            {rows.slice(startIndex, endIndex + 1).map((row, idx) => {
              const i = startIndex + idx;
              const top = offsets[i];
              if (row.type === 'group') {
                return (
                  <button
                    key={`g:${row.key}`}
                    type="button"
                    className="rstr-group-row"
                    style={{ transform: `translateY(${top}px)`, height: GROUP_H }}
                    onClick={() => toggleGroup(row.key)}
                    aria-expanded={!row.collapsed}
                  >
                    <svg className={`rstr-group-chevron${row.collapsed ? ' is-collapsed' : ''}`} viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {groupBy === 'unit' && <span className="rstr-group-dot" style={{ backgroundColor: unitDotColor(row.key) }} />}
                    <span className="rstr-group-name">{row.key}</span>
                    <span className="rstr-group-count">{row.count}</span>
                  </button>
                );
              }
              return (
                <div
                  key={`r:${i}`}
                  className="rstr-cards-row"
                  style={{ transform: `translateY(${top}px)`, height: CARD_H, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
                >
                  {row.items.map((a, j) => (
                    <AgentCard
                      key={`${i}-${j}`}
                      agent={a}
                      onOpen={openAgent}
                      hideUnit={groupBy === 'unit'}
                      hidePlatform={groupBy === 'platform'}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {loading && (
          <div className="rstr-gallery-static" aria-hidden="true">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rstr-card rstr-card--skel">
                <div className="rstr-skel-line rstr-skel-line--main" />
                <div className="rstr-skel-line rstr-skel-line--pills" />
                <div className="rstr-skel-line rstr-skel-line--meta" />
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="rstr-empty">
            <svg className="rstr-empty-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
              <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            {agents.length === 0 ? (
              <p className="rstr-empty-title">No agents yet</p>
            ) : (
              <>
                <p className="rstr-empty-title">No matching agents</p>
                <p className="rstr-empty-sub">Try adjusting your search or filters.</p>
                {hasFilters && (
                  <button type="button" className="rstr-empty-clear" onClick={clearAllFilters}>
                    Clear filters
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
