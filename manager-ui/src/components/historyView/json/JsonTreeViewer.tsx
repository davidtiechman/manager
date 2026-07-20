// Interactive JSON tree viewer for the detail drawer.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { JsonPretty } from './JsonPreviewCell';
import {
  normalizeJson,
  countJsonNodes,
  TREE_NODE_CAP,
  SEARCH_MATCH_CAP,
  type JsonValue,
} from './jsonUtils';

const DEFAULT_DEPTH = 2;
const VALUE_CLAMP = 200;

interface ExpandState {
  mode: 'default' | 'all' | 'none';
  overrides: Map<string, boolean>;
}

interface SearchResult {
  matches: Set<string>;
  ancestors: Set<string>;
  count: number;
}

function isContainer(v: JsonValue): v is JsonValue[] | { [k: string]: JsonValue } {
  return v !== null && typeof v === 'object';
}

// One walk: collect matching paths + their ancestors.
function searchJson(root: JsonValue, query: string): SearchResult {
  const q = query.toLowerCase();
  const matches = new Set<string>();
  const ancestors = new Set<string>();
  let count = 0;

  const visit = (v: JsonValue, path: string, trail: string[]): void => {
    if (count >= SEARCH_MATCH_CAP) return;
    if (isContainer(v)) {
      const entries = Array.isArray(v)
        ? v.map((item, i) => [String(i), item] as const)
        : Object.entries(v);
      for (const [k, child] of entries) {
        if (count >= SEARCH_MATCH_CAP) return;
        const childPath = `${path}/${k}`;
        const keyHit = !Array.isArray(v) && k.toLowerCase().includes(q);
        const valHit =
          !isContainer(child) && String(child).toLowerCase().includes(q);
        if (keyHit || valHit) {
          matches.add(childPath);
          count += 1;
          for (const a of trail) ancestors.add(a);
          ancestors.add(path);
        }
        visit(child, childPath, [...trail, path]);
      }
    }
  };

  visit(root, 'root', []);
  return { matches, ancestors, count };
}

function highlight(text: string, query: string): JSX.Element {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="snc-json-hl">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function PrimitiveValue({ value, query }: { value: JsonValue; query: string }) {
  if (value === null) return <span className="snc-json-0">null</span>;
  if (typeof value === 'boolean') return <span className="snc-json-b">{String(value)}</span>;
  if (typeof value === 'number') return <span className="snc-json-n">{highlight(String(value), query)}</span>;
  const s = String(value);
  const shown = s.length > VALUE_CLAMP ? `${s.slice(0, VALUE_CLAMP)}…` : s;
  return <span className="snc-json-s">"{highlight(shown, query)}"</span>;
}

interface TreeNodeProps {
  nodeKey: string | null;
  value: JsonValue;
  path: string;
  depth: number;
  expand: ExpandState;
  onToggle: (path: string, next: boolean) => void;
  query: string;
  search: SearchResult | null;
}

function isExpanded(path: string, depth: number, expand: ExpandState, search: SearchResult | null): boolean {
  const override = expand.overrides.get(path);
  if (override != null) return override;
  if (search) return search.ancestors.has(path);
  if (expand.mode === 'all') return true;
  if (expand.mode === 'none') return false;
  return depth < DEFAULT_DEPTH;
}

function TreeNode({ nodeKey, value, path, depth, expand, onToggle, query, search }: TreeNodeProps) {
  const matched = search != null && search.matches.has(path);
  const keyEl =
    nodeKey != null ? (
      <span className="snc-json-k">{matched ? highlight(nodeKey, query) : nodeKey}</span>
    ) : null;

  if (!isContainer(value)) {
    return (
      <li>
        <span className="snc-json-row" style={{ cursor: 'default' }}>
          <span className="snc-json-caret" aria-hidden="true" />
          {keyEl}
          {keyEl && <span className="snc-json-p">: </span>}
          <PrimitiveValue value={value} query={matched ? query : ''} />
        </span>
      </li>
    );
  }

  const open = isExpanded(path, depth, expand, search);
  const isArr = Array.isArray(value);
  const entries = isArr
    ? (value as JsonValue[]).map((item, i) => [String(i), item] as const)
    : Object.entries(value as { [k: string]: JsonValue });
  const size = entries.length;
  const brackets = isArr ? ['[', ']'] : ['{', '}'];

  return (
    <li>
      <button
        type="button"
        className="snc-json-row"
        onClick={() => onToggle(path, !open)}
        aria-expanded={open}
      >
        <span className={`snc-json-caret${open ? ' snc-json-caret--open' : ''}`} aria-hidden="true">
          ▶
        </span>
        {keyEl}
        {keyEl && <span className="snc-json-p">: </span>}
        <span className="snc-json-p">{brackets[0]}</span>
        {!open && (
          <span className="snc-json-summary">
            {size > 0 ? ` ${size} ` : ''}
          </span>
        )}
        {!open && <span className="snc-json-p">{brackets[1]}</span>}
      </button>
      {open && (
        <>
          <ul role="group">
            {entries.map(([k, child]) => (
              <TreeNode
                key={k}
                nodeKey={k}
                value={child}
                path={`${path}/${k}`}
                depth={depth + 1}
                expand={expand}
                onToggle={onToggle}
                query={query}
                search={search}
              />
            ))}
          </ul>
          <span className="snc-json-p">{brackets[1]}</span>
        </>
      )}
    </li>
  );
}

export function JsonTreeViewer({ value }: { value: unknown }) {
  const { t } = useTranslation('history');
  const norm = useMemo(() => normalizeJson(value), [value]);

  const [view, setView] = useState<'tree' | 'raw'>('tree');
  const [expand, setExpand] = useState<ExpandState>({ mode: 'default', overrides: new Map() });
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const tooLarge = useMemo(
    () => norm.kind === 'value' && countJsonNodes(norm.value, TREE_NODE_CAP) > TREE_NODE_CAP,
    [norm]
  );

  const search = useMemo<SearchResult | null>(() => {
    if (norm.kind !== 'value' || tooLarge || debouncedQuery === '') return null;
    return searchJson(norm.value, debouncedQuery);
  }, [norm, tooLarge, debouncedQuery]);

  // Search results override manual toggles until the query changes.
  useEffect(() => {
    setExpand((e) => (e.overrides.size > 0 ? { ...e, overrides: new Map() } : e));
  }, [debouncedQuery]);

  const raw = norm.kind === 'empty' ? '' : norm.raw;

  const copy = () => {
    const write = async () => {
      try {
        await navigator.clipboard.writeText(raw);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = raw;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1500);
    };
    void write();
  };

  const onToggle = (path: string, next: boolean) => {
    setExpand((e) => {
      const overrides = new Map(e.overrides);
      overrides.set(path, next);
      return { ...e, overrides };
    });
  };

  if (norm.kind === 'empty') {
    return <div className="snc-json-notice">{t('json.empty')}</div>;
  }

  if (norm.kind === 'invalid') {
    return (
      <div className="snc-json-viewer">
        <div className="snc-json-toolbar">
          <span className="snc-json-badge snc-json-badge--invalid">! {t('json.invalid')}</span>
          <button
            type="button"
            className={`snc-json-btn${copied ? ' snc-json-btn--copied' : ''}`}
            onClick={copy}
          >
            {copied ? t('json.copied') : t('json.copy')}
          </button>
        </div>
        <div className="snc-json-body">
          <pre className="snc-json-pre" dir="ltr">{norm.raw}</pre>
        </div>
      </div>
    );
  }

  const showTree = view === 'tree' && !tooLarge;

  return (
    <div className="snc-json-viewer">
      <div className="snc-json-toolbar" role="toolbar">
        <div className="snc-json-seg" role="group">
          <button
            type="button"
            aria-pressed={showTree}
            disabled={tooLarge}
            onClick={() => setView('tree')}
          >
            {t('json.tree')}
          </button>
          <button type="button" aria-pressed={!showTree} onClick={() => setView('raw')}>
            {t('json.raw')}
          </button>
        </div>
        <button
          type="button"
          className="snc-json-btn"
          disabled={!showTree}
          onClick={() => setExpand({ mode: 'all', overrides: new Map() })}
          title={t('json.expandAll')}
          aria-label={t('json.expandAll')}
        >
          ⊞
        </button>
        <button
          type="button"
          className="snc-json-btn"
          disabled={!showTree}
          onClick={() => setExpand({ mode: 'none', overrides: new Map() })}
          title={t('json.collapseAll')}
          aria-label={t('json.collapseAll')}
        >
          ⊟
        </button>
        <input
          type="search"
          className="snc-json-search"
          placeholder={t('json.search')}
          value={query}
          disabled={tooLarge}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          className={`snc-json-btn${copied ? ' snc-json-btn--copied' : ''}`}
          onClick={copy}
        >
          {copied ? t('json.copied') : t('json.copy')}
        </button>
      </div>

      <div className="snc-json-body">
        {tooLarge && (
          <div className="snc-json-notice snc-json-notice--warn">
            {t('json.tooLarge', { n: TREE_NODE_CAP })}
          </div>
        )}
        {search != null && search.count === 0 && (
          <div className="snc-json-notice">{t('json.noMatches')}</div>
        )}
        {showTree ? (
          <ul className="snc-json-tree">
            <TreeNode
              nodeKey={null}
              value={norm.value}
              path="root"
              depth={0}
              expand={expand}
              onToggle={onToggle}
              query={debouncedQuery}
              search={search}
            />
          </ul>
        ) : (
          <JsonPretty text={raw} />
        )}
      </div>
    </div>
  );
}
