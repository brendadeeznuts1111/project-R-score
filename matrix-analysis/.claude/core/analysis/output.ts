/**
 * Output Utilities for /analyze
 *
 * Provides consistent, visually polished output rendering
 * using Bun.inspect.table() and ANSI colors.
 */

// ============================================================================
// ANSI Color Codes (respects NO_COLOR env var)
// ============================================================================

const NO_COLOR = process.env.NO_COLOR !== undefined;

const ANSI = {
	reset: NO_COLOR ? "" : "\x1b[0m",
	bold: NO_COLOR ? "" : "\x1b[1m",
	dim: NO_COLOR ? "" : "\x1b[2m",
	italic: NO_COLOR ? "" : "\x1b[3m",
	underline: NO_COLOR ? "" : "\x1b[4m",
	// Foreground colors
	black: NO_COLOR ? "" : "\x1b[30m",
	red: NO_COLOR ? "" : "\x1b[31m",
	green: NO_COLOR ? "" : "\x1b[32m",
	yellow: NO_COLOR ? "" : "\x1b[33m",
	blue: NO_COLOR ? "" : "\x1b[34m",
	magenta: NO_COLOR ? "" : "\x1b[35m",
	cyan: NO_COLOR ? "" : "\x1b[36m",
	white: NO_COLOR ? "" : "\x1b[37m",
	gray: NO_COLOR ? "" : "\x1b[90m",
	// Bright colors
	brightRed: NO_COLOR ? "" : "\x1b[91m",
	brightGreen: NO_COLOR ? "" : "\x1b[92m",
	brightYellow: NO_COLOR ? "" : "\x1b[93m",
	brightBlue: NO_COLOR ? "" : "\x1b[94m",
	brightMagenta: NO_COLOR ? "" : "\x1b[95m",
	brightCyan: NO_COLOR ? "" : "\x1b[96m",
};

// ============================================================================
// Types
// ============================================================================

export type SeverityLevel = "low" | "medium" | "high" | "critical";

export interface TableOptions {
	colors?: boolean;
	columns?: string[];
}

// ============================================================================
// Table Rendering
// ============================================================================

/**
 * Render data as a table using Bun.inspect.table()
 * @param data Array of objects to render
 * @param options Table rendering options
 * @returns Formatted table string
 */
export function renderTable(
	data: Record<string, unknown>[],
	options: TableOptions = {},
): string {
	if (data.length === 0) {
		return `${ANSI.dim}(no data)${ANSI.reset}`;
	}

	const { colors = true, columns } = options;

	return Bun.inspect.table(data, columns, { colors });
}

// ============================================================================
// Box Rendering
// ============================================================================

/**
 * Render content in a styled box
 * @param title Box title
 * @param content Array of content lines
 * @returns Formatted box string
 */
export function renderBox(title: string, content: string[]): string {
	const titleWidth = textWidth(title);
	const maxLineLength = Math.max(
		titleWidth + 4,
		...content.map((line) => textWidth(line)),
	);
	const width = Math.min(maxLineLength + 4, 89);

	const topBorder = `╭${"─".repeat(width - 2)}╮`;
	const bottomBorder = `╰${"─".repeat(width - 2)}╯`;
	const titleLine = `│ ${ANSI.bold}${title}${ANSI.reset}${" ".repeat(width - 4 - titleWidth)} │`;
	const separator = `├${"─".repeat(width - 2)}┤`;

	const lines = [topBorder, titleLine, separator];

	for (const line of content) {
		const lineWidth = textWidth(line);
		const padding = width - 4 - lineWidth;
		lines.push(`│ ${line}${" ".repeat(Math.max(0, padding))} │`);
	}

	lines.push(bottomBorder);
	return lines.join("\n");
}

/**
 * Strip ANSI escape codes from a string.
 * Uses Bun.stripANSI() when available (6-57x faster).
 */
export function stripAnsi(str: string): string {
	if (typeof Bun !== "undefined") {
		return Bun.stripANSI(str);
	}
	// eslint-disable-next-line no-control-regex
	return str.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Get the visual display width of a string.
 * Uses Bun.stringWidth() for Unicode-aware width (emoji, CJK, ANSI).
 * Falls back to stripping ANSI + .length for non-Bun runtimes.
 */
export function textWidth(str: string): number {
	if (typeof Bun !== "undefined") {
		return Bun.stringWidth(str, { countAnsiEscapeCodes: false });
	}
	return stripAnsi(str).length;
}

// ============================================================================
// Progress Rendering
// ============================================================================

/**
 * Render a progress bar
 * @param current Current progress value
 * @param total Total progress value
 * @param width Bar width in characters (default: 40)
 * @returns Formatted progress bar string
 */
export function renderProgress(
	current: number,
	total: number,
	width: number = 40,
): string {
	const ratio = Math.min(current / total, 1);
	const filled = Math.floor(width * ratio);
	const empty = width - filled;

	const bar = `${ANSI.cyan}[${"█".repeat(filled)}${"░".repeat(empty)}]${ANSI.reset}`;
	const percent = `${Math.floor(ratio * 100)
		.toString()
		.padStart(3)}%`;
	const counts = `${current}/${total}`;

	return `${bar} ${percent} ${counts}`;
}

// ============================================================================
// Severity Rendering
// ============================================================================

const SEVERITY_CONFIG: Record<
	SeverityLevel,
	{ color: string; icon: string; label: string }
> = {
	low: { color: ANSI.green, icon: "○", label: "LOW" },
	medium: { color: ANSI.yellow, icon: "◐", label: "MEDIUM" },
	high: { color: ANSI.brightYellow, icon: "●", label: "HIGH" },
	critical: { color: ANSI.brightRed, icon: "◉", label: "CRITICAL" },
};

/**
 * Render a severity indicator
 * @param level Severity level
 * @returns Formatted severity string with icon and color
 */
export function renderSeverity(level: SeverityLevel): string {
	const config = SEVERITY_CONFIG[level];
	return `${config.color}${config.icon} ${config.label}${ANSI.reset}`;
}

/**
 * Get severity level from a numeric score
 * @param score Numeric score (0-100)
 * @returns Severity level
 */
export function scoreToSeverity(score: number): SeverityLevel {
	if (score >= 80) return "critical";
	if (score >= 60) return "high";
	if (score >= 40) return "medium";
	return "low";
}

// ============================================================================
// Tree Rendering
// ============================================================================

export interface TreeNode {
	name: string;
	children?: TreeNode[];
}

/**
 * Render a tree structure
 * @param node Root tree node
 * @param prefix Current prefix (used recursively)
 * @param isLast Whether this is the last child
 * @returns Formatted tree string
 */
export function renderTree(
	node: TreeNode,
	prefix: string = "",
	isLast: boolean = true,
): string {
	const connector = isLast ? "└── " : "├── ";
	const lines: string[] = [];

	lines.push(`${prefix}${connector}${node.name}`);

	if (node.children && node.children.length > 0) {
		const childPrefix = prefix + (isLast ? "    " : "│   ");
		const childrenCount = node.children.length;
		for (let index = 0; index < childrenCount; index++) {
			const child = node.children[index];
			const childIsLast = index === childrenCount - 1;
			lines.push(renderTree(child, childPrefix, childIsLast));
		}
	}

	return lines.join("\n");
}

// ============================================================================
// Section Headers
// ============================================================================

/**
 * Render a section header
 * @param title Section title
 * @param icon Optional icon
 * @returns Formatted header string
 */
export function renderHeader(title: string, icon?: string): string {
	const prefix = icon ? `${icon} ` : "";
	return `\n${ANSI.bold}${prefix}${title}${ANSI.reset}\n`;
}

/**
 * Render a sub-section header
 * @param title Sub-section title
 * @returns Formatted sub-header string
 */
export function renderSubHeader(title: string): string {
	return `\n${ANSI.dim}──${ANSI.reset} ${title} ${ANSI.dim}${"─".repeat(Math.max(0, 40 - title.length))}${ANSI.reset}\n`;
}

// ============================================================================
// Styled Text Helpers
// ============================================================================

export const style = {
	bold: (s: string) => `${ANSI.bold}${s}${ANSI.reset}`,
	dim: (s: string) => `${ANSI.dim}${s}${ANSI.reset}`,
	italic: (s: string) => `${ANSI.italic}${s}${ANSI.reset}`,
	underline: (s: string) => `${ANSI.underline}${s}${ANSI.reset}`,

	red: (s: string) => `${ANSI.red}${s}${ANSI.reset}`,
	green: (s: string) => `${ANSI.green}${s}${ANSI.reset}`,
	yellow: (s: string) => `${ANSI.yellow}${s}${ANSI.reset}`,
	blue: (s: string) => `${ANSI.blue}${s}${ANSI.reset}`,
	cyan: (s: string) => `${ANSI.cyan}${s}${ANSI.reset}`,
	magenta: (s: string) => `${ANSI.magenta}${s}${ANSI.reset}`,
	gray: (s: string) => `${ANSI.gray}${s}${ANSI.reset}`,

	success: (s: string) => `${ANSI.brightGreen}${s}${ANSI.reset}`,
	error: (s: string) => `${ANSI.brightRed}${s}${ANSI.reset}`,
	warn: (s: string) => `${ANSI.brightYellow}${s}${ANSI.reset}`,
	info: (s: string) => `${ANSI.brightCyan}${s}${ANSI.reset}`,
};

// ============================================================================
// Count/Stats Formatting
// ============================================================================

/**
 * Format a count with appropriate color based on threshold
 * @param count Count value
 * @param warnThreshold Threshold for warning color
 * @param errorThreshold Threshold for error color
 * @returns Colored count string
 */
export function formatCount(
	count: number,
	warnThreshold: number = 10,
	errorThreshold: number = 50,
): string {
	if (count >= errorThreshold) return style.error(count.toString());
	if (count >= warnThreshold) return style.warn(count.toString());
	return style.success(count.toString());
}

/**
 * Format a percentage with color coding
 * @param value Percentage value (0-100)
 * @param invert If true, lower is better (e.g., error rates)
 * @returns Colored percentage string
 */
export function formatPercent(value: number, invert: boolean = false): string {
	const formatted = `${value.toFixed(1)}%`;
	const isGood = invert ? value < 30 : value > 70;
	const isBad = invert ? value > 70 : value < 30;

	if (isGood) return style.success(formatted);
	if (isBad) return style.error(formatted);
	return style.warn(formatted);
}

// ============================================================================
// File Path Formatting
// ============================================================================

/**
 * Format a file path with line number for easy navigation
 * @param filePath File path
 * @param line Optional line number
 * @param column Optional column number
 * @returns Formatted path string (e.g., "src/app.ts:42")
 */
export function formatFilePath(
	filePath: string,
	line?: number,
	column?: number,
): string {
	let result = filePath;
	if (line !== undefined) {
		result += `:${line}`;
		if (column !== undefined) {
			result += `:${column}`;
		}
	}
	return `${ANSI.cyan}${result}${ANSI.reset}`;
}
