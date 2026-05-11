import type { AgentResponse } from '../types/agentResponse';

import type {
    AgentPreviewData,
    LinkQualityTableData,
    PlatformTableData,
    SyncDetailsTableData,
    ConfigurationTableData,
} from '../types/tables';

export function toAgentPreview(
  agent: AgentResponse
): AgentPreviewData {

  return {
    id: agent.id,

    status: agent.status.status,

    call_sign:
      agent.status.details.agentData.call_sign,

    unit:
      agent.status.details.agentData.unit,

    unit_code:
      agent.status.details.agentData.unit_code,

    zayad_id:
      agent.status.details.agentData.zayad_id,

    platformId:
      agent.status.details.platform.id,
  };
}

export function toLinkQualityTable(
  agent: AgentResponse
): LinkQualityTableData {

  const link = agent.status.details.linkQualities;

  return {
    linkType: link.type,
    linkAvailable: link.available,
    linkQuality: link.quality,
    latency: link.latency,
    reliability: link.reliability,
    linkTimestamp: link.timestamp,
  };
}

export function toPlatformTable(
  agent: AgentResponse
): PlatformTableData {

  const agentData = agent.status.details.agentData;
  const platform = agent.status.details.platform;

  return {
    unit: agentData.unit,
    unit_code: agentData.unit_code,
    zayad_id: agentData.zayad_id,
    call_sign: agentData.call_sign,
    platformId: platform.id,
    platformName: platform.platform,
  };
}

export function toSyncDetailsTable(
  agent: AgentResponse
): SyncDetailsTableData {

  const details = agent.status.details;

  return {
    status: agent.status.status,
    schedulerMode: details.schedulerMode,
    selectedLink: details.selectedLink,
    messagesInQueue: details.messagesInQueue,
    nextDeliveryTime: details.nextDeliveryTime,
    serverLut: details.serverLut,
    lastSeen: agent.lastSeen,
  };
}

export function toConfigurationTable(
  agent: AgentResponse
): ConfigurationTableData {

  const config = agent.configuration;

  return {
    schedulerMode: config.schedulerMode,
    selectedLink: config.selectedLink,
    intervalMs: config.intervalMs,
    maxRetries: config.maxRetries,
    sparkProxyUrl: config.sparkProxyUrl,
    token: config.token,
    batchSize: config.batchSize,
    isManualMode: config.isManualMode,
  };
}