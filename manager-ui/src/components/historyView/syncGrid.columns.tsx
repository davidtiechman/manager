/**
 * syncGrid.columns.tsx
 *
 * Single source of truth for every column in the sync-history grid.
 *
 * To add a column:
 *   1. Add ONE entry inside buildColumnDefs() using the col() factory.
 *      - Set `group` to place it in the picker panel.
 *      - `minWidth` is auto-calculated from headerName — override only
 *        when you need a specific value.
 *   2. That's it. COLUMN_LABELS and COLUMN_GROUPS are derived automatically.
 *
 * Nothing here knows about React state, routing, or the AG Grid API instance.
 */

import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import type { AgentHistoryRecord } from '../../types/history/agentHistoryRecord';
import {
  LinkQualityType,
  LinkType,
  SchedulerMode,
  StatusAgent,
} from '../../types/serverEnums';

// ── Grid constants ──────────────────────────────────────────────────

export const BLOCK_SIZE  = 100;
export const LS_COL_KEY  = 'snc-col-state';

/** Columns hidden by default (first load, no saved state) */
export const DEFAULT_HIDDEN: string[] = [
  'nextDeliveryTime',
  'geoData',
  'serverLut',
  'reliability',
  'linkTimestamp',
];

// ── Column metadata ─────────────────────────────────────────────────

/** Picker panel group names — order here controls render order */
export type ColGroup = 'General' | 'Sync Details' | 'Link Quality';
const GROUP_ORDER: ColGroup[] = ['General', 'Sync Details', 'Link Quality'];

/** Allowed shapes for the `enum` field on a column definition. */
type EnumSource = Record<string, string> | readonly (string | boolean)[];

/**
 * Column definition for the sync-history grid.
 *
 * `group` is consumed by the column picker panel.
 * `enum` is consumed by the `col()` factory only — when set, the column
 * gets `filter: 'agSetColumnFilter'` with the enum values as options.
 * `col()` strips `enum` before returning so AG Grid never sees it.
 */
interface SyncColDef extends ColDef<AgentHistoryRecord> {
  group: ColGroup;
  enum?: EnumSource;
}

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

/**
 * Compose a filter-dropdown formatter so that null/undefined always shows as
 * "(Blanks)" regardless of any user-supplied formatter (which only sees
 * non-null values).
 */
function withBlanksFormatter(
  userFormatter: SetFilterValueFormatter | undefined
): SetFilterValueFormatter {
  return (params) => {
    if (params.value == null) return BLANKS_LABEL;
    if (userFormatter) return userFormatter(params);
    return String(params.value);
  };
}

/**
 * Wraps a column definition and:
 *   - fills in `minWidth` from `headerName` when not provided,
 *   - translates `enum` → `agSetColumnFilter` + `filterParams.values`
 *     (unless the caller already set a different `filter`). The values
 *     list always includes `null` so users can filter blank/missing rows;
 *     `null` is displayed as `(Blanks)` in the dropdown.
 *   - injects `EnumChipCell` as the cell renderer when `enum` is set
 *     and no `cellRenderer` is provided.
 *
 * `enum` is stripped from the output so AG Grid never sees an unknown property.
 */
function col(def: SyncColDef): SyncColDef {
  const { enum: enumDef, ...rest } = def;
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

  return {
    ...rest,
    ...(setFilterFromEnum ?? {}),
    ...(chipRendererFromEnum ?? {}),
    minWidth: rest.minWidth ?? autoMin,
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

/**
 * Renders a colored chip for any enum-backed value.
 * Class shape: `snc-chip snc-chip--{colId}-{value-slug}`.
 * Unknown values still render — they just hit the neutral base style.
 */
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
      // Render booleans as Yes/No inside the filter dropdown (column cells use AvailabilityCell).
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

/** Column definitions for <AgGridReact columnDefs={...}> */
export function buildColumnDefs(): ColDef<AgentHistoryRecord>[] {
  return buildColumnDefsInternal();
}

/**
 * colId → headerName map, derived from column definitions.
 * Used by filter chips and the picker panel.
 */
export function buildColumnLabels(
  defs: SyncColDef[]
): Record<string, string> {
  return Object.fromEntries(
    defs
      .map((d) => [(d.colId ?? d.field) as string, d.headerName ?? ''])
      .filter(([id]) => Boolean(id))
  );
}

/**
 * Picker groups in GROUP_ORDER, derived from each column's `group` property.
 */
export function buildColumnGroups(
  defs: SyncColDef[]
): Array<{ label: string; cols: string[] }> {
  return GROUP_ORDER.map((label) => ({
    label,
    cols: defs
      .filter((d) => d.group === label)
      .map((d) => (d.colId ?? d.field) as string)
      .filter(Boolean),
  }));
}

// ── Singleton exports ───────────────────────────────────────────────
// Evaluated once at module load. Safe because defs never change at runtime.

const _defs = buildColumnDefsInternal();

/** colId → human label (e.g. 'selectedLink' → 'Selected Link') */
export const COLUMN_LABELS = buildColumnLabels(_defs);

/** Picker panel groups with their column ids */
export const COLUMN_GROUPS = buildColumnGroups(_defs);
