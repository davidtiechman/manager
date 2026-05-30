// Single source of truth for every column in the sync-history grid.
// To add a column: add one col() entry in buildColumnDefs() (set `group`).
// To add a category: add one entry to GROUP_DEFS (name + color).

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

// ── Column groups ───────────────────────────────────────────────────
// Add a category here (name + color); order/colors derive automatically.
export const GROUP_DEFS = [
  { name: 'General',      color: '#0284c7' }, // sky
  { name: 'Sync Details', color: '#7c3aed' }, // violet
  { name: 'Link Quality', color: '#059669' }, // emerald
] as const;

export type ColGroup = (typeof GROUP_DEFS)[number]['name'];
const GROUP_ORDER: ColGroup[] = GROUP_DEFS.map((g) => g.name);

/** Group name → CSS slug, e.g. 'Sync Details' → 'sync-details'. */
function groupSlug(group: string): string {
  return group.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/** slug → color map, used by the component for per-group CSS. */
export const GROUP_COLORS: Record<string, string> = Object.fromEntries(
  GROUP_DEFS.map((g) => [groupSlug(g.name), g.color])
);

/** Allowed shapes for the `enum` field on a column definition. */
type EnumSource = Record<string, string> | readonly (string | boolean)[];

interface SyncColDefInput extends Omit<ColDef<AgentHistoryRecord>, 'context'> {
  group: ColGroup;
  enum?: EnumSource;
}

type SyncColDef = ColDef<AgentHistoryRecord> & {
  context: { group: ColGroup };
};

// ── Auto-minWidth factory ───────────────────────────────────────────

/** Approximate px per character at 12.5 px / weight-600 Inter */
const CHAR_WIDTH    = 7.5;
/** Sort icon + cell padding shared by every header cell */
const HDR_OVERHEAD  = 44;

/** Extract the runtime values from an EnumSource (string-enum object or array). */
function enumValues(source: EnumSource): (string | boolean)[] {
  return Array.isArray(source) ? [...source] : Object.values(source);
}

/** Label shown in the set-filter dropdown for null/undefined values. */
const BLANKS_LABEL = '(Blanks)';

type SetFilterValueFormatter = (params: { value: unknown }) => string;

/** Show null/undefined as "(Blanks)" in the filter dropdown. */
function withBlanksFormatter(
  userFormatter: SetFilterValueFormatter | undefined
): SetFilterValueFormatter {
  return (params) => {
    if (params.value == null) return BLANKS_LABEL;
    if (userFormatter) return userFormatter(params);
    return String(params.value);
  };
}

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

  const chipRendererFromEnum =
    enumDef && !rest.cellRenderer ? { cellRenderer: EnumChipCell } : null;

  const headerClass = `snc-hdr-group snc-hdr-group--${groupSlug(group)}`;

  return {
    ...rest,
    ...(setFilterFromEnum ?? {}),
    ...(chipRendererFromEnum ?? {}),
    headerClass: rest.headerClass ?? headerClass,
    minWidth: rest.minWidth ?? autoMin,
    context: { group },
  };
}

// ── Cell renderers (internal) ───────────────────────────────────────

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

/** Colored chip for enum values: snc-chip snc-chip--{colId}-{value-slug}. */
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
// Add a new column here ONLY. Labels and groups are derived below.

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
  ];
}

// ── Public API ──────────────────────────────────────────────────────

// Wraps flat columns into ColGroupDefs by context.group (drives the tool
// panels). The grid's group header row is collapsed via groupHeaderHeight={0}.
export function buildColumnDefs(): (ColDef<AgentHistoryRecord> | ColGroupDef<AgentHistoryRecord>)[] {
  const defs = buildColumnDefsInternal();
  return GROUP_ORDER.map((groupName) => ({
    headerName: groupName,
    groupId: groupName,
    toolPanelClass: `snc-tp-group snc-tp-group--${groupSlug(groupName)}`,
    children: defs.filter((d) => d.context?.group === groupName),
  })).filter((g) => g.children.length > 0);
}

/** colId → headerName map, used by the toolbar's active-filter chips. */
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

/** colId → human label (e.g. 'selectedLink' → 'Selected Link') */
export const COLUMN_LABELS = buildColumnLabels(_defs);
