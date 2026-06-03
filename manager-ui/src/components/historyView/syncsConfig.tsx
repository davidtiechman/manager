// Wires the sync-history table into the shared HistoryDataGrid.

import { ApiService } from '../../api';
import type { AgentHistoryRecord } from '../../types/history/agentHistoryRecord';
import type { GridConfig } from './grid/gridConfig';
import { RecordDetailPanel } from './grid/RecordDetailPanel';
import { BLOCK_SIZE, buildColumnDefs, COLUMN_LABELS, GROUP_COLORS } from './syncGrid.columns';
import { syncsDetailSections } from './syncsDetailSections';

export const syncsConfig: GridConfig<AgentHistoryRecord> = {
  storageKey: 'snc-col-state',
  columnDefs: buildColumnDefs(),
  groupColors: GROUP_COLORS,
  columnLabels: COLUMN_LABELS,
  blockSize: BLOCK_SIZE,
  fetchRows: (agentId, params) => ApiService.getHistorySyncsIrm(agentId, params),
  renderDetail: (record, onClose) => (
    <RecordDetailPanel
      open={record != null}
      eyebrow="Sync"
      title={record ? `#${record.id}` : ''}
      ariaLabel="Sync details"
      sections={record ? syncsDetailSections(record) : []}
      onClose={onClose}
    />
  ),
  noRowsText: 'אין רשומות עבור agent זה',
};
