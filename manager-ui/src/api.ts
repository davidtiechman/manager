import type { AgentResponse } from './types/realTimeAgents/agentResponse';
import type { AgentHistoryRecord } from './types/history/agentHistoryRecord';
import type { AgentMessageRecord } from './types/history/agentMessageRecord';
import type { HistoryAgent } from './types/history/historyAgent';
import type { ConfigurationTableData } from './types/realTimeAgents/tables';
import { refreshSession, redirectToLogin } from './auth/refreshSession';

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

const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:9000';
const API_BASE = `${API_ROOT}/manager`;

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  let res = await fetch(`${API_BASE}${path}`, { ...init, credentials: 'include' });

  // 401 → refresh + retry, else re-login.
  if (res.status === 401) {
    if (await refreshSession()) {
      res = await fetch(`${API_BASE}${path}`, { ...init, credentials: 'include' });
    } else {
      redirectToLogin();
    }
  }

  if (!res.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${path} → ${res.status}`);
  }
  return res;
}

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

    const data = await apiFetch('/agents').then((r) => r.json());
    if (!Array.isArray(data)) {
      throw new Error('GET /agents → unexpected response shape');
    }
    return data;
  }

  static async getHistoryAgents(): Promise<HistoryAgent[]> {
    const response = await apiFetch('/agents-history');
    return response.json();
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

    let response: Response;
    try {
      response = await apiFetch(
        `/agent/${encodeURIComponent(agentId)}/${resource}?${query}`
      );
    } catch {
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
    const response = await apiFetch(`/agents/${encodeURIComponent(agentId)}/config`);
    return response.json();
  }

  static async updateAgentConfig(
    agentId: string,
    config: ConfigurationTableData
  ): Promise<ConfigurationTableData> {
    const response = await apiFetch(`/agents/${encodeURIComponent(agentId)}/configuration`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return response.json();
  }
}
