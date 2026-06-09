// Builds the detail-drawer sections for one message record.

import type { TFunction } from 'i18next';
import type { AgentMessageRecord } from '../../types/history/agentMessageRecord';
import type { DetailSection } from './grid/RecordDetailPanel';
import { formatDate, formatValue } from './grid/detailFormat';

export function messagesDetailSections(record: AgentMessageRecord, t: TFunction): DetailSection[] {
  const c = (id: string) => t(`messages.columns.${id}`);
  const group = (slug: string) => t(`groups.${slug}`);

  return [
    {
      title: group('general'),
      slug: 'general',
      rows: [
        { label: c('id'), value: formatValue(record.id) },
        { label: c('agentId'), value: formatValue(record.agentId) },
        { label: c('receivedAt'), value: formatDate(record.receivedAt) },
        { label: c('sentAt'), value: formatDate(record.sentAt) },
        { label: c('processed'), value: formatValue(record.processed) },
      ],
    },
    {
      title: group('message'),
      slug: 'message',
      rows: [
        {
          label: c('contentType'),
          value: formatValue(record.contentType),
          className: record.contentType
            ? `snc-dp-chip snc-chip snc-chip--contentType-${String(record.contentType).toLowerCase()}`
            : undefined,
        },
        { label: c('priority'), value: formatValue(record.priority) },
        { label: c('content'), value: formatValue(record.content) },
      ],
    },
    {
      title: group('payload'),
      slug: 'payload',
      rows: [
        { label: c('contentJson'), value: formatValue(record.contentJson) },
        { label: c('contentExcel'), value: formatValue(record.contentExcel) },
      ],
    },
  ];
}
