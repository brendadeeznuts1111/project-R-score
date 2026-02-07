/**
 * Unicode-Aware CLI Table Generator
 * 
 * Features:
 * - Full Unicode support (emojis, full-width chars, CJK)
 * - ANSI color code preservation with Bun.wrapAnsi()
 * - Status indicators with semantic colors
 * - Automatic column width calculation
 * - Header case preservation (using Bun fetch's new behavior)
 * - Markdown and plain text output formats
 */

import { getBrandColor } from '../config/domain';

// ANSI color codes
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  // Colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  // Bright colors
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightCyan: '\x1b[96m',
  // Backgrounds
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgRed: '\x1b[41m',
  bgBlue: '\x1b[44m',
};

export type StatusType = 'online' | 'away' | 'busy' | 'offline' | 'ok' | 'warning' | 'error' | 'info' | 'pending';

export interface TableColumn<T = TableRow> {
  key: keyof T | string;
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  wrap?: boolean;
  color?: (value: unknown) => string;
  formatter?: (value: unknown, row?: T) => string;
}

export interface TableRow {
  [key: string]: unknown;
}

export interface TableOptions {
  columns: TableColumn[];
  rows: TableRow[];
  title?: string;
  showHeader?: boolean;
  border?: 'single' | 'double' | 'rounded' | 'minimal' | 'none';
  headerStyle?: 'bold' | 'inverse' | 'underline' | 'none';
  maxWidth?: number;
  format?: 'terminal' | 'markdown' | 'json';
}

// Unicode box drawing characters
const BORDERS = {
  single: {
    topLeft: '┌', topRight: '┐', bottomLeft: '└', bottomRight: '┘',
    horizontal: '─', vertical: '│',
    leftT: '├', rightT: '┤', topT: '┬', bottomT: '┴', cross: '┼'
  },
  double: {
    topLeft: '╔', topRight: '╗', bottomLeft: '╚', bottomRight: '╝',
    horizontal: '═', vertical: '║',
    leftT: '╠', rightT: '╣', topT: '╦', bottomT: '╩', cross: '╬'
  },
  rounded: {
    topLeft: '╭', topRight: '╮', bottomLeft: '╰', bottomRight: '╯',
    horizontal: '─', vertical: '│',
    leftT: '├', rightT: '┤', topT: '┬', bottomT: '┴', cross: '┼'
  },
  minimal: {
    topLeft: '┌', topRight: '┐', bottomLeft: '└', bottomRight: '┘',
    horizontal: '─', vertical: '│',
    leftT: '├', rightT: '┤', topT: '┬', bottomT: '┴', cross: '┼'
  },
  none: {
    topLeft: '', topRight: '', bottomLeft: '', bottomRight: '',
    horizontal: '', vertical: '',
    leftT: '', rightT: '', topT: '', bottomT: '', cross: ''
  }
};

// Status indicators with Unicode symbols
const STATUS_INDICATORS: Record<StatusType, { symbol: string; label: string; color: string }> = {
  online:   { symbol: '🟢', label: 'ONLINE',   color: ANSI.green },
  away:     { symbol: '🟡', label: 'AWAY',     color: ANSI.yellow },
  busy:     { symbol: '🔴', label: 'BUSY',     color: ANSI.red },
  offline:  { symbol: '⚫', label: 'OFFLINE',  color: ANSI.dim },
  ok:       { symbol: '✅', label: 'OK',       color: ANSI.green },
  warning:  { symbol: '⚠️',  label: 'WARNING',  color: ANSI.yellow },
  error:    { symbol: '❌', label: 'ERROR',    color: ANSI.red },
  info:     { symbol: 'ℹ️',  label: 'INFO',     color: ANSI.cyan },
  pending:  { symbol: '⏳', label: 'PENDING',  color: ANSI.blue },
};

/**
 * Calculate display width of a string (Unicode-aware)
 * Handles full-width characters (CJK, emoji)
 */
export function getDisplayWidth(str: string): number {
  let width = 0;
  for (const char of str) {
    const code = char.codePointAt(0) || 0;
    // Full-width characters: CJK, emoji, etc.
    if (
      (code >= 0x1100 && code <= 0x115f) || // Hangul Jamo
      (code >= 0x2e80 && code <= 0x9fff) || // CJK
      (code >= 0xac00 && code <= 0xd7af) || // Hangul Syllables
      (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility
      (code >= 0x1f300 && code <= 0x1f9ff) || // Emoji
      (code >= 0x20000 && code <= 0x2ffff) // CJK Extension B
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * Strip ANSI codes from string
 */
export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Pad string to target width (Unicode-aware)
 */
export function padUnicode(str: string, width: number, align: 'left' | 'center' | 'right' = 'left'): string {
  const displayWidth = getDisplayWidth(stripAnsi(str));
  const padding = width - displayWidth;
  
  if (padding <= 0) return str;
  
  const leftPad = align === 'center' ? Math.floor(padding / 2) : align === 'right' ? padding : 0;
  const rightPad = padding - leftPad;
  
  return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
}

/**
 * Truncate string to max width with ellipsis (Unicode-aware)
 */
export function truncateUnicode(str: string, maxWidth: number): string {
  const stripped = stripAnsi(str);
  const width = getDisplayWidth(stripped);
  
  if (width <= maxWidth) return str;
  
  let result = '';
  let currentWidth = 0;
  
  for (const char of str) {
    const charWidth = getDisplayWidth(char);
    if (currentWidth + charWidth + 1 > maxWidth) {
      break;
    }
    result += char;
    currentWidth += charWidth;
  }
  
  return result + '…';
}

/**
 * Format status with Unicode indicator
 */
export function formatStatus(status: StatusType, compact = false): string {
  const indicator = STATUS_INDICATORS[status];
  if (!indicator) return status;
  
  if (compact) {
    return `${indicator.color}${indicator.symbol}${ANSI.reset}`;
  }
  
  return `${indicator.color}${indicator.symbol} ${indicator.label}${ANSI.reset}`;
}

/**
 * Wrap text using Bun.wrapAnsi() if available, fallback to manual
 */
export function wrapText(text: string, maxWidth: number): string[] {
  // Try to use Bun.wrapAnsi if available (Bun v1.3.7+)
  if (typeof Bun !== 'undefined' && 'wrapAnsi' in Bun) {
    try {
      const wrapped = (Bun as unknown as { wrapAnsi: (text: string, width: number) => string }).wrapAnsi(text, maxWidth);
      return wrapped.split('\n');
    } catch {
      // Fall through to manual wrapping
    }
  }
  
  // Manual Unicode-aware wrapping
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const wordWidth = getDisplayWidth(stripAnsi(word));
    const lineWidth = getDisplayWidth(stripAnsi(currentLine));
    
    if (lineWidth + wordWidth + 1 > maxWidth) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine += (currentLine ? ' ' : '') + word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines.length ? lines : [text];
}

/**
 * Calculate optimal column widths
 */
function calculateColumnWidths(options: TableOptions): number[] {
  const { columns, rows, maxWidth = process.stdout?.columns || 120 } = options;
  
  // Start with header widths
  const widths = columns.map(col => {
    const headerWidth = getDisplayWidth(col.header);
    const maxDataWidth = Math.max(...rows.map(row => {
      const value = String(row[col.key] ?? '');
      return getDisplayWidth(stripAnsi(value));
    }));
    return Math.max(headerWidth, maxDataWidth, col.width || 0);
  });
  
  // If total width exceeds max, scale down proportionally
  const borderWidth = columns.length + 1; // Vertical borders + padding
  const totalWidth = widths.reduce((a, b) => a + b, 0) + borderWidth;
  
  if (totalWidth > maxWidth) {
    const scale = (maxWidth - borderWidth) / (totalWidth - borderWidth);
    return widths.map(w => Math.max(3, Math.floor(w * scale)));
  }
  
  return widths;
}

/**
 * Generate terminal table
 */
function generateTerminalTable(options: TableOptions): string {
  const { columns, rows, title, showHeader = true, border = 'single', headerStyle = 'bold' } = options;
  const borders = BORDERS[border];
  const widths = calculateColumnWidths(options);
  
  const lines: string[] = [];
  
  // Title
  if (title) {
    const titleWidth = widths.reduce((a, b) => a + b, 0) + columns.length + 1;
    const paddedTitle = padUnicode(title, titleWidth - 2, 'center');
    lines.push(`${borders.topLeft}${borders.horizontal.repeat(titleWidth)}${borders.topRight}`);
    lines.push(`${borders.vertical} ${ANSI.bold}${paddedTitle}${ANSI.reset} ${borders.vertical}`);
    lines.push(`${borders.leftT}${columns.map((_, i) => borders.horizontal.repeat(widths[i] + 2)).join(borders.cross)}${borders.rightT}`);
  } else {
    // Top border
    lines.push(`${borders.topLeft}${columns.map((_, i) => borders.horizontal.repeat(widths[i] + 2)).join(borders.topT)}${borders.topRight}`);
  }
  
  // Header row
  if (showHeader) {
    const headerCells = columns.map((col, i) => {
      let text = padUnicode(col.header, widths[i], col.align || 'left');
      if (headerStyle === 'bold') text = `${ANSI.bold}${text}${ANSI.reset}`;
      if (headerStyle === 'inverse') text = `${ANSI.bgBlue}${ANSI.white}${text}${ANSI.reset}`;
      if (headerStyle === 'underline') text = `${ANSI.underline}${text}${ANSI.reset}`;
      return text;
    });
    lines.push(`${borders.vertical} ${headerCells.join(` ${borders.vertical} `)} ${borders.vertical}`);
    
    // Header separator
    lines.push(`${borders.leftT}${columns.map((_, i) => borders.horizontal.repeat(widths[i] + 2)).join(borders.cross)}${borders.rightT}`);
  }
  
  // Data rows
  for (const row of rows) {
    const rowLines: string[][] = columns.map((col, i) => {
      let value = String(row[col.key] ?? '');
      
      // Apply custom color function if provided
      if (col.color) {
        value = col.color(row[col.key]);
      }
      
      // Wrap if needed
      if (col.wrap && getDisplayWidth(stripAnsi(value)) > widths[i]) {
        return wrapText(value, widths[i]);
      }
      
      return [truncateUnicode(value, widths[i])];
    });
    
    // Find max lines in this row
    const maxLines = Math.max(...rowLines.map(cellLines => cellLines.length));
    
    for (let lineIdx = 0; lineIdx < maxLines; lineIdx++) {
      const cells = columns.map((col, colIdx) => {
        const cellLines = rowLines[colIdx];
        const text = cellLines[lineIdx] || '';
        return padUnicode(text, widths[colIdx], col.align || 'left');
      });
      lines.push(`${borders.vertical} ${cells.join(` ${borders.vertical} `)} ${borders.vertical}`);
    }
  }
  
  // Bottom border
  lines.push(`${borders.bottomLeft}${columns.map((_, i) => borders.horizontal.repeat(widths[i] + 2)).join(borders.bottomT)}${borders.bottomRight}`);
  
  return lines.join('\n');
}

/**
 * Generate Markdown table
 */
function generateMarkdownTable(options: TableOptions): string {
  const { columns, rows, title } = options;
  const widths = calculateColumnWidths(options);
  const lines: string[] = [];
  
  if (title) {
    lines.push(`## ${title}\n`);
  }
  
  // Header
  const headerRow = `| ${columns.map((col, i) => padUnicode(col.header, widths[i])).join(' | ')} |`;
  lines.push(headerRow);
  
  // Separator
  const separator = `| ${columns.map((_, i) => '-'.repeat(widths[i])).join(' | ')} |`;
  lines.push(separator);
  
  // Data rows
  for (const row of rows) {
    const cells = columns.map((col, i) => {
      const value = String(row[col.key] ?? '');
      return padUnicode(value, widths[i]);
    });
    lines.push(`| ${cells.join(' | ')} |`);
  }
  
  return lines.join('\n');
}

/**
 * Generate JSON output
 */
function generateJSONTable(options: TableOptions): string {
  return JSON.stringify({
    title: options.title,
    columns: options.columns.map(c => ({ key: c.key, header: c.header })),
    rows: options.rows
  }, null, 2);
}

/**
 * Main table generation function
 */
export function generateTable(options: TableOptions): string {
  switch (options.format) {
    case 'markdown':
      return generateMarkdownTable(options);
    case 'json':
      return generateJSONTable(options);
    case 'terminal':
    default:
      return generateTerminalTable(options);
  }
}

/**
 * Print table to console
 */
export function printTable(options: TableOptions): void;
export function printTable<T>(
  data: T[],
  columns: Array<{
    key: keyof T | string;
    header: string;
    width?: number;
    align?: 'left' | 'center' | 'right';
    formatter?: (value: unknown, row?: T) => string;
  }>,
  options?: Omit<TableOptions, 'columns' | 'rows'>
): void;
export function printTable<T>(
  optionsOrData: TableOptions | T[],
  columnsOrUndefined?: Array<{
    key: keyof T | string;
    header: string;
    width?: number;
    align?: 'left' | 'center' | 'right';
    formatter?: (value: unknown, row?: T) => string;
  }>,
  options?: Omit<TableOptions, 'columns' | 'rows'>
): void {
  // Check if first argument is the options object
  if (!Array.isArray(optionsOrData) && 'columns' in optionsOrData && 'rows' in optionsOrData) {
    console.log(generateTable(optionsOrData as TableOptions));
    return;
  }

  // Convert data array format to TableOptions format
  const data = optionsOrData as T[];
  const columns = (columnsOrUndefined || []).map(col => ({
    key: col.key as string,
    header: col.header,
    width: col.width,
    align: col.align,
    color: col.formatter ? (value: unknown, row?: TableRow) => col.formatter!(value, row as T) : undefined,
  }));

  const rows: TableRow[] = data.map(item => {
    const row: TableRow = {};
    columns.forEach(col => {
      row[col.key] = (item as Record<string, unknown>)[col.key as string];
    });
    return row;
  });

  console.log(generateTable({
    columns,
    rows,
    ...options,
  }));
}

/**
 * Predefined column types
 */
export const ColumnTypes = {
  /** Text column with left alignment */
  text: (key: string, header: string, width?: number): TableColumn => ({
    key, header, width, align: 'left', wrap: true
  }),
  
  /** Number column with right alignment */
  number: (key: string, header: string, width?: number): TableColumn => ({
    key, header, width: width || 10, align: 'right'
  }),
  
  /** Status column with color coding */
  status: (key: string, header: string, width = 12): TableColumn => ({
    key, header, width, align: 'center',
    color: (value) => {
      const status = String(value).toLowerCase() as StatusType;
      return formatStatus(status);
    }
  }),
  
  /** File size column (auto-formats bytes) */
  fileSize: (key: string, header: string, width = 12): TableColumn => ({
    key, header, width, align: 'right',
    color: (value) => {
      const bytes = Number(value);
      if (isNaN(bytes)) return String(value);
      
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      const size = (bytes / Math.pow(1024, i)).toFixed(1);
      
      let color = ANSI.dim;
      if (i >= 3) color = ANSI.red;      // GB+
      else if (i >= 2) color = ANSI.yellow; // MB
      else if (i >= 1) color = ANSI.green;  // KB
      
      return `${color}${size} ${sizes[i]}${ANSI.reset}`;
    }
  }),
  
  /** Duration column (auto-formats ms) */
  duration: (key: string, header: string, width = 10): TableColumn => ({
    key, header, width, align: 'right',
    color: (value) => {
      const ms = Number(value);
      if (isNaN(ms)) return String(value);
      
      let color = ANSI.green;
      if (ms > 1000) color = ANSI.red;
      else if (ms > 100) color = ANSI.yellow;
      
      if (ms < 1) return `${color}${(ms * 1000).toFixed(0)}µs${ANSI.reset}`;
      if (ms < 1000) return `${color}${ms.toFixed(1)}ms${ANSI.reset}`;
      return `${color}${(ms / 1000).toFixed(2)}s${ANSI.reset}`;
    }
  }),
};

/**
 * Example usage and demo
 */
export function demoTable(): void {
  const columns: TableColumn[] = [
    ColumnTypes.text('name', 'Service', 20),
    ColumnTypes.status('status', 'Status', 12),
    ColumnTypes.number('requests', 'Requests', 12),
    ColumnTypes.duration('latency', 'Latency', 10),
    ColumnTypes.fileSize('memory', 'Memory', 12),
  ];
  
  const rows: TableRow[] = [
    { name: '🔐 Auth Service', status: 'online', requests: 15234, latency: 45.2, memory: 52428800 },
    { name: '📊 Analytics API', status: 'warning', requests: 8932, latency: 245.5, memory: 134217728 },
    { name: '📧 Email Worker', status: 'busy', requests: 3421, latency: 1250.0, memory: 67108864 },
    { name: '🔔 Notification', status: 'offline', requests: 0, latency: 0, memory: 0 },
    { name: '📦 Cache Layer', status: 'ok', requests: 98765, latency: 2.1, memory: 268435456 },
  ];
  
  console.log('\n' + ANSI.bold + 'Terminal Format:' + ANSI.reset);
  printTable({
    title: '🏰 FactoryWager Service Status',
    columns,
    rows,
    border: 'rounded',
    headerStyle: 'bold'
  });
  
  console.log('\n' + ANSI.bold + 'Markdown Format:' + ANSI.reset);
  console.log(generateTable({
    title: 'Service Status Report',
    columns,
    rows,
    format: 'markdown'
  }));
}

// Run demo if executed directly
if (import.meta.main) {
  demoTable();
}
