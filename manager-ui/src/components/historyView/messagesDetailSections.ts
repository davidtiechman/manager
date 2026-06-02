// Builds the detail-drawer sections for one message record.

import type { AgentMessageRecord } from '../../types/history/agentMessageRecord';
import type { DetailSection } from './grid/RecordDetailPanel';
import { formatDate, formatValue } from './grid/detailFormat';

export function messagesDetailSections(record: AgentMessageRecord): DetailSection[] {
  return [
    {
      title: 'General',
      slug: 'general',
      rows: [
        { label: 'ID', value: formatValue(record.id) },
        { label: 'Agent ID', value: formatValue(record.agentId) },
        { label: 'Received At', value: formatDate(record.receivedAt) },
        { label: 'Sent At', value: formatDate(record.sentAt) },
        { label: 'Processed', value: formatValue(record.processed) },
      ],
    },
    {
      title: 'Message',
      slug: 'message',
      rows: [
        {
          label: 'Content Type',
          value: formatValue(record.contentType),
          className: record.contentType
            ? `snc-dp-chip snc-chip snc-chip--contentType-${String(record.contentType).toLowerCase()}`
            : undefined,
        },
        { label: 'Priority', value: formatValue(record.priority) },
        { label: 'Content', value: formatValue(record.content) },
      ],
    },
    {
      title: 'Payload',
      slug: 'payload',
      rows: [
        { label: 'Content JSON', value: formatValue(record.contentJson) },
        { label: 'Content Excel', value: formatValue(record.contentExcel) },
      ],
    },
  ];
}
