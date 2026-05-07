
export type DateValue = string | Date;

export interface AgentStatus {
  id: string;
  lastSeen: DateValue;
  status: 'online' | 'warning' | 'offline';
  schedulerMode: string;
  selectedLink: string;
  messagesInQueue: number;
  nextDeliveryTime: DateValue;
  serverLut: DateValue;
  linkType: string;
  linkAvailable: boolean;
  linkQuality: number;
  latency: number;
  reliability: number;
  linkTimestamp: DateValue;
  unit: string;
  unit_code: string;
  zayad_id: string;
  call_sign: string;
  platformId: string;
  platformName: string;

  session_time?: string | number;
  scheduler_mode?: string;
  messages_in_queue?: number;
  last_delivery_time?: DateValue;
  geo_data?: string;
  server_id?: string;

  platform_id_unit_code?: string;
  platform_id?: string;
  platform?: string;
  created_id?: string;

  created_min?: number;
  scheduler_type?: string;
  interval_ms?: number;
  max_retries?: number;
  sync_tries_on?: boolean;
  base_url?: string;
  batch_size?: number;
  is_manual_mode?: boolean;
  created_at?: DateValue;
}

export interface AgentConfig {
    created_min?: number;
  scheduler_type?: string;
  interval_ms?: number;
  max_retries?: number;
  sync_tries_on?: boolean;
  base_url?: string;
  batch_size?: number;
  is_manual_mode?: boolean;
  created_at?: DateValue;
}

export interface HistoryPoint {
  time: string;
  latency: number;
  reliability: number;
}
