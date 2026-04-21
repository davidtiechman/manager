
export interface AgentStatus {
  id: string;
  lastSeen: string | Date;
  status: 'online' | 'warning' | 'offline';
  schedulerMode: string;
  selectedLink: string;
  messagesInQueue: number;
  nextDeliveryTime: string | Date;
  serverLut: string | Date;
  linkType: string;
  linkAvailable: boolean;
  linkQuality: number;
  latency: number;
  reliability: number;
  linkTimestamp: string | Date;
  unit: string;
  unit_code: string;
  zayad_id: string;
  call_sign: string;
  platformId: string;
  platformName: string;
}

export interface AgentConfig {
  agentId?: string;
  schedulerMode: string;
  selectedLink: string;
  intervalMs: number;
  maxRetries: number;
  sparkProxyUrl: string;
  token: string;
  batchSize: number;
  isManualMode: boolean;
  updatedAt?: string;
}

export interface HistoryPoint {
  time: string;
  latency: number;
  reliability: number;
}
