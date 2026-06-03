export interface HistoryAgentPlatfrom {
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
  // NOTE: field names match the server's exactly ("callSign", "platfrom").
  callSign: string;
  createdAt: string;
  platfrom: HistoryAgentPlatfrom;
}
