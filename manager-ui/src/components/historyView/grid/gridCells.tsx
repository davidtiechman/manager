// Shared grid cells, column factory, and group helpers.

import type { ColDef, ColGroupDef, ICellRendererParams } from 'ag-grid-community';

// ── Group helpers ───────────────────────────────────────────────────

// Group name → CSS slug.
export function groupSlug(group: string): string {
  return group.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export interface GroupDef {
  name: string;
  color: string;
}

// slug → color map.
export function groupColorMap(defs: readonly GroupDef[]): Record<string, string> {
  return Object.fromEntries(defs.map((g) => [groupSlug(g.name), g.color]));
}

// ── Enum / filter helpers ───────────────────────────────────────────

export type EnumSource = Record<string, string> | readonly (string | boolean)[];

function enumValues(source: EnumSource): (string | boolean)[] {
  return Array.isArray(source) ? [...source] : Object.values(source);
}

const BLANKS_LABEL = '(Blanks)';

type SetFilterValueFormatter = (params: { value: unknown }) => string;

// Null → "(Blanks)".
function withBlanksFormatter(
  userFormatter: SetFilterValueFormatter | undefined
): SetFilterValueFormatter {
  return (params) => {
    if (params.value == null) return BLANKS_LABEL;
    if (userFormatter) return userFormatter(params);
    return String(params.value);
  };
}

// Header type class → CSS icon.
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

// ── Cell renderers ──────────────────────────────────────────────────

// Skeleton bar while the block loads.
export function withSkeleton(
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
export function StatusCell({ value }: ICellRendererParams) {
  if (value == null || value === '') return <span className="snc-null">—</span>;
  const key = String(value).toLowerCase();
  return <span className={`snc-status snc-status--${key}`}>{value}</span>;
}

// Yes/No availability badge.
export function AvailabilityCell({ value }: ICellRendererParams) {
  if (value == null) return <span className="snc-null">—</span>;
  const isYes = value === true || value === 'true';
  return (
    <span className={`snc-avail snc-avail--${isYes ? 'yes' : 'no'}`}>
      {isYes ? 'Yes' : 'No'}
    </span>
  );
}

// Epoch/ISO → he-IL date-time.
export function DateCell({ value }: ICellRendererParams) {
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
export function NumericCell({ value }: ICellRendererParams) {
  if (value == null || value === '') return <span className="snc-null">—</span>;
  return <span className="snc-num">{String(value)}</span>;
}

// Text with ellipsis; objects stringified.
export function TextCell({ value }: ICellRendererParams) {
  if (value == null || value === '') return <span className="snc-null">—</span>;
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return (
    <span className="snc-text" title={text}>
      {text}
    </span>
  );
}

// Colored chip for enum values.
export function EnumChipCell({ value, column }: ICellRendererParams) {
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

// ── Column factory ──────────────────────────────────────────────────

const CHAR_WIDTH   = 7.5; // px per char (12.5px weight-600 Inter)
const HDR_OVERHEAD = 44;  // sort icon + cell padding

export interface ColInput<T> extends Omit<ColDef<T>, 'context'> {
  group: string;
  enum?: EnumSource;
}

export type GridColDef<T> = ColDef<T> & { context: { group: string } };

// Column input → full ColDef.
export function makeCol<T>(def: ColInput<T>): GridColDef<T> {
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

// Flat columns → ColGroupDefs by group.
export function groupColumns<T>(
  defs: GridColDef<T>[],
  groupOrder: readonly string[]
): (ColDef<T> | ColGroupDef<T>)[] {
  return groupOrder
    .map((groupName) => ({
      headerName: groupName,
      groupId: groupName,
      toolPanelClass: `snc-tp-group snc-tp-group--${groupSlug(groupName)}`,
      children: defs.filter((d) => d.context?.group === groupName),
    }))
    .filter((g) => g.children.length > 0);
}

// colId → headerName.
export function buildColumnLabels<T>(defs: GridColDef<T>[]): Record<string, string> {
  return Object.fromEntries(
    defs
      .map((d) => [(d.colId ?? d.field) as string, d.headerName ?? ''])
      .filter(([id]) => Boolean(id))
  );
}
