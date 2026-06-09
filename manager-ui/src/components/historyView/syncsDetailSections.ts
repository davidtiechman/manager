// Builds the detail-drawer sections for one sync record.

import type { TFunction } from 'i18next';
import type { AgentHistoryRecord } from '../../types/history/agentHistoryRecord';
import type { DetailSection } from './grid/RecordDetailPanel';
import { formatDate, formatValue } from './grid/detailFormat';

export function syncsDetailSections(record: AgentHistoryRecord, t: TFunction): DetailSection[] {
  const ac = record.details?.agentConfig;
  const pd = record.details?.platfromData;
  const c = (id: string) => t(`sync.columns.${id}`);
  const group = (slug: string) => t(`groups.${slug}`);

  return [
    {
      title: group('general'),
      slug: 'general',
      rows: [
        { label: c('id'), value: formatValue(record.id) },
        { label: c('agentId'), value: formatValue(record.agentId) },
        {
          label: c('status'),
          value: formatValue(record.status),
          className: `snc-dp-chip snc-status snc-status--${String(record.status).toLowerCase()}`,
        },
        { label: c('createdAt'), value: formatDate(record.createdAt) },
      ],
    },
    {
      title: group('sync-details'),
      slug: 'sync-details',
      rows: [
        { label: c('selectedLink'), value: formatValue(record.details?.selectedLink) },
        { label: c('schedulerMode'), value: formatValue(record.details?.schedulerMode) },
        { label: c('messagesInQueue'), value: formatValue(record.details?.messagesInQueue) },
        { label: c('nextDeliveryTime'), value: formatDate(record.details?.nextDeliveryTime) },
        { label: c('geoData'), value: formatValue(record.details?.geoData) },
        { label: c('serverLut'), value: formatDate(record.details?.serverLut) },
      ],
    },
    {
      title: group('agent-config'),
      slug: 'agent-config',
      rows: ac
        ? [
            { label: c('schedulerMode'), value: formatValue(ac.schedulerMode) },
            { label: c('selectedLink'), value: formatValue(ac.selectedLink) },
            { label: c('intervalMs'), value: formatValue(ac.intervalMs) },
            { label: c('maxRetries'), value: formatValue(ac.maxRetries) },
            { label: c('batchSize'), value: formatValue(ac.batchSize) },
            { label: c('isManualMode'), value: formatValue(ac.isManualMode) },
            { label: c('sparkProxyUrl'), value: formatValue(ac.sparkProxyUrl) },
            { label: c('token'), value: formatValue(ac.token) },
            { label: c('createdAt'), value: formatDate(ac.createdAt) },
          ]
        : [],
    },
    {
      title: group('platform-data'),
      slug: 'platform-data',
      rows: pd
        ? [
            { label: c('unit'), value: formatValue(pd.unit) },
            { label: c('unitCode'), value: formatValue(pd.unitCode) },
            { label: c('zayadId'), value: formatValue(pd.zayadId) },
            { label: c('platform'), value: formatValue(pd.platform) },
            { label: c('platformId'), value: formatValue(pd.platformId) },
            { label: c('createdAt'), value: formatDate(pd.createdAt) },
          ]
        : [],
    },
    {
      title: group('link-quality'),
      slug: 'link-quality',
      rows: [
        { label: c('linkType'), value: formatValue(record.link_quality?.type) },
        { label: c('linkAvailable'), value: formatValue(record.link_quality?.available) },
        { label: c('linkQuality'), value: formatValue(record.link_quality?.quality) },
        { label: c('latency'), value: formatValue(record.link_quality?.latency) },
        { label: c('reliability'), value: formatValue(record.link_quality?.reliability) },
        { label: c('timestamp'), value: formatDate(record.link_quality?.timestamp) },
      ],
    },
  ];
}
