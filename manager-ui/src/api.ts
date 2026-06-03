import type { AgentResponse } from './types/realTimeAgents/agentResponse';
import type { AgentHistoryRecord } from './types/history/agentHistoryRecord';
import type { AgentMessageRecord } from './types/history/agentMessageRecord';
import type { HistoryAgent } from './types/history/historyAgent';
import type { ConfigurationTableData } from './types/realTimeAgents/tables';
import { MOCK_AGENTS } from './MOCK_AGENT';

// IRM request params.
export interface IrmParams {
  startRow: number;
  endRow: number;
  sortModel?: Array<{ colId: string; sort: 'asc' | 'desc' }>;
  filterModel?: Record<string, unknown>;
}

export interface IrmResponse<T> {
  rows: T[];
  lastRow: number | null;
  rowCount?: number; // first block only
}

// Back-compat aliases.
export type SyncsIrmParams = IrmParams;
export type SyncsIrmResponse = IrmResponse<AgentHistoryRecord>;

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

    // Tolerate the field spelled either "platform" or the legacy typo "platfrom".
    const data = await response.json();
    return (Array.isArray(data) ? data : []).map((a: Record<string, unknown>) => ({
      ...a,
      platfrom: a.platfrom ?? a.platform,
    })) as HistoryAgent[];
  }

  // Generic IRM fetch.
  private static async fetchHistoryIrm<T>(
    resource: 'syncs' | 'messages',
    agentId: string,
    params: IrmParams,
    errorMessage: string
  ): Promise<IrmResponse<T>> {
    const query = new URLSearchParams({
      startRow:    String(params.startRow),
      endRow:      String(params.endRow),
      sortModel:   JSON.stringify(params.sortModel   ?? []),
      filterModel: JSON.stringify(params.filterModel ?? {}),
    });

    const response = await fetch(
      `${API_BASE_URL}/agent/${encodeURIComponent(agentId)}/${resource}?${query}`,
      { headers: { 'Authorization': `Bearer ${VITE_API_TOKEN}` } }
    );

    if (!response.ok) {
      throw new Error(errorMessage);
    }

    // Accept IRM { rows } or legacy { items }.
    const data = await response.json() as Record<string, unknown>;
    const rows = (data.rows ?? data.items ?? []) as T[];
    const lastRow = (data.lastRow ?? null) as number | null;
    const rowCount = typeof data.rowCount === 'number' ? data.rowCount : undefined;
    return { rows, lastRow, rowCount };
  }

  static getHistorySyncsIrm(
    agentId: string,
    params: IrmParams
  ): Promise<IrmResponse<AgentHistoryRecord>> {
    return this.fetchHistoryIrm('syncs', agentId, params, 'Failed to load agent sync history');
  }

  static getHistoryMessagesIrm(
    agentId: string,
    params: IrmParams
  ): Promise<IrmResponse<AgentMessageRecord>> {
    return this.fetchHistoryIrm('messages', agentId, params, 'Failed to load agent messages');
  }

  static async getAgentConfig(
    agentId: string
  ): Promise<ConfigurationTableData> {
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
    config: ConfigurationTableData
  ): Promise<ConfigurationTableData> {
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
