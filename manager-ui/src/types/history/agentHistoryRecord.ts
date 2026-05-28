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
export interface AgentHistoryResponse {
  items: AgentHistoryRecord[];
  total: number;
}
