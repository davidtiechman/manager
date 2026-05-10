
export type DateValue = string | Date;
export interface LinkQualityTableData {
  linkType: string;
  linkAvailable: boolean;
  linkQuality: number;
  latency: number;
  reliability: number;
  linkTimestamp: DateValue;
}

export interface PlatformTableData {
  unit: string;
  unit_code: string;
  zayad_id: string;
  call_sign: string;
  platformId: string;
  platformName: string;
  platform_id_unit_code?: string;
  platform_id?: string;
  platform?: string;
  created_id?: string;
}

export interface SyncDetailsTableData {
  session_time?: string | number;
  scheduler_mode?: string;
  messages_in_queue?: number;
  last_delivery_time?: DateValue;
  geo_data?: string;
  server_id?: string;
}

export interface ConfigurationTableData {
  id?: string;
  agent_id?: string;
  selected_link?: number | string;
  scheduler_link?: number | string;
  scheduler_type?: string;
  scheduler_mode?: string;
  interval_ms?: number;
  max_retries?: number;
  spark_proxy_url?: string;
  base_url?: string;
  token?: string;
  batch_size?: number;
  is_manual_mode?: boolean;
  sync_tries_on?: boolean;
  created_min?: number;
  created_at?: DateValue;
}

export interface AgentStatus
  extends LinkQualityTableData,
    PlatformTableData,
    SyncDetailsTableData,
    ConfigurationTableData {
  id: string;
  lastSeen: DateValue;
  status: 'online' | 'warning' | 'offline';
  schedulerMode: string;
  selectedLink?: number | string;
  messagesInQueue: number;
  nextDeliveryTime: DateValue;
  serverLut: DateValue;
}



export interface HistoryPoint {
  time: string;
  latency: number;
  reliability: number;
}
