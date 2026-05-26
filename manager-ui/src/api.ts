import type { AgentResponse } from './types/realTimeAgents/agentResponse';
import type { AgentHistoryRecord } from './types/history/agentHistoryRecord';
import type { HistoryAgent } from './types/history/historyAgent';
import type { ConfigurationPayload } from './types/realTimeAgents/tables';
import { MOCK_AGENTS } from './MOCK_AGENT';

export interface SyncsIrmParams {
  startRow: number;
  endRow: number;
  sortModel?: Array<{ colId: string; sort: 'asc' | 'desc' }>;
  filterModel?: Record<string, unknown>;
  maxId?: number | null;
}

export interface SyncsIrmResponse {
  rows: AgentHistoryRecord[];
  lastRow: number | null;
}

const VITE_API_TOKEN = import.meta.env.VITE_API_TOKEN || 'test';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9000';

type AgentDataSource = 'real-time' | 'history';


export class ApiService {
  static async getAgents(source?: 'real-time'): Promise<AgentResponse[]>;
  static async getAgents(source: 'history'): Promise<HistoryAgent[]>;
  static async getAgents(
    source: AgentDataSource = 'real-time'
  ): Promise<AgentResponse[] | HistoryAgent[]> {
    if (source === 'history') {
      return this.getHistoryAgents();
    }

    try {
      const response = await fetch(`${API_BASE_URL}/manager/agents`, {
        headers:{
          'Authorization': `Bearer ${VITE_API_TOKEN}`
        },
      });

      if (!response.ok) {
        console.warn('API returned error, using mock data');
        return MOCK_AGENTS;
      }

      const data = await response.json();

      return Array.isArray(data) ? data : MOCK_AGENTS;
    } catch (error) {
      console.warn('Failed to fetch agents from API, using mock data:', error);
      return MOCK_AGENTS;
    }
  }

  static async getHistoryAgents(): Promise<HistoryAgent[]> {
    const response = await fetch(`${API_BASE_URL}/agents-history`,{
        headers:{
          'Authorization': `Bearer ${VITE_API_TOKEN}`
        },
      });

    if (!response.ok) {
      throw new Error('Failed to load history agents');
    }

    return response.json();
  }

  static async getHistorySyncsIrm(
    agentId: string,
    params: SyncsIrmParams
  ): Promise<SyncsIrmResponse> {
    const query = new URLSearchParams({
      startRow:    String(params.startRow),
      endRow:      String(params.endRow),
      sortModel:   JSON.stringify(params.sortModel   ?? []),
      filterModel: JSON.stringify(params.filterModel ?? {}),
      ...(params.maxId != null ? { maxId: String(params.maxId) } : {}),
    });

    const response = await fetch(
      `${API_BASE_URL}/agent/${encodeURIComponent(agentId)}/syncs?${query}`,
      {
        headers: {
          'Authorization': `Bearer ${VITE_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to load agent sync history');
    }

    // Normalize: accept both IRM format { rows, lastRow }
    // and legacy format { items, total } (backend not yet restarted)
    const data = await response.json() as Record<string, unknown>;
    const rows = (data.rows ?? data.items ?? []) as AgentHistoryRecord[];
    const lastRow = (data.lastRow ?? null) as number | null;
    return { rows, lastRow };
  }

  static async getAgentConfig(
    agentId: string
  ): Promise<ConfigurationPayload> {
    const response = await fetch(`${API_BASE_URL}/manager/agents/${agentId}/config`,{
        headers:{
          'Authorization': `Bearer ${VITE_API_TOKEN}`
        },
      });

    if (!response.ok) {
      throw new Error('Failed to load agent config');
    }

    return response.json();
  }

  static async updateAgentConfig(
    agentId: string,
    config: ConfigurationPayload
  ): Promise<ConfigurationPayload> {
    const response = await fetch(`${API_BASE_URL}/agents/${agentId}/configuration`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VITE_API_TOKEN}`
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error('Failed to save agent config');
    }

    return response.json();
  }
}
