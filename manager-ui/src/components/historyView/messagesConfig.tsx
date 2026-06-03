// Wires the messages table into the shared HistoryDataGrid.

import { ApiService } from '../../api';
import type { AgentMessageRecord } from '../../types/history/agentMessageRecord';
import type { GridConfig } from './grid/gridConfig';
import { RecordDetailPanel } from './grid/RecordDetailPanel';
import {
  MESSAGES_BLOCK_SIZE,
  MESSAGES_COLUMN_LABELS,
  MESSAGES_GROUP_COLORS,
  buildMessagesColumnDefs,
} from './messagesGrid.columns';
import { messagesDetailSections } from './messagesDetailSections';

export const messagesConfig: GridConfig<AgentMessageRecord> = {
  storageKey: 'msg-col-state',
  columnDefs: buildMessagesColumnDefs(),
  groupColors: MESSAGES_GROUP_COLORS,
  columnLabels: MESSAGES_COLUMN_LABELS,
  blockSize: MESSAGES_BLOCK_SIZE,
  fetchRows: (agentId, params) => ApiService.getHistoryMessagesIrm(agentId, params),
  renderDetail: (record, onClose) => (
    <RecordDetailPanel
      open={record != null}
      eyebrow="Message"
      title={record ? record.id : ''}
      ariaLabel="Message details"
      sections={record ? messagesDetailSections(record) : []}
      onClose={onClose}
    />
  ),
  noRowsText: 'No messages for this agent',
};
