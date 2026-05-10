import type { AgentStatus, ConfigurationTableData } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000';

const MOCK_AGENTS: AgentStatus[] = [
    {
        id: 'ag-101',
        status: 'online',
        schedulerMode: 'auto',
        selected_link: 1,
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
        selectedLink: 0
    },
    {
        id: 'ag-204',
        status: 'warning',
        schedulerMode: 'manual',
        selected_link: 1,
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
        selectedLink: 0
    },
];

export function normalizeAgentStatus(agent: AgentStatus): AgentStatus {
    const selectedLink = agent.selected_link ?? agent.scheduler_link ?? agent.selectedLink;

    return {
        ...agent,
        selected_link: selectedLink,
        selectedLink,
    };
}

export class ApiService {
    static async getAgents(): Promise<AgentStatus[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/ui/agents`);
            if (!response.ok) {
                console.warn('API returned error, using mock data');
                return MOCK_AGENTS.map(normalizeAgentStatus);
            }

            const data = await response.json();
            return Array.isArray(data) ? data.map(normalizeAgentStatus) : MOCK_AGENTS.map(normalizeAgentStatus);
        } catch (error) {
            console.warn('Failed to fetch agents from API, using mock data:', error);
            return MOCK_AGENTS.map(normalizeAgentStatus);
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

    static async getAgentConfig(agentId: string): Promise<ConfigurationTableData> {
        const response = await fetch(`${API_BASE_URL}/api/ui/agents/${agentId}/config`);
        if (!response.ok) {
            throw new Error('Failed to load agent config');
        }

        return response.json();
    }

    static async updateAgentConfig(agentId: string, config: ConfigurationTableData): Promise<ConfigurationTableData> {
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
