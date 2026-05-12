import type { AgentResponse } from './types/agentResponse';
import type { ConfigurationTableData } from './types/tables';
import {MOCK_AGENTS} from './MOCK_AGENT';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000';


export class ApiService {
  static async getAgents(): Promise<AgentResponse[]> {
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

  static async getAgentHistory(
    agentId: string,
    limit: number = 100
  ): Promise<any[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/ui/agents/${agentId}/history?limit=${limit}`
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn('Failed to fetch agent history:', error);
      return [];
    }
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