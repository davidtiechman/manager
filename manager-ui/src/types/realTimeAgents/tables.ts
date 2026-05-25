export type DateValue = string | number | Date;

export type TableField<TValue = unknown> = {
  key: string;
  label: string;
  value: TValue;
};

export type AgentPreviewData = {
  id: string;
  status: string;
  call_sign: string;
  unit: string;
  unit_code: string;
  zayad_id: number;
  platformId: number;
};

export type LinkQualityTableData = TableField[];
export type PlatformTableData = TableField[];
export type SyncDetailsTableData = TableField[];
export type ConfigurationTableData = TableField[];

export type ConfigurationPayload = {
  schedulerMode: string;
  selectedLink: string;
  intervalMs: number;
  maxRetries: number;
  sparkProxyUrl: string;
  token: string;
  batchSize: number;
  isManualMode: boolean;
};