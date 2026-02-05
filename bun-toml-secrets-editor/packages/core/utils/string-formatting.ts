/**
 * Unicode-aware string formatting utilities using Bun.stringWidth()
 *
 * These utilities properly handle:
 * - Emojis and flags (2 columns each)
 * - ANSI escape codes (0 columns)
 * - Zero-width characters (0 columns)
 * - International text (full-width characters)
 *
 * Note: We use Bun.stringWidth() directly - these are convenience wrappers
 * for consistency, reusability, and customization.
 *
 * For simple tables, consider using Bun's built-in console.table() or inspect.table().
 * Use these utilities when you need custom headers, separators, or formatting.
 *
 * Use these instead of String.padEnd() or String.padStart() for terminal output.
 *
 * @see https://bun.com/docs/runtime/utils#bun-stringwidth - Bun.stringWidth() documentation
 * @see https://bun.com/docs/runtime/utils#bun-inspect-table - Bun.inspect.table() for simple tables
 */

/**
 * Pad a string to the right (end) using visible width, not character count
 *
 * @param str - String to pad
 * @param width - Target visible width in terminal columns
 * @returns Padded string
 *
 * @example
 * padEnd('🇺🇸', 10) // '🇺🇸        ' (2 visible columns + 8 spaces)
 * padEnd('\x1b[32mOK\x1b[0m', 10) // '\x1b[32mOK\x1b[0m      ' (2 visible columns + 8 spaces)
 */
export function padEnd(str: string, width: number): string {
	const strWidth = Bun.stringWidth(str);
	const padding = Math.max(0, width - strWidth);
	return str + " ".repeat(padding);
}

/**
 * Pad a string to the left (start) using visible width, not character count
 *
 * @param str - String to pad
 * @param width - Target visible width in terminal columns
 * @returns Padded string
 *
 * @example
 * padStart('100', 10) // '       100'
 * padStart('€85', 10) // '       €85'
 */
export function padStart(str: string, width: number): string {
	const strWidth = Bun.stringWidth(str);
	const padding = Math.max(0, width - strWidth);
	return " ".repeat(padding) + str;
}

/**
 * Truncate a string to a maximum visible width
 *
 * @param str - String to truncate
 * @param maxWidth - Maximum visible width in terminal columns
 * @param ellipsis - Ellipsis character (default: '…')
 * @returns Truncated string with ellipsis if needed
 *
 * @example
 * truncate('Hello 🇺🇸!', 8) // 'Hello 🇺…'
 * truncate('\x1b[32mOK\x1b[0m', 5) // '\x1b[32mOK\x1b[0m' (no truncation needed)
 */
export function truncate(
	str: string,
	maxWidth: number,
	ellipsis = "…",
): string {
	const strWidth = Bun.stringWidth(str);
	if (strWidth <= maxWidth) {
		return str;
	}

	const ellipsisWidth = Bun.stringWidth(ellipsis);
	const availableWidth = maxWidth - ellipsisWidth;

	let result = "";
	for (const char of str) {
		const newResult = result + char;
		if (Bun.stringWidth(newResult) > availableWidth) {
			return result + ellipsis;
		}
		result = newResult;
	}
	return result + ellipsis;
}

/**
 * Calculate the visible width of a string (accounting for emojis, ANSI codes, etc.)
 *
 * @param str - String to measure
 * @returns Visible width in terminal columns
 *
 * @example
 * getWidth('🇺🇸') // 2
 * getWidth('\x1b[32mOK\x1b[0m') // 2
 * getWidth('Test') // 4
 */
export function getWidth(str: string): number {
	return Bun.stringWidth(str);
}

/**
 * Align text in a column with proper Unicode handling
 *
 * @param text - Text to align
 * @param width - Column width
 * @param align - Alignment: 'left' | 'right' | 'center'
 * @returns Aligned text
 *
 * @example
 * align('🇺🇸', 10, 'left') // '🇺🇸        '
 * align('100', 10, 'right') // '       100'
 * align('OK', 10, 'center') // '    OK    '
 */
export function align(
	text: string,
	width: number,
	align: "left" | "right" | "center" = "left",
): string {
	const textWidth = Bun.stringWidth(text);
	const padding = Math.max(0, width - textWidth);

	switch (align) {
		case "right":
			return " ".repeat(padding) + text;
		case "center": {
			const leftPad = Math.floor(padding / 2);
			const rightPad = padding - leftPad;
			return " ".repeat(leftPad) + text + " ".repeat(rightPad);
		}
		default:
			return text + " ".repeat(padding);
	}
}

/**
 * Create a progress bar with Unicode-aware label truncation
 *
 * @param current - Current progress value
 * @param total - Total progress value
 * @param label - Optional label to display (truncated by visible width)
 * @param width - Progress bar width in characters (default: 30)
 * @param filledChar - Character for filled portion (default: '█')
 * @param emptyChar - Character for empty portion (default: '░')
 * @returns Formatted progress bar string
 *
 * @example
 * createProgress(25, 100, 'Processing files 🇺🇸')
 * // '[███████░░░░░░░░░░░░░░░░░░░░░░░] 25.0% Processing files 🇺🇸'
 */
export function createProgress(
	current: number,
	total: number,
	label: string = "",
	width: number = 30,
	filledChar: string = "█",
	emptyChar: string = "░",
): string {
	const filled = Math.floor(width * (current / total));
	const bar = filledChar.repeat(filled) + emptyChar.repeat(width - filled);
	const percent = ((current / total) * 100).toFixed(1);

	// Calculate available space for label
	const progressText = `[${bar}] ${percent}%`;
	const terminalWidth = process.stdout.columns || 80;
	const available = terminalWidth - Bun.stringWidth(progressText) - 1;

	// Truncate label by visible width, not character count
	let displayLabel = label;
	if (label && Bun.stringWidth(displayLabel) > available) {
		while (
			Bun.stringWidth(displayLabel) > available &&
			displayLabel.length > 0
		) {
			displayLabel = displayLabel.slice(0, -1);
		}
		// Add ellipsis if truncated
		if (displayLabel.length < label.length) {
			displayLabel = `${displayLabel.slice(0, -1)}…`;
		}
	}

	return displayLabel ? `${progressText} ${displayLabel}` : progressText;
}

/**
 * Format currency with proper Unicode-aware spacing
 *
 * @param symbol - Currency symbol (emoji or Unicode)
 * @param amount - Amount as string or number
 * @param currency - Currency code (e.g., 'USD', 'EUR')
 * @param symbolWidth - Target width for symbol column (default: 3)
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency('💲', '100', 'USD') // '💲  100 USD'
 * formatCurrency('€', '85', 'EUR') // '€   85 EUR'
 * formatCurrency('¥', '11000', 'JPY') // '¥   11000 JPY'
 */
export function formatCurrency(
	symbol: string,
	amount: string | number,
	currency: string,
	symbolWidth: number = 3,
): string {
	const symbolWidthActual = Bun.stringWidth(symbol);
	const padding = " ".repeat(Math.max(0, symbolWidth - symbolWidthActual));
	const amountStr = typeof amount === "number" ? amount.toString() : amount;
	return `${symbol}${padding} ${amountStr} ${currency}`;
}

/**
 * Format a list of currencies with aligned columns
 *
 * @param prices - Array of price objects with symbol, amount, and currency
 * @param options - Formatting options
 * @returns Array of formatted currency strings
 *
 * @example
 * formatCurrencyList([
 *   { symbol: '💲', amount: '100', currency: 'USD' },
 *   { symbol: '€', amount: '85', currency: 'EUR' },
 *   { symbol: '¥', amount: '11000', currency: 'JPY' }
 * ])
 */
export function formatCurrencyList(
	prices: Array<{ symbol: string; amount: string | number; currency: string }>,
	options: { symbolWidth?: number; amountWidth?: number } = {},
): string[] {
	const { symbolWidth = 3, amountWidth } = options;

	// Calculate max amount width if not specified
	let maxAmountWidth = amountWidth;
	if (!maxAmountWidth) {
		maxAmountWidth = Math.max(
			...prices.map((p) => {
				const amountStr =
					typeof p.amount === "number" ? p.amount.toString() : p.amount;
				return Bun.stringWidth(amountStr);
			}),
		);
	}

	return prices.map(({ symbol, amount, currency }) => {
		const symbolWidthActual = Bun.stringWidth(symbol);
		const symbolPadding = " ".repeat(
			Math.max(0, symbolWidth - symbolWidthActual),
		);

		const amountStr = typeof amount === "number" ? amount.toString() : amount;
		const amountWidthActual = Bun.stringWidth(amountStr);
		const amountPadding = " ".repeat(
			Math.max(0, maxAmountWidth - amountWidthActual),
		);

		return `${symbol}${symbolPadding} ${amountPadding}${amountStr} ${currency}`;
	});
}

/**
 * Print a table with Unicode-aware column alignment
 *
 * @param headers - Array of header strings
 * @param rows - Array of row arrays (each row should have same length as headers)
 * @param options - Formatting options
 * @returns Array of formatted table lines (or prints to console if options.print !== false)
 *
 * @example
 * printTable(
 *   ['Name', 'Status', 'Value'],
 *   [
 *     ['File', '✅', '100'],
 *     ['Config', '🇺🇸', '200'],
 *     ['\x1b[32mOK\x1b[0m', 'Active', '300']
 *   ]
 * )
 */
export function printTable(
	headers: string[],
	rows: Array<Array<string | number>>,
	options: {
		separator?: string;
		print?: boolean;
		border?: boolean;
	} = {},
): string[] {
	const { separator = " | ", print = true, border = false } = options;

	// Calculate column widths using Unicode-aware width
	const widths = headers.map((h, i) =>
		Math.max(
			Bun.stringWidth(h),
			...rows.map((r) => Bun.stringWidth(String(r[i] || ""))),
		),
	);

	const lines: string[] = [];

	// Helper to pad cell content
	const padCell = (content: string, width: number): string => {
		const contentWidth = Bun.stringWidth(content);
		return content + " ".repeat(Math.max(0, width - contentWidth));
	};

	// Print headers
	const headerLine = headers
		.map((h, i) => padCell(h, widths[i]))
		.join(separator);
	lines.push(headerLine);

	// Print separator line
	const separatorLine = "-".repeat(
		widths.reduce((a, b) => a + b, 0) + separator.length * (headers.length - 1),
	);
	lines.push(separatorLine);

	// Print rows
	rows.forEach((row) => {
		const rowLine = row
			.map((cell, i) => padCell(String(cell || ""), widths[i]))
			.join(separator);
		lines.push(rowLine);
	});

	// Print to console if requested
	if (print) {
		lines.forEach((line) => console.log(line));
	}

	return lines;
}

/**
 * Print a table with box-drawing borders (Unicode-aware)
 *
 * @param headers - Array of header strings
 * @param rows - Array of row arrays
 * @param options - Formatting options
 * @returns Array of formatted table lines (or prints to console if options.print !== false)
 *
 * @example
 * printTableBox(
 *   ['Name', 'Status', 'Value'],
 *   [
 *     ['File', '✅', '100'],
 *     ['Config', '🇺🇸', '200']
 *   ]
 * )
 */
export function printTableBox(
	headers: string[],
	rows: Array<Array<string | number>>,
	options: { print?: boolean } = {},
): string[] {
	const { print = true } = options;

	// Calculate column widths
	const widths = headers.map((h, i) =>
		Math.max(
			Bun.stringWidth(h),
			...rows.map((r) => Bun.stringWidth(String(r[i] || ""))),
		),
	);

	const lines: string[] = [];

	// Helper to pad cell content
	const padCell = (content: string, width: number): string => {
		const contentWidth = Bun.stringWidth(content);
		return content + " ".repeat(Math.max(0, width - contentWidth));
	};

	// Top border
	const topBorder = `┌${widths.map((w) => "─".repeat(w + 2)).join("┬")}┐`;
	lines.push(topBorder);

	// Header row
	const headerRow = `│ ${headers.map((h, i) => padCell(h, widths[i])).join(" │ ")} │`;
	lines.push(headerRow);

	// Separator
	const separator = `├${widths.map((w) => "─".repeat(w + 2)).join("┼")}┤`;
	lines.push(separator);

	// Data rows
	rows.forEach((row) => {
		const rowLine =
			"│ " +
			row.map((cell, i) => padCell(String(cell || ""), widths[i])).join(" │ ") +
			" │";
		lines.push(rowLine);
	});

	// Bottom border
	const bottomBorder = `└${widths.map((w) => "─".repeat(w + 2)).join("┴")}┘`;
	lines.push(bottomBorder);

	// Print to console if requested
	if (print) {
		lines.forEach((line) => console.log(line));
	}

	return lines;
}
