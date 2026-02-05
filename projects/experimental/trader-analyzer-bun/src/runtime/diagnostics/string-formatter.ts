/**
 * @fileoverview 7.3.1.0.0.0.0: Unicode-Aware String Formatting Utilities
 * @description String width calculation for Telegram message layout and table alignment
 * @module runtime/diagnostics/string-formatter
 *
 * Cross-Reference Hub:
 * - @see 7.1.1.0.0.0.0 for table generation
 * - @see 9.1.1.4.1.0 for Telegram message formatting
 * - @see 6.1.1.2.2.2.1.0 for HTMLRewriter log alignment
 */

/**
 * 7.3.1.0.0.0.0: Unicode-Aware String Width Calculation for Telegram & Terminal Formatting
 *
 * Calculates display width of Unicode strings for precise column alignment in monospace output.
 * Critical for:
 * - Telegram Mini App tables (see 9.1.1.4.1.0)
 * - Terminal diagnostics (see 7.1.1.0.0.0.0)
 * - HTMLRewriter log alignment (see 6.1.1.2.2.2.1.0)
 *
 * Unicode Handling Guarantees:
 * - ASCII: `'A'` = 1 width unit
 * - Emoji: `'⚡️'` = 1 width unit (not 2)
 * - CJK Characters: `'世'` = 2 width units
 * - ANSI Escape Codes: `'\x1b[31m'` = 0 width units (invisible)
 *
 * @param str - Input string containing Unicode (bookmaker names, emojis, CJK characters)
 * @returns Display width in monospace character cells
 *
 * @example 7.3.1.1.0: Telegram Monospace Table Alignment
 * // Test Formula:
 * // 1. Execute: `Bun.stringWidth('Bet365⚡️')` → Expected: `8`
 * // 2. Execute: `Bun.stringWidth('Pinnacle')` → Expected: `8`
 * // 3. Execute: `Bun.stringWidth('威廉希尔')` → Expected: `8` (CJK)
 * // 4. Execute: `Bun.stringWidth('Betfair📊')` → Expected: `8` (emoji)
 *
 * @see 7.1.1.0.0.0.0 for Bun.inspect.table integration
 * @see 9.1.1.4.1.0 for Telegram message formatting pipeline
 * @see 6.1.1.2.2.1.2.2 for feature flag structure inspection
 */
export function calculateTelegramPadding(
	str: string,
	targetWidth: number,
): string {
	// 7.3.1.2.0: Subtle Bug Prevention - Bun.stringWidth handles all Unicode edge cases
	const width = Bun.stringWidth(str);

	// 7.3.1.2.1: Defensive Padding - Prevent negative values from over-wide strings
	const padding = Math.max(0, targetWidth - width);

	// 7.3.1.2.2: Exact Visual Width - Return string that occupies precise column space
	return str + " ".repeat(padding);
}

/**
 * 7.3.1.3.0: Multi-Column Telegram Table Formatter using stringWidth
 * Produces monospace-aligned tables compatible with HTMLRewriter diagnostics.
 *
 * @param rows - Array of row objects
 * @param columns - Column definitions with key and header
 * @returns Formatted table string for Telegram monospace blocks
 *
 * @example 7.3.1.3.1: Market Odds Telegram Table (Production Use Case)
 * // Test Formula:
 * // const rows = [
 * //   { bookmaker: 'Bet365⚡️', odds: 1.95, steam: true },
 * //   { bookmaker: 'Pinnacle', odds: 1.93, steam: false },
 * // ];
 * // const table = formatTelegramTable(rows, [
 * //   { key: 'bookmaker', header: 'Bookmaker' },
 * //   { key: 'odds', header: 'Odds' },
 * // ]);
 * // Expected: Aligned table with proper Unicode handling
 *
 * @see 9.1.1.2.1.0 for Telegram Mini App integration
 */
export function formatTelegramTable(
	rows: any[],
	columns: { key: string; header: string }[],
): string {
	if (rows.length === 0) {
		throw new Error(
			"7.3.1.3.7: Cannot format empty table - rows array is empty",
		);
	}
	if (columns.length === 0) {
		throw new Error(
			"7.3.1.3.8: Cannot format empty table - columns array is empty",
		);
	}

	// 7.3.1.3.2: Dynamic Column Width Calculation - Per-column max width detection
	const widths = columns.map((col) => {
		const headerWidth = Bun.stringWidth(col.header);
		const maxDataWidth =
			rows.length > 0
				? Math.max(
						...rows.map((row) => Bun.stringWidth(String(row[col.key] || ""))),
					)
				: 0;
		return Math.max(headerWidth, maxDataWidth);
	});

	// 7.3.1.3.3: Header Row Construction - Aligned headers
	const header = columns
		.map((col, i) => calculateTelegramPadding(col.header, widths[i]))
		.join(" | ");

	// 7.3.1.3.4: Separator Row - Markdown-style alignment guides
	const separator = widths.map((w) => "-".repeat(w)).join("-+-");

	// 7.3.1.3.5: Data Row Iteration - Each cell padded to column width
	const dataRows = rows.map((row) =>
		columns
			.map((col, i) =>
				calculateTelegramPadding(String(row[col.key] || ""), widths[i]),
			)
			.join(" | "),
	);

	// 7.3.1.3.6: Final Assembly - Join with newlines for Telegram compatibility
	return [header, separator, ...dataRows].join("\n");
}

/**
 * 7.3.1.4.0: Ripgrep Output Formatter - Aligns grep results in terminal
 * Used for debugging cross-references between 6.x.x.x.x.x.x and 9.1.1.x.x.x.x documentation
 *
 * @param matches - Array of ripgrep match results
 * @returns Formatted output with aligned file names
 *
 * @example 7.3.1.4.1: Documentation Cross-Reference Alignment
 * Cross-Reference: @see 7.1.1.0.0.0.0 → Bun.inspect.table integration, @see 9.1.1.4.1.0 → Telegram formatting
 * // Test Formula:
 * // const matches = [
 * //   { file: 'src/telegram/mini-app-context.ts', line: 28, content: '6.1.1.2.2.1.2.0' },
 * //   { file: 'src/telegram/mini-app.ts', line: 15, content: '6.1.1.2.2.2.1.0' },
 * // ];
 * // const output = formatRipgrepOutput(matches);
 * // Expected: Aligned file names with line numbers
 */
export function formatRipgrepOutput(
	matches: { file: string; line: number; content: string }[],
): string {
	const maxFileWidth = Math.max(...matches.map((m) => Bun.stringWidth(m.file)));
	return matches
		.map(
			(m) =>
				`${calculateTelegramPadding(m.file, maxFileWidth)} | ${m.line}: ${m.content}`,
		)
		.join("\n");
}

/**
 * 7.3.1.3.0: Formats multiple strings with consistent padding for table display.
 *
 * @param strings - Array of strings to pad
 * @param targetWidth - Target width for all strings
 * @returns Array of padded strings
 */
export function padStrings(strings: string[], targetWidth: number): string[] {
	return strings.map((str) => calculateTelegramPadding(str, targetWidth));
}
