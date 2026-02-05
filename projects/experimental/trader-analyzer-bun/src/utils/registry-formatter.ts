/**
 * @fileoverview Registry Formatter
 * @description Format registry data using BunUtilities
 * @module utils/registry-formatter
 */

import { BunUtilities } from './bun-utilities';
import type { RegistryItem, RegistryInfo, RegistryMetrics } from '../api/registry';

// Note: BunUtilities.formatTable expects array of objects, not string arrays
// We'll use StringMeasurement.createTable for string arrays
import { StringMeasurement } from './string-measurement';

/**
 * Registry Formatter
 * 
 * Formats registry data for display using BunUtilities.
 */
export class RegistryFormatter {
	/**
	 * Format registry overview as table
	 */
	static formatOverview(registries: RegistryInfo[]): string {
		const tableData = registries.map(reg => ({
			Name: reg.name,
			Category: reg.category,
			Type: reg.type,
			Status: this.formatStatus(reg.status),
			Items: reg.itemCount?.toLocaleString() || 'N/A',
			Tags: reg.tags.slice(0, 3).join(', '),
			Endpoint: reg.endpoint
		}));

		// Use BunUtilities for object arrays
		return BunUtilities.formatTable(tableData);
	}

	/**
	 * Format registry items as table
	 */
	static formatItems(items: RegistryItem[]): string {
		const tableData = items.map(item => ({
			ID: BunUtilities.stringWidth(item.id) > 20 
				? StringMeasurement.truncate(item.id, 20, { position: 'end' })
				: item.id,
			Name: item.name,
			Type: item.type,
			Description: item.description 
				? StringMeasurement.truncate(item.description, 40, { preserveWords: true })
				: '-',
			Updated: item.updatedAt 
				? new Date(item.updatedAt).toLocaleDateString()
				: '-'
		}));

		// Use BunUtilities for object arrays
		return BunUtilities.formatTable(tableData);
	}

	/**
	 * Format registry metrics
	 */
	static formatMetrics(metrics: RegistryMetrics): string {
		const progressBar = BunUtilities.createProgressBar(
			metrics.activeItems,
			metrics.totalItems,
			30,
			{ color: 'green', showPercentage: true }
		);

		return `
Total Items: ${metrics.totalItems.toLocaleString()}
Active Items: ${metrics.activeItems.toLocaleString()}
${progressBar}
Avg Response: ${metrics.avgResponseMs.toFixed(2)}ms
Error Rate: ${(metrics.errorRate * 100).toFixed(2)}%
24h Queries: ${metrics.queryCount24h.toLocaleString()}
`.trim();
	}

	/**
	 * Format status with color
	 */
	private static formatStatus(status: string): string {
		const colors = {
			healthy: '\x1b[32m',
			degraded: '\x1b[33m',
			offline: '\x1b[31m',
			unknown: '\x1b[90m'
		};
		const reset = '\x1b[0m';
		const color = colors[status as keyof typeof colors] || colors.unknown;
		return `${color}${status.toUpperCase()}${reset}`;
	}

	/**
	 * Format registry info as detailed view
	 */
	static formatDetails(registry: RegistryInfo): string {
		const lines: string[] = [];
		
		lines.push(`\n${'─'.repeat(60)}`);
		lines.push(`Registry: ${registry.name}`);
		lines.push(`Category: ${registry.category}`);
		lines.push(`Type: ${registry.type}`);
		lines.push(`Status: ${this.formatStatus(registry.status)}`);
		lines.push(`Endpoint: ${registry.endpoint}`);
		
		if (registry.description) {
			lines.push(`\nDescription:`);
			const wrapped = BunUtilities.measureText(registry.description, 60);
			lines.push(...wrapped.lines);
		}
		
		if (registry.tags.length > 0) {
			lines.push(`\nTags: ${registry.tags.join(', ')}`);
		}
		
		if (registry.metrics) {
			lines.push(`\nMetrics:`);
			lines.push(this.formatMetrics(registry.metrics));
		}
		
		lines.push('─'.repeat(60));
		
		return lines.join('\n');
	}
}
