import type {
  LinkQualityType,
  LinkType,
  SchedulerMode,
  StatusAgent,
} from '../serverEnums';
export type DateValue = string | number | Date;

export interface AgentResponse {
  id: string;
  lastSeen: number;

  status: {
    id: string;
    status: StatusAgent;

    details: {
      selectedLink: LinkType;
      schedulerMode: SchedulerMode;
      messagesInQueue: number;

      linkQualities: {
        type: LinkType;
        available: boolean;
        quality: LinkQualityType;
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
    schedulerMode: SchedulerMode;
    selectedLink: LinkType;
    intervalMs: number;
    maxRetries: number;
    sparkProxyUrl: string;
    token: string;
    batchSize: number;
    isManualMode: boolean;
  };
}
