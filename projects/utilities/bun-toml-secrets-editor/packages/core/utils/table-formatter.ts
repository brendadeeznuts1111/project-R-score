/**
 * Table Formatting Utilities for CLI Output
 * Provides clean, formatted tables with alignment and styling
 *
 * Uses Bun v1.3.7 features:
 * - Bun.wrapAnsi() for 88x faster ANSI-aware text wrapping
 * - Bun.stringWidth() for accurate Unicode width calculation
 */

export interface TableColumn {
	header: string;
	key: string;
	width?: number;
	align?: "left" | "center" | "right";
	format?: (value: any, rowIndex?: number, rowData?: any) => string;
	/** Enable text wrapping for long content (uses Bun.wrapAnsi) */
	wrap?: boolean;
}

export interface TableOptions {
	maxWidth?: number;
	showHeaders?: boolean;
	showBorders?: boolean;
	padding?: number;
	headerStyle?: "bold" | "underline" | "uppercase";
	compact?: boolean;
	/** Enable ANSI-aware text wrapping for cell content (v1.3.7) */
	wrapText?: boolean;
}

export class TableFormatter {
	private columns: TableColumn[];
	private options: Required<TableOptions>;

	constructor(columns: TableColumn[], options: TableOptions = {}) {
		this.columns = columns.map((col) => ({
			...col,
			width: col.width || 20,
			align: col.align || "left",
			format: col.format || ((value: any) => String(value || "")),
			wrap: col.wrap ?? false,
		}));

		this.options = {
			maxWidth: options.maxWidth || 120,
			showHeaders: options.showHeaders !== false,
			showBorders: options.showBorders !== false,
			padding: options.padding || 1,
			headerStyle: options.headerStyle || "bold",
			compact: options.compact || false,
			wrapText: options.wrapText ?? false,
		};
	}

	/**
	 * Format data as a table
	 */
	format(data: any[]): string[] {
		if (data.length === 0) {
			return ["No data to display"];
		}

		// Calculate optimal column widths
		this.calculateColumnWidths(data);

		const lines: string[] = [];

		// Add header
		if (this.options.showHeaders) {
			lines.push(...this.renderHeader());
			if (this.options.showBorders) {
				lines.push(this.renderSeparator());
			}
		}

		// Add data rows
		data.forEach((row, index) => {
			lines.push(this.renderRow(row, index));
		});

		return lines;
	}

	/**
	 * Print table directly to console
	 */
	print(data: any[]): void {
		const lines = this.format(data);
		lines.forEach((line) => console.log(line));
	}

	private calculateColumnWidths(data: any[]): void {
		// Start with header widths (using Bun.stringWidth for accuracy)
		this.columns.forEach((col) => {
			col.width = Math.max(
				col.width || 0,
				this.getStringWidth(col.header) + this.options.padding * 2,
			);
		});

		// Adjust for content
		data.forEach((row, rowIndex) => {
			this.columns.forEach((col) => {
				const value = col.format?.(row[col.key], rowIndex, row);
				const valueWidth = this.getStringWidth(value);
				col.width = Math.max(col.width!, valueWidth + this.options.padding * 2);
			});
		});

		// Apply max width constraint
		const totalWidth = this.columns.reduce((sum, col) => sum + col.width!, 0);
		if (totalWidth > this.options.maxWidth) {
			const scale = this.options.maxWidth / totalWidth;
			this.columns.forEach((col) => {
				col.width = Math.floor(col.width! * scale);
			});
		}
	}

	private renderHeader(): string[] {
		const headers = this.columns.map((col) => {
			let header = col.header;

			switch (this.options.headerStyle) {
				case "bold":
					header = `\x1b[1m${header}\x1b[0m`;
					break;
				case "underline":
					header = `\x1b[4m${header}\x1b[0m`;
					break;
				case "uppercase":
					header = header.toUpperCase();
					break;
			}

			return this.padText(header, col.width!, col.align!);
		});

		return [
			this.options.showBorders
				? this.addRowBorders(headers.join(""))
				: headers.join(""),
		];
	}

	private renderRow(row: any, index: number): string {
		const cells = this.columns.map((col) => {
			const value = col.format?.(row[col.key], index, row);
			return this.padText(value, col.width!, col.align!);
		});

		const rowText = cells.join("");
		return this.options.showBorders ? this.addRowBorders(rowText) : rowText;
	}

	private renderSeparator(): string {
		const separator = this.columns
			.map((col) => "─".repeat(col.width!))
			.join("┼");
		return this.addRowBorders(separator);
	}

	private addRowBorders(content: string): string {
		if (!this.options.showBorders) return content;
		return `│${content}│`;
	}

	private padText(
		text: string,
		width: number,
		align: "left" | "center" | "right",
	): string {
		const textWidth = this.getStringWidth(text);

		if (textWidth >= width) {
			// Truncate if too long, preserving ANSI codes
			return this.truncateText(text, width);
		}

		const padding = width - textWidth;

		switch (align) {
			case "center": {
				const leftPad = Math.floor(padding / 2);
				const rightPad = padding - leftPad;
				return " ".repeat(leftPad) + text + " ".repeat(rightPad);
			}
			case "right":
				return " ".repeat(padding) + text;
			default: // left
				return text + " ".repeat(padding);
		}
	}

	/**
	 * Truncate text while preserving ANSI codes
	 */
	private truncateText(text: string, maxWidth: number): string {
		if (this.getStringWidth(text) <= maxWidth) return text;

		let result = "";
		let width = 0;
		const ellipsis = "…";
		const ellipsisWidth = this.getStringWidth(ellipsis);
		const availableWidth = maxWidth - ellipsisWidth;

		for (const char of text) {
			const newResult = result + char;
			const newWidth = this.getStringWidth(newResult);

			if (newWidth > availableWidth) {
				return result + ellipsis;
			}
			result = newResult;
			width = newWidth;
		}

		return result + ellipsis;
	}

	private stripAnsi(text: string): string {
		return text.replace(/\x1b\[[0-9;]*m/g, "");
	}

	/**
	 * Get the visible width of a string using Bun.stringWidth() (v1.3.7)
	 * Properly handles ANSI codes, emojis, and full-width characters
	 */
	private getStringWidth(text: string): number {
		// Use Bun.stringWidth if available (v1.3.7+)
		if (typeof Bun !== "undefined" && "stringWidth" in Bun) {
			return (Bun as any).stringWidth(text);
		}
		// Fallback: strip ANSI and use length
		return this.stripAnsi(text).length;
	}

	/**
	 * Wrap text to fit within a column width using Bun.wrapAnsi() (v1.3.7)
	 * 88x faster than wrap-ansi npm package, preserves ANSI codes
	 */
	private wrapText(text: string, width: number): string[] {
		// Use Bun.wrapAnsi if available (v1.3.7+)
		if (typeof Bun !== "undefined" && "wrapAnsi" in Bun) {
			const wrapped = (Bun as any).wrapAnsi(text, width, {
				hard: false,
				wordWrap: true,
				trim: true,
			});
			return wrapped.split("\n");
		}
		// Fallback: simple truncation
		return [
			this.getStringWidth(text) > width
				? `${text.slice(0, width - 3)}...`
				: text,
		];
	}
}

/**
 * Predefined table formats for common use cases
 */
export class TableFormats {
	/**
	 * Device list table format
	 */
	static deviceList(): TableFormatter {
		return new TableFormatter(
			[
				{ header: "ID", key: "id", width: 25, align: "left" },
				{ header: "Name", key: "name", width: 20, align: "left" },
				{
					header: "Status",
					key: "status",
					width: 12,
					align: "center",
					format: (value) =>
						value === 1 ? "\x1b[32mOnline\x1b[0m" : "\x1b[31mOffline\x1b[0m",
				},
				{ header: "Model", key: "model", width: 15, align: "left" },
				{ header: "IP", key: "ip", width: 15, align: "left" },
			],
			{ showBorders: true, headerStyle: "bold" },
		);
	}

	/**
	 * App list table format
	 */
	static appList(): TableFormatter {
		return new TableFormatter(
			[
				{ header: "Package", key: "package", width: 30, align: "left" },
				{ header: "Name", key: "name", width: 20, align: "left" },
				{ header: "Version", key: "version", width: 12, align: "center" },
				{
					header: "Size",
					key: "size",
					width: 10,
					align: "right",
					format: (value) =>
						value ? `${(value / 1024 / 1024).toFixed(1)}MB` : "N/A",
				},
				{
					header: "Installed",
					key: "installed",
					width: 12,
					align: "center",
					format: (value) =>
						value ? "\x1b[32mYes\x1b[0m" : "\x1b[31mNo\x1b[0m",
				},
			],
			{ showBorders: true, headerStyle: "bold" },
		);
	}

	/**
	 * Team members table format
	 */
	static teamMembers(): TableFormatter {
		return new TableFormatter(
			[
				{ header: "Name", key: "name", width: 20, align: "left" },
				{ header: "Email", key: "email", width: 25, align: "left" },
				{ header: "Role", key: "role", width: 15, align: "center" },
				{
					header: "Status",
					key: "status",
					width: 12,
					align: "center",
					format: (value) =>
						value === "active"
							? "\x1b[32mActive\x1b[0m"
							: "\x1b[31mInactive\x1b[0m",
				},
				{
					header: "Last Seen",
					key: "lastSeen",
					width: 16,
					align: "center",
					format: (value) =>
						value ? new Date(value).toLocaleDateString() : "Never",
				},
			],
			{ showBorders: true, headerStyle: "bold" },
		);
	}

	/**
	 * Analytics summary table format
	 */
	static analyticsSummary(): TableFormatter {
		return new TableFormatter(
			[
				{ header: "Metric", key: "metric", width: 25, align: "left" },
				{ header: "Value", key: "value", width: 15, align: "right" },
				{
					header: "Change",
					key: "change",
					width: 12,
					align: "center",
					format: (value) => {
						if (!value) return "N/A";
						const num = parseFloat(value);
						if (num > 0) return `\x1b[32m+${value}%\x1b[0m`;
						if (num < 0) return `\x1b[31m${value}%\x1b[0m`;
						return `${value}%`;
					},
				},
				{
					header: "Status",
					key: "status",
					width: 12,
					align: "center",
					format: (value) => {
						if (value === "good") return "\x1b[32mGood\x1b[0m";
						if (value === "warning") return "\x1b[33mWarning\x1b[0m";
						if (value === "critical") return "\x1b[31mCritical\x1b[0m";
						return value;
					},
				},
			],
			{ showBorders: true, headerStyle: "bold" },
		);
	}

	/**
	 * Simple status table format
	 */
	static statusList(): TableFormatter {
		return new TableFormatter(
			[
				{ header: "Property", key: "property", width: 20, align: "left" },
				{ header: "Value", key: "value", width: 30, align: "left" },
				{
					header: "Status",
					key: "status",
					width: 10,
					align: "center",
					format: (value) => {
						if (value === "ok" || value === "active") return "\x1b[32m✓\x1b[0m";
						if (value === "error" || value === "inactive")
							return "\x1b[31m✗\x1b[0m";
						if (value === "warning") return "\x1b[33m⚠\x1b[0m";
						return value;
					},
				},
			],
			{ showBorders: false, compact: true, headerStyle: "underline" },
		);
	}
}

/**
 * Utility functions for table operations
 */
export class TableUtils {
	/**
	 * Create a simple two-column table
	 */
	static simpleTable(data: Record<string, any>, title?: string): string[] {
		const lines: string[] = [];

		if (title) {
			lines.push(`\x1b[1m${title}\x1b[0m`);
			lines.push("─".repeat(title.length));
			lines.push("");
		}

		const maxKeyLength = Math.max(
			...Object.keys(data).map((key) => key.length),
		);

		Object.entries(data).forEach(([key, value]) => {
			const paddedKey = key.padEnd(maxKeyLength);
			const formattedValue =
				typeof value === "object" ? JSON.stringify(value) : String(value);
			lines.push(`${paddedKey} : ${formattedValue}`);
		});

		return lines;
	}

	/**
	 * Print a simple two-column table
	 */
	static printSimpleTable(data: Record<string, any>, title?: string): void {
		const lines = TableUtils.simpleTable(data, title);
		lines.forEach((line) => console.log(line));
	}

	/**
	 * Create a comparison table
	 */
	static comparisonTable(items: any[], compareKey: string): TableFormatter {
		const uniqueValues = [...new Set(items.map((item) => item[compareKey]))];
		const columns: TableColumn[] = [
			{ header: "Property", key: "property", width: 20, align: "left" },
		];

		uniqueValues.forEach((value) => {
			columns.push({
				header: String(value),
				key: value,
				width: 15,
				align: "center",
			});
		});

		return new TableFormatter(columns, {
			showBorders: true,
			headerStyle: "bold",
		});
	}
}
