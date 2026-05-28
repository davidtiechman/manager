export type DateValue = string | number | Date;

export interface AgentResponse {
  id: string;
  lastSeen: number;

  status: {
    id: string;
    status: 'active' | 'inactive' | 'slow';

    details: {
      selectedLink: string;
      schedulerMode: string;
      messagesInQueue: number;

      linkQualities: {
        type: string;
        available: boolean;
        quality: string;
        latency: number;
        reliability: number;
        timestamp: number;
      };

      nextDeliveryTime: string;
      serverLut: string;

      agentData: {
        id: string;
        unit: string;
        unit_code: string;
        zayad_id: number;
        call_sign: string;
      };

      platform: {
        id: number;
        platform: string;
      };
    };
  };

  configuration: {
    schedulerMode: string;
    selectedLink: string;
    intervalMs: number;
    maxRetries: number;
    sparkProxyUrl: string;
    token: string;
    batchSize: number;
    isManualMode: boolean;
  };
}