import type { AgentResponse } from './agentResponse';
import type { PlatformTableData } from './tables';
import {
  LinkQualityType,
  LinkType,
  SchedulerMode,
  StatusAgent,
} from '../serverEnums';

export type PlatformFilterField = Extract<keyof PlatformTableData, string>;

export type AgentFilterFieldKey =
  | 'other'
  | PlatformFilterField
  | 'status'
  | 'selectedLink'
  | 'schedulerMode'
  | 'linkType'
  | 'linkQuality'
  | 'configSelectedLink'
  | 'configSchedulerMode';

export type AgentFilterFieldGroup =
  | 'Platform'
  | 'Live Status'
  | 'Link Quality'
  | 'Configuration';

type AgentFilterFieldBase = {
  label: string;
  value: AgentFilterFieldKey;
  group: AgentFilterFieldGroup;
  getValue: (agent: AgentResponse) => unknown;
};

export type AgentFilterField =
  | (AgentFilterFieldBase & {
      kind: 'text';
    })
  | (AgentFilterFieldBase & {
      kind: 'enum';
      options: string[];
    });

export type AgentSearchState = {
  field: AgentFilterFieldKey;
  customField: string;
  text: string;
};
export const agentFilterFields: AgentFilterField[] = [
  {
    label: 'Platform ID',
    value: 'platformId',
    group: 'Platform',
    kind: 'text',
    getValue: (agent) => agent.status.details.platform.id,
  },
  {
    label: 'Platform Name',
    value: 'platformName',
    group: 'Platform',
    kind: 'text',
    getValue: (agent) => agent.status.details.platform.platform,
  },
  {
    label: 'Unit',
    value: 'unit',
    group: 'Platform',
    kind: 'text',
    getValue: (agent) => agent.status.details.agentData.unit,
  },
  {
    label: 'Unit Code',
    value: 'unit_code',
    group: 'Platform',
    kind: 'text',
    getValue: (agent) => agent.status.details.agentData.unit_code,
  },
  {
    label: 'Zayad ID',
    value: 'zayad_id',
    group: 'Platform',
    kind: 'text',
    getValue: (agent) => agent.status.details.agentData.zayad_id,
  },
  {
    label: 'Call Sign',
    value: 'call_sign',
    group: 'Platform',
    kind: 'text',
    getValue: (agent) => agent.status.details.agentData.call_sign,
  },
  {
    label: 'Status',
    value: 'status',
    group: 'Live Status',
    kind: 'enum',
    options: Object.values(StatusAgent),
    getValue: (agent) => agent.status.status,
  },
  {
    label: 'Runtime Selected Link',
    value: 'selectedLink',
    group: 'Live Status',
    kind: 'enum',
    options: Object.values(LinkType),
    getValue: (agent) => agent.status.details.selectedLink,
  },
  {
    label: 'Runtime Scheduler Mode',
    value: 'schedulerMode',
    group: 'Live Status',
    kind: 'enum',
    options: Object.values(SchedulerMode),
    getValue: (agent) => agent.status.details.schedulerMode,
  },
  {
    label: 'Link Type',
    value: 'linkType',
    group: 'Link Quality',
    kind: 'enum',
    options: Object.values(LinkType),
    getValue: (agent) => agent.status.details.linkQualities.type,
  },
  {
    label: 'Link Quality',
    value: 'linkQuality',
    group: 'Link Quality',
    kind: 'enum',
    options: Object.values(LinkQualityType),
    getValue: (agent) => agent.status.details.linkQualities.quality,
  },
  {
    label: 'Configuration Selected Link',
    value: 'configSelectedLink',
    group: 'Configuration',
    kind: 'enum',
    options: Object.values(LinkType),
    getValue: (agent) => agent.configuration.selectedLink,
  },
  {
    label: 'Configuration Scheduler Mode',
    value: 'configSchedulerMode',
    group: 'Configuration',
    kind: 'enum',
    options: Object.values(SchedulerMode),
    getValue: (agent) => agent.configuration.schedulerMode,
  },
];
