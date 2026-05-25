import type { AgentResponse } from './agentResponse';
import type {
  AgentPreviewData,
  ConfigurationTableData,
  LinkQualityTableData,
  PlatformTableData,
  SyncDetailsTableData,
  TableField,
} from './tables';

export function toAgentPreview(agent: AgentResponse): AgentPreviewData {
  return {
    id: agent.id,
    status: agent.status.status,
    call_sign: agent.status.details.agentData.call_sign,
    unit: agent.status.details.agentData.unit,
    unit_code: agent.status.details.agentData.unit_code,
    zayad_id: agent.status.details.agentData.zayad_id,
    platformId: agent.status.details.platform.id,
  };
}

export function toPlatformTable(agent: AgentResponse): PlatformTableData {
  return [
    { key: 'unit', label: 'Unit', value: agent.status.details.agentData.unit },
    { key: 'unit_code', label: 'Unit Code', value: agent.status.details.agentData.unit_code },
    { key: 'zayad_id', label: 'Zayad ID', value: agent.status.details.agentData.zayad_id },
    { key: 'call_sign', label: 'Call Sign', value: agent.status.details.agentData.call_sign },
    { key: 'platformId', label: 'Platform ID', value: agent.status.details.platform.id },
    { key: 'platformName', label: 'Platform Name', value: agent.status.details.platform.platform },
  ];
}

export function toLinkQualityTable(agent: AgentResponse): LinkQualityTableData {
  const link = agent.status.details.linkQualities;

  return [
    { key: 'linkType', label: 'Link Type', value: link.type },
    { key: 'linkAvailable', label: 'Available', value: link.available },
    { key: 'linkQuality', label: 'Quality', value: link.quality },
    { key: 'latency', label: 'Latency', value: link.latency },
    { key: 'reliability', label: 'Reliability', value: link.reliability },
    { key: 'linkTimestamp', label: 'Timestamp', value: link.timestamp },
  ];
}

export function toSyncDetailsTable(agent: AgentResponse): SyncDetailsTableData {
  const details = agent.status.details;

  return [
    { key: 'status', label: 'Status', value: agent.status.status },
    { key: 'schedulerMode', label: 'Scheduler Mode', value: details.schedulerMode },
    { key: 'selectedLink', label: 'Selected Link', value: details.selectedLink },
    { key: 'messagesInQueue', label: 'Messages In Queue', value: details.messagesInQueue },
    { key: 'nextDeliveryTime', label: 'Next Delivery Time', value: details.nextDeliveryTime },
    { key: 'serverLut', label: 'Server LUT', value: details.serverLut },
    { key: 'lastSeen', label: 'Last Seen', value: agent.lastSeen },
  ];
}

export function toConfigurationTable(
  agent: AgentResponse
): ConfigurationTableData {
  return [
    { key: 'schedulerMode', label: 'Scheduler Mode', value: agent.configuration.schedulerMode },
    { key: 'selectedLink', label: 'Selected Link', value: agent.configuration.selectedLink },
    { key: 'intervalMs', label: 'Interval MS', value: agent.configuration.intervalMs },
    { key: 'maxRetries', label: 'Max Retries', value: agent.configuration.maxRetries },
    { key: 'sparkProxyUrl', label: 'Spark Proxy URL', value: agent.configuration.sparkProxyUrl },
    { key: 'token', label: 'Token', value: agent.configuration.token },
    { key: 'batchSize', label: 'Batch Size', value: agent.configuration.batchSize },
    { key: 'isManualMode', label: 'Is Manual Mode', value: agent.configuration.isManualMode },
  ];
}

export function getFieldValue<T>(
  fields: TableField[],
  key: string
): T {
  return fields.find((field) => field.key === key)?.value as T;
}