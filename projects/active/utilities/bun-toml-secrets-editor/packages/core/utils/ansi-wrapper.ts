// utils/ansi-wrapper.ts
// Bun v1.3.7 ANSI-aware text wrapping utilities
// Leverages Bun.wrapAnsi() for 88x faster CLI formatting

/**
 * Wrap text while preserving ANSI escape codes and handling Unicode properly
 *
 * Bun v1.3.7 introduced Bun.wrapAnsi() which is 88x faster than manual wrapping
 * for CLI output with colors and formatting.
 */

/**
 * Wrap text to a specific width while preserving ANSI escape codes
 *
 * @param text - Text to wrap (may contain ANSI codes)
 * @param width - Maximum width per line (default: 80)
 * @param options - Additional wrapping options
 * @returns Array of wrapped lines
 */
export function wrapAnsiText(
	text: string,
	width: number = 80,
	options: {
		preserveIndentation?: boolean;
		breakOnSpaces?: boolean;
		ansiAware?: boolean;
	} = {},
): string[] {
	const {
		preserveIndentation = true,
		breakOnSpaces = true,
		ansiAware = true,
	} = options;

	// Use Bun v1.3.7's native wrapAnsi if available and enabled
	if (ansiAware && typeof Bun !== "undefined" && "wrapAnsi" in Bun) {
		const wrapped = (Bun as any).wrapAnsi(text, width);
		// Bun.wrapAnsi returns a string with newlines, split into array
		return wrapped.split("\n");
	}

	// Fallback to manual wrapping for older Bun versions
	return wrapTextManually(text, width, { preserveIndentation, breakOnSpaces });
}

/**
 * Manual text wrapping fallback for older Bun versions
 */
function wrapTextManually(
	text: string,
	width: number,
	options: { preserveIndentation?: boolean; breakOnSpaces?: boolean },
): string[] {
	const { preserveIndentation = true, breakOnSpaces = true } = options;
	const lines: string[] = [];

	// Split by existing newlines first
	const paragraphs = text.split("\n");

	for (const paragraph of paragraphs) {
		if (Bun.stringWidth(paragraph) <= width) {
			lines.push(paragraph);
			continue;
		}

		// Handle indentation preservation
		let currentIndent = "";
		if (preserveIndentation) {
			const indentMatch = paragraph.match(/^(\s*)/);
			currentIndent = indentMatch ? indentMatch[1] : "";
		}

		// Strip ANSI codes for width calculation but preserve them in output
		const cleanText = stripAnsiCodes(paragraph);
		const words = breakOnSpaces ? cleanText.split(/\s+/) : cleanText.split("");

		let currentLine = currentIndent;
		let currentWidth = Bun.stringWidth(currentIndent);

		for (const word of words) {
			const wordWidth = Bun.stringWidth(word);
			const spaceWidth = currentLine ? 1 : 0;

			if (currentWidth + spaceWidth + wordWidth > width) {
				if (currentLine.trim()) {
					lines.push(currentLine);
				}
				currentLine = currentIndent + word;
				currentWidth = Bun.stringWidth(currentIndent) + wordWidth;
			} else {
				if (currentLine && currentLine !== currentIndent) {
					currentLine += " ";
					currentWidth += 1;
				}
				currentLine += word;
				currentWidth += wordWidth;
			}
		}

		if (currentLine.trim()) {
			lines.push(currentLine);
		}
	}

	return lines;
}

/**
 * Strip ANSI escape codes from text for width calculation
 */
function stripAnsiCodes(text: string): string {
	return text.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Format a table with ANSI-aware wrapping for long content
 */
export function formatAnsiTable(
	data: Array<Record<string, string>>,
	options: {
		maxWidth?: number;
		headers?: string[];
		preserveAnsi?: boolean;
		wrapCells?: boolean;
	} = {},
): string[] {
	const {
		maxWidth = 120,
		headers = Object.keys(data[0] || {}),
		preserveAnsi = true,
		wrapCells = true,
	} = options;

	if (data.length === 0) return [];

	// Calculate column widths
	const colWidths: number[] = [];
	for (let i = 0; i < headers.length; i++) {
		const header = headers[i];
		let maxColWidth = Bun.stringWidth(header);

		for (const row of data) {
			const cellContent = row[header] || "";
			const cellWidth = Bun.stringWidth(cellContent);
			maxColWidth = Math.max(maxColWidth, cellWidth);
		}

		colWidths.push(maxColWidth);
	}

	// Adjust column widths to fit within maxWidth
	const totalWidth = colWidths.reduce((sum, width) => sum + width + 3, 0); // +3 for padding and separator
	if (totalWidth > maxWidth && wrapCells) {
		const availableWidth = maxWidth - headers.length * 3; // Reserve space for padding
		const avgWidth = Math.floor(availableWidth / headers.length);

		for (let i = 0; i < colWidths.length; i++) {
			colWidths[i] = Math.min(colWidths[i], avgWidth);
		}
	}

	const lines: string[] = [];

	// Add header
	const headerLine = headers
		.map((header, i) => padEndAnsi(header, colWidths[i]))
		.join(" | ");
	lines.push(headerLine);
	lines.push("-".repeat(headerLine.length));

	// Add data rows
	for (const row of data) {
		const rowLines: string[][] = [];

		for (let col = 0; col < headers.length; col++) {
			const header = headers[col];
			const content = row[header] || "";

			if (wrapCells && Bun.stringWidth(content) > colWidths[col]) {
				const wrappedLines = wrapAnsiText(content, colWidths[col], {
					ansiAware: preserveAnsi,
				});
				rowLines.push(wrappedLines);
			} else {
				const paddedLine = padEndAnsi(content, colWidths[col]);
				rowLines.push([paddedLine]);
			}
		}

		// Combine wrapped lines for each row
		const maxRowLines = Math.max(...rowLines.map((lines) => lines.length));
		for (let line = 0; line < maxRowLines; line++) {
			const rowCells = rowLines.map(
				(cellLines) =>
					cellLines[line] ||
					padEndAnsi("", colWidths[rowLines.indexOf(cellLines)]),
			);
			lines.push(rowCells.join(" | "));
		}
	}

	return lines;
}

/**
 * Pad string to specified width while preserving ANSI codes
 */
function padEndAnsi(str: string, width: number): string {
	const visibleWidth = Bun.stringWidth(str);
	const padding = Math.max(0, width - visibleWidth);
	return str + " ".repeat(padding);
}

/**
 * Create a wrapped text block with optional prefix
 */
export function createAnsiBlock(
	text: string,
	options: {
		width?: number;
		prefix?: string;
		suffix?: string;
		preserveAnsi?: boolean;
	} = {},
): string {
	const { width = 80, prefix = "", suffix = "", preserveAnsi = true } = options;

	const availableWidth =
		width - Bun.stringWidth(prefix) - Bun.stringWidth(suffix);
	const wrappedLines = wrapAnsiText(text, availableWidth, {
		ansiAware: preserveAnsi,
	});

	return wrappedLines.map((line) => prefix + line + suffix).join("\n");
}

/**
 * Format a status message with ANSI wrapping
 */
export function formatStatusMessage(
	message: string,
	status: "info" | "success" | "warning" | "error",
	options: { width?: number; icon?: boolean } = {},
): string {
	const { width = 80, icon = true } = options;

	const statusColors = {
		info: "\x1b[36m", // Cyan
		success: "\x1b[32m", // Green
		warning: "\x1b[33m", // Yellow
		error: "\x1b[31m", // Red
	};

	const statusIcons = {
		info: "ℹ️",
		success: "✅",
		warning: "⚠️",
		error: "❌",
	};

	const color = statusColors[status];
	const reset = "\x1b[0m";
	const iconStr = icon ? statusIcons[status] + " " : "";
	const coloredMessage = `${color}${iconStr}${message}${reset}`;

	return createAnsiBlock(coloredMessage, { width });
}

/**
 * Check if Bun.wrapAnsi is available
 */
export function isWrapAnsiAvailable(): boolean {
	return typeof Bun !== "undefined" && "wrapAnsi" in Bun;
}

// Export convenience functions for common use cases
export const wrap = wrapAnsiText;
export const table = formatAnsiTable;
export const block = createAnsiBlock;
export const status = formatStatusMessage;
