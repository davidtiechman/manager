// One history table = one GridConfig, rendered by HistoryDataGrid.

import type { ReactNode } from 'react';
import type { ColDef, ColGroupDef } from 'ag-grid-community';
import type { IrmParams, IrmResponse } from '../../../api';

export interface GridConfig<T> {
  storageKey: string;                                  // namespaces saved layout
  columnDefs: (ColDef<T> | ColGroupDef<T>)[];
  groupColors: Record<string, string>;                 // slug → color
  groupLabelColors: Record<string, string>;            // translated group label → color
  columnLabels: Record<string, string>;                // colId → label
  blockSize: number;
  fetchRows: (agentId: string, params: IrmParams) => Promise<IrmResponse<T>>;
  renderDetail: (record: T | null, onClose: () => void) => ReactNode;
  noRowsText: string;
}
