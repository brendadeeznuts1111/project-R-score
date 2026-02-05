/**
 * @fileoverview Changelog Display Utilities
 * @description CLI-friendly changelog display using Bun.inspect.table() with vibrant colors
 * @module utils/changelog-display
 *
 * Uses Bun.inspect.table() to display changelog entries in a formatted table
 * with category colors matching the NEXUS vibrant tag system.
 */

import {
	CHANGELOG_CATEGORY_COLORS,
	getCategoryColor,
} from "./changelog-colors";

/**
 * Changelog entry type
 */
export interface ChangelogEntry {
	hash: string;
	message: string;
	date: string;
	author?: string;
	category?: string;
}

/**
 * Display changelog entries in a formatted table using Bun.inspect.table()
 *
 * @param entries - Array of changelog entries
 * @param options - Display options
 * @param options.properties - Property names to display (default: ["hash", "category", "message", "date"])
 * @param options.colors - Enable ANSI colors (default: true)
 * @param options.limit - Maximum number of entries to display
 *
 * @example
 * ```ts
 * displayChangelogTable(entries, {
 *   properties: ["hash", "category", "message"],
 *   colors: true,
 *   limit: 10
 * });
 * ```
 */
export function displayChangelogTable(
	entries: ChangelogEntry[],
	options: {
		properties?: string[];
		colors?: boolean;
		limit?: number;
	} = {},
): void {
	const {
		properties = ["hash", "category", "message", "date"],
		colors = true,
		limit,
	} = options;

	// Limit entries if specified
	const displayEntries = limit ? entries.slice(0, limit) : entries;

	// Prepare table data with colorized category
	const tableData = displayEntries.map((entry) => {
		const row: Record<string, string> = {};

		for (const prop of properties) {
			if (prop === "hash") {
				// Short hash (7 chars)
				row[prop] = entry.hash.substring(0, 7);
			} else if (prop === "category") {
				// Colorize category if colors enabled
				const category = entry.category || "other";
				if (colors) {
					const color = getCategoryColor(category);
					row[prop] = colorizeText(category, color);
				} else {
					row[prop] = category;
				}
			} else if (prop === "message") {
				// Truncate long messages
				const maxLength = 60;
				const message =
					entry.message.length > maxLength
						? entry.message.substring(0, maxLength) + "..."
						: entry.message;
				row[prop] = message;
			} else if (prop === "date") {
				// Format date
				try {
					const date = new Date(entry.date);
					row[prop] = date.toLocaleDateString();
				} catch {
					row[prop] = entry.date;
				}
			} else if (prop === "author") {
				row[prop] = entry.author || "--";
			} else {
				// Fallback for other properties
				row[prop] = String((entry as Record<string, unknown>)[prop] || "--");
			}
		}

		return row;
	});

	// Display table with Bun.inspect.table()
	console.log(
		Bun.inspect.table(tableData, {
			columns: properties,
			colors,
		}),
	);
}

/**
 * Display changelog grouped by category
 *
 * @param entries - Array of changelog entries
 * @param options - Display options
 */
export function displayChangelogByCategory(
	entries: ChangelogEntry[],
	options: {
		colors?: boolean;
		limit?: number;
	} = {},
): void {
	const { colors = true, limit } = options;

	// Group by category
	const byCategory: Record<string, ChangelogEntry[]> = {};
	for (const entry of entries) {
		const category = entry.category || "other";
		if (!byCategory[category]) {
			byCategory[category] = [];
		}
		byCategory[category].push(entry);
	}

	// Display each category
	for (const [category, categoryEntries] of Object.entries(byCategory)) {
		const color = getCategoryColor(category);
		const categoryLabel = colors
			? colorizeText(category.toUpperCase(), color)
			: category.toUpperCase();

		console.log(`\n${categoryLabel} (${categoryEntries.length} entries)`);
		console.log("─".repeat(80));

		// Limit entries per category if specified
		const displayEntries = limit
			? categoryEntries.slice(0, limit)
			: categoryEntries;

		displayChangelogTable(displayEntries, {
			properties: ["hash", "message", "date"],
			colors,
		});
	}
}

/**
 * Colorize text with ANSI color codes
 * @param text - Text to colorize
 * @param hexColor - Hex color code (e.g., "#00d4ff")
 * @returns ANSI-colored string
 */
function colorizeText(text: string, hexColor: string): string {
	const r = parseInt(hexColor.slice(1, 3), 16);
	const g = parseInt(hexColor.slice(3, 5), 16);
	const b = parseInt(hexColor.slice(5, 7), 16);
	return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
}

/**
 * Display changelog summary statistics
 *
 * @param entries - Array of changelog entries
 * @param options - Display options
 */
export function displayChangelogSummary(
	entries: ChangelogEntry[],
	options: { colors?: boolean } = {},
): void {
	const { colors = true } = options;

	// Count by category
	const byCategory: Record<string, number> = {};
	for (const entry of entries) {
		const category = entry.category || "other";
		byCategory[category] = (byCategory[category] || 0) + 1;
	}

	// Prepare summary table
	const summaryData = Object.entries(byCategory).map(([category, count]) => {
		const color = getCategoryColor(category);
		return {
			category: colors ? colorizeText(category, color) : category,
			count: String(count),
			percentage: `${((count / entries.length) * 100).toFixed(1)}%`,
		};
	});

	console.log(`\nChangelog Summary (${entries.length} total entries)`);
	console.log("─".repeat(80));
	console.log(
		Bun.inspect.table(summaryData, {
			columns: ["category", "count", "percentage"],
			colors,
		}),
	);
}
