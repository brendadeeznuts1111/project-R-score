/**
 * @fileoverview Performance Monitor
 * @description Bun-native performance monitoring with anomaly detection and analytics
 * @module observability/performance-monitor
 *
 * Uses Bun.nanoseconds() for high-resolution timing and integrates with metrics system.
 */

import { logger } from "../utils/logger";
import { ENTERPRISE_CONFIG } from "../utils/enterprise-config";
import { histogram } from "./metrics";
import { NexusError } from "../errors";

/**
 * Performance thresholds
 */
const PERFORMANCE_THRESHOLDS = {
	/** Warning threshold in milliseconds */
	WARNING_MS: ENTERPRISE_CONFIG.thresholds.responseTimeWarning,
	/** Error threshold in milliseconds */
	ERROR_MS: ENTERPRISE_CONFIG.thresholds.responseTimeError,
	/** Anomaly detection: standard deviations from mean */
	ANOMALY_SIGMA: 3,
	/** Minimum samples needed for anomaly detection */
	MIN_SAMPLES_FOR_ANOMALY: 10,
	/** Maximum timings to keep per operation */
	MAX_TIMINGS: 1000,
} as const;

/**
 * Performance statistics for an operation
 */
export interface PerformanceStats {
	operation: string;
	count: number;
	mean: number;
	min: number;
	max: number;
	p50: number;
	p95: number;
	p99: number;
	stdDev: number;
	lastDuration: number;
	anomalies: number;
}

/**
 * Operation failure record
 */
interface FailureRecord {
	operation: string;
	error: Error | unknown;
	timestamp: number;
	count: number;
}

/**
 * Custom error for market operations
 * Extends NexusError for consistent error handling
 */
export class MarketOperationError extends NexusError {
	constructor(
		public readonly operationName: string,
		public readonly originalError: unknown,
	) {
		const message =
			originalError instanceof Error
				? originalError.message
				: String(originalError);

		super(
			"NX-000", // Use general error code, operation details in details field
			{
				operation: operationName,
				originalMessage: message,
				originalError:
					originalError instanceof Error
						? {
								name: originalError.name,
								message: originalError.message,
								stack: originalError.stack,
							}
						: String(originalError),
			},
			originalError instanceof Error ? originalError : undefined,
		);

		this.message = `Market operation '${operationName}' failed: ${message}`;
	}
}

/**
 * Performance Monitor with Bun-native high-resolution timing
 *
 * Features:
 * - High-resolution timing using Bun.nanoseconds()
 * - Anomaly detection using statistical analysis
 * - Integration with Prometheus metrics
 * - Failure tracking and reporting
 * - Automatic threshold alerts
 *
 * @example
 * ```typescript
 * const monitor = new PerformanceMonitor();
 *
 * const result = await monitor.trackOperation("fetchMarketData", async () => {
 *   return await fetchMarketData();
 * });
 *
 * const stats = monitor.getStats("fetchMarketData");
 * console.log(`Average: ${stats.mean}ms, p95: ${stats.p95}ms`);
 * ```
 */
export class PerformanceMonitor {
	private timings = new Map<string, number[]>();
	private failures = new Map<string, FailureRecord[]>();
	private histograms = new Map<string, ReturnType<typeof histogram>>();

	/**
	 * Track an async operation with performance monitoring
	 *
	 * Uses Bun.nanoseconds() for high-resolution timing (nanosecond precision).
	 * Automatically records timing, detects anomalies, and tracks failures.
	 *
	 * @param operationName - Name of the operation being tracked
	 * @param operation - Async function to execute and monitor
	 * @returns Result of the operation
	 * @throws MarketOperationError if operation fails
	 *
	 * @example
	 * ```typescript
	 * const result = await monitor.trackOperation("apiCall", async () => {
	 *   return await fetch("/api/data");
	 * });
	 * ```
	 */
	async trackOperation<T>(
		operationName: string,
		operation: () => Promise<T> | T,
	): Promise<T> {
		// Use Bun.nanoseconds() for high-resolution timing
		const start = Bun.nanoseconds();

		try {
			const result = await operation();
			const durationNs = Bun.nanoseconds() - start;
			const durationMs = durationNs / 1_000_000; // Convert nanoseconds to milliseconds

			// Record timing
			this.recordTiming(operationName, durationMs);

			// Check for anomalies
			this.checkForAnomalies(operationName, durationMs);

			// Check thresholds and log warnings
			this.checkThresholds(operationName, durationMs);

			return result;
		} catch (error) {
			// Record failure with Bun-native error handling
			this.recordFailure(operationName, error);

			// Throw custom error with domain context
			throw new MarketOperationError(operationName, error);
		}
	}

	/**
	 * Record timing for an operation
	 */
	private recordTiming(operationName: string, durationMs: number): void {
		const timings = this.timings.get(operationName) || [];
		timings.push(durationMs);

		// Keep only last N timings to prevent memory growth
		if (timings.length > PERFORMANCE_THRESHOLDS.MAX_TIMINGS) {
			timings.shift(); // Remove oldest
		}

		this.timings.set(operationName, timings);

		// Update Prometheus histogram if available
		const hist = this.getOrCreateHistogram(operationName);
		hist.observe({ operation: operationName }, durationMs);
	}

	/**
	 * Check for performance anomalies using statistical analysis
	 */
	private checkForAnomalies(operationName: string, durationMs: number): void {
		const timings = this.timings.get(operationName);
		if (
			!timings ||
			timings.length < PERFORMANCE_THRESHOLDS.MIN_SAMPLES_FOR_ANOMALY
		) {
			return; // Not enough data
		}

		// Calculate mean and standard deviation
		const mean = timings.reduce((a, b) => a + b, 0) / timings.length;
		const variance =
			timings.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) /
			timings.length;
		const stdDev = Math.sqrt(variance);

		// Check if current duration is an anomaly (more than N sigma from mean)
		const zScore = Math.abs((durationMs - mean) / stdDev);
		if (zScore > PERFORMANCE_THRESHOLDS.ANOMALY_SIGMA) {
			logger.warn(`Performance anomaly detected for '${operationName}'`, {
				duration: durationMs,
				mean,
				stdDev,
				zScore: zScore.toFixed(2),
			});
		}
	}

	/**
	 * Check performance thresholds and log warnings
	 */
	private checkThresholds(operationName: string, durationMs: number): void {
		if (durationMs >= PERFORMANCE_THRESHOLDS.ERROR_MS) {
			logger.error(`Operation '${operationName}' exceeded error threshold`, {
				duration: durationMs,
				threshold: PERFORMANCE_THRESHOLDS.ERROR_MS,
			});
		} else if (durationMs >= PERFORMANCE_THRESHOLDS.WARNING_MS) {
			logger.warn(`Operation '${operationName}' exceeded warning threshold`, {
				duration: durationMs,
				threshold: PERFORMANCE_THRESHOLDS.WARNING_MS,
			});
		}
	}

	/**
	 * Record operation failure
	 */
	private recordFailure(operationName: string, error: unknown): void {
		const failures = this.failures.get(operationName) || [];

		failures.push({
			operation: operationName,
			error,
			timestamp: Date.now(),
			count: 1,
		});

		// Keep only last 100 failures
		if (failures.length > 100) {
			failures.shift();
		}

		this.failures.set(operationName, failures);

		logger.error(`Operation '${operationName}' failed`, error);
	}

	/**
	 * Get or create Prometheus histogram for an operation
	 */
	private getOrCreateHistogram(
		operationName: string,
	): ReturnType<typeof histogram> {
		if (!this.histograms.has(operationName)) {
			this.histograms.set(
				operationName,
				histogram({
					name: `operation_duration_ms`,
					help: `Duration of ${operationName} operation in milliseconds`,
					buckets: [10, 50, 100, 500, 1000, 5000],
				}),
			);
		}
		return this.histograms.get(operationName)!;
	}

	/**
	 * Get performance statistics for an operation
	 */
	getStats(operationName: string): PerformanceStats | null {
		const timings = this.timings.get(operationName);
		if (!timings || timings.length === 0) {
			return null;
		}

		const sorted = [...timings].sort((a, b) => a - b);
		const count = timings.length;
		const mean = timings.reduce((a, b) => a + b, 0) / count;
		const min = sorted[0]!;
		const max = sorted[count - 1]!;
		const p50 = sorted[Math.floor(count * 0.5)] ?? 0;
		const p95 = sorted[Math.floor(count * 0.95)] ?? 0;
		const p99 = sorted[Math.floor(count * 0.99)] ?? 0;

		// Calculate standard deviation
		const variance =
			timings.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / count;
		const stdDev = Math.sqrt(variance);

		// Count anomalies
		const anomalies = timings.filter((t) => {
			const zScore = Math.abs((t - mean) / stdDev);
			return zScore > PERFORMANCE_THRESHOLDS.ANOMALY_SIGMA;
		}).length;

		return {
			operation: operationName,
			count,
			mean: Number(mean.toFixed(2)),
			min: Number(min.toFixed(2)),
			max: Number(max.toFixed(2)),
			p50: Number(p50.toFixed(2)),
			p95: Number(p95.toFixed(2)),
			p99: Number(p99.toFixed(2)),
			stdDev: Number(stdDev.toFixed(2)),
			lastDuration: Number((timings[timings.length - 1] ?? 0).toFixed(2)),
			anomalies,
		};
	}

	/**
	 * Get all operation statistics
	 */
	getAllStats(): PerformanceStats[] {
		const stats: PerformanceStats[] = [];
		const operationNames = Array.from(this.timings.keys());
		for (const operationName of operationNames) {
			const stat = this.getStats(operationName);
			if (stat) {
				stats.push(stat);
			}
		}
		return stats.sort((a, b) => b.count - a.count); // Sort by count descending
	}

	/**
	 * Get failure statistics for an operation
	 */
	getFailures(operationName: string): FailureRecord[] {
		return this.failures.get(operationName) || [];
	}

	/**
	 * Get failure rate for an operation
	 */
	getFailureRate(operationName: string): number {
		const timings = this.timings.get(operationName) || [];
		const failures = this.failures.get(operationName) || [];

		if (timings.length === 0 && failures.length === 0) {
			return 0;
		}

		const total = timings.length + failures.length;
		return failures.length / total;
	}

	/**
	 * Reset statistics for an operation
	 */
	reset(operationName: string): void {
		this.timings.delete(operationName);
		this.failures.delete(operationName);
		this.histograms.delete(operationName);
	}

	/**
	 * Reset all statistics
	 */
	resetAll(): void {
		this.timings.clear();
		this.failures.clear();
		this.histograms.clear();
	}

	/**
	 * Get summary report as formatted string
	 */
	getSummary(): string {
		const stats = this.getAllStats();
		if (stats.length === 0) {
			return "No performance data available.";
		}

		const lines: string[] = [];
		lines.push("Performance Summary:");
		lines.push("─".repeat(100));
		lines.push(
			"Operation".padEnd(30) +
				"Count".padEnd(10) +
				"Mean (ms)".padEnd(12) +
				"p95 (ms)".padEnd(12) +
				"p99 (ms)".padEnd(12) +
				"Anomalies".padEnd(12) +
				"Failures",
		);
		lines.push("─".repeat(100));

		for (const stat of stats) {
			const failureRate = this.getFailureRate(stat.operation);
			const failureCount = this.failures.get(stat.operation)?.length || 0;
			lines.push(
				stat.operation.padEnd(30) +
					String(stat.count).padEnd(10) +
					stat.mean.toFixed(2).padEnd(12) +
					stat.p95.toFixed(2).padEnd(12) +
					stat.p99.toFixed(2).padEnd(12) +
					String(stat.anomalies).padEnd(12) +
					`${failureCount} (${(failureRate * 100).toFixed(1)}%)`,
			);
		}

		return lines.join("\n");
	}

	/**
	 * Get all operation names being monitored
	 */
	getAllOperationNames(): string[] {
		return Array.from(this.timings.keys());
	}

	/**
	 * Get active performance alerts
	 */
	getActiveAlerts(): Array<{ operation: string; type: string; message: string; timestamp: number }> {
		const alerts: Array<{ operation: string; type: string; message: string; timestamp: number }> = [];

		for (const operationName of this.timings.keys()) {
			const stats = this.getStats(operationName);
			if (!stats) continue;

			// Check for high p95 latency
			if (stats.p95 > PERFORMANCE_THRESHOLDS.ERROR_MS) {
				alerts.push({
					operation: operationName,
					type: "high_latency",
					message: `p95 latency ${stats.p95}ms exceeds error threshold ${PERFORMANCE_THRESHOLDS.ERROR_MS}ms`,
					timestamp: Date.now(),
				});
			} else if (stats.p95 > PERFORMANCE_THRESHOLDS.WARNING_MS) {
				alerts.push({
					operation: operationName,
					type: "warning_latency",
					message: `p95 latency ${stats.p95}ms exceeds warning threshold ${PERFORMANCE_THRESHOLDS.WARNING_MS}ms`,
					timestamp: Date.now(),
				});
			}

			// Check for high anomaly rate
			const anomalyRate = stats.anomalies / stats.count;
			if (anomalyRate > 0.1) { // More than 10% anomalies
				alerts.push({
					operation: operationName,
					type: "high_anomalies",
					message: `Anomaly rate ${(anomalyRate * 100).toFixed(1)}% is too high`,
					timestamp: Date.now(),
				});
			}

			// Check for high failure rate
			const failureRate = this.getFailureRate(operationName);
			if (failureRate > 0.05) { // More than 5% failures
				alerts.push({
					operation: operationName,
					type: "high_failures",
					message: `Failure rate ${(failureRate * 100).toFixed(1)}% is too high`,
					timestamp: Date.now(),
				});
			}
		}

		return alerts;
	}

	/**
	 * Get recent performance anomalies
	 */
	getRecentAnomalies(limit = 10): Array<{ operation: string; duration: number; timestamp: number; zScore: number }> {
		const anomalies: Array<{ operation: string; duration: number; timestamp: number; zScore: number }> = [];

		for (const [operationName, timings] of this.timings.entries()) {
			if (timings.length < PERFORMANCE_THRESHOLDS.MIN_SAMPLES_FOR_ANOMALY) continue;

			const mean = timings.reduce((a, b) => a + b, 0) / timings.length;
			const variance = timings.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / timings.length;
			const stdDev = Math.sqrt(variance);

			// Find recent anomalies (last 100 timings)
			const recentTimings = timings.slice(-100);
			for (let i = 0; i < recentTimings.length; i++) {
				const duration = recentTimings[i]!;
				const zScore = Math.abs((duration - mean) / stdDev);

				if (zScore > PERFORMANCE_THRESHOLDS.ANOMALY_SIGMA) {
					anomalies.push({
						operation: operationName,
						duration,
						timestamp: Date.now() - (recentTimings.length - i) * 1000, // Approximate timestamp
						zScore,
					});
				}
			}
		}

		// Sort by timestamp descending and limit
		return anomalies
			.sort((a, b) => b.timestamp - a.timestamp)
			.slice(0, limit);
	}

	/**
	 * Get system health status
	 */
	getSystemHealth(): { healthy: boolean; issues: string[]; metrics: Record<string, any> } {
		const alerts = this.getActiveAlerts();
		const issues: string[] = [];

		// Check for critical alerts
		const criticalAlerts = alerts.filter(a => a.type === "high_failures" || a.type === "high_latency");
		if (criticalAlerts.length > 0) {
			issues.push(`${criticalAlerts.length} critical performance issues detected`);
		}

		// Check memory usage (if available)
		const memUsage = process.memoryUsage?.();
		if (memUsage) {
			const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
			if (heapUsedMB > 500) { // More than 500MB
				issues.push(`High memory usage: ${heapUsedMB.toFixed(1)}MB`);
			}
		}

		return {
			healthy: issues.length === 0,
			issues,
			metrics: {
				alertsCount: alerts.length,
				operationsMonitored: this.timings.size,
				totalTimings: Array.from(this.timings.values()).reduce((sum, t) => sum + t.length, 0),
				memoryUsage: memUsage ? {
					heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
					heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
					external: Math.round(memUsage.external / 1024 / 1024),
				} : null,
			},
		};
	}
}

/**
 * Default performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();
