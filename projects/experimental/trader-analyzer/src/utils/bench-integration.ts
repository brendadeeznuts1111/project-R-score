/**
 * @fileoverview Benchmark Integration Utilities
 * @description Integrate BunUtilities with benchmark scripts
 * @module utils/bench-integration
 */

import { BunUtilities } from './bun-utilities';
import { PerformanceMonitor } from './performance-monitor';

/**
 * Benchmark Integration Utilities
 * 
 * Provides utilities for integrating BunUtilities with benchmark scripts.
 */
export class BenchIntegration {
	/**
	 * Format benchmark results using BunUtilities
	 */
	static formatBenchResults(results: Array<{
		name: string;
		avg: number;
		p50: number;
		p95: number;
		p99: number;
		min: number;
		max: number;
		status: 'pass' | 'fail' | 'warn';
		target?: number;
		unit?: string;
	}>): string {
		const tableData = results.map(r => ({
			Benchmark: r.name,
			Avg: `${(r.avg / 1_000_000).toFixed(3)}${r.unit || 'ms'}`,
			P50: `${(r.p50 / 1_000_000).toFixed(3)}${r.unit || 'ms'}`,
			P95: `${(r.p95 / 1_000_000).toFixed(3)}${r.unit || 'ms'}`,
			P99: `${(r.p99 / 1_000_000).toFixed(3)}${r.unit || 'ms'}`,
			Target: r.target ? `${r.target}${r.unit || 'ms'}` : '-',
			Status: r.status === 'pass' ? '✅ PASS' : r.status === 'fail' ? '❌ FAIL' : '⚠️ WARN'
		}));

		return BunUtilities.formatTable(tableData);
	}

	/**
	 * Create benchmark progress indicator
	 */
	static createBenchProgress(
		current: number,
		total: number,
		label: string
	): string {
		const bar = BunUtilities.createProgressBar(current, total, 30, {
			color: 'cyan',
			showNumbers: true,
			showPercentage: true
		});

		return `${label}\n${bar}`;
	}

	/**
	 * Format benchmark summary with performance monitor
	 */
	static formatBenchSummary(monitor: PerformanceMonitor): string {
		return monitor.formatMetrics();
	}
}
