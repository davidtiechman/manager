// Column definitions for the sync-history grid.

import type { ColDef, ColGroupDef, ICellRendererParams } from 'ag-grid-community';
import type { AgentHistoryRecord } from '../../types/history/agentHistoryRecord';
import {
  LinkQualityType,
  LinkType,
  SchedulerMode,
  StatusAgent,
} from '../../types/serverEnums';

// ── Grid constants ──────────────────────────────────────────────────

export const BLOCK_SIZE  = 100;

// Column groups (name + color); order and colors derive from here.
export const GROUP_DEFS = [
  { name: 'General',       color: '#0284c7' }, // sky
  { name: 'Sync Details',  color: '#7c3aed' }, // violet
  { name: 'Agent Config',  color: '#d97706' }, // amber
  { name: 'Platform Data', color: '#db2777' }, // rose
  { name: 'Link Quality',  color: '#059669' }, // emerald
] as const;

export type ColGroup = (typeof GROUP_DEFS)[number]['name'];
const GROUP_ORDER: ColGroup[] = GROUP_DEFS.map((g) => g.name);

// Group name → CSS slug ('Sync Details' → 'sync-details').
function groupSlug(group: string): string {
  return group.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

// slug → color map, for per-group CSS.
export const GROUP_COLORS: Record<string, string> = Object.fromEntries(
  GROUP_DEFS.map((g) => [groupSlug(g.name), g.color])
);

type EnumSource = Record<string, string> | readonly (string | boolean)[];

interface SyncColDefInput extends Omit<ColDef<AgentHistoryRecord>, 'context'> {
  group: ColGroup;
  enum?: EnumSource;
}

type SyncColDef = ColDef<AgentHistoryRecord> & {
  context: { group: ColGroup };
};

// ── Auto-minWidth factory ───────────────────────────────────────────

const CHAR_WIDTH    = 7.5; // px per char (12.5px weight-600 Inter)
const HDR_OVERHEAD  = 44;  // sort icon + cell padding

// Runtime values from an EnumSource (enum object or array).
function enumValues(source: EnumSource): (string | boolean)[] {
  return Array.isArray(source) ? [...source] : Object.values(source);
}

const BLANKS_LABEL = '(Blanks)';

type SetFilterValueFormatter = (params: { value: unknown }) => string;

// Show null/undefined as "(Blanks)" in the filter dropdown.
function withBlanksFormatter(
  userFormatter: SetFilterValueFormatter | undefined
): SetFilterValueFormatter {
  return (params) => {
    if (params.value == null) return BLANKS_LABEL;
    if (userFormatter) return userFormatter(params);
    return String(params.value);
  };
}

// Normalize one column input into a full ColDef (filter, icon, skeleton).
function col(def: SyncColDefInput): SyncColDef {
  const { group, enum: enumDef, ...rest } = def;
  const autoMin = rest.headerName
    ? Math.ceil(rest.headerName.length * CHAR_WIDTH) + HDR_OVERHEAD
    : undefined;

  const setFilterFromEnum =
    enumDef && !rest.filter
      ? {
          filter: 'agSetColumnFilter',
          filterParams: {
            ...(rest.filterParams ?? {}),
            values: [...enumValues(enumDef), null],
            valueFormatter: withBlanksFormatter(
              rest.filterParams?.valueFormatter as SetFilterValueFormatter | undefined
            ),
          },
        }
      : null;

  const typeClass = headerTypeClass(enumDef, rest.filter);
  const headerClass = `snc-hdr-group snc-hdr-group--${groupSlug(group)} ${typeClass}`;

  // Base renderer (explicit, enum chip, or plain text), wrapped with skeleton.
  const baseRenderer =
    (rest.cellRenderer as ((p: ICellRendererParams) => JSX.Element) | undefined) ??
    (enumDef ? EnumChipCell : TextCell);

  return {
    ...rest,
    ...(setFilterFromEnum ?? {}),
    cellRenderer: withSkeleton(baseRenderer),
    headerClass: rest.headerClass ?? headerClass,
    minWidth: rest.minWidth ?? autoMin,
    context: { group },
  };
}

// Pick a header type class (→ CSS icon) from the column's enum/filter.
function headerTypeClass(
  enumDef: EnumSource | undefined,
  filter: ColDef['filter']
): string {
  if (enumDef) return 'snc-hdr-type--enum';
  if (filter === 'agDateColumnFilter') return 'snc-hdr-type--date';
  if (filter === 'agNumberColumnFilter') return 'snc-hdr-type--number';
  if (filter === 'agTextColumnFilter') return 'snc-hdr-type--text';
  return 'snc-hdr-type--text';
}

// ── Cell renderers (internal) ───────────────────────────────────────

// Show a skeleton bar while the row's Infinite block is still loading.
function withSkeleton(
  Renderer: (p: ICellRendererParams) => JSX.Element
): (p: ICellRendererParams) => JSX.Element {
  return (params) => {
    if (params.data === undefined) {
      const widths = [40, 55, 70, 60, 45];
      const seed = (params.column?.getColId()?.length ?? 0) % widths.length;
      return (
        <span className="snc-skel" style={{ width: `${widths[seed]}%` }} aria-hidden="true" />
      );
    }
    return Renderer(params);
  };
}

// Colored status badge.
function StatusCell({ value }: ICellRendererParams) {
  if (value == null || value === '') return <span className="snc-null">—</span>;
  const key = String(value).toLowerCase();
  return <span className={`snc-status snc-status--${key}`}>{value}</span>;
}

// Yes/No availability badge.
function AvailabilityCell({ value }: ICellRendererParams) {
  if (value == null) return <span className="snc-null">—</span>;
  const isYes = value === true || value === 'true';
  return (
    <span className={`snc-avail snc-avail--${isYes ? 'yes' : 'no'}`}>
      {isYes ? 'Yes' : 'No'}
    </span>
  );
}

// Format an epoch (s or ms) or ISO string as a he-IL date-time.
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

// Right-aligned numeric value.
function NumericCell({ value }: ICellRendererParams) {
  if (value == null || value === '') return <span className="snc-null">—</span>;
  return <span className="snc-num">{String(value)}</span>;
}

// Plain text with ellipsis + tooltip.
function TextCell({ value }: ICellRendererParams) {
  if (value == null || value === '') return <span className="snc-null">—</span>;
  return (
    <span className="snc-text" title={String(value)}>
      {String(value)}
    </span>
  );
}

// Colored chip for enum values.
function EnumChipCell({ value, column }: ICellRendererParams) {
  if (value == null || value === '') return <span className="snc-null">—</span>;
  const colId = column?.getColId();
  const slug = String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const className = colId ? `snc-chip snc-chip--${colId}-${slug}` : 'snc-chip';
  return (
    <span className={className} title={String(value)}>
      {String(value)}
    </span>
  );
}

// ── Column definitions ──────────────────────────────────────────────

// All columns; labels and groups are derived from this list.
function buildColumnDefsInternal(): SyncColDef[] {
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

    // ── Agent Config (nested in details.agentConfig) — hidden by default ──
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

    // ── Platform Data (nested in details.platfromData) — hidden by default ──
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

// Wrap flat columns into ColGroupDefs by group (drives the tool panels).
export function buildColumnDefs(): (ColDef<AgentHistoryRecord> | ColGroupDef<AgentHistoryRecord>)[] {
  const defs = buildColumnDefsInternal();
  return GROUP_ORDER.map((groupName) => ({
    headerName: groupName,
    groupId: groupName,
    toolPanelClass: `snc-tp-group snc-tp-group--${groupSlug(groupName)}`,
    children: defs.filter((d) => d.context?.group === groupName),
  })).filter((g) => g.children.length > 0);
}

// colId → headerName map, used by the active-filter chips.
export function buildColumnLabels(
  defs: SyncColDef[]
): Record<string, string> {
  return Object.fromEntries(
    defs
      .map((d) => [(d.colId ?? d.field) as string, d.headerName ?? ''])
      .filter(([id]) => Boolean(id))
  );
}

// ── Singleton exports ───────────────────────────────────────────────

const _defs = buildColumnDefsInternal();

// colId → human label.
export const COLUMN_LABELS = buildColumnLabels(_defs);
