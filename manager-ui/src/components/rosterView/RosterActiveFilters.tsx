import type { RosterFacets } from './rosterSearch';

interface RosterActiveFiltersProps {
  facets: RosterFacets;
  onRemove: (key: keyof RosterFacets, value: string) => void;
  onClearAll: () => void;
}

const FACET_LABELS: Record<keyof RosterFacets, string> = {
  unit: 'Unit',
  platform: 'Platform',
};

// Row of removable chips for the active facet selections, with Clear all.
export default function RosterActiveFilters({ facets, onRemove, onClearAll }: RosterActiveFiltersProps) {
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
          title={`Remove ${FACET_LABELS[key]}: ${value}`}
        >
          {FACET_LABELS[key]}: {value}
          <span className="rstr-filter-chip-x" aria-hidden="true">×</span>
        </button>
      ))}
      <button type="button" className="rstr-clear-all" onClick={onClearAll}>Clear all</button>
    </div>
  );
}
