/**
 * syncGrid.columns.tsx
 *
 * Exports everything that is purely about column shape / cell rendering:
 *   - module-level constants  (BLOCK_SIZE, LS_COL_KEY, DEFAULT_HIDDEN, …)
 *   - cell renderer components (internal – not exported)
 *   - buildColumnDefs()
 *
 * Nothing in this file knows about React state, routing, or the AG Grid
 * API instance.  It is safe to import from any context.
 */

import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import type { AgentHistoryRecord } from '../../types/history/agentHistoryRecord';

// ── Constants ───────────────────────────────────────────────────────

export const BLOCK_SIZE = 100;
export const LS_COL_KEY = 'snc-col-state';

/** Columns hidden by default (first load, no saved state) */
export const DEFAULT_HIDDEN: string[] = [
  'nextDeliveryTime',
  'geoData',
  'serverLut',
  'reliability',
  'linkTimestamp',
];

/** Human-readable label for each column */
export const COLUMN_LABELS: Record<string, string> = {
  createdAt:        'Created At',
  id:               'ID',
  status:           'Status',
  selectedLink:     'Selected Link',
  schedulerMode:    'Scheduler Mode',
  messagesInQueue:  'Msgs In Queue',
  nextDeliveryTime: 'Next Delivery',
  geoData:          'Geo Data',
  serverLut:        'Server LUT',
  linkType:         'Link Type',
  linkAvailable:    'Available',
  linkQuality:      'Quality',
  latency:          'Latency',
  reliability:      'Reliability',
  linkTimestamp:    'Link Timestamp',
};

/** Column groups shown in the picker panel */
export const COLUMN_GROUPS: Array<{ label: string; cols: string[] }> = [
  {
    label: 'General',
    cols: ['createdAt', 'id', 'status'],
  },
  {
    label: 'Sync Details',
    cols: ['selectedLink', 'schedulerMode', 'messagesInQueue', 'nextDeliveryTime', 'geoData', 'serverLut'],
  },
  {
    label: 'Link Quality',
    cols: ['linkType', 'linkAvailable', 'linkQuality', 'latency', 'reliability', 'linkTimestamp'],
  },
];

// ── Cell renderers ──────────────────────────────────────────────────

function StatusCell({ value }: ICellRendererParams) {
  if (value == null || value === '') return <span className="snc-null">—</span>;
  const key = String(value).toLowerCase();
  return <span className={`snc-status snc-status--${key}`}>{value}</span>;
}

function AvailabilityCell({ value }: ICellRendererParams) {
  if (value == null) return <span className="snc-null">—</span>;
  const isYes = value === true || value === 'true';
  return (
    <span className={`snc-avail snc-avail--${isYes ? 'yes' : 'no'}`}>
      {isYes ? 'Yes' : 'No'}
    </span>
  );
}

function DateCell({ value }: ICellRendererParams) {
  if (value == null || value === '') return <span className="snc-null">—</span>;
  const raw =
    typeof value === 'number' && value < 1_000_000_000_000 ? value * 1000 : value;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime()))
    return <span title={String(value)}>{String(value)}</span>;
  const formatted = new Intl.DateTimeFormat('he-IL', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(date);
  return (
    <span className="snc-date" title={date.toISOString()}>
      {formatted}
    </span>
  );
}

function NumericCell({ value }: ICellRendererParams) {
  if (value == null || value === '') return <span className="snc-null">—</span>;
  return <span className="snc-num">{String(value)}</span>;
}

function TextCell({ value }: ICellRendererParams) {
  if (value == null || value === '') return <span className="snc-null">—</span>;
  return (
    <span className="snc-text" title={String(value)}>
      {String(value)}
    </span>
  );
}

// ── Column definitions ──────────────────────────────────────────────

export function buildColumnDefs(): ColDef<AgentHistoryRecord>[] {
  return [
    {
      field: 'createdAt',
      headerName: 'Created At',
      headerTooltip: 'Created At',
      pinned: 'left',
      width: 160,
      minWidth: 130,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
    },
    {
      field: 'id',
      headerName: 'ID',
      headerTooltip: 'ID',
      width: 72,
      minWidth: 62,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
      sort: 'desc',
    },
    {
      field: 'status',
      headerName: 'Status',
      headerTooltip: 'Status',
      width: 95,
      minWidth: 80,
      cellRenderer: StatusCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'selectedLink',
      headerName: 'Selected Link',
      headerTooltip: 'Selected Link',
      valueGetter: (p) => p.data?.details?.selectedLink,
      flex: 1.5,
      minWidth: 85,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'schedulerMode',
      headerName: 'Scheduler Mode',
      headerTooltip: 'Scheduler Mode',
      valueGetter: (p) => p.data?.details?.schedulerMode,
      flex: 1.5,
      minWidth: 95,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'messagesInQueue',
      headerName: 'Msgs In Queue',
      headerTooltip: 'Messages In Queue',
      valueGetter: (p) => p.data?.details?.messagesInQueue,
      flex: 1,
      minWidth: 80,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
    },
    {
      colId: 'nextDeliveryTime',
      headerName: 'Next Delivery',
      headerTooltip: 'Next Delivery Time',
      valueGetter: (p) => p.data?.details?.nextDeliveryTime,
      flex: 2,
      minWidth: 130,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
      hide: true,
    },
    {
      colId: 'geoData',
      headerName: 'Geo Data',
      headerTooltip: 'Geo Data',
      valueGetter: (p) => p.data?.details?.geoData,
      flex: 1,
      minWidth: 75,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
      hide: true,
    },
    {
      colId: 'serverLut',
      headerName: 'Server LUT',
      headerTooltip: 'Server Last Update Time',
      valueGetter: (p) => p.data?.details?.serverLut,
      flex: 2,
      minWidth: 130,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
      hide: true,
    },
    {
      colId: 'linkType',
      headerName: 'Link Type',
      headerTooltip: 'Link Type',
      valueGetter: (p) => p.data?.link_quality?.type,
      flex: 1,
      minWidth: 75,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'linkAvailable',
      headerName: 'Available',
      headerTooltip: 'Link Available',
      valueGetter: (p) => p.data?.link_quality?.available,
      flex: 1,
      minWidth: 75,
      cellRenderer: AvailabilityCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'linkQuality',
      headerName: 'Quality',
      headerTooltip: 'Link Quality',
      valueGetter: (p) => p.data?.link_quality?.quality,
      flex: 1,
      minWidth: 65,
      cellRenderer: TextCell,
      filter: 'agTextColumnFilter',
    },
    {
      colId: 'latency',
      headerName: 'Latency (ms)',
      headerTooltip: 'Latency in milliseconds',
      valueGetter: (p) => p.data?.link_quality?.latency,
      flex: 1,
      minWidth: 75,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
    },
    {
      colId: 'reliability',
      headerName: 'Reliability',
      headerTooltip: 'Link Reliability',
      valueGetter: (p) => p.data?.link_quality?.reliability,
      flex: 1,
      minWidth: 70,
      filter: 'agNumberColumnFilter',
      cellRenderer: NumericCell,
      hide: true,
    },
    {
      colId: 'linkTimestamp',
      headerName: 'Link Timestamp',
      headerTooltip: 'Link Quality Timestamp',
      valueGetter: (p) => p.data?.link_quality?.timestamp,
      flex: 2,
      minWidth: 130,
      cellRenderer: DateCell,
      filter: 'agDateColumnFilter',
      hide: true,
    },
  ];
}
