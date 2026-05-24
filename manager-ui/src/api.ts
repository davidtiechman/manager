import type { AgentResponse } from './types/realTimeAgents/agentResponse';
import type { AgentHistoryRecord, AgentHistoryResponse } from './types/history/agentHistoryRecord';
import type { HistoryAgent } from './types/history/historyAgent';
import type { ConfigurationTableData } from './types/realTimeAgents/tables';
import { MOCK_AGENTS } from './MOCK_AGENT';

const VITE_API_TOKEN = import.meta.env.VITE_API_TOKEN || 'test';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9000';

type AgentDataSource = 'real-time' | 'history';

function normalizeAgentHistoryResponse(data: unknown): AgentHistoryResponse {
  if (Array.isArray(data)) {
    return {
      items: data as AgentHistoryRecord[],
      total: data.length,
    };
  }

  if (!data || typeof data !== 'object') {
    return {
      items: [],
      total: 0,
    };
  }

  const payload = data as {
    items?: unknown;
    total?: unknown;
  };
  const items = Array.isArray(payload.items)
    ? (payload.items as AgentHistoryRecord[])
    : [];
  const total = Number(payload.total);

  return {
    items,
    total: Number.isFinite(total) ? total : items.length,
  };
}

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

  static async getHistorySyncs(
    agentId: string,
    offset = 0,
    limit = 50
  ): Promise<AgentHistoryResponse> {
    const query = new URLSearchParams({
      offset: String(offset),
      limit: String(limit),
    });

    const response = await fetch(
      `${API_BASE_URL}/agent/${encodeURIComponent(agentId)}/syncs?${query}`,
      {
        headers: {
          'Authorization': `Bearer ${VITE_API_TOKEN}`
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to load agent sync history');
    }

    const data: unknown = await response.json();
    return normalizeAgentHistoryResponse(data);
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
