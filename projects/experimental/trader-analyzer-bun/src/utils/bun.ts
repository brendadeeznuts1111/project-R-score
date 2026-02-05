/**
 * @fileoverview Bun-Native Utilities
 * @description Leverage Bun's native APIs for performance and developer experience
 * @module utils/bun
 */

/**
 * Bun.inspect options for pretty printing
 */
export interface InspectOptions {
  colors?: boolean;
  depth?: number;
  sorted?: boolean;
  compact?: boolean;
}

/**
 * Pretty print any value using Bun.inspect
 */
export function inspect(value: unknown, options: InspectOptions = {}): string {
  return Bun.inspect(value, {
    colors: options.colors ?? true,
    depth: options.depth ?? 4,
    sorted: options.sorted ?? true,
    compact: options.compact ?? false,
  });
}

/**
 * Log with Bun.inspect formatting
 */
export function log(label: string, value: unknown, options?: InspectOptions): void {
  console.log(`\x1b[36m[${label}]\x1b[0m`, inspect(value, options));
}

/**
 * Debug log (only in development)
 */
export function debug(label: string, value: unknown): void {
  if (process.env.NODE_ENV !== 'production') {
    log(`DEBUG:${label}`, value, { depth: 6 });
  }
}

/**
 * String width options for Bun.stringWidth
 */
export interface StringWidthOptions {
  /** Count ANSI escape codes in width (default: false) */
  countAnsiEscapeCodes?: boolean;
  /** When ambiguous, count emoji as 1 char wide if true, 2 if false (default: true) */
  ambiguousIsNarrow?: boolean;
}

/**
 * Get display width of string using Bun.stringWidth
 * Handles Unicode, emojis, ANSI escape codes correctly
 *
 * Performance (from official benchmarks):
 * - 5 chars ASCII: ~16ns
 * - 500 chars ASCII: ~37ns
 * - 7 chars emoji: ~54ns
 * - 700 chars emoji: ~3.3µs
 * - 8 chars ANSI+emoji: ~66ns
 *
 * @example
 * ```ts
 * stringWidth('hello');           // => 5
 * stringWidth('👋🌍');            // => 4 (each emoji = 2)
 * stringWidth('\x1b[31mred\x1b[0m'); // => 3 (ANSI codes ignored)
 * ```
 */
export function stringWidth(str: string, options?: StringWidthOptions): number {
  return Bun.stringWidth(str, options);
}

/**
 * Pad string to width accounting for Unicode display width
 * Unlike String.padEnd, this correctly handles emojis and wide characters
 */
export function padEnd(str: string, width: number, fill = ' '): string {
  const currentWidth = Bun.stringWidth(str);
  if (currentWidth >= width) return str;
  return str + fill.repeat(width - currentWidth);
}

/**
 * Pad string to width from start, accounting for Unicode display width
 */
export function padStart(str: string, width: number, fill = ' '): string {
  const currentWidth = Bun.stringWidth(str);
  if (currentWidth >= width) return str;
  return fill.repeat(width - currentWidth) + str;
}

/**
 * Center string within width, accounting for Unicode display width
 */
export function center(str: string, width: number, fill = ' '): string {
  const currentWidth = Bun.stringWidth(str);
  if (currentWidth >= width) return str;
  const padding = width - currentWidth;
  const left = Math.floor(padding / 2);
  const right = padding - left;
  return fill.repeat(left) + str + fill.repeat(right);
}

/**
 * Truncate string to max display width, adding ellipsis if needed
 */
export function truncate(str: string, maxWidth: number, ellipsis = '…'): string {
  if (Bun.stringWidth(str) <= maxWidth) return str;

  const ellipsisWidth = Bun.stringWidth(ellipsis);
  let result = '';
  let width = 0;

  for (const char of str) {
    const charWidth = Bun.stringWidth(char);
    if (width + charWidth > maxWidth - ellipsisWidth) break;
    result += char;
    width += charWidth;
  }

  return result + ellipsis;
}

/**
 * Peek at a promise value without consuming it (Bun.peek)
 */
export function peek<T>(promise: Promise<T>): T | Promise<T> {
  return Bun.peek(promise);
}

/**
 * Deep equality check using Bun.deepEquals
 */
export function deepEquals(a: unknown, b: unknown): boolean {
  return Bun.deepEquals(a, b);
}

/**
 * Escape HTML special characters using Bun.escapeHTML
 */
export function escapeHTML(str: string): string {
  return Bun.escapeHTML(str);
}

/**
 * Options for Bun.which
 */
export interface WhichOptions {
  /** Custom PATH to search */
  PATH?: string;
  /** Current working directory for resolution */
  cwd?: string;
}

/**
 * Find executable path using Bun.which
 * Similar to `which` command in terminal
 *
 * @example
 * ```ts
 * which('ls');                    // => "/usr/bin/ls"
 * which('node', { PATH: '/usr/local/bin' });
 * which('script', { cwd: '/tmp', PATH: '' }); // => null if not found
 * ```
 */
export function which(command: string, options?: WhichOptions): string | null {
  return Bun.which(command, options);
}

/**
 * Table column configuration
 */
export interface TableColumn<T> {
  key: keyof T | ((row: T) => unknown);
  header: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
  format?: (value: unknown) => string;
}

/**
 * Format value for table display using Bun.stringWidth for accurate width
 */
function formatValue(value: unknown, width: number, align: 'left' | 'right' | 'center' = 'left'): string {
  let str = String(value ?? '');
  const displayWidth = Bun.stringWidth(str);

  if (displayWidth > width) {
    // Truncate accounting for display width
    let truncated = '';
    let w = 0;
    for (const char of str) {
      const charWidth = Bun.stringWidth(char);
      if (w + charWidth > width - 1) break;
      truncated += char;
      w += charWidth;
    }
    str = truncated + '…';
  }

  const padding = Math.max(0, width - Bun.stringWidth(str));
  switch (align) {
    case 'right':
      return ' '.repeat(padding) + str;
    case 'center':
      const left = Math.floor(padding / 2);
      return ' '.repeat(left) + str + ' '.repeat(padding - left);
    default:
      return str + ' '.repeat(padding);
  }
}

/**
 * Render array as formatted table (Bun-optimized)
 */
export function table<T extends Record<string, unknown>>(
  data: T[],
  columns?: TableColumn<T>[]
): string {
  if (data.length === 0) return '(empty)';

  // Auto-detect columns if not provided
  const cols: TableColumn<T>[] = columns ?? Object.keys(data[0]).map(key => ({
    key: key as keyof T,
    header: key,
  }));

  // Calculate column widths
  const widths = cols.map(col => {
    const headerLen = col.header.length;
    const maxDataLen = data.reduce((max, row) => {
      const value = typeof col.key === 'function' ? col.key(row) : row[col.key];
      const formatted = col.format ? col.format(value) : String(value ?? '');
      return Math.max(max, formatted.length);
    }, 0);
    return col.width ?? Math.min(Math.max(headerLen, maxDataLen), 40);
  });

  // Build table
  const lines: string[] = [];
  const separator = '─';
  const corner = '┼';
  const vertical = '│';

  // Top border
  lines.push('┌' + widths.map(w => separator.repeat(w + 2)).join('┬') + '┐');

  // Header
  const headerRow = cols.map((col, i) => formatValue(col.header, widths[i], 'center'));
  lines.push(vertical + ' ' + headerRow.join(' ' + vertical + ' ') + ' ' + vertical);

  // Header separator
  lines.push('├' + widths.map(w => separator.repeat(w + 2)).join(corner) + '┤');

  // Data rows
  for (const row of data) {
    const cells = cols.map((col, i) => {
      const value = typeof col.key === 'function' ? col.key(row) : row[col.key];
      const formatted = col.format ? col.format(value) : String(value ?? '');
      return formatValue(formatted, widths[i], col.align);
    });
    lines.push(vertical + ' ' + cells.join(' ' + vertical + ' ') + ' ' + vertical);
  }

  // Bottom border
  lines.push('└' + widths.map(w => separator.repeat(w + 2)).join('┴') + '┘');

  return lines.join('\n');
}

/**
 * Print table to console with colors
 */
export function printTable<T extends Record<string, unknown>>(
  data: T[],
  columns?: TableColumn<T>[]
): void {
  console.log(table(data, columns));
}

/**
 * Bun.inspect.table options
 */
export interface InspectTableOptions {
  colors?: boolean;
}

/**
 * Symbol for custom inspect implementation
 * Use this to customize how objects are printed with Bun.inspect
 *
 * @example
 * ```ts
 * class Trade {
 *   constructor(public symbol: string, public price: number) {}
 *
 *   [inspectCustom]() {
 *     return `Trade(${this.symbol} @ $${this.price})`;
 *   }
 * }
 * ```
 */
export const inspectCustom = Bun.inspect.custom;

/**
 * Print tabular data using Bun.inspect.table (Bun 1.3+)
 * Like console.table, but returns a string with box-drawing characters
 *
 * @example
 * ```ts
 * const data = [
 *   { name: 'BTC', price: 97500, change: 2.5 },
 *   { name: 'ETH', price: 3400, change: -1.2 },
 * ];
 * console.log(inspectTable(data));
 * // ┌───┬─────┬───────┬────────┐
 * // │   │ name│ price │ change │
 * // ├───┼─────┼───────┼────────┤
 * // │ 0 │ BTC │ 97500 │ 2.5    │
 * // │ 1 │ ETH │ 3400  │ -1.2   │
 * // └───┴─────┴───────┴────────┘
 *
 * // Only specific columns
 * console.log(inspectTable(data, ['name', 'price']));
 * ```
 */
export function inspectTable<T extends Record<string, unknown>>(
  data: T[],
  properties?: (keyof T)[] | InspectTableOptions,
  options?: InspectTableOptions
): string {
  // Handle overloaded signature: inspectTable(data, { colors: true })
  if (properties && !Array.isArray(properties)) {
    return Bun.inspect.table(data, properties);
  }
  if (properties && options) {
    return Bun.inspect.table(data, properties as string[], options);
  }
  if (properties) {
    return Bun.inspect.table(data, properties as string[]);
  }
  return Bun.inspect.table(data);
}

/**
 * Print Bun.inspect.table to console
 */
export function printInspectTable<T extends Record<string, unknown>>(
  data: T[],
  properties?: (keyof T)[],
  options: InspectTableOptions = {}
): void {
  console.log(inspectTable(data, properties, options));
}

/**
 * Benchmark result formatter using Bun.inspect.table
 */
export function benchmarkTable(results: Array<{
  name: string;
  ops: number;
  avgMs: number;
  minMs?: number;
  maxMs?: number;
}>): string {
  const formatted = results.map(r => ({
    Benchmark: r.name,
    'ops/sec': formatNumber(Math.round(r.ops)),
    'avg': formatDuration(r.avgMs),
    'min': r.minMs ? formatDuration(r.minMs) : '-',
    'max': r.maxMs ? formatDuration(r.maxMs) : '-',
  }));
  return Bun.inspect.table(formatted, ['Benchmark', 'ops/sec', 'avg', 'min', 'max'], { colors: true });
}

/**
 * Memory stats formatter using Bun.inspect.table
 */
export function memoryTable(): string {
  const mem = process.memoryUsage();
  const data = [
    { metric: 'Heap Used', value: formatBytes(mem.heapUsed), raw: mem.heapUsed },
    { metric: 'Heap Total', value: formatBytes(mem.heapTotal), raw: mem.heapTotal },
    { metric: 'RSS', value: formatBytes(mem.rss), raw: mem.rss },
    { metric: 'External', value: formatBytes(mem.external), raw: mem.external },
  ];
  return Bun.inspect.table(data, ['metric', 'value'], { colors: true });
}

/**
 * Quick comparison table for A/B testing
 */
export function compareTable<T extends Record<string, unknown>>(
  label: string,
  a: T,
  b: T,
  aLabel = 'A',
  bLabel = 'B'
): string {
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  const data = keys.map(key => ({
    [label]: key,
    [aLabel]: a[key] ?? '-',
    [bLabel]: b[key] ?? '-',
    diff: typeof a[key] === 'number' && typeof b[key] === 'number'
      ? `${(((b[key] as number) - (a[key] as number)) / (a[key] as number) * 100).toFixed(1)}%`
      : '-',
  }));
  return Bun.inspect.table(data, [label, aLabel, bLabel, 'diff'], { colors: true });
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format duration in ms to human readable
 */
export function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

/**
 * Format number with commas
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * Format percentage
 */
export function formatPercent(n: number, decimals = 2): string {
  return `${(n * 100).toFixed(decimals)}%`;
}

/**
 * Format currency
 */
export function formatCurrency(n: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
}

/**
 * Bun-native file utilities
 */
export const file = {
  /**
   * Check if file exists using Bun.file
   */
  async exists(path: string): Promise<boolean> {
    return Bun.file(path).exists();
  },

  /**
   * Read file as text
   */
  async readText(path: string): Promise<string> {
    return Bun.file(path).text();
  },

  /**
   * Read file as JSON
   */
  async readJson<T>(path: string): Promise<T> {
    return Bun.file(path).json();
  },

  /**
   * Read file as ArrayBuffer
   */
  async readBuffer(path: string): Promise<ArrayBuffer> {
    return Bun.file(path).arrayBuffer();
  },

  /**
   * Write text to file
   */
  async writeText(path: string, content: string): Promise<number> {
    return Bun.write(path, content);
  },

  /**
   * Write JSON to file
   */
  async writeJson(path: string, data: unknown, pretty = true): Promise<number> {
    const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    return Bun.write(path, content);
  },

  /**
   * Get file size
   */
  async size(path: string): Promise<number> {
    return Bun.file(path).size;
  },

  /**
   * Get file type (MIME)
   */
  type(path: string): string {
    return Bun.file(path).type;
  },
};

/**
 * Bun-native crypto utilities
 */
export const crypto = {
  /**
   * Hash string with SHA-256
   */
  sha256(input: string): string {
    const hasher = new Bun.CryptoHasher('sha256');
    hasher.update(input);
    return hasher.digest('hex');
  },

  /**
   * Hash string with SHA-1
   */
  sha1(input: string): string {
    const hasher = new Bun.CryptoHasher('sha1');
    hasher.update(input);
    return hasher.digest('hex');
  },

  /**
   * Hash string with MD5
   */
  md5(input: string): string {
    const hasher = new Bun.CryptoHasher('md5');
    hasher.update(input);
    return hasher.digest('hex');
  },

  /**
   * Generate random bytes as hex
   */
  randomHex(bytes = 16): string {
    const buffer = new Uint8Array(bytes);
    globalThis.crypto.getRandomValues(buffer);
    return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Generate UUID v4
   */
  uuid(): string {
    return globalThis.crypto.randomUUID();
  },

  /**
   * Generate UUID v7 (time-ordered) using Bun.randomUUIDv7
   */
  uuidv7(): string {
    return Bun.randomUUIDv7();
  },
};

/**
 * Bun-native color utilities (Bun.color)
 * Parse and format colors in various formats
 */
export const color = {
  /**
   * Parse color string to RGBA array
   */
  parse(input: string): { r: number; g: number; b: number; a: number } | null {
    const result = Bun.color(input, 'css');
    if (!result) return null;
    // Parse CSS color format
    const match = result.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) return null;
    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3]),
      a: match[4] ? parseFloat(match[4]) : 1,
    };
  },

  /**
   * Convert color to CSS format
   */
  toCSS(input: string): string | null {
    return Bun.color(input, 'css');
  },

  /**
   * Convert color to hex format
   */
  toHex(input: string): string | null {
    return Bun.color(input, 'hex');
  },

  /**
   * Convert color to ANSI format (for terminal)
   */
  toANSI(input: string): string | null {
    return Bun.color(input, 'ansi');
  },

  /**
   * Convert color to ANSI 256 format
   */
  toANSI256(input: string): string | null {
    return Bun.color(input, 'ansi-256');
  },

  /**
   * Convert color to ANSI 16m (true color) format
   */
  toANSI16m(input: string): string | null {
    return Bun.color(input, 'ansi-16m');
  },

  /**
   * Convert color to number format
   */
  toNumber(input: string): number | null {
    return Bun.color(input, 'number');
  },
};

/**
 * Bun-native timing utilities
 */
export const timing = {
  /**
   * Async sleep for ms or until Date
   * @example
   * ```ts
   * await timing.sleep(1000);  // sleep 1 second
   * await timing.sleep(new Date(Date.now() + 5000));  // sleep until 5s from now
   * ```
   */
  sleep: Bun.sleep as (ms: number | Date) => Promise<void>,

  /**
   * Blocking synchronous sleep (blocks the thread)
   * Use sparingly - prefer async sleep
   */
  sleepSync: Bun.sleepSync,

  /**
   * Measure execution time
   */
  async measure<T>(fn: () => Promise<T> | T): Promise<{ result: T; duration: number }> {
    const start = Bun.nanoseconds();
    const result = await fn();
    const duration = (Bun.nanoseconds() - start) / 1_000_000; // Convert to ms
    return { result, duration };
  },

  /**
   * Create a stopwatch
   */
  stopwatch() {
    const start = Bun.nanoseconds();
    return {
      elapsed(): number {
        return (Bun.nanoseconds() - start) / 1_000_000;
      },
      elapsedFormatted(): string {
        return formatDuration(this.elapsed());
      },
      lap(): number {
        const now = Bun.nanoseconds();
        const elapsed = (now - start) / 1_000_000;
        return elapsed;
      },
    };
  },

  /**
   * Get high-resolution timestamp in nanoseconds
   */
  now: Bun.nanoseconds,
};

/**
 * Bun runtime information
 */
export const runtime = {
  /**
   * Bun version string (e.g., "1.1.34")
   */
  version: Bun.version,

  /**
   * Git commit hash of Bun build
   */
  revision: Bun.revision,

  /**
   * Absolute path to the entrypoint script
   */
  main: Bun.main,

  /**
   * Check if current file is the entrypoint (directly executed)
   * Usage: runtime.isMain(import.meta.path)
   */
  isMain: (importMetaPath: string): boolean => importMetaPath === Bun.main,

  /**
   * Environment variables (alias for process.env / Bun.env)
   */
  env: Bun.env,

  /**
   * Memory usage
   */
  memory(): { heapUsed: number; heapTotal: number; rss: number } {
    const mem = process.memoryUsage();
    return {
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      rss: mem.rss,
    };
  },

  /**
   * Memory usage formatted
   */
  memoryFormatted(): { heapUsed: string; heapTotal: string; rss: string } {
    const mem = this.memory();
    return {
      heapUsed: formatBytes(mem.heapUsed),
      heapTotal: formatBytes(mem.heapTotal),
      rss: formatBytes(mem.rss),
    };
  },

  /**
   * Environment check
   */
  isDev: process.env.NODE_ENV !== 'production',
  isProd: process.env.NODE_ENV === 'production',
};

/**
 * Bun ArrayBuffer utilities (Bun-optimized)
 */
export const buffer = {
  /**
   * Concatenate ArrayBuffers
   */
  concat(...buffers: ArrayBuffer[]): ArrayBuffer {
    const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const buf of buffers) {
      result.set(new Uint8Array(buf), offset);
      offset += buf.byteLength;
    }
    return result.buffer;
  },

  /**
   * Convert string to ArrayBuffer
   */
  fromString(str: string): ArrayBuffer {
    return new TextEncoder().encode(str).buffer;
  },

  /**
   * Convert ArrayBuffer to string
   */
  toString(buf: ArrayBuffer): string {
    return new TextDecoder().decode(buf);
  },

  /**
   * Convert ArrayBuffer to hex string
   */
  toHex(buf: ArrayBuffer): string {
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },
};

/**
 * Progress bar for CLI
 */
export function progressBar(current: number, total: number, width = 30): string {
  const percent = Math.min(current / total, 1);
  const filled = Math.round(width * percent);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${(percent * 100).toFixed(1)}%`;
}

/**
 * Spinner for CLI operations
 */
export function createSpinner(message: string) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  let interval: ReturnType<typeof setInterval> | null = null;

  return {
    start() {
      interval = setInterval(() => {
        process.stdout.write(`\r${frames[i++ % frames.length]} ${message}`);
      }, 80);
    },
    stop(finalMessage?: string) {
      if (interval) clearInterval(interval);
      process.stdout.write(`\r✓ ${finalMessage ?? message}\n`);
    },
    fail(errorMessage?: string) {
      if (interval) clearInterval(interval);
      process.stdout.write(`\r✗ ${errorMessage ?? message}\n`);
    },
  };
}

/**
 * Color utilities for terminal output
 * Supports standard, bright, and 256-color modes
 */
export const colors = {
  // Reset and modifiers
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  blink: '\x1b[5m',
  inverse: '\x1b[7m',
  hidden: '\x1b[8m',
  strikethrough: '\x1b[9m',

  // Standard foreground (30-37)
  black: (s: string) => `\x1b[30m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[35m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  white: (s: string) => `\x1b[37m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,

  // Bright foreground (90-97)
  brightBlack: (s: string) => `\x1b[90m${s}\x1b[0m`,
  brightRed: (s: string) => `\x1b[91m${s}\x1b[0m`,
  brightGreen: (s: string) => `\x1b[92m${s}\x1b[0m`,
  brightYellow: (s: string) => `\x1b[93m${s}\x1b[0m`,
  brightBlue: (s: string) => `\x1b[94m${s}\x1b[0m`,
  brightMagenta: (s: string) => `\x1b[95m${s}\x1b[0m`,
  brightCyan: (s: string) => `\x1b[96m${s}\x1b[0m`,
  brightWhite: (s: string) => `\x1b[97m${s}\x1b[0m`,

  // Standard background (40-47)
  bgBlack: (s: string) => `\x1b[40m${s}\x1b[0m`,
  bgRed: (s: string) => `\x1b[41m${s}\x1b[0m`,
  bgGreen: (s: string) => `\x1b[42m${s}\x1b[0m`,
  bgYellow: (s: string) => `\x1b[43m${s}\x1b[0m`,
  bgBlue: (s: string) => `\x1b[44m${s}\x1b[0m`,
  bgMagenta: (s: string) => `\x1b[45m${s}\x1b[0m`,
  bgCyan: (s: string) => `\x1b[46m${s}\x1b[0m`,
  bgWhite: (s: string) => `\x1b[47m${s}\x1b[0m`,

  // Bright background (100-107)
  bgBrightBlack: (s: string) => `\x1b[100m${s}\x1b[0m`,
  bgBrightRed: (s: string) => `\x1b[101m${s}\x1b[0m`,
  bgBrightGreen: (s: string) => `\x1b[102m${s}\x1b[0m`,
  bgBrightYellow: (s: string) => `\x1b[103m${s}\x1b[0m`,
  bgBrightBlue: (s: string) => `\x1b[104m${s}\x1b[0m`,
  bgBrightMagenta: (s: string) => `\x1b[105m${s}\x1b[0m`,
  bgBrightCyan: (s: string) => `\x1b[106m${s}\x1b[0m`,
  bgBrightWhite: (s: string) => `\x1b[107m${s}\x1b[0m`,

  // Semantic colors
  success: (s: string) => `\x1b[92m${s}\x1b[0m`, // bright green
  error: (s: string) => `\x1b[91m${s}\x1b[0m`,   // bright red
  warning: (s: string) => `\x1b[93m${s}\x1b[0m`, // bright yellow
  info: (s: string) => `\x1b[96m${s}\x1b[0m`,    // bright cyan
  debug: (s: string) => `\x1b[95m${s}\x1b[0m`,   // bright magenta
  muted: (s: string) => `\x1b[90m${s}\x1b[0m`,   // gray

  // Combined styles
  boldRed: (s: string) => `\x1b[1;91m${s}\x1b[0m`,
  boldGreen: (s: string) => `\x1b[1;92m${s}\x1b[0m`,
  boldYellow: (s: string) => `\x1b[1;93m${s}\x1b[0m`,
  boldBlue: (s: string) => `\x1b[1;94m${s}\x1b[0m`,
  boldCyan: (s: string) => `\x1b[1;96m${s}\x1b[0m`,
  boldMagenta: (s: string) => `\x1b[1;95m${s}\x1b[0m`,

  // 256-color support (foreground)
  fg256: (code: number) => (s: string) => `\x1b[38;5;${code}m${s}\x1b[0m`,
  // 256-color support (background)
  bg256: (code: number) => (s: string) => `\x1b[48;5;${code}m${s}\x1b[0m`,

  // RGB true color support (foreground)
  rgb: (r: number, g: number, b: number) => (s: string) => `\x1b[38;2;${r};${g};${b}m${s}\x1b[0m`,
  // RGB true color support (background)
  bgRgb: (r: number, g: number, b: number) => (s: string) => `\x1b[48;2;${r};${g};${b}m${s}\x1b[0m`,

  // Hex color support using Bun.color
  hex: (hexColor: string) => (s: string) => {
    const ansi = Bun.color(hexColor, 'ansi-16m');
    return ansi ? `${ansi}${s}\x1b[0m` : s;
  },

  // Strip ANSI codes from string
  strip: (s: string) => s.replace(/\x1b\[[0-9;]*m/g, ''),
};

/**
 * Tagged template literal for inline ANSI colors
 * Usage: tag`This is ${tag.red}red${tag.reset} and ${tag.green}green${tag.reset}`
 */
export const tag = Object.assign(
  (strings: TemplateStringsArray, ...values: unknown[]): string => {
    return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '');
  },
  {
    // Inline ANSI codes for tagged templates
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    italic: '\x1b[3m',
    underline: '\x1b[4m',

    // Standard colors
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',

    // Bright colors
    brightRed: '\x1b[91m',
    brightGreen: '\x1b[92m',
    brightYellow: '\x1b[93m',
    brightBlue: '\x1b[94m',
    brightMagenta: '\x1b[95m',
    brightCyan: '\x1b[96m',
    brightWhite: '\x1b[97m',

    // Background
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',

    // Semantic
    success: '\x1b[92m',
    error: '\x1b[91m',
    warning: '\x1b[93m',
    info: '\x1b[96m',
  }
);

/**
 * NEXUS-themed color palette
 * Consistent branding colors across the codebase
 */
export const nexusColors = {
  // Primary brand colors
  primary: colors.rgb(0, 200, 255),      // Electric cyan
  secondary: colors.rgb(255, 100, 200),   // Hot pink
  accent: colors.rgb(100, 255, 150),      // Neon green

  // Status colors
  bullish: colors.rgb(0, 255, 136),       // Profit green
  bearish: colors.rgb(255, 68, 68),       // Loss red
  neutral: colors.rgb(255, 193, 7),       // Warning amber

  // Exchange colors
  polymarket: colors.rgb(100, 100, 255),  // Purple-blue
  kalshi: colors.rgb(255, 150, 50),       // Orange
  deribit: colors.rgb(0, 200, 150),       // Teal
  binance: colors.rgb(243, 186, 47),      // Binance yellow

  // Venue type badges
  crypto: (s: string) => `\x1b[48;2;30;30;60m\x1b[38;2;255;200;50m ${s} \x1b[0m`,
  prediction: (s: string) => `\x1b[48;2;60;30;60m\x1b[38;2;200;100;255m ${s} \x1b[0m`,
  sports: (s: string) => `\x1b[48;2;30;60;30m\x1b[38;2;100;255;150m ${s} \x1b[0m`,
  options: (s: string) => `\x1b[48;2;60;60;30m\x1b[38;2;255;200;100m ${s} \x1b[0m`,

  // Status badges
  pass: (s: string) => `\x1b[48;2;0;80;40m\x1b[38;2;0;255;136m ${s} \x1b[0m`,
  fail: (s: string) => `\x1b[48;2;80;20;20m\x1b[38;2;255;68;68m ${s} \x1b[0m`,
  warn: (s: string) => `\x1b[48;2;80;60;0m\x1b[38;2;255;193;7m ${s} \x1b[0m`,
  info: (s: string) => `\x1b[48;2;20;40;80m\x1b[38;2;100;180;255m ${s} \x1b[0m`,

  // Gradient text effect (requires true color terminal)
  gradient: (s: string, from: [number, number, number], to: [number, number, number]) => {
    const len = s.length;
    return s.split('').map((char, i) => {
      const ratio = i / (len - 1 || 1);
      const r = Math.round(from[0] + (to[0] - from[0]) * ratio);
      const g = Math.round(from[1] + (to[1] - from[1]) * ratio);
      const b = Math.round(from[2] + (to[2] - from[2]) * ratio);
      return `\x1b[38;2;${r};${g};${b}m${char}`;
    }).join('') + '\x1b[0m';
  },
};

/**
 * Box drawing for CLI banners
 */
export function box(content: string, title?: string): string {
  const lines = content.split('\n');
  const maxLen = Math.max(...lines.map(l => l.length), title?.length ?? 0);
  const top = title
    ? `╭─ ${title} ${'─'.repeat(maxLen - title.length)}╮`
    : `╭${'─'.repeat(maxLen + 2)}╮`;
  const bottom = `╰${'─'.repeat(maxLen + 2)}╯`;
  const body = lines.map(l => `│ ${l.padEnd(maxLen)} │`).join('\n');
  return `${top}\n${body}\n${bottom}`;
}
