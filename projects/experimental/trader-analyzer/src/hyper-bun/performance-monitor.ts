/**
 * Performance Monitor
 *
 * Tracks operation performance using Bun's high-resolution timing.
 * Provides statistical anomaly detection and performance analytics.
 */

import { performanceLogger } from "./console-enhancement";
export class PerformanceMonitor {
	private timings: Map<string, number[]> = new Map();
	private operationCounts: Map<string, number> = new Map();
	private anomalies: Map<string, AnomalyRecord[]> = new Map();
	private alerts: PerformanceAlert[] = [];

	/**
	 * Track the performance of an async operation
	 * Uses Bun-native high-resolution timer (performance.now())
	 */
	async trackOperation<T>(
		operationName: string,
		operation: () => Promise<T>,
	): Promise<T> {
		const start = performance.now(); // Bun-native high-res timer

		try {
			const result = await operation();
			const duration = performance.now() - start;

			// Custom Hyper-Bun analytics
			this.recordTiming(operationName, duration);
			this.checkForAnomalies(operationName, duration);

			return result;
		} catch (error) {
			const duration = performance.now() - start;

			// Record failure timing
			this.recordFailure(operationName, duration, error);

			throw new MarketOperationError(operationName, error);
		}
	}

	/**
	 * Record timing data for statistical analysis
	 */
	private recordTiming(operationName: string, duration: number): void {
		if (!this.timings.has(operationName)) {
			this.timings.set(operationName, []);
		}

		const operationTimings = this.timings.get(operationName)!;
		operationTimings.push(duration);

		// Keep only last 1000 measurements to prevent memory bloat
		if (operationTimings.length > 1000) {
			operationTimings.shift();
		}

		// Update operation count
		this.operationCounts.set(
			operationName,
			(this.operationCounts.get(operationName) || 0) + 1,
		);
	}

	/**
	 * Record operation failure with timing
	 */
	private recordFailure(
		operationName: string,
		duration: number,
		error: any,
	): void {
		this.recordTiming(`${operationName}_failed`, duration);

		// Log failure for monitoring
		performanceLogger.error(
			`Operation ${operationName} failed after ${duration.toFixed(2)}ms`,
			error,
		);
	}

	/**
	 * Check for performance anomalies using statistical analysis
	 */
	private checkForAnomalies(
		operationName: string,
		currentDuration: number,
	): void {
		const operationTimings = this.timings.get(operationName);
		if (!operationTimings || operationTimings.length < 10) {
			return; // Need minimum data for statistical analysis
		}

		// Calculate statistics
		const stats = this.calculateStatistics(operationTimings);
		const zScore = (currentDuration - stats.mean) / stats.stdDev;

		// Check for anomalies (Z-score > 3 is typically considered anomalous)
		if (Math.abs(zScore) > 3) {
			const anomaly: AnomalyRecord = {
				operationName,
				timestamp: Date.now(),
				duration: currentDuration,
				zScore,
				expectedDuration: stats.mean,
				severity: Math.abs(zScore) > 5 ? "critical" : "warning",
			};

			// Store anomaly
			if (!this.anomalies.has(operationName)) {
				this.anomalies.set(operationName, []);
			}
			this.anomalies.get(operationName)!.push(anomaly);

			// Keep only last 100 anomalies per operation
			const operationAnomalies = this.anomalies.get(operationName)!;
			if (operationAnomalies.length > 100) {
				operationAnomalies.shift();
			}

			// Create alert for critical anomalies
			if (anomaly.severity === "critical") {
				this.alerts.push({
					type: "performance_anomaly",
					operationName,
					message: `Critical performance anomaly: ${currentDuration.toFixed(2)}ms (expected: ${stats.mean.toFixed(2)}ms)`,
					timestamp: Date.now(),
					severity: "critical",
					data: anomaly,
				});
			}
		}
	}

	/**
	 * Calculate statistical measures for timing data
	 */
	private calculateStatistics(timings: number[]): TimingStatistics {
		const sorted = [...timings].sort((a, b) => a - b);
		const mean = timings.reduce((sum, t) => sum + t, 0) / timings.length;

		const variance =
			timings.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) /
			timings.length;
		const stdDev = Math.sqrt(variance);

		const median = sorted[Math.floor(sorted.length / 2)];
		const p95 = sorted[Math.floor(sorted.length * 0.95)];
		const p99 = sorted[Math.floor(sorted.length * 0.99)];

		return {
			mean,
			median,
			stdDev,
			min: sorted[0],
			max: sorted[sorted.length - 1],
			p95,
			p99,
			sampleSize: timings.length,
		};
	}

	/**
	 * Get performance statistics for an operation
	 */
	getOperationStats(operationName: string): OperationStats | null {
		const timings = this.timings.get(operationName);
		if (!timings || timings.length === 0) {
			return null;
		}

		const stats = this.calculateStatistics(timings);
		const operationCount = this.operationCounts.get(operationName) || 0;
		const anomalies = this.anomalies.get(operationName) || [];

		return {
			operationName,
			statistics: stats,
			totalOperations: operationCount,
			anomalyCount: anomalies.length,
			recentAnomalies: anomalies.slice(-5), // Last 5 anomalies
			healthScore: this.calculateHealthScore(stats, anomalies),
		};
	}

	/**
	 * Calculate health score based on performance and anomalies
	 */
	private calculateHealthScore(
		stats: TimingStatistics,
		anomalies: AnomalyRecord[],
	): number {
		let score = 100;

		// Penalize for high standard deviation (inconsistent performance)
		const cv = stats.stdDev / stats.mean; // Coefficient of variation
		score -= cv * 20; // Up to 20 points for high variability

		// Penalize for anomalies
		const anomalyRate = anomalies.length / Math.max(stats.sampleSize, 1);
		score -= anomalyRate * 50; // Up to 50 points for high anomaly rate

		// Penalize for high P99 latency
		if (stats.p99 > 1000) {
			// Over 1 second
			score -= 10;
		}

		return Math.max(0, Math.min(100, score));
	}

	/**
	 * Get all pending alerts
	 */
	getAlerts(): PerformanceAlert[] {
		return [...this.alerts];
	}

	/**
	 * Clear alerts (typically called after processing)
	 */
	clearAlerts(): void {
		this.alerts = [];
	}

	/**
	 * Get system-wide performance summary
	 */
	getSystemSummary(): SystemPerformanceSummary {
		const operations = Array.from(this.timings.keys());
		const operationStats: OperationStats[] = [];

		for (const op of operations) {
			const stats = this.getOperationStats(op);
			if (stats) {
				operationStats.push(stats);
			}
		}

		const avgHealthScore =
			operationStats.reduce((sum, op) => sum + op.healthScore, 0) /
			operationStats.length;
		const totalOperations = operationStats.reduce(
			(sum, op) => sum + op.totalOperations,
			0,
		);
		const totalAnomalies = operationStats.reduce(
			(sum, op) => sum + op.anomalyCount,
			0,
		);

		return {
			totalOperations,
			totalAnomalies,
			averageHealthScore: avgHealthScore || 100,
			operationCount: operations.length,
			operations: operationStats,
			timestamp: Date.now(),
		};
	}

	/**
	 * Export performance data for external analysis
	 */
	exportData(): PerformanceExport {
		const operations: Record<string, OperationExport> = {};

		for (const [operationName, timings] of this.timings) {
			const anomalies = this.anomalies.get(operationName) || [];
			const operationCount = this.operationCounts.get(operationName) || 0;

			operations[operationName] = {
				timings: [...timings],
				anomalies: [...anomalies],
				totalCount: operationCount,
			};
		}

		return {
			operations,
			alerts: [...this.alerts],
			exportedAt: Date.now(),
			version: "1.0",
		};
	}
}

// Custom error class for market operations
export class MarketOperationError extends Error {
	constructor(
		public operationName: string,
		public originalError: any,
	) {
		super(
			`Market operation '${operationName}' failed: ${originalError?.message || "Unknown error"}`,
		);
		this.name = "MarketOperationError";
	}
}

// Type definitions
export interface TimingStatistics {
	mean: number;
	median: number;
	stdDev: number;
	min: number;
	max: number;
	p95: number;
	p99: number;
	sampleSize: number;
}

export interface AnomalyRecord {
	operationName: string;
	timestamp: number;
	duration: number;
	zScore: number;
	expectedDuration: number;
	severity: "warning" | "critical";
}

export interface PerformanceAlert {
	type: "performance_anomaly" | "system_degradation";
	operationName: string;
	message: string;
	timestamp: number;
	severity: "warning" | "critical";
	data?: any;
}

export interface OperationStats {
	operationName: string;
	statistics: TimingStatistics;
	totalOperations: number;
	anomalyCount: number;
	recentAnomalies: AnomalyRecord[];
	healthScore: number;
}

export interface SystemPerformanceSummary {
	totalOperations: number;
	totalAnomalies: number;
	averageHealthScore: number;
	operationCount: number;
	operations: OperationStats[];
	timestamp: number;
}

export interface OperationExport {
	timings: number[];
	anomalies: AnomalyRecord[];
	totalCount: number;
}

export interface PerformanceExport {
	operations: Record<string, OperationExport>;
	alerts: PerformanceAlert[];
	exportedAt: number;
	version: string;
}
