// Wires the sync-history table into the shared HistoryDataGrid.

import type { TFunction } from 'i18next';
import { ApiService } from '../../api';
import type { AgentHistoryRecord } from '../../types/history/agentHistoryRecord';
import type { GridConfig } from './grid/gridConfig';
import { RecordDetailPanel } from './grid/RecordDetailPanel';
import {
  BLOCK_SIZE,
  buildColumnDefs,
  buildColumnLabelsFor,
  groupLabelColors,
  GROUP_COLORS,
} from './syncGrid.columns';
import { syncsDetailSections } from './syncsDetailSections';

export function syncsConfig(t: TFunction): GridConfig<AgentHistoryRecord> {
  return {
    storageKey: 'snc-col-state',
    columnDefs: buildColumnDefs(t),
    groupColors: GROUP_COLORS,
    groupLabelColors: groupLabelColors(t),
    columnLabels: buildColumnLabelsFor(t),
    blockSize: BLOCK_SIZE,
    fetchRows: (agentId, params) => ApiService.getHistorySyncsIrm(agentId, params),
    renderDetail: (record, onClose) => (
      <RecordDetailPanel
        open={record != null}
        eyebrow={t('detail.syncEyebrow')}
        title={record ? `#${record.id}` : ''}
        ariaLabel={t('detail.syncAria')}
        closeLabel={t('detail.closeDetails')}
        sections={record ? syncsDetailSections(record, t) : []}
        onClose={onClose}
      />
    ),
    noRowsText: t('noRows.syncs'),
  };
}
