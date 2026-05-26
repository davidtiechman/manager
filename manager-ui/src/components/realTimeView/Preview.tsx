import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { AgentResponse } from '../../types/realTimeAgents/agentResponse';
import type {AgentPreviewData,ConfigurationTableData,} from '../../types/realTimeAgents/tables';
import { toAgentPreview, toPlatformTable } from '../../types/realTimeAgents/adapter';
import Details from './AgentDetails';
import { ApiService } from '../../api';
import TankIcon from '../agent-details/TankIcon';
import ModeNavigationLink from '../ModeNavigationLink';
import type {PlatformSearchField,PlatformSearchState,} from '../../types/realTimeAgents/PlatformSearchField';

const intervalFetchManager = Number(import.meta.env.VITE_FETCH_INTERVAL) || 10_000;

type ViewMode = 'icon' | 'list';
type KnownSearchField = Exclude<PlatformSearchField, 'other'>;

const platformSearchFields: { label: string; value: KnownSearchField }[] = [
  { label: 'Platform ID', value: 'platformId' },
  { label: 'Platform Name', value: 'platformName' },
  { label: 'Unit', value: 'unit' },
  { label: 'Unit Code', value: 'unit_code' },
  { label: 'Zayad ID', value: 'zayad_id' },
  { label: 'Call Sign', value: 'call_sign' },
];

type SearchValueMatch = {
  exists: boolean;
  value: unknown;
};

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
  const normalizedField = field.trim().toLowerCase();

  if (normalizedField === '') {
    return { exists: false, value: undefined };
  }

  const platformFields = toPlatformTable(agent);
  const platformField = Object.keys(platformFields).find(
    (key) => key.toLowerCase() === normalizedField
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
    const normalizedKey = key.toLowerCase();
    return (
      normalizedKey === normalizedField ||
      normalizedKey.split('.').pop() === normalizedField
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

function stringifySearchValue(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

export default function Preview() {
  const [agents, setAgents] = useState<AgentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('icon');
  const [isConfigurationEditing, setIsConfigurationEditing] = useState(false);
  const [configurationMessage, setConfigurationMessage] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [search, setSearch] = useState<PlatformSearchState>({
    field: 'unit',
    customField: '',
    text: '',
  });
  const isConfigurationEditingRef = useRef(isConfigurationEditing);
  const { agentId: routeAgentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const customSearchField = search.customField.trim();
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
        return false;
      }

      if (searchText === '') {
        return true;
      }

      return stringifySearchValue(customSearchEntry.value)
        .toLowerCase()
        .includes(searchText);
    }

    if (searchText === '') {
      return true;
    }

    const platformFields = toPlatformTable(agent);
    return stringifySearchValue(platformFields[search.field])
      .toLowerCase()
      .includes(searchText);
  });

  useEffect(() => {
    isConfigurationEditingRef.current = isConfigurationEditing;
  }, [isConfigurationEditing]);

  useEffect(() => {
    if (routeAgentId) {
      setSelectedAgentId(routeAgentId);
    }
  }, [routeAgentId]);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const data: AgentResponse[] = await ApiService.getAgents();
        if (isConfigurationEditingRef.current) {
          return;
        }

        setAgents(data);
      } catch (err) {
        console.error('Error fetching agents:', err);
      } finally {
        if (!isConfigurationEditingRef.current) {
          setLoading(false);
        }
      }
    };

    if (isConfigurationEditing) {
      return;
    }

    fetchAgents();

    const intervalId = setInterval(fetchAgents, intervalFetchManager);
    return () => {
      clearInterval(intervalId);
    };
  }, [isConfigurationEditing]);

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);

  const updateAgentConfiguration = (
    agentId: string,
    configuration: ConfigurationTableData
  ) => {
    setAgents((currentAgents) =>
      currentAgents.map((agent) => {
        if (agent.id !== agentId) {
          return agent;
        }

        return {
          ...agent,
          status: {
            ...agent.status,
            details: {
              ...agent.status.details,
              selectedLink: configuration.selectedLink,
              schedulerMode: configuration.schedulerMode,
            },
          },
          configuration,
        };
      })
    );
  };

  function getAgentLabel(agent: AgentPreviewData) {
    return agent.call_sign || agent.zayad_id || agent.unit_code || agent.id;
  }

  if (loading) {
    return (
      <div className="dashboard-layout">
        <div className="page-header">
          <ModeNavigationLink
            to="/history"
            label="למעבר להיסטוריה"
            variant="history"
          />
          <h1>ניטור סוכנים בזמן אמת</h1>
          <p className="muted">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="top-bar">
        <ModeNavigationLink
          to="/history"
          label="למעבר להיסטוריה"
          variant="history"
          />
        </div>

      <div className="page-header">
        <h1>ניטור סוכנים בזמן אמת</h1>

        <p className="muted">
          {viewMode === 'icon'
            ? 'לחץ על אייקון כדי לראות פרטים'
            : 'לחץ על שורה כדי לראות פרטים'}
        </p>
        {!selectedAgent && (
        <div className="view-toggle" role="group" aria-label="בחירת תצוגה">
          <button
            type="button"
            className={`view-toggle-button ${viewMode === 'icon' ? 'active' : ''}`}
            onClick={() => setViewMode('icon')}
          >
            אייקונים
          </button>

          <button
            type="button"
            className={`view-toggle-button ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            רשימה
          </button>
        </div>
)}
      </div>
      <div className={`home-layout ${
        selectedAgent ? 'has-selected-agent' : 'no-selected-agent'}`}
        style={

          selectedAgent
          ? {gridTemplateColumns: `${sidebarWidth}px 6px minmax(0, 1fr)`}
          : undefined
        }
      >
        <aside className="agents-sidebar">
        <div className="filters-box">
  <label>
    <span>Search column</span>
    <select
      value={search.field}
      onChange={(event) =>
        setSearch((prev) => ({
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
        placeholder="unit, status.status, selectedLink..."
        value={search.customField}
        onChange={(event) =>
          setSearch((prev) => ({
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
        setSearch((prev) => ({
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

<div
  className={`agents-grid ${
    !selectedAgent && viewMode === 'list' ? 'agents-list' : ''
  }`}
>
  {filteredAgents.map((agent) => {
    const previewAgent = toAgentPreview(agent);

    return (
      <button
        key={previewAgent.id}
        type="button"
        className={`agent-card ${previewAgent.status} ${
          !selectedAgent && viewMode === 'list' ? 'list-view' : ''
        } ${selectedAgentId === previewAgent.id ? 'selected' : ''}`}
        onClick={() => {
          setSelectedAgentId(previewAgent.id);
          setConfigurationMessage('');
          navigate(`/agents/${previewAgent.id}`);
        }}
      >
        <div className="tank-icon">
          <TankIcon status={previewAgent.status} />
        </div>

        <div className="agent-content">
          <div className="agent-label">{getAgentLabel(previewAgent)}</div>

          <div className="agent-info">
            <div className="info-item">ID: {previewAgent.id}</div>
            <div className="info-item">סטטוס: {previewAgent.status}</div>
            <div className="info-item">שם סוכן: {previewAgent.call_sign}</div>
            <div className="info-item">יחידה: {previewAgent.unit}</div>
            <div className="info-item">
              פלטפורמה ID: {previewAgent.platformId}
            </div>
            <div className="info-item">צייד ID: {previewAgent.zayad_id}</div>
          </div>
        </div>
      </button>
    );
  })}
</div>
</aside>

{selectedAgent && (
  <>
    <div
      className="resize-handle"
      onMouseDown={(event) => {
        event.preventDefault();

        const startX = event.clientX;
        const startWidth = sidebarWidth;

        const handleMouseMove = (moveEvent: MouseEvent) => {
          const nextWidth = startWidth + (moveEvent.clientX - startX);
          const limitedWidth = Math.min(Math.max(nextWidth, 120), 500);
          setSidebarWidth(limitedWidth);
        };

        const handleMouseUp = () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
      }}
    />

    <main className="details-pane">
      <Details
        agent={selectedAgent}
        onClose={() => {
          setSelectedAgentId(null);
          setIsConfigurationEditing(false);
          setConfigurationMessage('');
          navigate('/');
        }}
        onConfigurationEditChange={setIsConfigurationEditing}
        onConfigurationSaved={updateAgentConfiguration}
        configurationMessage={configurationMessage}
        onConfigurationMessageChange={setConfigurationMessage}
      />
    </main>
  </>
)}
</div>
</div>
);
}