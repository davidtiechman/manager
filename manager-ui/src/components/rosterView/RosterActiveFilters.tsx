import { useTranslation } from 'react-i18next';
import type { RosterFacets } from './rosterSearch';

interface RosterActiveFiltersProps {
  facets: RosterFacets;
  onRemove: (key: keyof RosterFacets, value: string) => void;
  onClearAll: () => void;
}

// Row of removable chips for the active facet selections, with Clear all.
export default function RosterActiveFilters({ facets, onRemove, onClearAll }: RosterActiveFiltersProps) {
  const { t } = useTranslation('roster');
  const facetLabel = (key: keyof RosterFacets) => t(`facets.${key}`);

  const chips = (Object.keys(facets) as (keyof RosterFacets)[]).flatMap((key) =>
    facets[key].map((value) => ({ key, value }))
  );
  if (chips.length === 0) return null;

  return (
    <div className="rstr-activefilters">
      {chips.map(({ key, value }) => (
        <button
          key={`${key}:${value}`}
          type="button"
          className="rstr-filter-chip"
          onClick={() => onRemove(key, value)}
          title={t('activeFilters.remove', { label: facetLabel(key), value })}
        >
          {facetLabel(key)}: {value}
          <span className="rstr-filter-chip-x" aria-hidden="true">×</span>
        </button>
      ))}
      <button type="button" className="rstr-clear-all" onClick={onClearAll}>
        {t('activeFilters.clearAll')}
      </button>
    </div>
  );
}
