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
	maxArrayLength?: number;
	breakLength?: number;
	showHidden?: boolean;
	getters?: boolean;
	showProxy?: boolean;
}

/**
 * Advanced table configuration options
 */
export interface TableOptions {
	title?: string;
	border?: boolean;
	borderStyle?: 'single' | 'double' | 'rounded' | 'minimal';
	padding?: number;
	align?: 'left' | 'center' | 'right' | Record<string, 'left' | 'center' | 'right'>;
	sort?: string | ((a: any, b: any) => number);
	filter?: (row: any) => boolean;
	truncate?: number;
	colors?: boolean;
	compact?: boolean;
	showIndex?: boolean;
	columnOrder?: string[];
	maxColumnWidth?: number;
	formatters?: Record<string, (value: any) => string>;
}

/**
 * Pretty print any value using Bun.inspect
 *
 * @version 7.1.2.0.0.0.0 - Enhanced with console depth control integration
 * @see {@link https://docs.bun.sh/runtime/bun-inspect Bun.inspect Documentation}
 * @see {@link ../../docs/7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md Console Depth Debugging Features}
 * Cross-Reference: @see 7.1.2.0.0.0.0 → Deep object inspection, @see 6.1.1.2.2.1.2.0 → UIContext patterns
 *
 * @param value - The value to inspect
 * @param options - Inspection options (depth defaults to 4)
 * @returns Formatted string representation
 *
 * @example
 * ```typescript
 * const obj = { nested: { deep: { value: 42 } } };
 * console.log(inspect(obj, { depth: 5 }));
 * ```
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
 *
 * @version 7.0.0.0.0.0.0 - Respects --console-depth CLI argument
 * @see {@link ../../docs/7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md Console Depth Debugging Features}
 *
 * @param label - Label prefix for the log entry
 * @param value - Value to log (will be inspected)
 * @param options - Optional inspection options
 *
 * @example
 * ```typescript
 * log("Market Data", { nested: { deep: { value: 42 } } }, { depth: 6 });
 * ```
 */
export function log(
	label: string,
	value: unknown,
	options?: InspectOptions,
): void {
	console.log(`\x1b[36m[${label}]\x1b[0m`, inspect(value, options));
}

/**
 * Debug log (only in development)
 *
 * @version 7.0.0.0.0.0.0 - Uses depth 6 for comprehensive debugging output
 * @see {@link ../../docs/7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md Console Depth Debugging Features}
 *
 * @param label - Debug label prefix
 * @param value - Value to debug (will be inspected with depth 6)
 *
 * @example
 * ```typescript
 * debug("Graph Node", { analysis: { marketHealth: { riskLevel: "low" } } });
 * ```
 */
export function debug(label: string, value: unknown): void {
	if (process.env.NODE_ENV !== "production") {
		log(`DEBUG:${label}`, value, { depth: 6 });
	}
}

/**
 * Get display width of string using Bun.stringWidth
 * Handles Unicode, emojis, ANSI escape codes correctly
 *
 * @version 7.3.1.0.0.0.0 - Unicode-Aware String Width Calculation with Options
 * @see {@link https://docs.bun.sh/runtime/bun-apis Bun.stringWidth Documentation}
 * @see {@link ../../docs/7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md Console Depth Debugging Features}
 * Cross-Reference: @see 7.1.1.0.0.0.0 for table generation, @see 9.1.1.4.1.0 for Telegram formatting
 *
 * @param str - The string to measure
 * @param options - Configuration options
 * @returns Display width in terminal columns
 *
 * @example
 * ```typescript
 * stringWidth("Hello 🌍"); // 8 (emoji counts as 1)
 * stringWidth("Hello 🌍", { ambiguousIsNarrow: false }); // 9 (emoji counts as 2)
 * stringWidth("\x1b[31mRed\x1b[0m", { countAnsiEscapeCodes: true }); // Includes ANSI codes
 * ```
 */
export function stringWidth(
	str: string,
	options?: {
		countAnsiEscapeCodes?: boolean;
		ambiguousIsNarrow?: boolean;
	}
): number {
	return Bun.stringWidth(str, options);
}

/**
 * Peek at a promise value without consuming it (Bun.peek)
 */
export function peek<T>(promise: Promise<T>): T | Promise<T> {
	return Bun.peek(promise);
}

/**
 * Serialize any JavaScript value to ArrayBuffer using Bun's structured clone
 * Uses the same algorithm as postMessage and structuredClone
 *
 * @param value - Value to serialize (supports all structured clone types)
 * @returns ArrayBuffer containing serialized data
 *
 * @example
 * ```typescript
 * const buf = serialize({ data: [1, 2, 3], meta: { timestamp: Date.now() } });
 * // buf is ArrayBuffer ready for storage or transmission
 * ```
 */
export function serialize(value: any): ArrayBuffer {
	// Import from bun:jsc module for structured clone serialization
	const { serialize } = require("bun:jsc") as { serialize: (value: any) => ArrayBuffer };
	return serialize(value);
}

/**
 * Deserialize ArrayBuffer back to JavaScript value using Bun's structured clone
 * Reverse operation of serialize()
 *
 * @param buffer - ArrayBuffer containing serialized data
 * @returns Deserialized JavaScript value
 *
 * @example
 * ```typescript
 * const obj = deserialize(buf);
 * console.log(obj); // { data: [1, 2, 3], meta: { timestamp: 1234567890 } }
 * ```
 */
export function deserialize<T = any>(buffer: ArrayBuffer): T {
	// Import from bun:jsc module for structured clone deserialization
	const { deserialize } = require("bun:jsc") as { deserialize: (buffer: ArrayBuffer) => T };
	return deserialize(buffer);
}

/**
 * Deep equality check using Bun.deepEquals
 * Handles complex objects, arrays, dates, regexes, and more
 *
 * @param a - First value to compare
 * @param b - Second value to compare
 * @param strict - If true, treats undefined values differently (default: false)
 * @returns True if values are deeply equal
 *
 * @example
 * ```typescript
 * deepEquals({ a: 1 }, { a: 1 }); // true
 * deepEquals({}, { a: undefined }, true); // false (strict mode)
 * deepEquals([, 1], [undefined, 1], true); // false (strict mode)
 * ```
 */
export function deepEquals(a: unknown, b: unknown, strict?: boolean): boolean {
	return Bun.deepEquals(a, b, strict);
}

/**
 * Escape HTML special characters using Bun.escapeHTML
 * Handles strings, objects, numbers, and booleans
 *
 * @param value - Value to escape (string, object, number, boolean)
 * @returns HTML-escaped string
 *
 * @example
 * ```typescript
 * escapeHTML("<script>"); // "&lt;script&gt;"
 * escapeHTML({ name: "<b>Bold</b>" }); // "{"name":"&lt;b&gt;Bold&lt;/b&gt;"}"
 * escapeHTML(42); // "42"
 * escapeHTML(true); // "true"
 * ```
 */
export function escapeHTML(value: string | object | number | boolean): string {
	// For objects, JSON.stringify first, then escape
	if (typeof value === 'object' && value !== null) {
		return Bun.escapeHTML(JSON.stringify(value));
	}
	return Bun.escapeHTML(value);
}

/**
 * Advanced table configuration options
 */
export interface TableOptions {
	title?: string;
	border?: boolean;
	borderStyle?: 'single' | 'double' | 'rounded' | 'minimal';
	padding?: number;
	align?: 'left' | 'center' | 'right' | Record<string, 'left' | 'center' | 'right'>;
	sort?: string | ((a: any, b: any) => number);
	filter?: (row: any) => boolean;
	truncate?: number;
	colors?: boolean;
	compact?: boolean;
	showIndex?: boolean;
	columnOrder?: string[];
	maxColumnWidth?: number;
	formatters?: Record<string, (value: any) => string>;
}

/**
 * Advanced table formatting with filtering, sorting, styling, and more
 *
 * @param data - Array of objects to format as table
 * @param properties - Column properties or options object
 * @param options - Additional table formatting options
 * @returns Formatted table string
 *
 * @example
 * ```typescript
 * const users = [
 *   { name: 'Alice', age: 30, active: true },
 *   { name: 'Bob', age: 25, active: false }
 * ];
 *
 * console.log(formatTable(users, {
 *   title: 'Users',
 *   borderStyle: 'rounded',
 *   sort: 'age',
 *   filter: row => row.active,
 *   formatters: { age: v => `${v} years` }
 * }));
 * ```
 */
export function formatTable(
	data: any[],
	properties?: string[] | Partial<TableOptions>,
	options?: Partial<TableOptions>
): string {
	const opts = typeof properties === 'object' && !Array.isArray(properties)
		? { ...properties, ...options }
		: { ...options };

	// Process data
	let processed = processTableData(data, opts);

	// Generate table
	const props = Array.isArray(properties) ? properties : undefined;
	let table = Bun.inspect.table(processed, props, {
		colors: opts.colors ?? true
	});

	// Apply post-processing
	table = applyTableFormatting(table, opts);

	return table;
}

/**
 * Process table data with filtering, sorting, and transformations
 */
function processTableData(data: any[], options: Partial<TableOptions>): any[] {
	let processed = [...data];

	// Apply filter
	if (options.filter) {
		processed = processed.filter(options.filter);
	}

	// Apply sort
	if (options.sort) {
		if (typeof options.sort === 'function') {
			processed.sort(options.sort);
		} else {
			processed.sort((a, b) => {
				const aVal = a[options.sort as string];
				const bVal = b[options.sort as string];
				return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
			});
		}
	}

	// Apply formatters
	if (options.formatters) {
		processed = processed.map(row => {
			const newRow = { ...row };
			for (const [key, formatter] of Object.entries(options.formatters!)) {
				if (key in newRow) {
					newRow[key] = formatter(newRow[key]);
				}
			}
			return newRow;
		});
	}

	// Truncate
	if (options.truncate && processed.length > options.truncate) {
		processed = processed.slice(0, options.truncate);
		processed.push({
			_note: `... ${data.length - options.truncate} more rows not shown`
		});
	}

	// Reorder columns
	if (options.columnOrder) {
		processed = processed.map(row => {
			const orderedRow: any = {};
			options.columnOrder!.forEach(key => {
				if (key in row) orderedRow[key] = row[key];
			});
			// Add remaining columns
			Object.keys(row).forEach(key => {
				if (!options.columnOrder!.includes(key)) {
					orderedRow[key] = row[key];
				}
			});
			return orderedRow;
		});
	}

	// Apply max column width
	if (options.maxColumnWidth) {
		processed = processed.map(row => {
			const trimmedRow: any = {};
			for (const [key, value] of Object.entries(row)) {
				if (typeof value === 'string' && value.length > options.maxColumnWidth!) {
					trimmedRow[key] = value.substring(0, options.maxColumnWidth! - 3) + '...';
				} else {
					trimmedRow[key] = value;
				}
			}
			return trimmedRow;
		});
	}

	return processed;
}

/**
 * Apply post-processing formatting to table
 */
function applyTableFormatting(table: string, options: Partial<TableOptions>): string {
	const lines = table.split('\n');

	// Add title
	if (options.title) {
		const width = lines[0].length;
		const title = ` ${options.title} `;
		const titleWidth = Bun.stringWidth(title);
		const padding = Math.max(0, Math.floor((width - titleWidth) / 2));

		const borderTop = '┌' + '─'.repeat(width) + '┐';
		const titleLine = '│' + ' '.repeat(padding) + title + ' '.repeat(width - titleWidth - padding) + '│';
		const separator = '├' + '─'.repeat(width) + '┤';

		lines.unshift(separator);
		lines.unshift(titleLine);
		lines.unshift(borderTop);
	}

	// Add border style
	if (options.borderStyle) {
		const borderMap = {
			single: { topLeft: '┌', topRight: '┐', bottomLeft: '└', bottomRight: '┘', horizontal: '─', vertical: '│' },
			double: { topLeft: '╔', topRight: '╗', bottomLeft: '╚', bottomRight: '╝', horizontal: '═', vertical: '║' },
			rounded: { topLeft: '╭', topRight: '╮', bottomLeft: '╰', bottomRight: '╯', horizontal: '─', vertical: '│' },
			minimal: { topLeft: ' ', topRight: ' ', bottomLeft: ' ', bottomRight: ' ', horizontal: ' ', vertical: ' ' }
		};

		const borders = borderMap[options.borderStyle];
		if (borders) {
			for (let i = 0; i < lines.length; i++) {
				if (i === 0) {
					lines[i] = lines[i].replace(/^┌/, borders.topLeft).replace(/┐$/, borders.topRight);
				} else if (i === lines.length - 1) {
					lines[i] = lines[i].replace(/^└/, borders.bottomLeft).replace(/┘$/, borders.bottomRight);
				}
				lines[i] = lines[i].replace(/─/g, borders.horizontal).replace(/│/g, borders.vertical);
			}
		}
	}

	return lines.join('\n');
}

/**
 * Create a heatmap table with color-coded values
 *
 * @param data - Array of objects to format as heatmap
 * @param valueColumn - Column to use for coloring
 * @param options - Heatmap options
 * @returns Formatted heatmap table
 */
export function createHeatmap(
	data: any[],
	valueColumn: string,
	options: {
		minColor?: string;
		maxColor?: string;
		gradient?: boolean;
	} = {}
): string {
	const values = data.map(row => parseFloat(row[valueColumn]) || 0);
	const min = Math.min(...values);
	const max = Math.max(...values);

	const colorize = (value: number): string => {
		if (options.gradient) {
			const ratio = (value - min) / (max - min || 1);
			const r = Math.floor(255 * ratio);
			const g = Math.floor(255 * (1 - ratio));
			return `\x1b[48;2;${r};${g};0m${value}\x1b[0m`;
		}
		return value > (max * 0.8) ? `\x1b[41m${value}\x1b[0m` :
			   value > (max * 0.5) ? `\x1b[43m${value}\x1b[0m` :
			   `\x1b[42m${value}\x1b[0m`;
	};

	const processed = data.map(row => ({
		...row,
		[valueColumn]: colorize(parseFloat(row[valueColumn]) || 0)
	}));

	return formatTable(processed, { colors: false });
}

// UUID v7 support available via Bun.randomUUIDv7(timestamp)
// For different encodings: Bun.randomUUIDv7('buffer'|'base64'|'base64url'|'hex', timestamp)

/**
 * Find executable path using Bun.which
 */
export function which(command: string): string | null {
	return Bun.which(command);
}

/**
 * Table column configuration
 */
export interface TableColumn<T> {
	key: keyof T | ((row: T) => unknown);
	header: string;
	width?: number;
	align?: "left" | "right" | "center";
	format?: (value: unknown) => string;
}

/**
 * Format value for table display using Bun.stringWidth for accurate width
 */
function formatValue(
	value: unknown,
	width: number,
	align: "left" | "right" | "center" = "left",
): string {
	let str = String(value ?? "");
	const displayWidth = Bun.stringWidth(str);

	if (displayWidth > width) {
		// Truncate accounting for display width
		let truncated = "";
		let w = 0;
		for (const char of str) {
			const charWidth = Bun.stringWidth(char);
			if (w + charWidth > width - 1) break;
			truncated += char;
			w += charWidth;
		}
		str = truncated + "…";
	}

	const padding = Math.max(0, width - Bun.stringWidth(str));
	switch (align) {
		case "right":
			return " ".repeat(padding) + str;
		case "center": {
			const left = Math.floor(padding / 2);
			return " ".repeat(left) + str + " ".repeat(padding - left);
		}
		default:
			return str + " ".repeat(padding);
	}
}

/**
 * Render array as formatted table (Bun-optimized)
 */
export function table<T extends Record<string, unknown>>(
	data: T[],
	columns?: TableColumn<T>[],
): string {
	if (data.length === 0) return "(empty)";

	// Auto-detect columns if not provided
	const cols: TableColumn<T>[] =
		columns ??
		Object.keys(data[0]).map((key) => ({
			key: key as keyof T,
			header: key,
		}));

	// Calculate column widths
	const widths = cols.map((col) => {
		const headerLen = col.header.length;
		const maxDataLen = data.reduce((max, row) => {
			const value = typeof col.key === "function" ? col.key(row) : row[col.key];
			const formatted = col.format ? col.format(value) : String(value ?? "");
			return Math.max(max, formatted.length);
		}, 0);
		return col.width ?? Math.min(Math.max(headerLen, maxDataLen), 40);
	});

	// Build table
	const lines: string[] = [];
	const separator = "─";
	const corner = "┼";
	const vertical = "│";

	// Top border
	lines.push("┌" + widths.map((w) => separator.repeat(w + 2)).join("┬") + "┐");

	// Header
	const headerRow = cols.map((col, i) =>
		formatValue(col.header, widths[i], "center"),
	);
	lines.push(
		vertical + " " + headerRow.join(" " + vertical + " ") + " " + vertical,
	);

	// Header separator
	lines.push(
		"├" + widths.map((w) => separator.repeat(w + 2)).join(corner) + "┤",
	);

	// Data rows
	for (const row of data) {
		const cells = cols.map((col, i) => {
			const value = typeof col.key === "function" ? col.key(row) : row[col.key];
			const formatted = col.format ? col.format(value) : String(value ?? "");
			return formatValue(formatted, widths[i], col.align);
		});
		lines.push(
			vertical + " " + cells.join(" " + vertical + " ") + " " + vertical,
		);
	}

	// Bottom border
	lines.push("└" + widths.map((w) => separator.repeat(w + 2)).join("┴") + "┘");

	return lines.join("\n");
}

/**
 * Print table to console with colors
 */
export function printTable<T extends Record<string, unknown>>(
	data: T[],
	columns?: TableColumn<T>[],
): void {
	console.log(table(data, columns));
}

/**
 * Enhanced table using Bun.inspect.table() for simple cases
 * Falls back to custom table for complex formatting
 */
export function inspectTable<T extends Record<string, unknown>>(
	data: T[],
	options: {
		columns?: (keyof T | string)[];
		maxWidth?: number;
		colors?: boolean;
		sorted?: boolean;
	} = {}
): string {
	// For simple cases, use Bun's native table
	if (!options.columns && !options.maxWidth && !options.sorted) {
		try {
			return Bun.inspect.table(data, undefined, {
				colors: options.colors ?? true,
			});
		} catch (error) {
			// Fall back to custom table if Bun.inspect.table fails
			console.warn('Bun.inspect.table failed, using custom table:', error);
		}
	}

	// For complex cases, use custom table with enhanced options
	const tableColumns: TableColumn<T>[] | undefined = options.columns
		? options.columns.map(col => ({
			key: col as keyof T,
			header: String(col),
			width: options.maxWidth && options.columns ? Math.min(40, options.maxWidth / options.columns.length) : undefined,
		}))
		: undefined;

	let result = table(data, tableColumns);

	// Apply max width if specified
	if (options.maxWidth) {
		const lines = result.split('\n');
		result = lines.map(line => {
			if (Bun.stringWidth(line) > options.maxWidth!) {
				// Truncate line if too wide
				let truncated = '';
				let width = 0;
				for (const char of line) {
					width += Bun.stringWidth(char);
					if (width > options.maxWidth! - 3) {
						truncated += '...';
						break;
					}
					truncated += char;
				}
				return truncated;
			}
			return line;
		}).join('\n');
	}

	return result;
}

/**
 * Create a terminal progress bar using Bun.stringWidth
 */
export class ProgressBar {
	private total: number;
	private current: number = 0;
	private width: number;
	private startTime: number;

	constructor(total: number, width: number = 40) {
		this.total = total;
		this.width = width;
		this.startTime = Date.now();
	}

	update(current: number, message?: string): void {
		this.current = Math.min(current, this.total);
		this.render(message);
	}

	increment(message?: string): void {
		this.update(this.current + 1, message);
	}

	private render(message?: string): void {
		const percent = (this.current / this.total) * 100;
		const filled = Math.floor((percent / 100) * this.width);
		const bar = '█'.repeat(filled) + '░'.repeat(this.width - filled);
		const percentStr = percent.toFixed(1).padStart(5);

		// Calculate ETA
		const elapsed = Date.now() - this.startTime;
		const eta = this.current > 0 ? (elapsed / this.current) * (this.total - this.current) : 0;
		const etaStr = eta > 0 ? formatDuration(eta / 1000) : '--:--';

		let displayMessage = message || '';
		const terminalWidth = process.stdout.columns || 80;
		const barWidth = this.width + 15 + etaStr.length; // bar + percentage + eta

		// Truncate message if too long
		if (displayMessage && Bun.stringWidth(displayMessage) > terminalWidth - barWidth - 5) {
			const maxWidth = terminalWidth - barWidth - 8;
			let truncated = '';
			let width = 0;
			for (const char of displayMessage) {
				width += Bun.stringWidth(char);
				if (width > maxWidth) {
					truncated += '...';
					break;
				}
				truncated += char;
			}
			displayMessage = truncated;
		}

		const line = `\r${bar} ${percentStr}% ETA: ${etaStr} ${displayMessage}`;
		process.stdout.write(line.padEnd(terminalWidth));
	}

	complete(message: string = 'Complete!'): void {
		this.update(this.total);
		process.stdout.write(`\n${message}\n`);
	}
}

/**
 * Enhanced HTML sanitizer using Bun.escapeHTML
 */
export class HTMLSanitizer {
	private static allowedTags = new Set([
		'b', 'i', 'u', 'strong', 'em', 'p', 'br',
		'a', 'ul', 'ol', 'li', 'code', 'pre'
	]);

	private static allowedAttributes: Record<string, string[]> = {
		a: ['href', 'title', 'target'],
		'*': ['class', 'id']
	};

	static sanitize(html: string, options: {
		stripTags?: boolean;
		maxLength?: number;
	} = {}): string {
		// First escape everything
		let result = Bun.escapeHTML(html);

		// Apply length limit
		if (options.maxLength && result.length > options.maxLength) {
			result = result.slice(0, options.maxLength) + '...';
		}

		return result;
	}

	static escapeAttribute(value: string): string {
		return Bun.escapeHTML(value)
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#x27;');
	}
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
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
	return n.toLocaleString("en-US");
}

/**
 * Format percentage
 */
export function formatPercent(n: number, decimals = 2): string {
  return `${(n * 100).toFixed(decimals)}%`;
}

// Re-export all utilities from the comprehensive suite
export {
  // Rate Limiting
  RateLimiter,
  SlidingWindowRateLimiter,
  RateLimiterFactory,

  // Promise Utilities
  PromiseUtils,
  PromisePool,

  // Path Resolution
  PathResolver,
  ExecutableFinder,

  // Migration Helper
  MigrationHelper,

  // Performance Benchmarks
  BunPerformanceBenchmarks
} from "../../scripts/bun-runtime-utils";

/**
 * Format currency
 */
export function formatCurrency(n: number, currency = "USD"): string {
	return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
		n,
	);
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
		const content = pretty
			? JSON.stringify(data, null, 2)
			: JSON.stringify(data);
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
		const hasher = new Bun.CryptoHasher("sha256");
		hasher.update(input);
		return hasher.digest("hex");
	},

	/**
	 * Hash string with SHA-1
	 */
	sha1(input: string): string {
		const hasher = new Bun.CryptoHasher("sha1");
		hasher.update(input);
		return hasher.digest("hex");
	},

	/**
	 * Hash string with MD5
	 */
	md5(input: string): string {
		const hasher = new Bun.CryptoHasher("md5");
		hasher.update(input);
		return hasher.digest("hex");
	},

	/**
	 * Generate random bytes as hex
	 */
	randomHex(bytes = 16): string {
		const buffer = new Uint8Array(bytes);
		globalThis.crypto.getRandomValues(buffer);
		return Array.from(buffer)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
	},

	/**
	 * Generate UUID v4
	 */
	uuid(): string {
		return globalThis.crypto.randomUUID();
	},

	/**
	 * Generate UUID v7 (time-ordered) using Bun.randomUUIDv7
	 *
	 * @version 7.2.1.0.0.0.0 - Time-Ordered UUID Generation
	 * @see {@link https://docs.bun.sh/runtime/bun-apis Bun.randomUUIDv7 Documentation}
	 * Cross-Reference: @see 9.1.1.9.2.0.0 for steam alert tracking, @see 7.2.1.0.0.0.0 for UUID patterns
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
		const result = Bun.color(input, "css");
		if (!result) return null;
		// Parse CSS color format
		const match = result.match(
			/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
		);
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
		return Bun.color(input, "css");
	},

	/**
	 * Convert color to hex format
	 */
	toHex(input: string): string | null {
		return Bun.color(input, "hex");
	},

	/**
	 * Convert color to ANSI format (for terminal)
	 */
	toANSI(input: string): string | null {
		return Bun.color(input, "ansi");
	},

	/**
	 * Convert color to ANSI 256 format
	 */
	toANSI256(input: string): string | null {
		return Bun.color(input, "ansi-256");
	},

	/**
	 * Convert color to ANSI 16m (true color) format
	 */
	toANSI16m(input: string): string | null {
		return Bun.color(input, "ansi-16m");
	},

	/**
	 * Convert color to number format
	 */
	toNumber(input: string): number | null {
		return Bun.color(input, "number");
	},
};

/**
 * Bun-native timing utilities
 */
export const timing = {
	/**
	 * Sleep for ms using Bun.sleep
	 */
	sleep: Bun.sleep,

	/**
	 * Measure execution time
	 */
	async measure<T>(
		fn: () => Promise<T> | T,
	): Promise<{ result: T; duration: number }> {
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
	 * Bun version
	 */
	version: Bun.version,

	/**
	 * Bun revision
	 */
	revision: Bun.revision,

	/**
	 * Main script path
	 */
	main: Bun.main,

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
	isDev: process.env.NODE_ENV !== "production",
	isProd: process.env.NODE_ENV === "production",
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
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
	},
};

/**
 * Progress bar for CLI
 */
export function progressBar(
	current: number,
	total: number,
	width = 30,
): string {
	const percent = Math.min(current / total, 1);
	const filled = Math.round(width * percent);
	const empty = width - filled;
	const bar = "█".repeat(filled) + "░".repeat(empty);
	return `[${bar}] ${(percent * 100).toFixed(1)}%`;
}

/**
 * Spinner for CLI operations
 */
export function createSpinner(message: string) {
	const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
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
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	italic: "\x1b[3m",
	underline: "\x1b[4m",
	blink: "\x1b[5m",
	inverse: "\x1b[7m",
	hidden: "\x1b[8m",
	strikethrough: "\x1b[9m",

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
	error: (s: string) => `\x1b[91m${s}\x1b[0m`, // bright red
	warning: (s: string) => `\x1b[93m${s}\x1b[0m`, // bright yellow
	info: (s: string) => `\x1b[96m${s}\x1b[0m`, // bright cyan
	debug: (s: string) => `\x1b[95m${s}\x1b[0m`, // bright magenta
	muted: (s: string) => `\x1b[90m${s}\x1b[0m`, // gray

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
	rgb: (r: number, g: number, b: number) => (s: string) =>
		`\x1b[38;2;${r};${g};${b}m${s}\x1b[0m`,
	// RGB true color support (background)
	bgRgb: (r: number, g: number, b: number) => (s: string) =>
		`\x1b[48;2;${r};${g};${b}m${s}\x1b[0m`,

	// Hex color support using Bun.color
	hex: (hexColor: string) => (s: string) => {
		const ansi = Bun.color(hexColor, "ansi-16m");
		return ansi ? `${ansi}${s}\x1b[0m` : s;
	},

	// Strip ANSI codes from string
	strip: (s: string) => s.replace(/\x1b\[[0-9;]*m/g, ""),
};

/**
 * Tagged template literal for inline ANSI colors
 * Usage: tag`This is ${tag.red}red${tag.reset} and ${tag.green}green${tag.reset}`
 */
export const tag = Object.assign(
	(strings: TemplateStringsArray, ...values: unknown[]): string => {
		return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "");
	},
	{
		// Inline ANSI codes for tagged templates
		reset: "\x1b[0m",
		bold: "\x1b[1m",
		dim: "\x1b[2m",
		italic: "\x1b[3m",
		underline: "\x1b[4m",

		// Standard colors
		black: "\x1b[30m",
		red: "\x1b[31m",
		green: "\x1b[32m",
		yellow: "\x1b[33m",
		blue: "\x1b[34m",
		magenta: "\x1b[35m",
		cyan: "\x1b[36m",
		white: "\x1b[37m",
		gray: "\x1b[90m",

		// Bright colors
		brightRed: "\x1b[91m",
		brightGreen: "\x1b[92m",
		brightYellow: "\x1b[93m",
		brightBlue: "\x1b[94m",
		brightMagenta: "\x1b[95m",
		brightCyan: "\x1b[96m",
		brightWhite: "\x1b[97m",

		// Background
		bgRed: "\x1b[41m",
		bgGreen: "\x1b[42m",
		bgYellow: "\x1b[43m",
		bgBlue: "\x1b[44m",
		bgMagenta: "\x1b[45m",
		bgCyan: "\x1b[46m",

		// Semantic
		success: "\x1b[92m",
		error: "\x1b[91m",
		warning: "\x1b[93m",
		info: "\x1b[96m",
	},
);

/**
 * NEXUS-themed color palette
 * Consistent branding colors across the codebase
 */
export const nexusColors = {
	// Primary brand colors
	primary: colors.rgb(0, 200, 255), // Electric cyan
	secondary: colors.rgb(255, 100, 200), // Hot pink
	accent: colors.rgb(100, 255, 150), // Neon green

	// Status colors
	bullish: colors.rgb(0, 255, 136), // Profit green
	bearish: colors.rgb(255, 68, 68), // Loss red
	neutral: colors.rgb(255, 193, 7), // Warning amber

	// Exchange colors
	polymarket: colors.rgb(100, 100, 255), // Purple-blue
	kalshi: colors.rgb(255, 150, 50), // Orange
	deribit: colors.rgb(0, 200, 150), // Teal
	binance: colors.rgb(243, 186, 47), // Binance yellow

	// Venue type badges
	crypto: (s: string) =>
		`\x1b[48;2;30;30;60m\x1b[38;2;255;200;50m ${s} \x1b[0m`,
	prediction: (s: string) =>
		`\x1b[48;2;60;30;60m\x1b[38;2;200;100;255m ${s} \x1b[0m`,
	sports: (s: string) =>
		`\x1b[48;2;30;60;30m\x1b[38;2;100;255;150m ${s} \x1b[0m`,
	options: (s: string) =>
		`\x1b[48;2;60;60;30m\x1b[38;2;255;200;100m ${s} \x1b[0m`,

	// Status badges
	pass: (s: string) => `\x1b[48;2;0;80;40m\x1b[38;2;0;255;136m ${s} \x1b[0m`,
	fail: (s: string) => `\x1b[48;2;80;20;20m\x1b[38;2;255;68;68m ${s} \x1b[0m`,
	warn: (s: string) => `\x1b[48;2;80;60;0m\x1b[38;2;255;193;7m ${s} \x1b[0m`,
	info: (s: string) => `\x1b[48;2;20;40;80m\x1b[38;2;100;180;255m ${s} \x1b[0m`,

	// Gradient text effect (requires true color terminal)
	gradient: (
		s: string,
		from: [number, number, number],
		to: [number, number, number],
	) => {
		const len = s.length;
		return (
			s
				.split("")
				.map((char, i) => {
					const ratio = i / (len - 1 || 1);
					const r = Math.round(from[0] + (to[0] - from[0]) * ratio);
					const g = Math.round(from[1] + (to[1] - from[1]) * ratio);
					const b = Math.round(from[2] + (to[2] - from[2]) * ratio);
					return `\x1b[38;2;${r};${g};${b}m${char}`;
				})
				.join("") + "\x1b[0m"
		);
	},
};

/**
 * Box drawing for CLI banners
 */
export function box(content: string, title?: string): string {
	const lines = content.split("\n");
	const maxLen = Math.max(...lines.map((l) => l.length), title?.length ?? 0);
	const top = title
		? `╭─ ${title} ${"─".repeat(maxLen - title.length)}╮`
		: `╭${"─".repeat(maxLen + 2)}╮`;
	const bottom = `╰${"─".repeat(maxLen + 2)}╯`;
	const body = lines.map((l) => `│ ${l.padEnd(maxLen)} │`).join("\n");
	return `${top}\n${body}\n${bottom}`;
}

/**
 * 2.1.1 YAML Configuration Reading
 * Uses Bun's native YAML parser - zero dependency
 * Optimized: Uses Bun.file().yaml() for direct parsing
 */
export async function readYAMLConfig<T = any>(path: string): Promise<T | null> {
	try {
		const file = Bun.file(path);
		const text = await file.text();
		// Parse YAML using basic parser
		return parseBasicYAML(text) as T;
	} catch (error) {
		console.error(`Failed to read YAML config from ${path}:`, error);
		return null;
	}
}

/**
 * Basic YAML parser fallback
 */
function parseBasicYAML(text: string): any {
	const result: any = {};
	const lines = text.split("\n");

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed && !trimmed.startsWith("#")) {
			const colonIndex = trimmed.indexOf(":");
			if (colonIndex > 0) {
				const key = trimmed.substring(0, colonIndex).trim();
				let value = trimmed.substring(colonIndex + 1).trim();

				// Remove quotes if present
				if (
					(value.startsWith('"') && value.endsWith('"')) ||
					(value.startsWith("'") && value.endsWith("'"))
				) {
					value = value.slice(1, -1);
				}

				// Convert to number if possible
				if (!isNaN(Number(value)) && value !== "") {
					result[key] = Number(value);
				} else if (value === "true" || value === "false") {
					result[key] = value === "true";
				} else if (value.startsWith("[") && value.endsWith("]")) {
					result[key] = value
						.slice(1, -1)
						.split(",")
						.map((v) => v.trim().replace(/['"]/g, ""));
				} else {
					result[key] = value || "";
				}
			}
		}
	}

	return result;
}

/**
 * 2.1.2 Concurrent File Operations
 * Batch read multiple files in parallel
 */
export async function batchReadFiles(paths: string[]): Promise<string[]> {
	try {
		return Promise.all(
			paths.map(async (path) => {
				const file = Bun.file(path);
				return await file.text();
			}),
		);
	} catch (error) {
		// Fallback to Bun.file
		return Promise.all(
			paths.map(async (path) => {
				try {
					const file = Bun.file(path);
					return await file.text();
				} catch {
					return "";
				}
			}),
		);
	}
}

/**
 * 3.1.2 JSON Streaming
 * Stream large JSON files efficiently
 */
export async function streamJSONFile(path: string): Promise<any> {
	try {
		const file = Bun.file(path);
		const stream = file.stream();

		let result = "";
		const reader = stream.getReader();
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				result += new TextDecoder().decode(value);
			}
		} finally {
			reader.releaseLock();
		}
		return JSON.parse(result);
	} catch (error) {
		// Fallback to Bun.file + JSON.parse
		const file = Bun.file(path);
		const data = await file.text();
		return JSON.parse(data);
	}
}

/**
 * 3.2.2 Memory monitoring with Bun-specific metrics
 */
export function getMemoryStats() {
	const memUsage = process.memoryUsage();
	return {
		heapUsed: memUsage.heapUsed,
		rss: memUsage.rss,
		heapTotal: memUsage.heapTotal,
		external: memUsage.external,
		arrayBuffers: memUsage.arrayBuffers,
	};
}

/**
 * 4.1.1 Seeded Random for Tests
 * Deterministic random for reproducible tests
 */
export class SeededRandom {
	private seed: number;

	constructor(seed: number = Date.now()) {
		this.seed = seed;
	}

	nextInt(max: number): number {
		this.seed = (this.seed * 9301 + 49297) % 233280;
		return Math.floor((this.seed / 233280) * max);
	}

	nextFloat(): number {
		this.seed = (this.seed * 9301 + 49297) % 233280;
		return this.seed / 233280;
	}
}

/**
 * 4.1.2 Test fixture generator
 */
export function generateTestData(seed: number, count: number) {
	const random = new SeededRandom(seed);
	return Array.from({ length: count }, (_, i) => ({
		id: i,
		value: `test-${random.nextInt(1000)}`,
		nested: { data: simpleHash(String(random.nextInt(100000))) },
	}));
}

/**
 * Simple hash function fallback
 */
function simpleHash(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash);
}

/**
 * 4.2.1 Native benchmarking
 */
export async function benchmark(
	name: string,
	fn: () => Promise<void> | void,
	iterations = 1000,
) {
	const times: number[] = [];

	for (let i = 0; i < iterations; i++) {
		const start = Bun.nanoseconds();
		await fn();
		times.push((Bun.nanoseconds() - start) / 1_000_000); // Convert to ms
	}

	const sorted = [...times].sort((a, b) => a - b);
	return {
		name,
		avg: times.reduce((a, b) => a + b) / times.length,
		p50: sorted[Math.floor(sorted.length * 0.5)],
		p95: sorted[Math.floor(sorted.length * 0.95)],
		p99: sorted[Math.floor(sorted.length * 0.99)],
		min: Math.min(...times),
		max: Math.max(...times),
		opsPerSecond: 1000 / (times.reduce((a, b) => a + b) / times.length),
	};
}

/**
 * 4.2.2 Memory benchmark
 */
export function memoryBenchmark(fn: () => void) {
	const before = process.memoryUsage();
	fn();
	const after = process.memoryUsage();

	return {
		heapDiff: after.heapUsed - before.heapUsed,
		rssDiff: after.rss - before.rss,
		heapTotalDiff: after.heapTotal - before.heapTotal,
	};
}

/**
 * 5.1 Enhanced Spawn with Timeout
 */
export async function spawnWithTimeout(
	cmd: string[],
	timeout: number,
	options: { stdout?: "pipe" | "inherit"; stderr?: "pipe" | "inherit" } = {},
) {
	const proc = Bun.spawn(cmd, {
		stdout: options.stdout || "pipe",
		stderr: options.stderr || "pipe",
		env: { ...process.env },
	});

	const timer = setTimeout(() => {
		proc.kill(9); // SIGKILL
	}, timeout);

	// Bun provides native .text() method on stdout/stderr streams
	const [stdout, stderr] = await Promise.all([
		proc.stdout ? (proc.stdout as any).text() : Promise.resolve(""),
		proc.stderr ? (proc.stderr as any).text() : Promise.resolve(""),
	]);

	clearTimeout(timer);
	return { stdout, stderr, exitCode: await proc.exited };
}

/**
 * 5.2.1 Graceful shutdown
 */
export function setupGracefulShutdown(cleanup: () => Promise<void>) {
	const signals = ["SIGINT", "SIGTERM", "SIGHUP"];

	signals.forEach((signal) => {
		process.on(signal, async () => {
			console.log(`Received ${signal}, cleaning up...`);
			await cleanup();
			process.exit(0);
		});
	});
}

/**
 * 6.1.1 Optimized fetch with retry
 */
export async function fetchWithRetry(
	url: string,
	options: RequestInit = {},
	retries = 3,
): Promise<Response> {
	for (let i = 0; i < retries; i++) {
		try {
			const response = await fetch(url, {
				...options,
				headers: {
					"User-Agent": `Bun/${Bun.version}`,
					...(options.headers as Record<string, string>),
				},
			});

			if (response.ok) return response;
		} catch (error) {
			if (i === retries - 1) throw error;
			await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** i)); // Exponential backoff
		}
	}
	throw new Error("Max retries exceeded");
}

/**
 * 6.1.2 WebSocket utilities
 */
export function createWebSocketHandler(url: string) {
	const ws = new WebSocket(url);

	return {
		send: (data: any) => ws.send(JSON.stringify(data)),
		close: () => ws.close(),
		onMessage: (callback: (data: any) => void) => {
			ws.onmessage = (event) => {
				try {
					callback(JSON.parse(event.data as string));
				} catch {
					callback(event.data);
				}
			};
		},
		onOpen: (callback: () => void) => {
			ws.onopen = callback;
		},
		onClose: (callback: () => void) => {
			ws.onclose = callback;
		},
		onError: (callback: (error: Event) => void) => {
			ws.onerror = callback;
		},
	};
}

/**
 * 7.1.1 Transform streams with Bun YAML
 */
export function createYAMLProcessor() {
	return new TransformStream<Uint8Array, any>({
		async transform(chunk, controller) {
			try {
				// Convert chunk to string
				const text = new TextDecoder().decode(chunk);
				// Parse YAML using basic parser
				const parsed = parseBasicYAML(text);
				controller.enqueue(parsed);
			} catch (error) {
				console.error('YAML processing error:', error);
			}
		}
	});
}

/**
 * 7.1.2 Parallel processing
 */
export async function parallelProcess<T, U>(
	items: T[],
	processor: (item: T) => Promise<U>,
	concurrency = 4,
): Promise<U[]> {
	const results: U[] = [];
	const queue = [...items];

	await Promise.all(
		Array.from({ length: concurrency }, async () => {
			while (queue.length) {
				const item = queue.pop();
				if (item) {
					const result = await processor(item);
					results.push(result);
				}
			}
		}),
	);

	return results;
}

/**
 * 8.1.2 Deep cloning optimized for Bun
 */
export function deepClone<T>(obj: T): T {
	try {
		// Fast path: JSON-serializable objects
		return JSON.parse(JSON.stringify(obj));
	} catch (error) {
		// Handle circular references
		const seen = new WeakSet();
		const clone = (item: any): any => {
			if (item === null || typeof item !== "object") return item;
			if (seen.has(item)) return "[Circular]";
			seen.add(item);

			if (Array.isArray(item)) {
				return item.map(clone);
			}

			const cloned: any = {};
			for (const key in item) {
				if (Object.prototype.hasOwnProperty.call(item, key)) {
					cloned[key] = clone(item[key]);
				}
			}
			return cloned;
		};

		return clone(obj);
	}
}

/**
 * 8.2.1 Bun-enhanced errors
 */
export class BunError extends Error {
	constructor(
		message: string,
		public code: string,
		public metadata?: any,
	) {
		super(message);
		this.name = "BunError";

		// Capture stack trace
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, BunError);
		}
	}

	toJSON() {
		return {
			error: this.message,
			code: this.code,
			stack: this.stack,
			metadata: this.metadata,
		};
	}
}

/**
 * 8.2.2 Error recovery with retry
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	options = { retries: 3, delay: 1000 },
): Promise<T> {
	let lastError: Error;

	for (let i = 0; i <= options.retries; i++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error as Error;
			if (i < options.retries) {
				await new Promise((resolve) =>
					setTimeout(resolve, options.delay * 2 ** i),
				);
			}
		}
	}

	throw lastError!;
}

/**
 * Complete BunUtils class with all utilities
 */
export class BunUtils {
	// File operations
	static readConfig = readYAMLConfig;
	static batchRead = batchReadFiles;
	static streamJSON = streamJSONFile;

	// Performance monitoring
	static benchmark = benchmark;
	static memoryBenchmark = memoryBenchmark;
	static getMemory = getMemoryStats;

	// Testing utilities
	static createSeededTest = generateTestData;
	static SeededRandom = SeededRandom;

	// Process management
	static spawn = spawnWithTimeout;
	static setupShutdown = setupGracefulShutdown;

	// Network utilities
	static fetchWithRetry = fetchWithRetry;
	static createWebSocket = createWebSocketHandler;

	// Data processing
	static parallelProcess = parallelProcess;
	static createYAMLProcessor = createYAMLProcessor;

	// Error handling
	static withRetry = withRetry;
	static BunError = BunError;

	// Utilities
	static deepClone = deepClone;
}
