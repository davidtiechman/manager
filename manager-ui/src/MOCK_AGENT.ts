import type { AgentResponse } from './types/realTimeAgents/agentResponse';
import {
    LinkQualityType,
    LinkType,
    SchedulerMode,
    StatusAgent,
} from './types/serverEnums';

export const MOCK_AGENTS: AgentResponse[] = [
    {
        id: 'ag-101',
        lastSeen: Date.now(),

        status: {
            id: 'status-101',
            status: StatusAgent.SLOW,

            details: {
                selectedLink: 'lte',
                schedulerMode: SchedulerMode.CONTINUOUS,
                messagesInQueue: 4,

                linkQualities: {
                    type: LinkType.IP,
                    available: true,
                    quality: LinkQualityType.GOOD,
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
            schedulerMode: SchedulerMode.CONTINUOUS,
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
