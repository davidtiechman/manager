import type { AgentConfig, AgentStatus } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000';

const MOCK_AGENTS: AgentStatus[] = [
    {
        id: 'ag-101',
        status: 'online',
        schedulerMode: 'auto',
        selectedLink: 'satcom',
        unit: 'North Command',
        unit_code: 'N-001',
        zayad_id: 'Z-101',
        call_sign: 'N-ALPHA',
        platformId: 'plat-101',
        platformName: 'Platform Alpha',
        messagesInQueue: 2,
        linkType: 'satcom',
        linkAvailable: true,
        linkQuality: 0.98,
        latency: 72,
        reliability: 0.98,
        linkTimestamp: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        nextDeliveryTime: new Date().toISOString(),
        serverLut: new Date().toISOString(),
    },
    {
        id: 'ag-204',
        status: 'warning',
        schedulerMode: 'manual',
        selectedLink: 'lte',
        unit: 'East Relay',
        unit_code: 'E-002',
        zayad_id: 'Z-204',
        call_sign: 'E-ROOK',
        platformId: 'plat-204',
        platformName: 'Platform Beta',
        messagesInQueue: 14,
        linkType: 'lte',
        linkAvailable: true,
        linkQuality: 0.86,
        latency: 181,
        reliability: 0.86,
        linkTimestamp: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        nextDeliveryTime: new Date().toISOString(),
        serverLut: new Date().toISOString(),
    },
];

export class ApiService {
    static async getAgents(): Promise<AgentStatus[]> {
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

    static async getAgentHistory(agentId: string, limit: number = 100): Promise<any[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/ui/agents/${agentId}/history?limit=${limit}`);
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

    static async getAgentConfig(agentId: string): Promise<AgentConfig> {
        const response = await fetch(`${API_BASE_URL}/api/ui/agents/${agentId}/config`);
        if (!response.ok) {
            throw new Error('Failed to load agent config');
        }

        return response.json();
    }

    static async updateAgentConfig(agentId: string, config: AgentConfig): Promise<AgentConfig> {
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
