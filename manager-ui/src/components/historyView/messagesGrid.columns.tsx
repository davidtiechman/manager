// Messages column definitions (all visible).

import type { ColDef, ColGroupDef } from 'ag-grid-community';
import type { AgentMessageRecord } from '../../types/history/agentMessageRecord';
import { ContentType } from '../../types/serverEnums';
import {
  makeCol,
  groupColumns,
  buildColumnLabels,
  groupColorMap,
  DateCell,
  NumericCell,
  TextCell,
  AvailabilityCell,
  type ColInput,
  type GridColDef,
  type GroupDef,
} from './grid/gridCells';

export const MESSAGES_BLOCK_SIZE = 200;

// Column groups (name + color).
export const MESSAGES_GROUP_DEFS = [
  { name: 'General', color: '#0284c7' }, // sky
  { name: 'Message', color: '#7c3aed' }, // violet
  { name: 'Payload', color: '#059669' }, // emerald
] as const satisfies readonly GroupDef[];

type MessageGroup = (typeof MESSAGES_GROUP_DEFS)[number]['name'];
const GROUP_ORDER: MessageGroup[] = MESSAGES_GROUP_DEFS.map((g) => g.name);

export const MESSAGES_GROUP_COLORS: Record<string, string> = groupColorMap(MESSAGES_GROUP_DEFS);

const col = (def: ColInput<AgentMessageRecord>): GridColDef<AgentMessageRecord> =>
  makeCol<AgentMessageRecord>(def);

function buildColumnDefsInternal(): GridColDef<AgentMessageRecord>[] {
  return [
    // ── General ──────────────────────────────────────────────────
    col({
      group: 'General',
      field: 'receivedAt',
      headerName: 'Received At',
      headerTooltip: 'Received At',
      pinned: 'left',
      width: 170,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
    }),
    col({
      group: 'General',
      field: 'sentAt',
      headerName: 'Sent At',
      headerTooltip: 'Sent At',
      width: 170,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
    }),
    col({
      group: 'General',
      field: 'id',
      headerName: 'ID',
      headerTooltip: 'Message ID',
      flex: 1.5,
      minWidth: 150,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    }),
    col({
      group: 'General',
      field: 'agentId',
      headerName: 'Agent ID',
      headerTooltip: 'Agent ID',
      flex: 1,
      minWidth: 110,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    }),

    // ── Message ──────────────────────────────────────────────────
    col({
      group: 'Message',
      field: 'contentType',
      headerName: 'Content Type',
      headerTooltip: 'Content Type',
      width: 130,
      enum: ContentType,
    }),
    col({
      group: 'Message',
      field: 'priority',
      headerName: 'Priority',
      headerTooltip: 'Priority',
      width: 110,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
    }),
    col({
      group: 'Message',
      field: 'processed',
      headerName: 'Processed',
      headerTooltip: 'Processed',
      width: 120,
      cellRenderer: AvailabilityCell,
      enum: [true, false],
      filterParams: {
        valueFormatter: (p: { value: unknown }) =>
          p.value === true || p.value === 'true' ? 'Yes' : 'No',
      },
    }),
    col({
      group: 'Message',
      field: 'content',
      headerName: 'Content',
      headerTooltip: 'Content',
      flex: 2,
      minWidth: 160,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    }),

    // ── Payload ──────────────────────────────────────────────────
    col({
      group: 'Payload',
      field: 'contentJson',
      headerName: 'Content JSON',
      headerTooltip: 'Content JSON',
      flex: 2,
      minWidth: 160,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    }),
    col({
      group: 'Payload',
      field: 'contentExcel',
      headerName: 'Content Excel',
      headerTooltip: 'Content Excel',
      flex: 2,
      minWidth: 160,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    }),
  ];
}

export function buildMessagesColumnDefs(): (ColDef<AgentMessageRecord> | ColGroupDef<AgentMessageRecord>)[] {
  return groupColumns(buildColumnDefsInternal(), GROUP_ORDER);
}

export const MESSAGES_COLUMN_LABELS: Record<string, string> = buildColumnLabels(buildColumnDefsInternal());
