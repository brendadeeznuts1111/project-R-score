/**
 * Shared columnar CLI tables for tools/* (SSOT).
 *
 * Meta line (once per table by default):
 *   BUN <runtime>  COLS <column-keys>
 *
 * - BUN    → Bun.version (runtime pin for the tool process)
 * - COLS   → keys passed to the table (= Bun.inspect.table `properties`)
 *
 * Do NOT put Bun.version in every data row. Row-level attrs go in an ATTRS
 * column (frag, missing:N, Options, …) — never name that column PROPERTIES
 * (collides with COLS / inspect.table vocabulary).
 *
 * @see https://bun.com/docs/runtime/utils#bun-stringwidth
 * @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options
 * @see https://bun.com/docs/runtime/utils#bun-version
 */
import { stringWidth } from 'bun';
import { inspectTable, padEndWidth, truncateWidth } from '../lib/console-depth.ts';

export type CliColumnAlign = 'left' | 'right';

export type CliColumn<K extends string = string> = {
  key: K;
  header: string;
  /** Fixed width; omit to auto-size from header + rows (capped). */
  width?: number;
  align?: CliColumnAlign;
  /** Max auto width when width omitted (default 48). */
  maxWidth?: number;
};

export type CliTableOpts = {
  /** Column separator (default two spaces). Use `\t` for TSV body. */
  sep?: string;
  /** Include header row (default true). */
  header?: boolean;
  /** Include underline under header (default true for sep !== tab). */
  rule?: boolean;
  /** Indent every line (default ""). */
  indent?: string;
  /**
   * Runtime pin on the meta line (default Bun.version).
   * Pass `false` to omit BUN= from the meta line (COLS may still print).
   */
  bun?: string | false;
  /**
   * Column keys for this table (Bun.inspect.table `properties` sense).
   * Defaults to `columns.map(c => c.key)`. Shown as COLS on the meta line.
   */
  cols?: readonly string[];
  /**
   * Meta banner policy:
   * - `each` (default) — print before this table
   * - `none` — no meta line
   */
  meta?: 'each' | 'none';
};

function cell(text: string, width: number, align: CliColumnAlign): string {
  const t = truncateWidth(String(text ?? ''), width);
  if (align === 'right') {
    const missing = width - stringWidth(t);
    return missing > 0 ? `${' '.repeat(missing)}${t}` : t;
  }
  return padEndWidth(t, width);
}

function resolveWidths<K extends string>(
  columns: readonly CliColumn<K>[],
  rows: ReadonlyArray<Record<K, string | number | boolean | null | undefined>>
): number[] {
  return columns.map(col => {
    if (col.width != null) return col.width;
    const maxW = col.maxWidth ?? 48;
    let w = stringWidth(col.header);
    for (const row of rows) {
      w = Math.max(w, stringWidth(String(row[col.key] ?? '')));
    }
    return Math.min(Math.max(w, 1), maxW);
  });
}

/** Meta banner: BUN + COLS (never name these PROPERTIES). */
export function formatCliTableMeta(opts: {
  bun?: string | false;
  cols: readonly string[];
  indent?: string;
}): string {
  const indent = opts.indent ?? '';
  const parts: string[] = [];
  if (opts.bun !== false) parts.push(`BUN ${opts.bun ?? Bun.version}`);
  if (opts.cols.length) parts.push(`COLS ${opts.cols.join(',')}`);
  if (!parts.length) return '';
  return `${indent}${parts.join('  ')}\n`;
}

/** Space-padded columnar table (human default for tools CLI). */
export function formatCliTable<K extends string>(
  rows: ReadonlyArray<Record<K, string | number | boolean | null | undefined>>,
  columns: readonly CliColumn<K>[],
  opts: CliTableOpts = {}
): string {
  const sep = opts.sep ?? '  ';
  const indent = opts.indent ?? '';
  const widths = resolveWidths(columns, rows);
  const lines: string[] = [];
  const cols = opts.cols ?? columns.map(c => c.key);
  const meta = opts.meta ?? 'each';

  if (meta === 'each') {
    const banner = formatCliTableMeta({
      bun: opts.bun,
      cols,
      indent,
    }).trimEnd();
    if (banner) lines.push(banner);
  }

  const paint = (vals: string[]) =>
    `${indent}${vals.map((v, i) => cell(v, widths[i]!, columns[i]!.align ?? 'left')).join(sep)}`;

  if (opts.header !== false) {
    lines.push(paint(columns.map(c => c.header)));
    if (opts.rule !== false && sep !== '\t') {
      lines.push(`${indent}${widths.map(w => '─'.repeat(w)).join(sep)}`);
    }
  }

  for (const row of rows) {
    lines.push(paint(columns.map(c => String(row[c.key] ?? ''))));
  }

  return `${lines.join('\n')}\n`;
}

/** TSV — `# BUN …  COLS …` comment, then header + rows. */
export function formatCliTsv<K extends string>(
  rows: ReadonlyArray<Record<K, string | number | boolean | null | undefined>>,
  columns: readonly CliColumn<K>[],
  opts?: Pick<CliTableOpts, 'bun' | 'cols'>
): string {
  const cols = opts?.cols ?? columns.map(c => c.key);
  const meta =
    opts?.bun === false && !cols.length
      ? ''
      : `# ${formatCliTableMeta({ bun: opts?.bun, cols }).trim()}\n`;
  return (
    meta +
    formatCliTable(rows, columns, {
      sep: '\t',
      rule: false,
      header: true,
      meta: 'none',
    })
  );
}

/**
 * Bun.inspect.table dump — `properties` = column order.
 * Meta: BUN + COLS <properties>.
 */
export function formatInspectTable(
  rows: ReadonlyArray<Record<string, string | number | boolean | null | undefined>>,
  properties: string[],
  opts?: { bun?: string | false; meta?: 'each' | 'none' }
): string {
  // @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options
  const meta =
    (opts?.meta ?? 'each') === 'none'
      ? ''
      : formatCliTableMeta({
          bun: opts?.bun,
          cols: properties,
        });
  const body = inspectTable(rows as Record<string, unknown>[], properties, {
    colors: Boolean(process.stdout.isTTY),
  });
  return `${meta}${body}\n`;
}

/** Runtime pin for tool meta lines (not a per-row column). */
export function toolTableVersion(): string {
  return Bun.version;
}

/** @deprecated use formatCliTableMeta / bun+cols */
export function formatCliTableMetaLegacy(opts: {
  version?: string | false;
  properties: readonly string[];
  indent?: string;
}): string {
  return formatCliTableMeta({
    bun: opts.version,
    cols: opts.properties,
    indent: opts.indent,
  });
}
