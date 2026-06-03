import {
  SCOPE_OPTIONS, GROUP_BY_OPTIONS, SORT_OPTIONS,
  type RosterScope, type RosterGroupBy, type RosterFacets, type RosterSortKey,
} from './rosterSearch';
import RosterFacet from './RosterFacet';
import RosterSelect from './RosterSelect';

interface RosterCommandBarProps {
  search: string;
  scope: RosterScope;
  onSearchChange: (value: string) => void;
  onScopeChange: (scope: RosterScope) => void;
  facets: RosterFacets;
  unitOptions: string[];
  platformOptions: string[];
  onFacetChange: (key: keyof RosterFacets, values: string[]) => void;
  sortBy: RosterSortKey;
  sortDir: 'asc' | 'desc';
  onSortByChange: (key: RosterSortKey) => void;
  onToggleSortDir: () => void;
  groupBy: RosterGroupBy;
  onGroupByChange: (groupBy: RosterGroupBy) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  total: number;
  shown: number;
  loading: boolean;
  error: string | null;
}

// Top command bar: search + scope, Unit/Platform facets, sort, group-by, and the result count.
export default function RosterCommandBar({
  search, scope, onSearchChange, onScopeChange,
  facets, unitOptions, platformOptions, onFacetChange,
  sortBy, sortDir, onSortByChange, onToggleSortDir,
  groupBy, onGroupByChange, onExpandAll, onCollapseAll,
  total, shown, loading, error,
}: RosterCommandBarProps) {
  const placeholder =
    SCOPE_OPTIONS.find((o) => o.value === scope)?.placeholder ?? 'Search…';
  const isFiltered = shown !== total; // search and/or facets narrowing

  let count: string;
  if (error) count = error;
  else if (loading) count = 'Loading…';
  else if (isFiltered) count = `${shown.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} agents`;
  else count = `${total.toLocaleString('en-US')} agents`;

  return (
    <div className="rstr-cmdbar">
      <div className="rstr-search">
        <svg className="rstr-search-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          className="rstr-search-input"
          value={search}
          placeholder={placeholder}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search agents"
        />
        <span className="rstr-scope-label">in</span>
        <RosterSelect
          value={scope}
          options={SCOPE_OPTIONS}
          onChange={(v) => onScopeChange(v as RosterScope)}
          ariaLabel="Search scope"
          triggerClassName="rstr-scope-trigger"
          align="right"
        />
      </div>
      <div className="rstr-facets">
        <RosterFacet
          label="Unit"
          options={unitOptions}
          selected={facets.unit}
          onChange={(v) => onFacetChange('unit', v)}
        />
        <RosterFacet
          label="Platform"
          options={platformOptions}
          selected={facets.platform}
          onChange={(v) => onFacetChange('platform', v)}
        />
      </div>
      <div className="rstr-cmdbar-right">
        <div className="rstr-sort">
          <span className="rstr-ctl-label">Sort by</span>
          <RosterSelect
            value={sortBy}
            options={SORT_OPTIONS}
            onChange={(v) => onSortByChange(v as RosterSortKey)}
            ariaLabel="Sort by"
            align="right"
          />
          <button
            type="button"
            className="rstr-ctl rstr-sort-dir"
            onClick={onToggleSortDir}
            aria-label={`Sort direction: ${sortDir === 'asc' ? 'ascending' : 'descending'}`}
            title="Toggle sort direction"
          >
            <svg viewBox="0 0 16 16" fill="none" className={sortDir === 'desc' ? 'is-desc' : ''} aria-hidden="true">
              <path d="M8 3v10M8 3L4.5 6.5M8 3l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="rstr-groupby">
          <span className="rstr-ctl-label">Group by</span>
          <RosterSelect
            value={groupBy}
            options={GROUP_BY_OPTIONS}
            onChange={(v) => onGroupByChange(v as RosterGroupBy)}
            ariaLabel="Group by"
            align="right"
          />
        </div>
        {groupBy !== 'none' && (
          <div className="rstr-bulk">
            <button type="button" className="rstr-ctl" onClick={onExpandAll}>Expand all</button>
            <button type="button" className="rstr-ctl" onClick={onCollapseAll}>Collapse all</button>
          </div>
        )}
        <div className="rstr-count">{count}</div>
      </div>
    </div>
  );
}
