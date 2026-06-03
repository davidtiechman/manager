// Sync-history column definitions.

import type { ColDef, ColGroupDef } from 'ag-grid-community';
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

export const BLOCK_SIZE = 100;

// Column groups (name + color).
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

// ── Column definitions ──────────────────────────────────────────────

function buildColumnDefsInternal(): GridColDef<AgentHistoryRecord>[] {
  return [
    // ── General ──────────────────────────────────────────────────
    col({
      group: 'General',
      field: 'createdAt',
      headerName: 'Created At',
      headerTooltip: 'Created At',
      pinned: 'left',
      width: 160,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
    }),
    col({
      group: 'General',
      field: 'id',
      headerName: 'ID',
      headerTooltip: 'ID',
      width: 82,
      minWidth: 72,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
      sort: 'desc',
    }),
    col({
      group: 'General',
      field: 'status',
      headerName: 'Status',
      headerTooltip: 'Status',
      width: 105,
      cellRenderer: StatusCell,
      enum: StatusAgent,
    }),

    // ── Sync Details ─────────────────────────────────────────────
    col({
      group: 'Sync Details',
      colId: 'selectedLink',
      headerName: 'Selected Link',
      headerTooltip: 'Selected Link',
      valueGetter: (p) => p.data?.details?.selectedLink,
      flex: 1.5,
      enum: LinkType,
    }),
    col({
      group: 'Sync Details',
      colId: 'schedulerMode',
      headerName: 'Scheduler Mode',
      headerTooltip: 'Scheduler Mode',
      valueGetter: (p) => p.data?.details?.schedulerMode,
      flex: 1.5,
      enum: SchedulerMode,
    }),
    col({
      group: 'Sync Details',
      colId: 'messagesInQueue',
      headerName: 'Msgs In Queue',
      headerTooltip: 'Messages In Queue',
      valueGetter: (p) => p.data?.details?.messagesInQueue,
      flex: 1,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
    }),
    col({
      group: 'Sync Details',
      colId: 'nextDeliveryTime',
      headerName: 'Next Delivery',
      headerTooltip: 'Next Delivery Time',
      valueGetter: (p) => p.data?.details?.nextDeliveryTime,
      flex: 2,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
      hide: true,
    }),
    col({
      group: 'Sync Details',
      colId: 'geoData',
      headerName: 'Geo Data',
      headerTooltip: 'Geo Data',
      valueGetter: (p) => p.data?.details?.geoData,
      flex: 1,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
      hide: true,
    }),
    col({
      group: 'Sync Details',
      colId: 'serverLut',
      headerName: 'Server LUT',
      headerTooltip: 'Server Last Update Time',
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
      headerName: 'Link Type',
      headerTooltip: 'Link Type',
      valueGetter: (p) => p.data?.link_quality?.type,
      flex: 1,
      enum: LinkType,
    }),
    col({
      group: 'Link Quality',
      colId: 'linkAvailable',
      headerName: 'Available',
      headerTooltip: 'Link Available',
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
      headerName: 'Quality',
      headerTooltip: 'Link Quality',
      valueGetter: (p) => p.data?.link_quality?.quality,
      flex: 1,
      enum: LinkQualityType,
    }),
    col({
      group: 'Link Quality',
      colId: 'latency',
      headerName: 'Latency (ms)',
      headerTooltip: 'Latency in milliseconds',
      valueGetter: (p) => p.data?.link_quality?.latency,
      flex: 1,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
    }),
    col({
      group: 'Link Quality',
      colId: 'reliability',
      headerName: 'Reliability',
      headerTooltip: 'Link Reliability',
      valueGetter: (p) => p.data?.link_quality?.reliability,
      flex: 1,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
      hide: true,
    }),
    col({
      group: 'Link Quality',
      colId: 'linkTimestamp',
      headerName: 'Link Timestamp',
      headerTooltip: 'Link Quality Timestamp',
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
      headerName: 'Cfg Scheduler',
      headerTooltip: 'Agent Config — Scheduler Mode',
      valueGetter: (p) => p.data?.details?.agentConfig?.schedulerMode,
      flex: 1.2,
      enum: SchedulerMode,
      hide: true,
    }),
    col({
      group: 'Agent Config',
      colId: 'cfgSelectedLink',
      headerName: 'Cfg Link',
      headerTooltip: 'Agent Config — Selected Link',
      valueGetter: (p) => p.data?.details?.agentConfig?.selectedLink,
      flex: 1,
      enum: LinkType,
      hide: true,
    }),
    col({
      group: 'Agent Config',
      colId: 'intervalMs',
      headerName: 'Interval (ms)',
      headerTooltip: 'Agent Config — Interval (ms)',
      valueGetter: (p) => p.data?.details?.agentConfig?.intervalMs,
      flex: 1,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
      hide: true,
    }),
    col({
      group: 'Agent Config',
      colId: 'maxRetries',
      headerName: 'Max Retries',
      headerTooltip: 'Agent Config — Max Retries',
      valueGetter: (p) => p.data?.details?.agentConfig?.maxRetries,
      flex: 1,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
      hide: true,
    }),
    col({
      group: 'Agent Config',
      colId: 'batchSize',
      headerName: 'Batch Size',
      headerTooltip: 'Agent Config — Batch Size',
      valueGetter: (p) => p.data?.details?.agentConfig?.batchSize,
      flex: 1,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
      hide: true,
    }),
    col({
      group: 'Agent Config',
      colId: 'isManualMode',
      headerName: 'Manual Mode',
      headerTooltip: 'Agent Config — Manual Mode',
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
      headerName: 'Spark Proxy URL',
      headerTooltip: 'Agent Config — Spark Proxy URL',
      valueGetter: (p) => p.data?.details?.agentConfig?.sparkProxyUrl,
      flex: 2,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
      hide: true,
    }),
    col({
      group: 'Agent Config',
      colId: 'token',
      headerName: 'Token',
      headerTooltip: 'Agent Config — Token',
      valueGetter: (p) => p.data?.details?.agentConfig?.token,
      flex: 1.5,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
      hide: true,
    }),
    col({
      group: 'Agent Config',
      colId: 'cfgCreatedAt',
      headerName: 'Cfg Created At',
      headerTooltip: 'Agent Config — Created At',
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
      headerName: 'Unit',
      headerTooltip: 'Platform — Unit',
      valueGetter: (p) => p.data?.details?.platfromData?.unit,
      flex: 1.2,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
      hide: true,
    }),
    col({
      group: 'Platform Data',
      colId: 'unitCode',
      headerName: 'Unit Code',
      headerTooltip: 'Platform — Unit Code',
      valueGetter: (p) => p.data?.details?.platfromData?.unitCode,
      flex: 1,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
      hide: true,
    }),
    col({
      group: 'Platform Data',
      colId: 'zayadId',
      headerName: 'Zayad ID',
      headerTooltip: 'Platform — Zayad ID',
      valueGetter: (p) => p.data?.details?.platfromData?.zayadId,
      flex: 1.2,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
      hide: true,
    }),
    col({
      group: 'Platform Data',
      colId: 'platform',
      headerName: 'Platform',
      headerTooltip: 'Platform — Name',
      valueGetter: (p) => p.data?.details?.platfromData?.platform,
      flex: 1.2,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
      hide: true,
    }),
    col({
      group: 'Platform Data',
      colId: 'platformId',
      headerName: 'Platform ID',
      headerTooltip: 'Platform — ID',
      valueGetter: (p) => p.data?.details?.platfromData?.platformId,
      flex: 1.2,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
      hide: true,
    }),
    col({
      group: 'Platform Data',
      colId: 'platCreatedAt',
      headerName: 'Plat Created At',
      headerTooltip: 'Platform — Created At',
      valueGetter: (p) => p.data?.details?.platfromData?.createdAt,
      flex: 2,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
      hide: true,
    }),
  ];
}

// ── Public API ──────────────────────────────────────────────────────

export function buildColumnDefs(): (ColDef<AgentHistoryRecord> | ColGroupDef<AgentHistoryRecord>)[] {
  return groupColumns(buildColumnDefsInternal(), GROUP_ORDER);
}

// colId → human label.
export const COLUMN_LABELS: Record<string, string> = buildColumnLabels(buildColumnDefsInternal());
