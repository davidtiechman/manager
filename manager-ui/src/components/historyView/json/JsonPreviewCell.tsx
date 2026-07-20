// Grid cell + rich tooltip for JSON columns.

import { useMemo } from 'react';
import type { ColDef, ICellRendererParams, ITooltipParams } from 'ag-grid-community';
import { useTranslation } from 'react-i18next';
import {
  normalizeJson,
  summarizeJson,
  truncatePretty,
  type JsonBadge,
} from './jsonUtils';

// Token regex over pretty-printed JSON (one line at a time).
const TOKEN_RE = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)|([{}[\],:])/g;

// Syntax-colored <pre> from a pretty-printed string.
export function JsonPretty({ text }: { text: string }) {
  const nodes = useMemo(() => {
    const out: JSX.Element[] = [];
    let i = 0;
    for (const line of text.split('\n')) {
      const parts: JSX.Element[] = [];
      let last = 0;
      let m: RegExpExecArray | null;
      TOKEN_RE.lastIndex = 0;
      while ((m = TOKEN_RE.exec(line)) !== null) {
        if (m.index > last) parts.push(<span key={last}>{line.slice(last, m.index)}</span>);
        const [, str, colon, num, bool, nul, punct] = m;
        if (str != null) {
          parts.push(
            <span key={m.index} className={colon ? 'snc-json-k' : 'snc-json-s'}>
              {str}
            </span>
          );
          if (colon) parts.push(<span key={`${m.index}c`} className="snc-json-p">{colon}</span>);
        } else if (num != null) {
          parts.push(<span key={m.index} className="snc-json-n">{num}</span>);
        } else if (bool != null) {
          parts.push(<span key={m.index} className="snc-json-b">{bool}</span>);
        } else if (nul != null) {
          parts.push(<span key={m.index} className="snc-json-0">{nul}</span>);
        } else if (punct != null) {
          parts.push(<span key={m.index} className="snc-json-p">{punct}</span>);
        }
        last = m.index + m[0].length;
      }
      if (last < line.length) parts.push(<span key={last}>{line.slice(last)}</span>);
      out.push(<div key={i}>{parts.length > 0 ? parts : ' '}</div>);
      i += 1;
    }
    return out;
  }, [text]);

  return (
    <pre className="snc-json-pre" dir="ltr">
      {nodes}
    </pre>
  );
}

function badgeGlyph(badge: JsonBadge): string {
  if (badge === 'object') return '{ }';
  if (badge === 'array') return '[ ]';
  return 'abc';
}

function badgeClass(badge: JsonBadge): string {
  if (badge === 'object') return 'snc-json-badge';
  if (badge === 'array') return 'snc-json-badge snc-json-badge--array';
  return 'snc-json-badge snc-json-badge--scalar';
}

// Compact preview cell: badge + count + one-line summary.
export function JsonPreviewCell({ value }: ICellRendererParams) {
  const { t } = useTranslation('history');
  const norm = useMemo(() => normalizeJson(value), [value]);

  if (norm.kind === 'empty') return <span className="snc-null">—</span>;
  if (norm.kind === 'invalid') {
    return (
      <span className="snc-json-cell" dir="ltr">
        <span className="snc-json-badge snc-json-badge--invalid">!</span>
        <span className="snc-json-cell-preview">{norm.raw}</span>
      </span>
    );
  }

  const sum = summarizeJson(norm.value);
  const count =
    sum.size == null
      ? null
      : sum.badge === 'array'
        ? t('json.items', { n: sum.size })
        : t('json.keys', { n: sum.size });

  return (
    <span className="snc-json-cell" dir="ltr">
      <span className={badgeClass(sum.badge)}>
        {badgeGlyph(sum.badge)}
        {count != null && <span>{count}</span>}
      </span>
      <span className="snc-json-cell-preview">{sum.preview}</span>
    </span>
  );
}

// ag-grid custom tooltip: pretty JSON, scrollable, truncated.
export function JsonCellTooltip(params: ITooltipParams) {
  const { t } = useTranslation('history');
  // tooltipValueGetter returns a sentinel; read the real value off the row.
  const field = (params.colDef as ColDef | undefined)?.field;
  const raw = field && params.data ? (params.data as Record<string, unknown>)[field] : undefined;
  const norm = useMemo(() => normalizeJson(raw), [raw]);

  if (norm.kind === 'empty') return null;

  if (norm.kind === 'invalid') {
    const { text, truncated } = truncatePretty(norm.raw);
    return (
      <div className="snc-json-tt">
        <div className="snc-json-tt-head">
          <span className="snc-json-badge snc-json-badge--invalid">!</span>
          <span>{t('json.invalid')}</span>
          {truncated && <span>· {t('json.truncated')}</span>}
        </div>
        <div className="snc-json-tt-body">
          <pre className="snc-json-pre" dir="ltr">{text}</pre>
        </div>
      </div>
    );
  }

  const sum = summarizeJson(norm.value);
  const { text, truncated } = truncatePretty(norm.raw);
  const count =
    sum.size == null
      ? null
      : sum.badge === 'array'
        ? t('json.items', { n: sum.size })
        : t('json.keys', { n: sum.size });

  return (
    <div className="snc-json-tt">
      <div className="snc-json-tt-head">
        <span className={badgeClass(sum.badge)}>{badgeGlyph(sum.badge)}</span>
        {count != null && <span>{count}</span>}
        {truncated && <span>· {t('json.truncated')}</span>}
      </div>
      <div className="snc-json-tt-body">
        <JsonPretty text={text} />
      </div>
    </div>
  );
}
