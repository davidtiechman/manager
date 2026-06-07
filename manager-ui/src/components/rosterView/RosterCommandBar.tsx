import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getScopeOptions, getGroupByOptions, getSortOptions,
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
  const { t } = useTranslation('roster');
  const scopeOptions = useMemo(() => getScopeOptions(t), [t]);
  const sortOptions = useMemo(() => getSortOptions(t), [t]);
  const groupByOptions = useMemo(() => getGroupByOptions(t), [t]);

  const placeholder =
    scopeOptions.find((o) => o.value === scope)?.placeholder ?? t('search.fallbackPlaceholder');
  const isFiltered = shown !== total; // search and/or facets narrowing

  let count: string;
  if (error) count = error;
  else if (loading) count = t('count.loading');
  else if (isFiltered)
    count = t('count.filtered', {
      shown: shown.toLocaleString('en-US'),
      total: total.toLocaleString('en-US'),
    });
  else count = t('count.agents', { n: total.toLocaleString('en-US') });

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
          aria-label={t('search.ariaSearch')}
        />
        <span className="rstr-scope-label">{t('search.in')}</span>
        <RosterSelect
          value={scope}
          options={scopeOptions}
          onChange={(v) => onScopeChange(v as RosterScope)}
          ariaLabel={t('search.ariaScope')}
          triggerClassName="rstr-scope-trigger"
          align="right"
        />
      </div>
      <div className="rstr-facets">
        <RosterFacet
          label={t('facets.unit')}
          options={unitOptions}
          selected={facets.unit}
          onChange={(v) => onFacetChange('unit', v)}
        />
        <RosterFacet
          label={t('facets.platform')}
          options={platformOptions}
          selected={facets.platform}
          onChange={(v) => onFacetChange('platform', v)}
        />
      </div>
      <div className="rstr-cmdbar-right">
        <div className="rstr-sort">
          <span className="rstr-ctl-label">{t('sort.label')}</span>
          <RosterSelect
            value={sortBy}
            options={sortOptions}
            onChange={(v) => onSortByChange(v as RosterSortKey)}
            ariaLabel={t('sort.label')}
            align="right"
          />
          <button
            type="button"
            className="rstr-ctl rstr-sort-dir"
            onClick={onToggleSortDir}
            aria-label={sortDir === 'asc' ? t('sort.ariaAsc') : t('sort.ariaDesc')}
            title={t('sort.toggleTitle')}
          >
            <svg viewBox="0 0 16 16" fill="none" className={sortDir === 'desc' ? 'is-desc' : ''} aria-hidden="true">
              <path d="M8 3v10M8 3L4.5 6.5M8 3l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="rstr-groupby">
          <span className="rstr-ctl-label">{t('group.label')}</span>
          <RosterSelect
            value={groupBy}
            options={groupByOptions}
            onChange={(v) => onGroupByChange(v as RosterGroupBy)}
            ariaLabel={t('group.label')}
            align="right"
          />
        </div>
        {groupBy !== 'none' && (
          <div className="rstr-bulk">
            <button type="button" className="rstr-ctl" onClick={onExpandAll}>{t('bulk.expandAll')}</button>
            <button type="button" className="rstr-ctl" onClick={onCollapseAll}>{t('bulk.collapseAll')}</button>
          </div>
        )}
        <div className="rstr-count">{count}</div>
      </div>
    </div>
  );
}
