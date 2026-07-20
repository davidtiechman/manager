// Messages column definitions (all visible).

import type { ColDef, ColGroupDef } from 'ag-grid-community';
import type { TFunction } from 'i18next';
import type { AgentMessageRecord } from '../../types/history/agentMessageRecord';
import { ContentType } from '../../types/serverEnums';
import {
  makeCol,
  groupColumns,
  buildColumnLabels,
  groupColorMap,
  groupSlug,
  DateCell,
  NumericCell,
  TextCell,
  AvailabilityCell,
  type ColInput,
  type GridColDef,
  type GroupDef,
} from './grid/gridCells';
import { JsonPreviewCell, JsonCellTooltip } from './json/JsonPreviewCell';

export const MESSAGES_BLOCK_SIZE = 200;

// Column groups (name + color).
export const MESSAGES_GROUP_DEFS = [
  { name: 'General', color: '#0284c7' }, // sky
  { name: 'Message', color: '#7c3aed' }, // violet
  { name: 'Payload', color: '#059669' }, // emerald
  { name: 'Platform Data', color: '#d97706' }, // amber
] as const satisfies readonly GroupDef[];

type MessageGroup = (typeof MESSAGES_GROUP_DEFS)[number]['name'];
const GROUP_ORDER: MessageGroup[] = MESSAGES_GROUP_DEFS.map((g) => g.name);

export const MESSAGES_GROUP_COLORS: Record<string, string> = groupColorMap(MESSAGES_GROUP_DEFS);

const col = (def: ColInput<AgentMessageRecord>): GridColDef<AgentMessageRecord> =>
  makeCol<AgentMessageRecord>(def);

// Translated group name, keyed by stable slug.
const groupLabel = (t: TFunction) => (name: string) => t(`groups.${groupSlug(name)}`);

function buildColumnDefsInternal(
  t: TFunction,
  dir: 'rtl' | 'ltr'
): GridColDef<AgentMessageRecord>[] {
  const c = (id: string) => t(`messages.columns.${id}`);
  const tip = (id: string) => t(`messages.tooltips.${id}`);
  const pinStart = dir === 'rtl' ? 'right' : 'left'; // freeze on the leading edge
  return [
    // ── General ──────────────────────────────────────────────────
    col({
      group: 'General',
      field: 'receivedAt',
      headerName: c('receivedAt'),
      headerTooltip: tip('receivedAt'),
      pinned: pinStart,
      width: 170,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
    }),
    col({
      group: 'General',
      field: 'sentAt',
      headerName: c('sentAt'),
      headerTooltip: tip('sentAt'),
      width: 170,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
    }),
    col({
      group: 'General',
      field: 'id',
      headerName: c('id'),
      headerTooltip: tip('id'),
      flex: 1.5,
      minWidth: 150,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    }),
    col({
      group: 'General',
      colId: 'agentId',
      headerName: c('agentId'),
      headerTooltip: tip('agentId'),
      valueGetter: (p) => p.data?.agent?.id,
      flex: 1,
      minWidth: 110,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    }),

    // ── Message ──────────────────────────────────────────────────
    col({
      group: 'Message',
      field: 'contentType',
      headerName: c('contentType'),
      headerTooltip: tip('contentType'),
      width: 130,
      enum: ContentType,
    }),
    col({
      group: 'Message',
      field: 'priority',
      headerName: c('priority'),
      headerTooltip: tip('priority'),
      width: 110,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
    }),
    col({
      group: 'Message',
      field: 'processed',
      headerName: c('processed'),
      headerTooltip: tip('processed'),
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
      headerName: c('content'),
      headerTooltip: tip('content'),
      flex: 2,
      minWidth: 160,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    }),

    // ── Payload ──────────────────────────────────────────────────
    col({
      group: 'Payload',
      field: 'contentJson',
      headerName: c('contentJson'),
      headerTooltip: tip('contentJson'),
      flex: 2,
      minWidth: 160,
      cellRenderer: JsonPreviewCell,
      tooltipComponent: JsonCellTooltip,
      // Sentinel: any truthy string shows the tooltip; '' suppresses it.
      tooltipValueGetter: (p) =>
        p.data == null || p.value == null || p.value === '' ? '' : 'json',
      filter: 'agTextColumnFilter',
    }),
    col({
      group: 'Payload',
      field: 'contentExcel',
      headerName: c('contentExcel'),
      headerTooltip: tip('contentExcel'),
      flex: 2,
      minWidth: 160,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    }),

    // ── Platform Data ────────────────────────────────────────────
    col({
      group: 'Platform Data',
      colId: 'platform',
      headerName: c('platform'),
      headerTooltip: tip('platform'),
      valueGetter: (p) => p.data?.platform?.platform,
      flex: 1.2,
      minWidth: 120,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    }),
    col({
      group: 'Platform Data',
      colId: 'platformId',
      headerName: c('platformId'),
      headerTooltip: tip('platformId'),
      valueGetter: (p) => p.data?.platform?.platformId,
      width: 120,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
    }),
    col({
      group: 'Platform Data',
      colId: 'unit',
      headerName: c('unit'),
      headerTooltip: tip('unit'),
      valueGetter: (p) => p.data?.platform?.unit,
      flex: 1.2,
      minWidth: 120,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
      hide: true,
    }),
    col({
      group: 'Platform Data',
      colId: 'unitCode',
      headerName: c('unitCode'),
      headerTooltip: tip('unitCode'),
      valueGetter: (p) => p.data?.platform?.unitCode,
      flex: 1,
      minWidth: 110,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
      hide: true,
    }),
    col({
      group: 'Platform Data',
      colId: 'zayadId',
      headerName: c('zayadId'),
      headerTooltip: tip('zayadId'),
      valueGetter: (p) => p.data?.platform?.zayadId,
      width: 120,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
      hide: true,
    }),
  ];
}

export function buildMessagesColumnDefs(
  t: TFunction,
  dir: 'rtl' | 'ltr'
): (ColDef<AgentMessageRecord> | ColGroupDef<AgentMessageRecord>)[] {
  return groupColumns(buildColumnDefsInternal(t, dir), GROUP_ORDER, groupLabel(t));
}

// colId → translated label.
export function buildMessagesColumnLabelsFor(t: TFunction): Record<string, string> {
  return buildColumnLabels(buildColumnDefsInternal(t, 'ltr'));
}

// Translated group label → color.
export function messagesGroupLabelColors(t: TFunction): Record<string, string> {
  return Object.fromEntries(
    MESSAGES_GROUP_DEFS.map((g) => [t(`groups.${groupSlug(g.name)}`), g.color])
  );
}
