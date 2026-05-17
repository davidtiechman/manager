import type { AgentResponse } from './types/realTimeAgents/agentResponse';
import type { AgentHistoryRecord } from './types/history/agentHistoryRecord';
import type { HistoryAgent } from './types/history/historyAgent';
import type { ConfigurationTableData } from './types/realTimeAgents/tables';
import { MOCK_AGENTS } from './MOCK_AGENT';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000';

type AgentDataSource = 'real-time' | 'history';

function extractAgentHistoryRecords(data: unknown): AgentHistoryRecord[] {
  if (Array.isArray(data)) {
    return data as AgentHistoryRecord[];
  }

  if (!data || typeof data !== 'object') {
    return [];
  }

  const payload = data as {
    syncs?: unknown;
    records?: unknown;
    history?: unknown;
    data?: unknown;
  };

  if (Array.isArray(payload.syncs)) {
    return payload.syncs as AgentHistoryRecord[];
  }

  if (Array.isArray(payload.records)) {
    return payload.records as AgentHistoryRecord[];
  }

  if (Array.isArray(payload.history)) {
    return payload.history as AgentHistoryRecord[];
  }

  if (Array.isArray(payload.data)) {
    return payload.data as AgentHistoryRecord[];
  }

  return [];
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
      const response = await fetch(`${API_BASE_URL}/api/ui/agents`);

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
    const response = await fetch(`${API_BASE_URL}/api/history/agents`);

    if (!response.ok) {
      throw new Error('Failed to load history agents');
    }

    return response.json();
  }

  static async getAgentHistory(
    agentId: string
  ): Promise<AgentHistoryRecord[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/history/agents/${agentId}/syncs`
    );

    if (!response.ok) {
      throw new Error('Failed to load agent sync history');
    }

    const data: unknown = await response.json();
    return extractAgentHistoryRecords(data);
  }

  static async getAgentConfig(
    agentId: string
  ): Promise<ConfigurationTableData> {
    const response = await fetch(`${API_BASE_URL}/api/ui/agents/${agentId}/config`);

    if (!response.ok) {
      throw new Error('Failed to load agent config');
    }

    return response.json();
  }

  static async updateAgentConfig(
    agentId: string,
    config: ConfigurationTableData
  ): Promise<ConfigurationTableData> {
    const response = await fetch(`${API_BASE_URL}/api/ui/agents/${agentId}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error('Failed to save agent config');
    }

    return response.json();
  }
}
