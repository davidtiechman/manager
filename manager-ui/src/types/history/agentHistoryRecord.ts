export interface AgentHistoryRecord {
  id: number;
  agentId: string;
  status: 'active' | 'inactive' | 'slow';
  createdAt: string;

  details: {
    id: number;
    selectedLink: string;
    schedulerMode: string;
    messagesInQueue: number;
    nextDeliveryTime: string | null;
    geoData: string | null;
    serverLut: string | null;
    agentConfig?: AgentConfig | null;
    // Platform snapshot for this sync.
    platformData?: PlatformData | null;
  };

  link_quality: {
    id: number;
    type: string;
    available: boolean;
    quality: string;
    latency: number;
    reliability: number;
    timestamp: number;
  };
}
export interface AgentConfig {
  id: number;
  schedulerMode: string;
  selectedLink: string;
  intervalMs: number;
  maxRetries: number;
  sparkProxyUrl: string;
  token: string;
  batchSize: number;
  isManualMode: boolean;
  createdAt: string;
}

export interface PlatformData {
  id: number;
  unit: string;
  unitCode: string;
  zayadId: number;
  platform: string;
  platformId: number;
  createdAt: string;
}

export interface AgentHistoryResponse {
  items: AgentHistoryRecord[];
  total: number;
}
