/**
 * [TABLE][UTILS]{BUN-NATIVE}
 * Enterprise Bun-native (v1.3.5+), zero-npm, Cloudflare Workers/KV-ready
 * Dark-mode-first, width-adaptive table utilities
 */

// [1.0.0.0] CORE TYPES & INTERFACES
export interface TableRow extends Record<string, unknown> {}

// [1.1.0.0] enforceTable Options Interface
export interface EnforceTableOptions {
  sortByWidth?: boolean;
  colors?: boolean;
  maxWidth?: number;
}

// [1.1.1.0] enforceTable(data: TableRow[], columns: string[], options?: {...})
// [1.1.1.1] Type: string (TTY table via Bun.inspect.table)
// [1.1.1.2] Specifics: ≥6 cols enforce; strict Bun.deepEquals [cross-ref 1.2.1.1]
// [1.1.1.3] Expand: {sortByWidth: true} → widest cols first
export function enforceTable(
  data: TableRow[],
  columns: string[],
  options: EnforceTableOptions = {}
): string {
  if (columns.length < 6) {
    throw new Error("Enterprise table requires ≥6 columns");
  }
  if (data.length === 0) {
    return Bun.inspect.table([], columns, {
      colors: options.colors ?? Bun.isTTY,
    });
  }

  // [1.2.1.1] Strict deepEquals schema validation
  const baseKeys = Object.keys(data[0]).sort();
  for (let i = 1; i < data.length; i++) {
    const rowKeys = Object.keys(data[i]).sort();
    if (!Bun.deepEquals(baseKeys, rowKeys, true)) {
      throw new Error(
        `Row ${i} mismatch (strict): Expected ${baseKeys}, got ${rowKeys}`
      );
    }
  }

  let displayColumns = [...columns];

  // [1.2.2.1] Adaptive width-sorting (Bun.stringWidth ~6,756× npm)
  if (options.sortByWidth && process.stdout?.columns) {
    const widthMap = new Map<string, number>();
    for (const col of columns) {
      const headerWidth = Bun.stringWidth(col);
      const dataWidths = data.map((row) =>
        Bun.stringWidth(String(row[col] ?? ""))
      );
      widthMap.set(col, Math.max(headerWidth, ...dataWidths, 0));
    }
    displayColumns.sort(
      (a, b) => (widthMap.get(b) ?? 0) - (widthMap.get(a) ?? 0)
    );
  }

  // [1.2.3.1] maxWidth truncation for Workers/TTY
  if (options.maxWidth) {
    const totalWidth =
      computeColumnWidths(data, displayColumns).reduce((a, b) => a + b, 0) +
      displayColumns.length * 3;
    if (totalWidth > options.maxWidth) {
      displayColumns = displayColumns.slice(0, 6);
    }
  }

  return Bun.inspect.table(data, displayColumns, {
    colors: options.colors ?? Bun.isTTY,
  });
}

/**
 * Default extra columns to suggest
 * [TABLE][UTILS][CONSTANTS]{BUN-NATIVE}
 */
const DEFAULT_EXTRA_COLUMNS = [
  "timestamp",
  "owner",
  "metrics",
  "tags",
] as const;

/**
 * Extract columns from single data sample
 * [TABLE][UTILS][HELPER][#REF:extractColumnsFromSample]{BUN-NATIVE}
 */
function extractColumnsFromSample(dataSample: unknown): string[] {
  if (!dataSample || typeof dataSample !== "object") return [];
  return Object.keys(dataSample as TableRow);
}

/**
 * Find common columns across multiple rows
 * [TABLE][UTILS][HELPER][#REF:findCommonColumns]{BUN-NATIVE}
 */
function findCommonColumns(data: TableRow[]): string[] {
  if (data.length === 0) return [];

  let common = new Set(Object.keys(data[0]));
  for (let i = 1; i < data.length; i++) {
    const keys = new Set(Object.keys(data[i]));
    common = new Set([...common].filter((k) => keys.has(k)));
    if (common.size === 0) break;
  }

  return [...common];
}

/**
 * Suggest columns from single data sample
 * [TABLE][UTILS][METHOD][#REF:aiSuggestColumns]{BUN-NATIVE}
 */
export function aiSuggestColumns(
  dataSample: TableRow | unknown,
  extras: string[] = [...DEFAULT_EXTRA_COLUMNS]
): string[] {
  const sampleColumns = extractColumnsFromSample(dataSample);
  return [...new Set([...sampleColumns, ...extras])];
}

/**
 * Suggest common columns across multiple rows
 * [TABLE][UTILS][METHOD][#REF:aiSuggestCommonColumns]{BUN-NATIVE}
 */
export function aiSuggestCommonColumns(
  data: TableRow[],
  extras: string[] = [...DEFAULT_EXTRA_COLUMNS]
): string[] {
  const commonColumns = findCommonColumns(data);
  return [...new Set([...commonColumns, ...extras])];
}

// [1.2.2.0] computeColumnWidths - Bun.stringWidth per cell/header
export function computeColumnWidths(
  data: TableRow[],
  columns: string[]
): number[] {
  return columns.map((col) => {
    const headerWidth = Bun.stringWidth(col);
    const values = data.map((row) => Bun.stringWidth(String(row[col] ?? "")));
    return Math.max(headerWidth, ...values);
  });
}

/**
 * Deprecated aliases - kept for backward compatibility
 * @deprecated Use Bun.stringWidth and Bun.deepEquals directly
 */
export const unicodeSafeWidth = Bun.stringWidth;
export const compareTableData = Bun.deepEquals;

/**
 * Validate table data structure
 * [TABLE][UTILS][METHOD][#REF:validateTableData]{BUN-NATIVE}
 */
export function validateTableData(data: unknown[]): boolean {
  if (!Array.isArray(data) || data.length === 0) return false;
  const firstRow = data[0];
  if (typeof firstRow !== "object" || firstRow === null) return false;
  const keys = Object.keys(firstRow as Record<string, unknown>);
  return keys.length >= 3; // Minimum 3 columns for meaningful table
}

/**
 * Convert column widths array to Map (legacy API)
 * @deprecated Use computeColumnWidths for new code (returns number[])
 */
export function calculateColumnWidths(
  data: unknown[],
  columns: string[]
): Map<string, number> {
  const widthsArray = computeColumnWidths(data as TableRow[], columns);
  return new Map(columns.map((col, i) => [col, widthsArray[i]]));
}

// [1.3.1.0] toHTMLTable - Dark-mode CSS, Bun.escapeHTML XSS-proof [480MB/s]
export function toHTMLTable(
  data: TableRow[],
  columns: string[],
  options: { darkMode?: boolean; className?: string } = {}
): string {
  const { darkMode = true, className = "bun-table" } = options;
  const thead = `<thead><tr>${columns
    .map((col) => `<th>${Bun.escapeHTML(col)}</th>`)
    .join("")}</tr></thead>`;
  const tbody = `<tbody>${data
    .map(
      (row) =>
        `<tr>${columns
          .map((col) => `<td>${Bun.escapeHTML(String(row[col] ?? ""))}</td>`)
          .join("")}</tr>`
    )
    .join("")}</tbody>`;
  const style = darkMode
    ? `style="background:#1a1a1a;color:#e0e0e0;border-collapse:collapse;"`
    : "";
  return `<table class="${className}" ${style}>${thead}${tbody}</table>`;
}

// [1.3.2.0] exportTableToS3 - Dual TTY/HTML, KV-tagged logs [#REF-1.3.1.1]
export interface ExportTableOptions extends EnforceTableOptions {
  htmlMode?: boolean;
  disposition?: string;
}

export async function exportTableToS3(
  data: TableRow[],
  bucketKey: string,
  options: ExportTableOptions = {}
): Promise<void> {
  const cols = aiSuggestColumns(data[0] ?? {});
  if (cols.length < 6) {
    throw new Error(
      `Enterprise table requires ≥6 columns for S3 export, got ${cols.length}`
    );
  }
  const content =
    options.htmlMode === true
      ? toHTMLTable(data, cols)
      : Bun.inspect.table(data, cols, { colors: false });
  const { s3 } = await import("bun");
  await s3.write(bucketKey, content, {
    contentDisposition:
      options.disposition ?? 'attachment; filename="enterprise-table.txt"',
  });
  console.log(`✅ Exported: ${bucketKey} [KV subprotocol #REF-1.3.1.1]`);
}
