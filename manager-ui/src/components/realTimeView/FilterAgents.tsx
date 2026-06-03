import { useEffect, useState, type ReactNode } from 'react';
import type { AgentResponse } from '../../types/realTimeAgents/agentResponse';
import { toPlatformTable } from '../../types/realTimeAgents/adapter';
import {
  agentFilterFields,
  type AgentFilterField,
  type AgentFilterFieldGroup,
  type AgentSearchState,
} from '../../types/realTimeAgents/agentFilterFields';

type FilterAgentsProps = {
  agents: AgentResponse[];
  children: (
    filteredAgents: AgentResponse[],
    statusFilter: ReactNode,
    filtersPanel: ReactNode
  ) => ReactNode;
};

type SearchValueMatch = {
  exists: boolean;
  value: unknown;
};

const filterFieldGroups: {
  label: string;
  value: AgentFilterFieldGroup;
  priority?: boolean;
}[] = [
  { label: 'Platform', value: 'Platform', priority: true },
  { label: 'Live Status', value: 'Live Status' },
  { label: 'Link Quality', value: 'Link Quality' },
  { label: 'Configuration', value: 'Configuration' },
];

const SEARCH_DEBOUNCE_MS = Number(import.meta.env.VITE_SEARCH_DEBOUNCE_SECONDS) || 2000;

function stringifySearchValue(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function isStatusField(field: AgentFilterField | undefined) {
  return field?.value === 'status';
}

function normalizeSearchKey(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function getNestedEntry(source: unknown, path: string): SearchValueMatch {
  if (!source || typeof source !== 'object') {
    return { exists: false, value: undefined };
  }

  return path.split('.').reduce<SearchValueMatch>((current, key) => {
    if (!current.exists) {
      return current;
    }

    const value = current.value;

    if (!value || typeof value !== 'object') {
      return { exists: false, value: undefined };
    }

    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      return { exists: false, value: undefined };
    }

    return {
      exists: true,
      value: (value as Record<string, unknown>)[key],
    };
  }, { exists: true, value: source });
}

function flattenValues(
  source: unknown,
  prefix = ''
): { key: string; value: unknown }[] {
  if (!source || typeof source !== 'object') {
    return [];
  }

  return Object.entries(source as Record<string, unknown>).flatMap(
    ([key, value]) => {
      const nextKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !(value instanceof Date)) {
        return [
          { key: nextKey, value },
          ...flattenValues(value, nextKey),
        ];
      }

      return [{ key: nextKey, value }];
    }
  );
}

function findCustomSearchEntry(
  agent: AgentResponse,
  field: string
): SearchValueMatch {
  const normalizedField = normalizeSearchKey(field);

  if (normalizedField === '') {
    return { exists: false, value: undefined };
  }

  const platformFields = toPlatformTable(agent);
  const platformField = Object.keys(platformFields).find(
    (key) => normalizeSearchKey(key) === normalizedField
  );

  if (platformField) {
    return {
      exists: true,
      value: platformFields[platformField as keyof typeof platformFields],
    };
  }

  const pathEntry = getNestedEntry(agent, field);
  if (pathEntry.exists) {
    return pathEntry;
  }

  const flattenedEntry = flattenValues(agent).find(({ key }) => {
    const normalizedKey = normalizeSearchKey(key);
    const normalizedLastKey = normalizeSearchKey(key.split('.').pop() ?? '');

    return (
      normalizedKey === normalizedField ||
      normalizedLastKey === normalizedField
    );
  });

  if (flattenedEntry) {
    return {
      exists: true,
      value: flattenedEntry.value,
    };
  }

  return { exists: false, value: undefined };
}

export default function FilterAgents({
  agents,
  children,
}: FilterAgentsProps) {
  const [activeFilterGroup, setActiveFilterGroup] =
    useState<AgentFilterFieldGroup | null>(null);
  const [openFilterGroup, setOpenFilterGroup] =
    useState<AgentFilterFieldGroup | null>(null);
  const [search, setSearch] = useState<AgentSearchState>({
    field: 'other',
    customField: '',
    text: '',
  });
  const [draftSearch, setDraftSearch] = useState<AgentSearchState>({
    field: 'other',
    customField: '',
    text: '',
  });

  const statusFilterField = agentFilterFields.find(
    (field) => field.value === 'status'
  );
  const selectedFilterField = agentFilterFields.find(
    (field) => field.value === search.field
  );
  const selectedDraftFilterField = agentFilterFields.find(
    (field) => field.value === draftSearch.field
  );
  const isOtherField = draftSearch.field === 'other';
  const selectedCategoryField = isStatusField(selectedDraftFilterField) || isOtherField
    ? undefined
    : selectedDraftFilterField;
  const activeGroupFields = agentFilterFields.filter(
    (field) => field.group === activeFilterGroup && field.value !== 'status'
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(draftSearch);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [draftSearch]);

  const customSearchField = search.customField.trim();
  const searchText = search.text.trim();
  const isSearchActive =
    searchText !== '' ||
    (search.field === 'other' && customSearchField !== '');
  const isCustomSearchFieldMissing =
    search.field === 'other' &&
    customSearchField !== '' &&
    agents.length > 0 &&
    !agents.some((agent) =>
      findCustomSearchEntry(agent, customSearchField).exists
    );

  const matchedAgents = agents.filter((agent) => {
    const searchText = search.text.trim().toLowerCase();

    if (search.field === 'other') {
      if (customSearchField === '') {
        return true;
      }

      const customSearchEntry = findCustomSearchEntry(agent, customSearchField);
      if (!customSearchEntry.exists) {
        return isCustomSearchFieldMissing;
      }

      if (searchText === '') {
        return true;
      }

      return stringifySearchValue(customSearchEntry.value)
        .toLowerCase()
        .includes(searchText);
    }

    if (!selectedFilterField || searchText === '') {
      return true;
    }

    const value = selectedFilterField.getValue(agent);

    if (selectedFilterField.kind === 'enum') {
      return stringifySearchValue(value) === search.text;
    }

    return stringifySearchValue(value)
      .toLowerCase()
      .includes(searchText);
  });

  const hasNoSearchResults =
    isSearchActive && matchedAgents.length === 0 && !isCustomSearchFieldMissing;
  const filteredAgents = hasNoSearchResults ? agents : matchedAgents;

  const appliedFilterField = agentFilterFields.find(
    (field) => field.value === search.field
  );
  const appliedFilterLabel =
    !isSearchActive
      ? 'No filter'
      : search.field === 'other'
        ? search.customField.trim() || 'Other'
        : appliedFilterField?.label ?? 'Field';
  const appliedFilterValue =
    !isSearchActive
      ? 'All'
      : search.field === 'other'
        ? search.text.trim() || 'All'
        : search.text.trim() || 'All';

  const clearSearch = () => {
    const nextSearch: AgentSearchState = {
      field: 'other',
      customField: '',
      text: '',
    };

    setActiveFilterGroup(null);
    setOpenFilterGroup(null);
    setDraftSearch(nextSearch);
    setSearch(nextSearch);
  };

  const statusFilter =
    statusFilterField?.kind === 'enum' ? (
      <div className="filter-section filter-section-status">
        <span className="filter-section-title">Status</span>
        <div
          className="status-filter-dots"
          role="group"
          aria-label="Status filter"
        >
          <button
            type="button"
            className={`status-filter-dot all ${
              !isStatusField(selectedDraftFilterField) || draftSearch.text === ''
                ? 'selected'
                : ''
            }`}
            onClick={() => {
              const nextSearch: AgentSearchState = {
                ...draftSearch,
                field: 'other',
                customField: '',
                text: '',
              };

              setActiveFilterGroup(null);
              setDraftSearch(nextSearch);
              setSearch(nextSearch);
              setOpenFilterGroup(null);
            }}
            title="All agents"
          >
            <span className="status-filter-dot-mark" />
            <span className="status-filter-dot-label">All</span>
          </button>

          {statusFilterField.options.map((option) => (
            <button
              key={option}
              type="button"
              className={`status-filter-dot status-${option.toLowerCase()} ${
                draftSearch.field === 'status' && draftSearch.text === option
                  ? 'selected'
                  : ''
              }`}
              onClick={() => {
                const nextSearch: AgentSearchState = {
                  ...draftSearch,
                  field: 'status',
                  text: option,
                };

                setDraftSearch(nextSearch);
                setSearch(nextSearch);
                setOpenFilterGroup(null);
              }}
              title={option}
            >
              <span className="status-filter-dot-mark" />
              <span className="status-filter-dot-label">{option}</span>
            </button>
          ))}
        </div>
      </div>
    ) : null;

  const filtersPanel = (
    <>
      <div className="filters-box">
        <div className="filter-section filter-section-groups">
          <span className="filter-section-title">Filter group</span>
          <div className="filter-chip-group" role="group" aria-label="Filter group">
            {filterFieldGroups.map((group) => (
              <button
                key={group.value}
                type="button"
                className={`filter-chip filter-group-chip ${
                  group.priority ? 'priority' : ''
                } ${activeFilterGroup === group.value ? 'active' : ''}`}
                onClick={() => {
                  if (openFilterGroup === group.value) {
                    setOpenFilterGroup(null);
                    return;
                  }

                  const defaultGroupField =
                    group.value === 'Platform'
                      ? agentFilterFields.find((field) => field.value === 'unit')
                      : agentFilterFields.find(
                          (field) =>
                            field.group === group.value && field.value !== 'status'
                        );

                  setActiveFilterGroup(group.value);
                  setOpenFilterGroup(group.value);
                  setDraftSearch((currentSearch) => ({
                    ...currentSearch,
                    field: defaultGroupField?.value ?? currentSearch.field,
                    text: '',
                  }));
                }}
              >
                {group.label}
              </button>
            ))}
          </div>

          {openFilterGroup && (
            <div className="filter-popover" role="dialog" aria-label="Filter fields">
              <div className="filter-popover-header">
                <span className="filter-section-title">{openFilterGroup}</span>
                <button
                  type="button"
                  className="filter-popover-close"
                  onClick={() => setOpenFilterGroup(null)}
                  aria-label="Close filter fields"
                >
                  ×
                </button>
              </div>

              <div className="filter-section filter-section-fields">
                <span className="filter-label-row">
                  <span className="filter-section-title">Field</span>
                  {selectedCategoryField?.group === 'Configuration' && (
                    <span className="filter-field-context">Configuration field</span>
                  )}
                </span>
                <div className="filter-chip-group" role="group" aria-label="Filter field">
                  {activeGroupFields.map((field) => (
                    <button
                      key={field.value}
                      type="button"
                      className={`filter-chip filter-field-chip ${
                        draftSearch.field === field.value ? 'active' : ''
                      }`}
                      onClick={() => {
                        const nextSearch: AgentSearchState = {
                          ...draftSearch,
                          field: field.value,
                          text: '',
                        };

                        setDraftSearch(nextSearch);
                        setSearch(nextSearch);
                      }}
                    >
                      {field.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`filter-chip filter-field-chip ${
                      draftSearch.field === 'other' ? 'active' : ''
                    }`}
                    onClick={() => {
                      const nextSearch: AgentSearchState = {
                        ...draftSearch,
                        field: 'other',
                        text: '',
                      };

                      setDraftSearch(nextSearch);
                      setSearch(nextSearch);
                    }}
                  >
                    Other
                  </button>
                </div>
              </div>

              {draftSearch.field === 'other' && (
                <label className="filter-section filter-custom-field">
                  <span className="filter-label-row">
                    <span className="filter-section-title">Other field</span>
                    <span className="filter-selected-field">{activeFilterGroup}</span>
                  </span>
                  <input
                    type="text"
                    placeholder="unit, status.status, selectedLink..."
                    value={draftSearch.customField}
                    onChange={(event) =>
                      setDraftSearch((prev) => ({
                        ...prev,
                        customField: event.target.value,
                      }))
                    }
                  />
                </label>
              )}

              {selectedCategoryField && (
                <label className="agent-free-text-filter">
                  <span className="filter-label-row">
                    <span>{selectedCategoryField.kind === 'enum' ? 'Value' : 'Search value'}</span>
                    <span className="filter-selected-field">{selectedCategoryField.label}</span>
                  </span>
                  {selectedCategoryField.kind === 'enum' ? (
                    <div
                      className="filter-chip-group filter-value-chip-group"
                      role="group"
                      aria-label="Filter value"
                    >
                      <button
                        type="button"
                        className={`filter-chip filter-value-chip ${
                          draftSearch.text === '' ? 'active' : ''
                        }`}
                        onClick={() => {
                          const nextSearch: AgentSearchState = {
                            ...draftSearch,
                            text: '',
                          };

                          setDraftSearch(nextSearch);
                          setSearch(nextSearch);
                          setOpenFilterGroup(null);
                        }}
                      >
                        All
                      </button>
                      {selectedCategoryField.options.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`filter-chip filter-value-chip ${
                            draftSearch.text === option ? 'active' : ''
                          }`}
                          onClick={() => {
                            const nextSearch: AgentSearchState = {
                              ...draftSearch,
                              text: option,
                            };

                            setDraftSearch(nextSearch);
                            setSearch(nextSearch);
                            setOpenFilterGroup(null);
                          }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="search"
                      placeholder="Type to filter"
                      value={draftSearch.text}
                      onChange={(event) =>
                        setDraftSearch((prev) => ({
                          ...prev,
                          text: event.target.value,
                        }))
                      }
                    />
                  )}
                </label>
              )}

              {draftSearch.field === 'other' && (
                <label className="agent-free-text-filter">
                  <span className="filter-label-row">
                    <span>Search value</span>
                    <span className="filter-selected-field">Other</span>
                  </span>
                  <input
                    type="search"
                    placeholder="Type to filter"
                    value={draftSearch.text}
                    onChange={(event) =>
                      setDraftSearch((prev) => ({
                        ...prev,
                        text: event.target.value,
                      }))
                    }
                  />
                </label>
              )}

              {(isCustomSearchFieldMissing || hasNoSearchResults) && (
                <div className="filter-popover-message">
                  {isCustomSearchFieldMissing && (
                    <p className="filter-message" role="alert">
                      העמודה "{customSearchField}" לא קיימת.
                    </p>
                  )}
                  {hasNoSearchResults && (
                    <p className="filter-message" role="status">
                      No search results.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {isSearchActive && (
          <div className="filter-active-summary" aria-live="polite">
            <span className="filter-active-pill">
              <span className="filter-active-field">{appliedFilterLabel}</span>
              <span className="filter-active-divider" aria-hidden="true" />
              <span className="filter-active-value">{appliedFilterValue}</span>
            </span>
            <button
              type="button"
              className="filter-clear-button"
              onClick={clearSearch}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {!openFilterGroup && isCustomSearchFieldMissing && (
        <p className="filter-message" role="alert">
          העמודה "{customSearchField}" לא קיימת.
        </p>
      )}

      {!openFilterGroup && hasNoSearchResults && (
        <p className="filter-message" role="status">
          No search results.
        </p>
      )}

      <div className="agents-results-summary" aria-live="polite">
        <span className="agents-results-label">Agents</span>
        <span className="agents-results-count">
          {isSearchActive ? `${filteredAgents.length} / ${agents.length}` : agents.length}
        </span>
      </div>
    </>
  );

  return <>{children(filteredAgents, statusFilter, filtersPanel)}</>;
}
