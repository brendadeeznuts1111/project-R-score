/**
 * @fileoverview Advanced Table Configuration
 * @description Advanced table formatting with heatmaps
 * @module utils/table-configuration
 */

import { table, type TableColumn } from './bun';

/**
 * Advanced Table Utilities
 * 
 * Provides advanced table formatting with heatmaps and custom configurations.
 */
export class AdvancedTable {
	/**
	 * Format table with advanced options
	 */
	static format<T extends Record<string, unknown>>(
		data: T[],
		columns?: TableColumn<T>[] | (keyof T)[],
		options?: {
			colors?: boolean;
			maxWidth?: number;
		}
	): string {
		// Convert string array to TableColumn format if needed
		let tableColumns: TableColumn<T>[] | undefined;
		if (columns && columns.length > 0) {
			if (typeof columns[0] === 'string') {
				tableColumns = (columns as (keyof T)[]).map(key => ({
					key,
					header: String(key)
				}));
			} else {
				tableColumns = columns as TableColumn<T>[];
			}
		}
		return table(data, tableColumns);
	}

	/**
	 * Create heatmap table with color-coded values
	 */
	static createHeatmap<T extends Record<string, unknown>>(
		data: T[],
		valueColumn: keyof T,
		options: {
			minColor?: string;
			maxColor?: string;
			columns?: TableColumn<T>[];
		} = {}
	): string {
		// Extract values for color mapping
		const values = data.map(row => {
			const value = row[valueColumn];
			return typeof value === 'number' ? value : 0;
		});

		const min = Math.min(...values);
		const max = Math.max(...values);

		// Create columns with color formatting
		const heatmapColumns: TableColumn<T>[] = options.columns || [];

		// Add color formatting to value column
		const valueColIndex = heatmapColumns.findIndex(col => 
			(typeof col.key === 'string' && col.key === valueColumn) ||
			(typeof col.key === 'function' && col.key.toString().includes(String(valueColumn)))
		);

		if (valueColIndex >= 0 && heatmapColumns[valueColIndex]) {
			const originalFormat = heatmapColumns[valueColIndex].format;
			heatmapColumns[valueColIndex].format = (value: unknown) => {
				const numValue = typeof value === 'number' ? value : 0;
				const ratio = (numValue - min) / (max - min || 1);
				
				// Simple color coding (can be enhanced)
				const colorCode = ratio > 0.8 ? '\x1b[31m' : ratio > 0.5 ? '\x1b[33m' : '\x1b[32m';
				const resetCode = '\x1b[0m';
				
				const formatted = originalFormat ? originalFormat(value) : String(value);
				return `${colorCode}${formatted}${resetCode}`;
			};
		}

		return table(data, heatmapColumns);
	}
}
