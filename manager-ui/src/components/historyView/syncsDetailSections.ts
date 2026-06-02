// Builds the detail-drawer sections for one sync record.

import type { AgentHistoryRecord } from '../../types/history/agentHistoryRecord';
import type { DetailSection } from './grid/RecordDetailPanel';
import { formatDate, formatValue } from './grid/detailFormat';

export function syncsDetailSections(record: AgentHistoryRecord): DetailSection[] {
  const ac = record.details?.agentConfig;
  const pd = record.details?.platfromData;

  return [
    {
      title: 'General',
      slug: 'general',
      rows: [
        { label: 'ID', value: formatValue(record.id) },
        { label: 'Agent ID', value: formatValue(record.agentId) },
        {
          label: 'Status',
          value: formatValue(record.status),
          className: `snc-dp-chip snc-status snc-status--${String(record.status).toLowerCase()}`,
        },
        { label: 'Created At', value: formatDate(record.createdAt) },
      ],
    },
    {
      title: 'Sync Details',
      slug: 'sync-details',
      rows: [
        { label: 'Selected Link', value: formatValue(record.details?.selectedLink) },
        { label: 'Scheduler Mode', value: formatValue(record.details?.schedulerMode) },
        { label: 'Messages In Queue', value: formatValue(record.details?.messagesInQueue) },
        { label: 'Next Delivery', value: formatDate(record.details?.nextDeliveryTime) },
        { label: 'Geo Data', value: formatValue(record.details?.geoData) },
        { label: 'Server LUT', value: formatDate(record.details?.serverLut) },
      ],
    },
    {
      title: 'Agent Config',
      slug: 'agent-config',
      rows: ac
        ? [
            { label: 'Scheduler Mode', value: formatValue(ac.schedulerMode) },
            { label: 'Selected Link', value: formatValue(ac.selectedLink) },
            { label: 'Interval (ms)', value: formatValue(ac.intervalMs) },
            { label: 'Max Retries', value: formatValue(ac.maxRetries) },
            { label: 'Batch Size', value: formatValue(ac.batchSize) },
            { label: 'Manual Mode', value: formatValue(ac.isManualMode) },
            { label: 'Spark Proxy URL', value: formatValue(ac.sparkProxyUrl) },
            { label: 'Token', value: formatValue(ac.token) },
            { label: 'Created At', value: formatDate(ac.createdAt) },
          ]
        : [],
    },
    {
      title: 'Platform Data',
      slug: 'platform-data',
      rows: pd
        ? [
            { label: 'Unit', value: formatValue(pd.unit) },
            { label: 'Unit Code', value: formatValue(pd.unitCode) },
            { label: 'Zayad ID', value: formatValue(pd.zayadId) },
            { label: 'Platform', value: formatValue(pd.platform) },
            { label: 'Platform ID', value: formatValue(pd.platformId) },
            { label: 'Created At', value: formatDate(pd.createdAt) },
          ]
        : [],
    },
    {
      title: 'Link Quality',
      slug: 'link-quality',
      rows: [
        { label: 'Link Type', value: formatValue(record.link_quality?.type) },
        { label: 'Available', value: formatValue(record.link_quality?.available) },
        { label: 'Quality', value: formatValue(record.link_quality?.quality) },
        { label: 'Latency (ms)', value: formatValue(record.link_quality?.latency) },
        { label: 'Reliability', value: formatValue(record.link_quality?.reliability) },
        { label: 'Timestamp', value: formatDate(record.link_quality?.timestamp) },
      ],
    },
  ];
}
