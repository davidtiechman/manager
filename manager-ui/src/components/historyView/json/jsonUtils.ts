// Pure JSON normalize / summarize helpers (no React).

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };

export type JsonNorm =
  | { kind: 'empty' }
  | { kind: 'invalid'; raw: string }
  | { kind: 'value'; value: JsonValue; raw: string };

export const TREE_NODE_CAP = 3000;
export const TOOLTIP_CHAR_CAP = 4000;
export const TOOLTIP_LINE_CAP = 120;
export const SEARCH_MATCH_CAP = 200;

// unknown → parsed JSON (handles JSON strings, double-encoded, malformed).
export function normalizeJson(input: unknown): JsonNorm {
  if (input == null) return { kind: 'empty' };
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed === '') return { kind: 'empty' };
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return { kind: 'invalid', raw: input };
    }
    // Double-encoded payload.
    if (typeof parsed === 'string') {
      const inner = parsed.trim();
      if (inner.startsWith('{') || inner.startsWith('[')) {
        try {
          parsed = JSON.parse(inner);
        } catch {
          /* keep first result */
        }
      }
    }
    return { kind: 'value', value: parsed as JsonValue, raw: JSON.stringify(parsed, null, 2) };
  }
  return { kind: 'value', value: input as JsonValue, raw: JSON.stringify(input, null, 2) };
}

export type JsonBadge = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

export interface JsonSummary {
  badge: JsonBadge;
  size: number | null;
  preview: string;
}

function previewScalar(v: JsonValue): string {
  if (typeof v === 'string') return JSON.stringify(v.length > 24 ? `${v.slice(0, 24)}…` : v);
  if (v === null) return 'null';
  if (Array.isArray(v)) return `[${v.length}]`;
  if (typeof v === 'object') return '{…}';
  return String(v);
}

// One-line badge + preview for the grid cell.
export function summarizeJson(v: JsonValue, maxEntries = 3, maxLen = 80): JsonSummary {
  if (v === null) return { badge: 'null', size: null, preview: 'null' };
  if (Array.isArray(v)) {
    const parts = v.slice(0, maxEntries).map(previewScalar);
    const more = v.length > maxEntries ? `, … +${v.length - maxEntries}` : '';
    return { badge: 'array', size: v.length, preview: clamp(`${parts.join(', ')}${more}`, maxLen) };
  }
  if (typeof v === 'object') {
    const keys = Object.keys(v);
    const parts = keys.slice(0, maxEntries).map((k) => `${k}: ${previewScalar(v[k])}`);
    const more = keys.length > maxEntries ? `, … +${keys.length - maxEntries}` : '';
    return {
      badge: 'object',
      size: keys.length,
      preview: clamp(`${parts.join(', ')}${more}`, maxLen),
    };
  }
  return { badge: typeof v as JsonBadge, size: null, preview: clamp(previewScalar(v), maxLen) };
}

function clamp(s: string, maxLen: number): string {
  return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
}

// Counts nodes, early-exits at cap (returns cap + 1 when exceeded).
export function countJsonNodes(v: JsonValue, cap: number): number {
  let count = 0;
  const stack: JsonValue[] = [v];
  while (stack.length > 0) {
    const cur = stack.pop() as JsonValue;
    count += 1;
    if (count > cap) return cap + 1;
    if (Array.isArray(cur)) {
      for (const item of cur) stack.push(item);
    } else if (cur !== null && typeof cur === 'object') {
      for (const k of Object.keys(cur)) stack.push(cur[k]);
    }
  }
  return count;
}

// Caps pretty text by chars and lines (tooltip).
export function truncatePretty(
  raw: string,
  maxChars = TOOLTIP_CHAR_CAP,
  maxLines = TOOLTIP_LINE_CAP
): { text: string; truncated: boolean } {
  let text = raw;
  let truncated = false;
  if (text.length > maxChars) {
    text = text.slice(0, maxChars);
    truncated = true;
  }
  const lines = text.split('\n');
  if (lines.length > maxLines) {
    text = lines.slice(0, maxLines).join('\n');
    truncated = true;
  }
  return { text: truncated ? `${text}\n…` : text, truncated };
}
