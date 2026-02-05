// ── CLI Utilities ────────────────────────────────────────────────────────────
// ANSI-aware text wrapping and CLI formatting utilities using Bun v1.3.7 features

/**
 * Wrap text while preserving ANSI escape codes
 * Uses Bun.wrapAnsi() for 33-88x faster performance than wrap-ansi npm package
 *
 * @param text - Text to wrap (may contain ANSI codes)
 * @param columns - Maximum column width (default: 80)
 * @param options - Wrapping options
 * @returns Wrapped text with ANSI codes preserved
 */
export function wrapAnsiText(
	text: string,
	columns: number = 80,
	options?: {
		hard?: boolean;
		wordWrap?: boolean;
		trim?: boolean;
		ambiguousIsNarrow?: boolean;
	},
): string {
	// Use Bun.wrapAnsi if available (Bun v1.3.7+)
	if (typeof Bun !== 'undefined' && 'wrapAnsi' in Bun && typeof Bun.wrapAnsi === 'function') {
		return Bun.wrapAnsi(text, columns, options);
	}

	// Fallback for older Bun versions or non-Bun environments
	return wrapAnsiFallback(text, columns);
}

/**
 * Fallback ANSI-aware wrapping for older Bun versions
 */
function wrapAnsiFallback(text: string, columns: number): string {
	// Simple word-wrap that preserves ANSI codes
	const lines: string[] = [];
	const words = text.split(/(\s+)/);
	let currentLine = '';
	let ansiState = '';

	for (const word of words) {
		// Track ANSI codes
		if (word.match(/\x1b\[[0-9;]*m/)) {
			ansiState = word;
			currentLine += word;
			continue;
		}

		const testLine = currentLine + word;
		const plainLength = Bun.stripANSI
			? Bun.stripANSI(testLine).length
			: testLine.replace(/\x1b\[[0-9;]*m/g, '').length;

		if (plainLength <= columns || currentLine === '') {
			currentLine = testLine;
		} else {
			lines.push(currentLine + ansiState);
			currentLine = word;
		}
	}

	if (currentLine) {
		lines.push(currentLine);
	}

	return lines.join('\n');
}

/**
 * Wrap error messages with ANSI colors preserved
 */
export function wrapErrorMessage(message: string, columns: number = 80): string {
	return wrapAnsiText(message, columns);
}

/**
 * Wrap help text with ANSI colors preserved
 */
export function wrapHelpText(text: string, columns: number = 80): string {
	return wrapAnsiText(text, columns);
}

/**
 * Get terminal width, falling back to default
 */
export function getTerminalWidth(defaultWidth: number = 80): number {
	if (typeof process !== 'undefined' && process.stdout?.columns) {
		return process.stdout.columns;
	}
	return defaultWidth;
}

/**
 * Wrap text to terminal width (or specified width)
 */
export function wrapToTerminal(text: string, maxWidth?: number, options?: Parameters<typeof wrapAnsiText>[2]): string {
	const width = maxWidth ?? getTerminalWidth();
	return wrapAnsiText(text, width, options);
}
