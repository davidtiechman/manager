// Sync-history column definitions.

import type { ColDef, ColGroupDef } from 'ag-grid-community';
import type { TFunction } from 'i18next';
import type { AgentHistoryRecord } from '../../types/history/agentHistoryRecord';
import {
  LinkQualityType,
  LinkType,
  SchedulerMode,
  StatusAgent,
} from '../../types/serverEnums';
import {
  makeCol,
  groupColumns,
  buildColumnLabels,
  groupColorMap,
  groupSlug,
  DateCell,
  NumericCell,
  TextCell,
  StatusCell,
  AvailabilityCell,
  type ColInput,
  type GridColDef,
  type GroupDef,
} from './grid/gridCells';

// ── Grid constants ──────────────────────────────────────────────────

export const BLOCK_SIZE = 200;

// Column groups (English name = stable color slug + color).
export const GROUP_DEFS = [
  { name: 'General',       color: '#0284c7' }, // sky
  { name: 'Sync Details',  color: '#7c3aed' }, // violet
  { name: 'Agent Config',  color: '#d97706' }, // amber
  { name: 'Platform Data', color: '#db2777' }, // rose
  { name: 'Link Quality',  color: '#059669' }, // emerald
] as const satisfies readonly GroupDef[];

export type ColGroup = (typeof GROUP_DEFS)[number]['name'];
const GROUP_ORDER: ColGroup[] = GROUP_DEFS.map((g) => g.name);

// slug → color map.
export const GROUP_COLORS: Record<string, string> = groupColorMap(GROUP_DEFS);

// Bind the factory to this row type.
const col = (def: ColInput<AgentHistoryRecord>): GridColDef<AgentHistoryRecord> =>
  makeCol<AgentHistoryRecord>(def);

// Translated group name, keyed by stable slug.
const groupLabel = (t: TFunction) => (name: string) => t(`groups.${groupSlug(name)}`);

// ── Column definitions ──────────────────────────────────────────────

function buildColumnDefsInternal(
  t: TFunction,
  dir: 'rtl' | 'ltr'
): GridColDef<AgentHistoryRecord>[] {
  const c = (id: string) => t(`sync.columns.${id}`);
  const tip = (id: string) => t(`sync.tooltips.${id}`);
  const pinStart = dir === 'rtl' ? 'right' : 'left'; // freeze on the leading edge
  return [
    // ── General ──────────────────────────────────────────────────
    col({
      group: 'General',
      field: 'createdAt',
      headerName: c('createdAt'),
      headerTooltip: tip('createdAt'),
      pinned: pinStart,
      width: 160,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
    }),
    col({
      group: 'General',
      field: 'id',
      headerName: c('id'),
      headerTooltip: tip('id'),
      width: 82,
      minWidth: 72,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
      sort: 'desc',
    }),
    col({
      group: 'General',
      field: 'status',
      headerName: c('status'),
      headerTooltip: tip('status'),
      width: 105,
      cellRenderer: StatusCell,
      enum: StatusAgent,
    }),

    // ── Sync Details ─────────────────────────────────────────────
    col({
      group: 'Sync Details',
      colId: 'selectedLink',
      headerName: c('selectedLink'),
      headerTooltip: tip('selectedLink'),
      valueGetter: (p) => p.data?.details?.selectedLink,
      flex: 1.5,
      enum: LinkType,
    }),
    col({
      group: 'Sync Details',
      colId: 'schedulerMode',
      headerName: c('schedulerMode'),
      headerTooltip: tip('schedulerMode'),
      valueGetter: (p) => p.data?.details?.schedulerMode,
      flex: 1.5,
      enum: SchedulerMode,
    }),
    col({
      group: 'Sync Details',
      colId: 'messagesInQueue',
      headerName: c('messagesInQueue'),
      headerTooltip: tip('messagesInQueue'),
      valueGetter: (p) => p.data?.details?.messagesInQueue,
      flex: 1,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
    }),
    col({
      group: 'Sync Details',
      colId: 'nextDeliveryTime',
      headerName: c('nextDeliveryTime'),
      headerTooltip: tip('nextDeliveryTime'),
      valueGetter: (p) => p.data?.details?.nextDeliveryTime,
      flex: 2,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
      hide: true,
    }),
    col({
      group: 'Sync Details',
      colId: 'geoData',
      headerName: c('geoData'),
      headerTooltip: tip('geoData'),
      valueGetter: (p) => p.data?.details?.geoData,
      flex: 1,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
      hide: true,
    }),
    col({
      group: 'Sync Details',
      colId: 'serverLut',
      headerName: c('serverLut'),
      headerTooltip: tip('serverLut'),
      valueGetter: (p) => p.data?.details?.serverLut,
      flex: 2,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
      hide: true,
    }),

    // ── Link Quality ─────────────────────────────────────────────
    col({
      group: 'Link Quality',
      colId: 'linkType',
      headerName: c('linkType'),
      headerTooltip: tip('linkType'),
      valueGetter: (p) => p.data?.link_quality?.type,
      flex: 1,
      enum: LinkType,
    }),
    col({
      group: 'Link Quality',
      colId: 'linkAvailable',
      headerName: c('linkAvailable'),
      headerTooltip: tip('linkAvailable'),
      valueGetter: (p) => p.data?.link_quality?.available,
      flex: 1,
      cellRenderer: AvailabilityCell,
      enum: [true, false],
      filterParams: {
        valueFormatter: (p: { value: unknown }) =>
          p.value === true || p.value === 'true' ? 'Yes' : 'No',
      },
    }),
    col({
      group: 'Link Quality',
      colId: 'linkQuality',
      headerName: c('linkQuality'),
      headerTooltip: tip('linkQuality'),
      valueGetter: (p) => p.data?.link_quality?.quality,
      flex: 1,
      enum: LinkQualityType,
    }),
    col({
      group: 'Link Quality',
      colId: 'latency',
      headerName: c('latency'),
      headerTooltip: tip('latency'),
      valueGetter: (p) => p.data?.link_quality?.latency,
      flex: 1,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
    }),
    col({
      group: 'Link Quality',
      colId: 'reliability',
      headerName: c('reliability'),
      headerTooltip: tip('reliability'),
      valueGetter: (p) => p.data?.link_quality?.reliability,
      flex: 1,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
      hide: true,
    }),
    col({
      group: 'Link Quality',
      colId: 'linkTimestamp',
      headerName: c('linkTimestamp'),
      headerTooltip: tip('linkTimestamp'),
      valueGetter: (p) => p.data?.link_quality?.timestamp,
      flex: 2,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
      hide: true,
    }),

    // ── Agent Config (hidden) ──
    col({
      group: 'Agent Config',
      colId: 'cfgSchedulerMode',
      headerName: c('cfgSchedulerMode'),
      headerTooltip: tip('cfgSchedulerMode'),
      valueGetter: (p) => p.data?.details?.agentConfig?.schedulerMode,
      flex: 1.2,
      enum: SchedulerMode,
      hide: true,
    }),
    col({
      group: 'Agent Config',
      colId: 'cfgSelectedLink',
      headerName: c('cfgSelectedLink'),
      headerTooltip: tip('cfgSelectedLink'),
      valueGetter: (p) => p.data?.details?.agentConfig?.selectedLink,
      flex: 1,
      enum: LinkType,
      hide: true,
    }),
    col({
      group: 'Agent Config',
      colId: 'intervalMs',
      headerName: c('intervalMs'),
      headerTooltip: tip('intervalMs'),
      valueGetter: (p) => p.data?.details?.agentConfig?.intervalMs,
      flex: 1,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
      hide: true,
    }),
    col({
      group: 'Agent Config',
      colId: 'maxRetries',
      headerName: c('maxRetries'),
      headerTooltip: tip('maxRetries'),
      valueGetter: (p) => p.data?.details?.agentConfig?.maxRetries,
      flex: 1,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
      hide: true,
    }),
    col({
      group: 'Agent Config',
      colId: 'batchSize',
      headerName: c('batchSize'),
      headerTooltip: tip('batchSize'),
      valueGetter: (p) => p.data?.details?.agentConfig?.batchSize,
      flex: 1,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
      hide: true,
    }),
    col({
      group: 'Agent Config',
      colId: 'isManualMode',
      headerName: c('isManualMode'),
      headerTooltip: tip('isManualMode'),
      valueGetter: (p) => p.data?.details?.agentConfig?.isManualMode,
      flex: 1,
      cellRenderer: AvailabilityCell,
      enum: [true, false],
      filterParams: {
        valueFormatter: (p: { value: unknown }) =>
          p.value === true || p.value === 'true' ? 'Yes' : 'No',
      },
      hide: true,
    }),
    col({
      group: 'Agent Config',
      colId: 'sparkProxyUrl',
      headerName: c('sparkProxyUrl'),
      headerTooltip: tip('sparkProxyUrl'),
      valueGetter: (p) => p.data?.details?.agentConfig?.sparkProxyUrl,
      flex: 2,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
      hide: true,
    }),
    col({
      group: 'Agent Config',
      colId: 'token',
      headerName: c('token'),
      headerTooltip: tip('token'),
      valueGetter: (p) => p.data?.details?.agentConfig?.token,
      flex: 1.5,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
      hide: true,
    }),
    col({
      group: 'Agent Config',
      colId: 'cfgCreatedAt',
      headerName: c('cfgCreatedAt'),
      headerTooltip: tip('cfgCreatedAt'),
      valueGetter: (p) => p.data?.details?.agentConfig?.createdAt,
      flex: 2,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
      hide: true,
    }),

    // ── Platform Data (hidden) ──
    col({
      group: 'Platform Data',
      colId: 'unit',
      headerName: c('unit'),
      headerTooltip: tip('unit'),
      valueGetter: (p) => p.data?.details?.platfromData?.unit,
      flex: 1.2,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
      hide: true,
    }),
    col({
      group: 'Platform Data',
      colId: 'unitCode',
      headerName: c('unitCode'),
      headerTooltip: tip('unitCode'),
      valueGetter: (p) => p.data?.details?.platfromData?.unitCode,
      flex: 1,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
      hide: true,
    }),
    col({
      group: 'Platform Data',
      colId: 'zayadId',
      headerName: c('zayadId'),
      headerTooltip: tip('zayadId'),
      valueGetter: (p) => p.data?.details?.platfromData?.zayadId,
      flex: 1.2,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
      hide: true,
    }),
    col({
      group: 'Platform Data',
      colId: 'platform',
      headerName: c('platform'),
      headerTooltip: tip('platform'),
      valueGetter: (p) => p.data?.details?.platfromData?.platform,
      flex: 1.2,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
      hide: true,
    }),
    col({
      group: 'Platform Data',
      colId: 'platformId',
      headerName: c('platformId'),
      headerTooltip: tip('platformId'),
      valueGetter: (p) => p.data?.details?.platfromData?.platformId,
      flex: 1.2,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
      hide: true,
    }),
    col({
      group: 'Platform Data',
      colId: 'platCreatedAt',
      headerName: c('platCreatedAt'),
      headerTooltip: tip('platCreatedAt'),
      valueGetter: (p) => p.data?.details?.platfromData?.createdAt,
      flex: 2,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
      hide: true,
    }),
  ];
}

// ── Public API ──────────────────────────────────────────────────────

export function buildColumnDefs(
  t: TFunction,
  dir: 'rtl' | 'ltr'
): (ColDef<AgentHistoryRecord> | ColGroupDef<AgentHistoryRecord>)[] {
  return groupColumns(buildColumnDefsInternal(t, dir), GROUP_ORDER, groupLabel(t));
}

// colId → translated label (filter chips). Pin side irrelevant here.
export function buildColumnLabelsFor(t: TFunction): Record<string, string> {
  return buildColumnLabels(buildColumnDefsInternal(t, 'ltr'));
}

// Translated group label → color (tool-panel title painting).
export function groupLabelColors(t: TFunction): Record<string, string> {
  return Object.fromEntries(GROUP_DEFS.map((g) => [t(`groups.${groupSlug(g.name)}`), g.color]));
}
