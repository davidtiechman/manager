export interface HistoryAgentPlatform {
  id: number;
  unit: string;
  unitCode: string;
  zayadId: number;
  platform: string;
  platformId: number;
  createdAt: string;
}

export interface HistoryAgent {
  id: string;
  // NOTE: field names match the server's exactly ("callSign", "platform").
  callSign: string;
  createdAt: string;
  platform: HistoryAgentPlatform;
}
