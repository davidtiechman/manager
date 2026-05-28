import { AgentResponse } from "./agentResponse";

export type DateValue = string | number | Date;

export interface AgentPreviewData {
  id: string;
  status: AgentResponse['status']['status'];
  call_sign: string;
  unit: string;
  unit_code: string;
  zayad_id: number;
  platformId: number;
}


export interface LinkQualityTableData {
  linkType: string;
  linkAvailable: boolean;
  linkQuality: string;
  latency: number;
  reliability: number;
  linkTimestamp: DateValue;
}

export interface PlatformTableData {
  unit: string;
  unit_code: string;
  zayad_id: number;
  call_sign: string;
  platformId: number;
  platformName: string;
}

export interface SyncDetailsTableData {
  status: string;
  schedulerMode: string;
  selectedLink: string;
  messagesInQueue: number;
  nextDeliveryTime: DateValue;
  serverLut: DateValue;
  lastSeen: DateValue;
}

export interface ConfigurationTableData {
  schedulerMode: string;
  selectedLink: string;
  intervalMs: number;
  maxRetries: number;
  sparkProxyUrl: string;
  token: string;
  batchSize: number;
  isManualMode: boolean;
}