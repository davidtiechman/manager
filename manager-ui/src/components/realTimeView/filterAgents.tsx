import type { AgentResponse } from '../../types/realTimeAgents/agentResponse';
import type {
  AgentPreviewData,
  TableField,
} from '../../types/realTimeAgents/tables';
import {
  toAgentPreview,
  toConfigurationTable,
  toLinkQualityTable,
  toPlatformTable,
  toSyncDetailsTable,
} from '../../types/realTimeAgents/adapter';
import type {
  PlatformSearchField,
  PlatformSearchState,
} from '../../types/realTimeAgents/PlatformSearchField';

type KnownSearchField = Exclude<PlatformSearchField, 'other'>;

export const platformSearchFields: {
  label: string;
  value: KnownSearchField;
}[] = [
  { label: 'Platform ID', value: 'platformId' },
  { label: 'Platform Name', value: 'platformName' },
  { label: 'Unit', value: 'unit' },
  { label: 'Unit Code', value: 'unit_code' },
  { label: 'Zayad ID', value: 'zayad_id' },
  { label: 'Call Sign', value: 'call_sign' },
];

type SearchValueMatch = {
  exists: boolean;
  values: unknown[];
};

function previewToFields(preview: AgentPreviewData): TableField[] {
  return [
    { key: 'id', label: 'ID', value: preview.id },
    { key: 'status', label: 'Status', value: preview.status },
    { key: 'call_sign', label: 'Agent Name', value: preview.call_sign },
    { key: 'unit', label: 'Unit', value: preview.unit },
    { key: 'unit_code', label: 'Unit Code', value: preview.unit_code },
    { key: 'zayad_id', label: 'Zayad ID', value: preview.zayad_id },
    { key: 'platformId', label: 'Platform ID', value: preview.platformId },
  ];
}

function getSearchableFields(agent: AgentResponse): TableField[] {
  return [
    ...previewToFields(toAgentPreview(agent)),
    ...toPlatformTable(agent),
    ...toLinkQualityTable(agent),
    ...toSyncDetailsTable(agent),
    ...toConfigurationTable(agent),
  ];
}

function normalizeSearchFieldName(value: string) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function toDisplayFieldName(fieldName: string) {
  return fieldName
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isMatchingFieldName(input: string, field: TableField) {
  const normalizedInput = normalizeSearchFieldName(input);
  const aliases = [field.key, field.label, toDisplayFieldName(field.key)];

  return aliases.some(
    (alias) => normalizeSearchFieldName(alias) === normalizedInput
  );
}

function findCustomSearchEntry(
  agent: AgentResponse,
  fieldName: string
): SearchValueMatch {
  if (normalizeSearchFieldName(fieldName) === '') {
    return { exists: false, values: [] };
  }

  const values = getSearchableFields(agent)
    .filter((field) => isMatchingFieldName(fieldName, field))
    .map((field) => field.value);

  return {
    exists: values.length > 0,
    values,
  };
}

function stringifySearchValue(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

export function getIsCustomSearchFieldMissing(
  agents: AgentResponse[],
  search: PlatformSearchState
) {
  const customSearchField = search.customField.trim();

  return (
    search.field === 'other' &&
    customSearchField !== '' &&
    agents.length > 0 &&
    !agents.some((agent) =>
      findCustomSearchEntry(agent, customSearchField).exists
    )
  );
}

export function filterAgents(
  agents: AgentResponse[],
  search: PlatformSearchState
) {
  const searchText = search.text.trim().toLowerCase();
  const customSearchField = search.customField.trim();

  return agents.filter((agent) => {
    if (search.field === 'other') {
      if (customSearchField === '') {
        return true;
      }

      const customSearchEntry = findCustomSearchEntry(agent, customSearchField);

      if (!customSearchEntry.exists) {
        return false;
      }

      if (searchText === '') {
        return true;
      }

      return customSearchEntry.values.some((value) =>
        stringifySearchValue(value).toLowerCase().includes(searchText)
      );
    }

    if (searchText === '') {
      return true;
    }

    const selectedField = getSearchableFields(agent).find(
      (field) => field.key === search.field
    );

    return stringifySearchValue(selectedField?.value)
      .toLowerCase()
      .includes(searchText);
  });
}
type AgentsFilterProps = {
  search: PlatformSearchState;
  onSearchChange: React.Dispatch<React.SetStateAction<PlatformSearchState>>;
  isCustomSearchFieldMissing: boolean;
};

export function AgentsFilter({
  search,
  onSearchChange,
  isCustomSearchFieldMissing,
}: AgentsFilterProps) {
  const customSearchField = search.customField.trim();

  return (
    <>
      <div className="filters-box">
        <label>
          <span>Search column</span>

          <select
            value={search.field}
            onChange={(event) =>
              onSearchChange((prev) => ({
                ...prev,
                field: event.target.value as PlatformSearchState['field'],
              }))
            }
          >
            {platformSearchFields.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}

            <option value="other">אחר</option>
          </select>
        </label>

        {search.field === 'other' && (
          <label>
            <span>Column name</span>

            <input
              type="text"
              placeholder="Unit, Platform ID, selectedLink..."
              value={search.customField}
              onChange={(event) =>
                onSearchChange((prev) => ({
                  ...prev,
                  customField: event.target.value,
                }))
              }
            />
          </label>
        )}

        <label className="agent-free-text-filter">
          <span>Free text</span>

          <input
            type="search"
            placeholder="Type to filter"
            value={search.text}
            onChange={(event) =>
              onSearchChange((prev) => ({
                ...prev,
                text: event.target.value,
              }))
            }
          />
        </label>
      </div>

      {isCustomSearchFieldMissing && (
        <p className="filter-message" role="alert">
          העמודה "{customSearchField}" לא קיימת.
        </p>
      )}
    </>
  );
}