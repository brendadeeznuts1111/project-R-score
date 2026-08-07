// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/color#flexible-input — via lib/console shouldColor
// @see https://bun.com/reference/bun/sliceAnsi — via lib/console fitVisible
/**
 * Universal table formatter — rich ANSI-styled terminal tables.
 *
 * Color/width SSOT: [`lib/console`](./console/README.md) (`shouldColor` · `termWidth` · `fitVisible`).
 * Prefer `logTable` / `inspectTable` for simple columnar dumps; this module for
 * box-drawing / alternate rows / per-column formatters.
 *
 * Features:
 * - ANSI gated by `shouldColor()` (same as logDepth/colorize)
 * - Auto-sizes columns to terminal width when no explicit width given
 * - Smart column width limiting with ellipsis (ANSI/grapheme-safe)
 * - Alternating row backgrounds · section separators · compact mode
 * - Unicode box-drawing with fallback to ASCII
 * - Supports Bun.inspect for rich cell values
 */
import { stringWidth, inspect, semver } from 'bun';
import {
  padCenterWidth,
  padEndWidth,
  padStartWidth,
  shouldColor,
  termWidth,
  truncateWidth,
} from './console/index.ts';

// ── Bun version check ────────────────────────────────────────────────────
const BUN_MIN_TABLE = '1.3.0';
export const BUN_TABLE_OK = semver.satisfies(Bun.version, `>=${BUN_MIN_TABLE}`);

function getTerminalWidth(): number {
  return termWidth();
}

/** Inverse of shouldColor — kept for local color wrappers. */
function isNoColor(): boolean {
  return !shouldColor();
}

const C = (code: string) => (s: string) => (isNoColor() ? s : `\x1b[${code}m${s}\x1b[0m`);
export const color = {
  red: C('31'),
  green: C('32'),
  yellow: C('33'),
  blue: C('34'),
  magenta: C('35'),
  cyan: C('36'),
  dim: C('2'),
  bold: C('1'),
  bgRed: C('41'),
  bgGreen: C('42'),
  bgYellow: C('43'),
  bgBlue: C('44'),
};
export const styles = {
  up: color.green,
  down: color.red,
  neutral: color.dim,
  header: color.bold,
  highlight: color.cyan,
  warning: color.yellow,
  error: color.red,
  ok: color.green,
};

// ── Types ─────────────────────────────────────────────────────────────────
export type TableCell = string | number | boolean | bigint | symbol | object | null | undefined;

export type ColumnDef = {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  width?: number; // max column width (0 = auto)
  color?: (s: string) => string;

  format?: (val: TableCell) => string;
};

export type TableOpts = {
  title?: string;
  titleColor?: (s: string) => string;
  compact?: boolean; // chat-friendly, no box drawing
  colors?: boolean; // ANSI colors (default: true unless NO_COLOR)
  maxColWidth?: number; // truncate cells longer than this (default: 40)
  alternate?: boolean; // alternating row bg (default: true)
  border?: 'unicode' | 'ascii' | 'minimal' | 'none';
  sortBy?: string;
  sortDesc?: boolean;
  footer?: string;
  separatorAfter?: number[]; // row indices after which to draw separator
};

const DEFAULT_OPTS: TableOpts = {
  compact: false,
  colors: shouldColor(),
  maxColWidth: Math.floor(getTerminalWidth() / 3),
  alternate: true,
  border: 'unicode',
};

// ── Box-drawing sets ──────────────────────────────────────────────────────
const BOX = {
  unicode: {
    tl: '┌',
    tc: '┬',
    tr: '┐',
    ml: '├',
    mc: '┼',
    mr: '┤',
    bl: '└',
    bc: '┴',
    br: '┘',
    h: '─',
    v: '│',
    sepH: '─',
    sepV: '│',
  },
  ascii: {
    tl: '+',
    tc: '+',
    tr: '+',
    ml: '+',
    mc: '+',
    mr: '+',
    bl: '+',
    bc: '+',
    br: '+',
    h: '-',
    v: '|',
    sepH: '=',
    sepV: '|',
  },
  minimal: {
    tl: '',
    tc: '',
    tr: '',
    ml: '',
    mc: '',
    mr: '',
    bl: '',
    bc: '',
    br: '',
    h: '',
    v: '',
    sepH: '─',
    sepV: '',
  },
  none: {
    tl: '',
    tc: '',
    tr: '',
    ml: '',
    mc: '',
    mr: '',
    bl: '',
    bc: '',
    br: '',
    h: '',
    v: ' ',
    sepH: '',
    sepV: '',
  },
};

// ── Helpers (width via Bun.stringWidth · clip/pad via lib/console layout) ─
function sw(s: TableCell): number {
  return stringWidth(String(s ?? ''));
}

/** Clip only — never pad (pad is a separate step with exact column width). */
function truncate(s: string, max: number): string {
  if (max <= 0) return '';
  return truncateWidth(s, max, { ellipsis: '…' });
}

/** Expand only — does not clip (caller truncates first when needed). */
function pad(s: string, w: number, align: 'left' | 'right' | 'center'): string {
  switch (align) {
    case 'right':
      return padStartWidth(s, w);
    case 'center':
      return padCenterWidth(s, w);
    default:
      return padEndWidth(s, w);
  }
}

function boxLine(parts: string[], b: typeof BOX.unicode): string {
  return b.v + parts.join(b.v) + b.v;
}

// ── Main renderer ─────────────────────────────────────────────────────────
/**
 * Render a rich table from column definitions and data rows.
 *
 * @example
 *   formatTable('Partners', cols, data, { title: '📊 Partner Limits', colors: true })
 */
export function formatTable(
  title: string,
  columns: ColumnDef[],
  rows: Record<string, TableCell>[],
  opts: TableOpts = {}
): string {
  // Version gate: fall back to compact mode on old Bun
  if (!BUN_TABLE_OK && !opts.compact) {
    return formatTable(title, columns, rows, { ...opts, compact: true, colors: false });
  }
  const o = { ...DEFAULT_OPTS, ...opts };
  const b = BOX[o.border ?? 'unicode'];
  const useColor = o.colors && !isNoColor();

  if (rows.length === 0) {
    const empty = `  ${title}: ${color.dim('(no data)')}`;
    return useColor ? empty : empty.replace(/\x1b\[\d+m/g, '');
  }

  // Compute column widths
  const maxW = o.maxColWidth ?? Math.floor(getTerminalWidth() / 3);
  const widths = columns.map((col, i) => {
    const labelW = sw(col.label);
    const dataW = Math.max(
      0,
      ...rows.map(r => {
        const val = col.format ? col.format(r[col.key]) : String(r[col.key] ?? '');
        return Math.min(sw(val), maxW);
      })
    );
    const colW = col.width ?? Math.max(labelW, dataW);
    return Math.min(colW, maxW);
  });

  // Build cell strings
  const headerCells = columns.map((col, i) => {
    const label = useColor ? color.bold(col.label) : col.label;
    return pad(label, widths[i]!, col.align ?? 'left');
  });

  const dataCells = rows.map((row, ri) => {
    return columns.map((col, ci) => {
      let val = col.format ? col.format(row[col.key]) : String(row[col.key] ?? '');
      if (col.color && useColor) val = col.color(val);
      // Alternate row dim
      if (useColor && o.alternate && ri % 2 === 1 && !col.color) {
        val = color.dim(val);
      }
      return pad(truncate(val, maxW), widths[ci]!, col.align ?? 'left');
    });
  });

  const out: string[] = [];

  // Title
  if (title) {
    const t = useColor && o.titleColor ? o.titleColor(title) : title;
    out.push(t);
  }

  // Border top
  if (b.tl) out.push(b.tl + widths.map(w => b.h.repeat(w + 2)).join(b.tc) + b.tr);

  // Header
  out.push(boxLine(headerCells, b));

  // Header-body separator
  if (b.ml) out.push(b.ml + widths.map(w => b.h.repeat(w + 2)).join(b.mc) + b.mr);

  // Data rows
  for (let ri = 0; ri < dataCells.length; ri++) {
    out.push(boxLine(dataCells[ri]!, b));
    // Optional separator after specific rows
    if (o.separatorAfter?.includes(ri) && b.sepH) {
      const sepCells = columns.map((_, ci) => pad(b.sepH.repeat(5), widths[ci]!, 'center'));
      out.push(boxLine(sepCells, b));
    }
  }

  // Border bottom
  if (b.bl) out.push(b.bl + widths.map(w => b.h.repeat(w + 2)).join(b.bc) + b.br);

  // Footer
  if (o.footer) {
    out.push(`  ${o.footer}`);
  }

  // Compact mode: no box drawing, just aligned columns
  if (o.compact) {
    const compactRows = [
      headerCells.join('  '),
      widths.map(w => '─'.repeat(w)).join('──'),
      ...dataCells.map(r => r.join('  ')),
    ];
    if (o.footer) compactRows.push(`  ${o.footer}`);
    return compactRows.join('\n');
  }

  return out.join('\n');
}

/** Quick native table via Bun.inspect.table — no custom formatting, just raw data dump. */
export function formatTableNative(
  rows: Record<string, TableCell>[],
  options?: { properties?: string[]; colors?: boolean }
): string {
  if (rows.length === 0) return '(no data)';
  const props = options?.properties;
  const data = props
    ? rows.map(r => {
        const subset: Record<string, TableCell> = {};
        for (const p of props) subset[p] = r[p];
        return subset;
      })
    : rows;
  return inspect.table(data, { colors: options?.colors ?? !isNoColor() });
}

// ── Convenience: number formatting ────────────────────────────────────────

export const fmt = {
  dollar: (v: TableCell) => {
    if (v == null || v === '') return '—';
    const n = Number(v);
    return Number.isFinite(n) ? `$${n.toLocaleString()}` : '—';
  },
  delta: (v: TableCell) => {
    if (v == null || v === '') return '—';
    const n = Number(v);
    if (!Number.isFinite(n)) return '—';
    return `${n >= 0 ? '+' : ''}$${n.toLocaleString()}`;
  },
  pct: (v: TableCell) => {
    if (v == null || v === '') return '—';
    const n = Number(v);
    return Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : '—';
  },
  pctRaw: (v: TableCell) => {
    if (v == null || v === '') return '—';
    const n = Number(v);
    return Number.isFinite(n) ? `${n >= 0 ? '+' : ''}${n.toFixed(1)}%` : '—';
  },
  date: (v: TableCell) => {
    if (v == null || v === '') return '—';
    const n = Number(v);
    return Number.isFinite(n) ? new Date(n * 1000).toLocaleDateString() : '—';
  },
  score: (v: TableCell) => {
    if (v == null || v === '') return '···';
    const n = Number(v);
    return Number.isFinite(n) ? `${(n * 100).toFixed(0)}%` : '···';
  },
  icon: {
    up: '🚀',
    down: '⬇️',
    upSimple: '↑',
    downSimple: '↓',
    neutral: '·',
    check: '✅',
    cross: '❌',
    warn: '⚠️',
  },
};

// ── Predefined column sets ────────────────────────────────────────────────
export const LIMIT_CHANGE_COLUMNS: ColumnDef[] = [
  {
    key: 'icon',
    label: 'I',
    align: 'center',
    width: 3,
    format: v => (v === 'down' || v === '⬇️' ? '⬇️' : v === undefined || v === null ? '·' : '🚀'),
    color: s => (s.includes('⬇') ? color.red(s) : color.green(s)),
  },
  { key: 'sportsbook', label: 'Book', align: 'left', width: 14 },
  { key: 'sport_id', label: 'Sport', align: 'left', width: 10, format: v => String(v ?? '—') },
  { key: 'market_id', label: 'Market', align: 'left', width: 12 },
  { key: 'bet_type', label: 'Type', align: 'left', width: 10 },
  { key: 'previous_max', label: 'Old', align: 'right', width: 10, format: fmt.dollar },
  {
    key: 'new_limit',
    label: 'New',
    align: 'right',
    width: 10,
    format: fmt.dollar,
    color: s => color.bold(s),
  },
  {
    key: '_delta',
    label: '±$',
    align: 'right',
    width: 10,
    format: (v: TableCell) => {
      const n = Number(v);
      return Number.isFinite(n) ? color[n >= 0 ? 'green' : 'red'](fmt.delta(v as number)) : '—';
    },
  },
  { key: 'multi_factor_score', label: 'Score', align: 'center', width: 7, format: fmt.score },
  { key: 'increased_at', label: 'When', align: 'left', width: 12, format: fmt.date },
];

export const DIMENSION_COLUMNS: ColumnDef[] = [
  { key: 'label', label: 'Name', align: 'left', width: 16, color: color.bold },
  { key: 'totalChanges', label: 'Total', align: 'right', width: 6 },
  { key: 'raises', label: '🚀', align: 'right', width: 4, color: color.green },
  { key: 'decreases', label: '⬇️', align: 'right', width: 4, color: color.red },
  { key: 'netDelta', label: 'Net', align: 'right', width: 10, format: fmt.delta },
  { key: 'avgMagnitudePct', label: 'Avg%', align: 'right', width: 7, format: fmt.pctRaw },
  {
    key: 'trend7d',
    label: 'Trend/d',
    align: 'right',
    width: 10,
    format: v => {
      const n = Number(v);
      return Number.isFinite(n) ? `${n >= 0 ? '+' : ''}$${n.toFixed(0)}/d` : '—';
    },
  },
];

export const REGULATORY_COLUMNS: ColumnDef[] = [
  { key: 'partner', label: 'Partner', align: 'left', width: 14 },
  { key: 'sportsbook', label: 'Book', align: 'left', width: 12 },
  { key: 'sportId', label: 'Sport', align: 'left', width: 10 },
  { key: 'marketId', label: 'Market', align: 'left', width: 12 },
  { key: 'currentLimit', label: 'Limit', align: 'right', width: 10, format: fmt.dollar },
  {
    key: 'regulatoryMax',
    label: 'RegMax',
    align: 'right',
    width: 10,
    format: v => (v != null ? fmt.dollar(v) : '—'),
  },
  {
    key: 'status',
    label: 'Status',
    align: 'left',
    width: 12,
    color: s =>
      s === 'over_limit' ? color.red(s) : s === 'at_limit' ? color.yellow(s) : color.green(s),
  },
  { key: 'stateCode', label: 'State', align: 'center', width: 6 },
];

export const PREDICTION_COLUMNS: ColumnDef[] = [
  { key: 'sportsbook', label: 'Book', align: 'left', width: 12 },
  { key: 'sport_id', label: 'Sport', align: 'left', width: 10 },
  { key: 'market_id', label: 'Market', align: 'left', width: 12 },
  { key: 'bet_type', label: 'Type', align: 'left', width: 10 },
  { key: 'predictedRaiseProb', label: 'Prob', align: 'right', width: 7, format: fmt.pct },
  { key: 'predictedMagnitudePct', label: 'Mag%', align: 'right', width: 7, format: v => `${v}%` },
  {
    key: 'confidence',
    label: 'Conf',
    align: 'center',
    width: 8,
    color: s => (s === 'high' ? color.green(s) : s === 'medium' ? color.yellow(s) : color.red(s)),
  },
  { key: 'windowHint', label: 'Window', align: 'left', width: 24, color: color.dim },
];

// ── Preferred name ───────────────────────────────────────────────────────
export const formatInspectTable = formatTableNative;
