/** Server enums — mirror of backend `src/types/index.ts`. Keep in sync. */

export enum LinkQualityType {
  EXCELLENT = 'excellent',
  GOOD      = 'good',
  FAIR      = 'fair',
  POOR      = 'poor',
  CRITICAL  = 'critical',
}

export enum LinkType {
  IP        = 'ip',
  IP_NARROW = 'ip_narrow',
  BIZUR     = 'bizur',
  NONE      = 'none',
}

export enum SchedulerMode {
  CONTINUOUS = 'continuous',
  INTERVAL   = 'interval',
}

export enum StatusAgent {
  ACTIVE   = 'active',
  INACTIVE = 'inactive',
  SLOW     = 'slow',
}

export enum ContentType {
  JSON  = 'Json',
  EXCEL = 'Excel',
}
