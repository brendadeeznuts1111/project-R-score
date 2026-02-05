/**
 * @fileoverview 9.1.5.26.0.0.0: Inspectable Performance Snapshot
 * @description Performance monitoring with advanced Bun.inspect integration
 * @module observability/inspectable-performance-snapshot
 *
 * Cross-Reference Hub:
 * - @see 7.1.2.3.1 → Bun.inspect.custom documentation
 * - @see 9.1.5.24.0.0.0 → Forensic Binary Data
 * - @see src/observability/ → Performance monitoring system
 */

import { inspect } from "bun";

/**
 * Performance snapshot interface
 */
export interface PerformanceSnapshot {
	timestamp: number;
	cpu: number;
	memory: NodeJS.MemoryUsage & { baseline?: number };
	network: { requests: number; errors: number };
	database: { queries: number; slowQueries: number };
	threats: { detected: number; mitigated: number };
}

/**
 * 9.1.5.26.0.0.0: Inspectable Performance Snapshot
 *
 * Provides advanced inspection for performance snapshots with CPU,
 * memory, network, database, and security metrics.
 */
export class InspectablePerformanceSnapshot {
	constructor(private snapshot: PerformanceSnapshot) {}

	/**
	 * 9.1.5.26.1.0.0: Custom inspection for performance snapshots
	 */
	[inspect.custom](depth: number, options: any): string {
		if (depth < 0) {
			return options.stylize("[PerfSnapshot]", "special");
		}

		const lines = [
			`${options.stylize("PerformanceSnapshot", "special")} @ ${new Date(this.snapshot.timestamp).toISOString()}`,
			`  ${options.stylize("CPU", "string")}: ${this.formatCpu(options)}`,
			`  ${options.stylize("Memory", "string")}: ${this.formatMemory(options)}`,
			`  ${options.stylize("Network", "string")}: ${this.snapshot.network.requests} req, ${this.snapshot.network.errors} errors`,
			`  ${options.stylize("Database", "string")}: ${this.snapshot.database.queries} queries, ${this.snapshot.database.slowQueries} slow`,
			`  ${options.stylize("Security", "string")}: ${this.snapshot.threats.detected} threats, ${this.snapshot.threats.mitigated} mitigated`,
		];

		return options.colors
			? lines.join("\n")
			: lines.map((l) => l.replace(/\u001b\[\d+m/g, "")).join("\n");
	}

	/**
	 * Format CPU usage with color coding
	 */
	private formatCpu(options: any): string {
		const cpu = this.snapshot.cpu;
		const status = cpu > 0.9 ? "regex" : cpu > 0.7 ? "special" : "boolean";
		return options.stylize(`${(cpu * 100).toFixed(1)}%`, status);
	}

	/**
	 * Format memory usage with color coding
	 */
	private formatMemory(options: any): string {
		const mem = this.snapshot.memory;
		const usedMB = mem.heapUsed / 1024 / 1024;
		const baseline = mem.baseline || mem.heapTotal;
		const ratio = mem.heapUsed / baseline;

		const status = ratio > 1.5 ? "regex" : ratio > 1.2 ? "special" : "boolean";
		return options.stylize(
			`${usedMB.toFixed(1)}MB (ratio: ${ratio.toFixed(2)})`,
			status,
		);
	}

	/**
	 * Get snapshot data
	 */
	getSnapshot(): PerformanceSnapshot {
		return this.snapshot;
	}
}
