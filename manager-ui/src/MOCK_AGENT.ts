import type { AgentResponse } from './types/realTimeAgents/agentResponse';

export const MOCK_AGENTS: AgentResponse[] = [
    {
        id: 'ag-101',
        lastSeen: Date.now(),

        status: {
            id: 'status-101',
            status: 'slow',

            details: {
                selectedLink: 'lte',
                schedulerMode: 'auto',
                messagesInQueue: 4,

                linkQualities: {
                    type: 'lte',
                    available: true,
                    quality: '0.92',
                    latency: 120,
                    reliability: 0.95,
                    timestamp: Date.now(),
                },

                nextDeliveryTime: new Date().toISOString(),
                serverLut: new Date().toISOString(),

                agentData: {
                    id: 'agent-data-101',
                    unit: 'North',
                    unit_code: 'N-001',
                    zayad_id: 101,
                    call_sign: 'ALPHA',
                },

                platform: {
                    id: 1,
                    platform: 'Platform Alpha',
                },
            },
        },

        configuration: {
            schedulerMode: 'auto',
            selectedLink: 'lte',
            intervalMs: 5000,
            maxRetries: 3,
            sparkProxyUrl: 'http://proxy.local',
            token: 'mock-token',
            batchSize: 10,
            isManualMode: false,
        },
    },
];
