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
  callsign: string;
  createdAt: string;
  // NOTE: "platfrom" matches the server's (misspelled) field name.
  platfrom: HistoryAgentPlatfrom;
}
