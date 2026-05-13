export interface HistoryAgent {
  id: string;
  callSign?: string;
  unit?: string;
  unitCode?: string;
  zayadId?: number;
  platformId?: number;
  platform?: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
}
