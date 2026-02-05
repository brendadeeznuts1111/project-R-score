#!/usr/bin/env bun
/**
 * @fileoverview Performance Monitor for Multi-Layer Graph System
 * @description CPU profiling and performance tracking for multi-layer correlation analysis
 * @module arbitrage/shadow-graph/profiling/performance-monitor
 *
 * @see {@link ../../../../docs/ANTI-PATTERNS.md|Anti-Patterns Guide} for coding best practices
 * @see {@link ../../../../docs/NAMING-CONVENTIONS.md|Naming Conventions} for code style guidelines
 */

/**
 * Performance monitoring session result
 */
export interface ProfileResult {
	sessionName: string;
	duration: number;
	timestamp: number;
	memoryUsage: number;
	metadata?: Record<string, unknown>;
}

/**
 * Performance metric record
 */
export interface PerformanceMetric {
	name: string;
	value: number;
	timestamp: number;
	metadata?: Record<string, unknown>;
}

/**
 * Performance Monitor for CPU profiling integration
 * Tracks performance metrics and integrates with Bun's CPU profiling
 */
export class PerformanceMonitor {
	private sessions: Map<string, { startTime: number; startMemory: number }> = new Map();
	private metrics: PerformanceMetric[] = [];
	private readonly maxMetrics = 10000;

	/**
	 * Mark the start of a profiling session
	 */
	markStart(sessionName: string): void {
		const startTime = performance.now();
		const startMemory = process.memoryUsage().heapUsed;

		this.sessions.set(sessionName, {
			startTime,
			startMemory,
		});

		if (process.env.BUN_CPU_PROF === "true") {
			console.log(`📊 Starting CPU profile: ${sessionName}`);
		}
	}

	/**
	 * Mark the end of a profiling session
	 */
	markEnd(sessionName: string): ProfileResult {
		const session = this.sessions.get(sessionName);

		if (!session) {
			throw new Error(`No active session found: ${sessionName}`);
		}

		const endTime = performance.now();
		const endMemory = process.memoryUsage().heapUsed;
		const duration = endTime - session.startTime;
		const memoryUsage = endMemory - session.startMemory;

		this.sessions.delete(sessionName);

		const result: ProfileResult = {
			sessionName,
			duration,
			timestamp: Date.now(),
			memoryUsage,
		};

		// Store metric
		this.recordMetric({
			name: sessionName,
			value: duration,
			timestamp: Date.now(),
			metadata: {
				memoryUsage,
				startMemory: session.startMemory,
				endMemory,
			},
		});

		return result;
	}

	/**
	 * Record a performance metric
	 */
	recordMetric(metric: PerformanceMetric): void {
		this.metrics.push(metric);

		// Prevent unbounded growth
		if (this.metrics.length > this.maxMetrics) {
			this.metrics.shift();
		}
	}

	/**
	 * Record a profile-specific metric
	 */
	recordProfileMetric(name: string, value: number, metadata?: Record<string, unknown>): void {
		this.recordMetric({
			name,
			value,
			timestamp: Date.now(),
			metadata,
		});
	}

	/**
	 * Get all metrics for a session
	 */
	getSessionMetrics(sessionName: string): PerformanceMetric[] {
		return this.metrics.filter((m) => m.name === sessionName);
	}

	/**
	 * Get summary statistics
	 */
	getSummary(): {
		totalSessions: number;
		activeSessions: number;
		totalMetrics: number;
		averageDuration: number;
	} {
		const durations = this.metrics
			.filter((m) => m.metadata?.duration !== undefined)
			.map((m) => (m.metadata?.duration as number) || 0);

		const averageDuration =
			durations.length > 0
				? durations.reduce((a, b) => a + b, 0) / durations.length
				: 0;

		return {
			totalSessions: this.metrics.length,
			activeSessions: this.sessions.size,
			totalMetrics: this.metrics.length,
			averageDuration,
		};
	}

	/**
	 * Clear all metrics (use with caution)
	 */
	clear(): void {
		this.metrics = [];
		this.sessions.clear();
	}

	/**
	 * Export metrics as JSON
	 */
	exportMetrics(): string {
		return JSON.stringify(
			{
				metrics: this.metrics,
				summary: this.getSummary(),
				exportedAt: new Date().toISOString(),
			},
			null,
			2,
		);
	}
}
