/**
 * @fileoverview String Measurement Utilities
 * @description String width measurement, alignment, truncation, progress bars, and tables
 * @module utils/string-measurement
 * 
 * Uses Bun.stringWidth and Bun.stripANSI for accurate string measurement.
 */

export interface MeasureLinesResult {
	lines: string[];
	width: number;
	height: number;
	fits: boolean;
}

export interface TruncateOptions {
	ellipsis?: string;
	position?: 'start' | 'middle' | 'end';
	preserveWords?: boolean;
}

export interface ProgressBarOptions {
	filledChar?: string;
	emptyChar?: string;
	showPercentage?: boolean;
	showNumbers?: boolean;
	color?: 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan';
}

export interface TableOptions {
	padding?: number;
	border?: boolean;
	header?: boolean;
	align?: ('left' | 'center' | 'right')[];
}

/**
 * String Measurement Utilities
 * 
 * Provides utilities for measuring string width, alignment, truncation,
 * progress bars, and table formatting using Bun's native string width APIs.
 */
export class StringMeasurement {
	/**
	 * Get display width of string using Bun.stringWidth
	 */
	static width = Bun.stringWidth;

	/**
	 * Strip ANSI escape codes using Bun.stripANSI
	 */
	static stripANSI = Bun.stripANSI;

	/**
	 * Measure text and wrap to fit within max width
	 */
	static measureLines(text: string, maxWidth: number): MeasureLinesResult {
		const lines = text.split('\n');
		const measuredLines: string[] = [];
		let maxLineWidth = 0;

		for (const line of lines) {
			const lineWidth = this.width(line);
			maxLineWidth = Math.max(maxLineWidth, lineWidth);

			if (lineWidth <= maxWidth) {
				measuredLines.push(line);
			} else {
				// Wrap line
				const words = line.split(/\s+/);
				let currentLine = '';

				for (const word of words) {
					const wordWidth = this.width(word);
					const currentWidth = this.width(currentLine);

					if (currentWidth + wordWidth + (currentLine ? 1 : 0) <= maxWidth) {
						currentLine += (currentLine ? ' ' : '') + word;
					} else {
						if (currentLine) {
							measuredLines.push(currentLine);
						}
						currentLine = word;
					}
				}

				if (currentLine) {
					measuredLines.push(currentLine);
				}
			}
		}

		return {
			lines: measuredLines,
			width: maxLineWidth,
			height: measuredLines.length,
			fits: maxLineWidth <= maxWidth
		};
	}

	/**
	 * Align text within a given width
	 */
	static align(
		text: string,
		width: number,
		alignment: 'left' | 'center' | 'right' = 'left',
		fillChar: string = ' '
	): string {
		const textWidth = this.width(text);

		if (textWidth >= width) return text;

		const padding = width - textWidth;

		switch (alignment) {
			case 'left':
				return text + fillChar.repeat(padding);
			case 'right':
				return fillChar.repeat(padding) + text;
			case 'center':
				const left = Math.floor(padding / 2);
				const right = padding - left;
				return fillChar.repeat(left) + text + fillChar.repeat(right);
		}
	}

	/**
	 * Truncate text to fit within max width
	 */
	static truncate(
		text: string,
		maxWidth: number,
		options: TruncateOptions = {}
	): string {
		const {
			ellipsis = '…',
			position = 'end',
			preserveWords = false
		} = options;

		const ellipsisWidth = this.width(ellipsis);
		const textWidth = this.width(text);

		if (textWidth <= maxWidth) return text;

		const availableWidth = maxWidth - ellipsisWidth;

		if (position === 'end') {
			if (preserveWords) {
				const words = text.split(/\s+/);
				let result = '';

				for (const word of words) {
					const newWidth = this.width(result + (result ? ' ' : '') + word + ellipsis);
					if (newWidth <= maxWidth) {
						result += (result ? ' ' : '') + word;
					} else {
						break;
					}
				}

				return result ? result + ellipsis : ellipsis;
			} else {
				let result = '';
				for (const char of text) {
					if (this.width(result + char + ellipsis) > maxWidth) break;
					result += char;
				}
				return result + ellipsis;
			}
		}

		if (position === 'start') {
			let result = '';
			for (let i = text.length - 1; i >= 0; i--) {
				const newText = text[i] + result;
				if (this.width(ellipsis + newText) > maxWidth) break;
				result = newText;
			}
			return ellipsis + result;
		}

		if (position === 'middle') {
			const halfWidth = Math.floor(availableWidth / 2);
			let left = '';
			let right = '';

			// Build left side
			for (const char of text) {
				if (this.width(left + char) > halfWidth) break;
				left += char;
			}

			// Build right side
			for (let i = text.length - 1; i >= 0; i--) {
				const newRight = text[i] + right;
				if (this.width(newRight) > halfWidth) break;
				right = newRight;
			}

			return left + ellipsis + right;
		}

		return text;
	}

	/**
	 * Create a progress bar
	 */
	static createProgressBar(
		current: number,
		total: number,
		width: number = 40,
		options: ProgressBarOptions = {}
	): string {
		const {
			filledChar = '█',
			emptyChar = '░',
			showPercentage = true,
			showNumbers = true,
			color = 'green'
		} = options;

		const progress = Math.min(1, Math.max(0, current / total));
		const filledWidth = Math.floor(progress * width);
		const emptyWidth = width - filledWidth;

		const colorCodes = {
			red: '\x1b[31m',
			green: '\x1b[32m',
			yellow: '\x1b[33m',
			blue: '\x1b[34m',
			magenta: '\x1b[35m',
			cyan: '\x1b[36m'
		};

		const colorCode = colorCodes[color] || '';
		const resetCode = '\x1b[0m';

		let bar = colorCode + filledChar.repeat(filledWidth) +
			'\x1b[90m' + emptyChar.repeat(emptyWidth) + resetCode;

		if (showNumbers) {
			bar = `[${bar}] ${current}/${total}`;
		}

		if (showPercentage) {
			bar += ` ${(progress * 100).toFixed(1)}%`;
		}

		return bar;
	}

	/**
	 * Create a formatted table
	 */
	static createTable(
		data: string[][],
		options: TableOptions = {}
	): string {
		const {
			padding = 1,
			border = true,
			header = false,
			align = []
		} = options;

		if (data.length === 0) return '';

		// Calculate column widths
		const colWidths = data[0].map((_, colIndex) =>
			Math.max(...data.map(row => this.width(row[colIndex] || '')))
		);

		const lines: string[] = [];

		if (border) {
			const topBorder = '┌' + colWidths.map(w => '─'.repeat(w + padding * 2)).join('┬') + '┐';
			lines.push(topBorder);
		}

		data.forEach((row, rowIndex) => {
			const cells = row.map((cell, colIndex) => {
				const width = colWidths[colIndex];
				const alignment = align[colIndex] || 'left';
				const padded = this.align(cell, width, alignment);
				return ' '.repeat(padding) + padded + ' '.repeat(padding);
			});

			let line = cells.join(border ? '│' : ' ');
			if (border) {
				line = '│' + line + '│';
			}

			lines.push(line);

			if (border && header && rowIndex === 0) {
				const separator = '├' + colWidths.map(w => '─'.repeat(w + padding * 2)).join('┼') + '┤';
				lines.push(separator);
			}
		});

		if (border) {
			const bottomBorder = '└' + colWidths.map(w => '─'.repeat(w + padding * 2)).join('┴') + '┘';
			lines.push(bottomBorder);
		}

		return lines.join('\n');
	}
}
