import { AgentResponse } from "./agentResponse";
import type {
  LinkQualityType,
  LinkType,
  SchedulerMode,
  StatusAgent,
} from "../serverEnums";

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
  linkType: LinkType;
  linkAvailable: boolean;
  linkQuality: LinkQualityType;
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
  status: StatusAgent;
  schedulerMode: SchedulerMode;
  selectedLink: LinkType;
  messagesInQueue: number;
  nextDeliveryTime: DateValue;
  serverLut: DateValue;
  lastSeen: DateValue;
}

export interface ConfigurationTableData {
  schedulerMode: SchedulerMode;
  selectedLink: LinkType;
  intervalMs: number;
  maxRetries: number;
  sparkProxyUrl: string;
  token: string;
  batchSize: number;
  isManualMode: boolean;
}
