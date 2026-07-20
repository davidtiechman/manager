// Wires the messages table into the shared HistoryDataGrid.

import type { TFunction } from 'i18next';
import { ApiService } from '../../api';
import type { AgentMessageRecord } from '../../types/history/agentMessageRecord';
import type { GridConfig } from './grid/gridConfig';
import { RecordDetailPanel } from './grid/RecordDetailPanel';
import {
  MESSAGES_BLOCK_SIZE,
  MESSAGES_GROUP_COLORS,
  buildMessagesColumnDefs,
  buildMessagesColumnLabelsFor,
  messagesGroupLabelColors,
} from './messagesGrid.columns';
import { messagesDetailSections } from './messagesDetailSections';

export function messagesConfig(t: TFunction, dir: 'rtl' | 'ltr'): GridConfig<AgentMessageRecord> {
  return {
    storageKey: 'msg-col-state',
    columnDefs: buildMessagesColumnDefs(t, dir),
    groupColors: MESSAGES_GROUP_COLORS,
    groupLabelColors: messagesGroupLabelColors(t),
    columnLabels: buildMessagesColumnLabelsFor(t),
    blockSize: MESSAGES_BLOCK_SIZE,
    fetchRows: (agentId, params) => ApiService.getHistoryMessagesIrm(agentId, params),
    renderDetail: (record, onClose) => (
      <RecordDetailPanel
        open={record != null}
        eyebrow={t('detail.messageEyebrow')}
        title={record ? record.id : ''}
        ariaLabel={t('detail.messageAria')}
        closeLabel={t('detail.closeDetails')}
        sections={record ? messagesDetailSections(record, t) : []}
        onClose={onClose}
        expandable
        expandLabel={t('detail.expand')}
        collapseLabel={t('detail.collapse')}
      />
    ),
    noRowsText: t('noRows.messages'),
  };
}
