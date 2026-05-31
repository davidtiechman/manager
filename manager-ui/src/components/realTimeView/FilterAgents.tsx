import { useEffect, useState, type ReactNode } from 'react';
import type { AgentResponse } from '../../types/realTimeAgents/agentResponse';
import { toPlatformTable } from '../../types/realTimeAgents/adapter';
import {agentFilterFields,type AgentSearchState,} from '../../types/realTimeAgents/agentFilterFields';

type FilterAgentsProps = {
  agents: AgentResponse[];
  children: (filteredAgents: AgentResponse[]) => ReactNode;
};

type SearchValueMatch = {
  exists: boolean;
  value: unknown;
};

const filterFieldGroups = [
  'Platform',
  'Live Status',
  'Link Quality',
  'Configuration',
] as const;
const SEARCH_DEBOUNCE_MS =Number(import.meta.env.VITE_SEARCH_DEBOUNCE_SECONDS) || 2000;

function stringifySearchValue(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
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
  const [search, setSearch] = useState<AgentSearchState>({
    field: 'unit',
    customField: '',
    text: '',
  });
  const [draftSearch, setDraftSearch] = useState<AgentSearchState>({
    field: 'unit',
    customField: '',
    text: '',
  });

  const selectedFilterField = agentFilterFields.find(
    (field) => field.value === search.field
  );
  const selectedDraftFilterField = agentFilterFields.find(
    (field) => field.value === draftSearch.field
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
  const isSearchActive =
    search.text.trim() !== '' ||
    (search.field === 'other' && customSearchField !== '');
  const isCustomSearchFieldMissing =
    search.field === 'other' &&
    customSearchField !== '' &&
    agents.length > 0 &&
    !agents.some((agent) =>
      findCustomSearchEntry(agent, customSearchField).exists
    );

  const filteredAgents = agents.filter((agent) => {
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

  return (
    <>
      <div className="filters-box">
        <label>
          <span className="filter-label-row">
            <span>Search column</span>
            {selectedDraftFilterField?.group === 'Configuration' && (
              <span className="filter-field-context">Configuration field</span>
            )}
          </span>
          <select
            value={draftSearch.field}
            onChange={(event) => {
              const nextSearch = {
                ...draftSearch,
                field: event.target.value as AgentSearchState['field'],
                text: '',
              };

              setDraftSearch(nextSearch);
              setSearch(nextSearch);
            }}
          >
            {filterFieldGroups.map((group) => (
              <optgroup key={group} label={group}>
                {agentFilterFields
                  .filter((field) => field.group === group)
                  .map((field) => (
                    <option key={field.value} value={field.value}>
                      {field.label}
                    </option>
                  ))}
              </optgroup>
            ))}
            <option value="other">אחר</option>
          </select>
        </label>

        {draftSearch.field === 'other' && (
          <label>
            <span>Column name</span>
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

        <label className="agent-free-text-filter">
          <span className="filter-label-row">
            <span>{selectedDraftFilterField?.kind === 'enum' ? 'Value' : 'Free text'}</span>
            {selectedDraftFilterField && (
              <span className="filter-selected-field">{selectedDraftFilterField.label}</span>
            )}
          </span>
          {selectedDraftFilterField?.kind === 'enum' ? (
            <select
              value={draftSearch.text}
              onChange={(event) => {
                const nextSearch = {
                  ...draftSearch,
                  text: event.target.value,
                };

                setDraftSearch(nextSearch);
                setSearch(nextSearch);
              }}
            >
              <option value="">All</option>
              {selectedDraftFilterField.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
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
      </div>

      {isCustomSearchFieldMissing && (
        <p className="filter-message" role="alert">
          העמודה "{customSearchField}" לא קיימת.
        </p>
      )}

      <div className="agents-results-summary" aria-live="polite">
        <span className="agents-results-label">Agents</span>
        <span className="agents-results-count">
          {isSearchActive ? `${filteredAgents.length} / ${agents.length}` : agents.length}
        </span>
      </div>

      {children(filteredAgents)}
    </>
  );
}
