/**
 * Performance Analytics Engine - Advanced Metrics and Benchmarking
 * Tier-1380 Enterprise Archive Management System
 *
 * @version 2.0.0
 * @author Tier-1380 Analytics Team
 */

import { Database } from "bun:sqlite";

export interface PerformanceMetric {
	timestamp: Date;
	operation: string;
	duration: number;
	dataSize: number;
	throughput: number;
	memoryUsage: number;
	cpuUsage: number;
	tenantId: string;
	metadata: Record<string, any>;
}

export interface BenchmarkResult {
	operation: string;
	iterations: number;
	averageTime: number;
	minTime: number;
	maxTime: number;
	standardDeviation: number;
	throughput: number;
	memoryPeak: number;
	efficiency: number;
}

export interface PerformanceReport {
	tenantId: string;
	dateRange: { start: Date; end: Date };
	summary: {
		totalOperations: number;
		averageThroughput: number;
		peakMemoryUsage: number;
		operationBreakdown: Record<string, number>;
	};
	benchmarks: BenchmarkResult[];
	trends: {
		throughput: Array<{ timestamp: Date; value: number }>;
		latency: Array<{ timestamp: Date; value: number }>;
		memory: Array<{ timestamp: Date; value: number }>;
	};
	recommendations: string[];
}

export interface PerformanceThreshold {
	metric: string;
	warning: number;
	critical: number;
	unit: string;
}

export class PerformanceAnalyzer {
	private readonly db: Database;
	private readonly metrics: PerformanceMetric[] = [];
	private readonly thresholds: Map<string, PerformanceThreshold> = new Map();
	private readonly maxMemoryMetrics: number = 10000;

	constructor(dbPath: string = "./data/performance-analytics.db") {
		this.db = new Database(dbPath, { create: true });
		this.initializeDatabase();
		this.initializeThresholds();
	}

	private initializeDatabase(): void {
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        operation TEXT NOT NULL,
        duration REAL NOT NULL,
        data_size INTEGER NOT NULL,
        throughput REAL NOT NULL,
        memory_usage INTEGER,
        cpu_usage REAL,
        tenant_id TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS benchmark_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation TEXT NOT NULL,
        iterations INTEGER NOT NULL,
        average_time REAL NOT NULL,
        min_time REAL NOT NULL,
        max_time REAL NOT NULL,
        standard_deviation REAL NOT NULL,
        throughput REAL NOT NULL,
        memory_peak INTEGER NOT NULL,
        efficiency REAL NOT NULL,
        tenant_id TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS performance_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_name TEXT NOT NULL,
        current_value REAL NOT NULL,
        threshold_level TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        message TEXT NOT NULL,
        resolved BOOLEAN DEFAULT FALSE,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON performance_metrics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_metrics_operation ON performance_metrics(operation);
      CREATE INDEX IF NOT EXISTS idx_metrics_tenant ON performance_metrics(tenant_id);
    `);
	}

	private initializeThresholds(): void {
		this.thresholds.set("throughput", {
			metric: "throughput",
			warning: 10, // MB/s
			critical: 5, // MB/s
			unit: "MB/s",
		});

		this.thresholds.set("latency", {
			metric: "latency",
			warning: 1000, // ms
			critical: 5000, // ms
			unit: "ms",
		});

		this.thresholds.set("memoryUsage", {
			metric: "memoryUsage",
			warning: 512 * 1024 * 1024, // 512MB
			critical: 1024 * 1024 * 1024, // 1GB
			unit: "bytes",
		});

		this.thresholds.set("cpuUsage", {
			metric: "cpuUsage",
			warning: 80, // %
			critical: 95, // %
			unit: "%",
		});
	}

	/**
	 * Record a performance metric
	 */
	recordMetric(metric: PerformanceMetric): void {
		// Add to in-memory cache
		this.metrics.push(metric);

		// Maintain cache size
		if (this.metrics.length > this.maxMemoryMetrics) {
			this.metrics.splice(0, this.metrics.length - this.maxMemoryMetrics);
		}

		// Store in database
		const stmt = this.db.prepare(`
      INSERT INTO performance_metrics 
      (timestamp, operation, duration, data_size, throughput, memory_usage, cpu_usage, tenant_id, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

		stmt.run(
			metric.timestamp.toISOString(),
			metric.operation,
			metric.duration,
			metric.dataSize,
			metric.throughput,
			metric.memoryUsage,
			metric.cpuUsage,
			metric.tenantId,
			JSON.stringify(metric.metadata),
		);

		// Check thresholds
		this.checkThresholds(metric);
	}

	/**
	 * Run comprehensive benchmark for an operation
	 */
	async runBenchmark(
		operation: () => Promise<any>,
		operationName: string,
		iterations: number = 10,
		tenantId: string = "default",
	): Promise<BenchmarkResult> {
		console.log(`🏁 Running benchmark: ${operationName} (${iterations} iterations)`);

		const times: number[] = [];
		let memoryPeak = 0;
		const startTime = performance.now();

		for (let i = 0; i < iterations; i++) {
			// Measure memory before
			const memBefore = process.memoryUsage().heapUsed;

			// Run operation and measure time
			const opStart = performance.now();
			await operation();
			const opDuration = performance.now() - opStart;

			// Measure memory after
			const memAfter = process.memoryUsage().heapUsed;
			const memUsed = memAfter - memBefore;

			times.push(opDuration);
			memoryPeak = Math.max(memoryPeak, memAfter);

			if (i % Math.max(1, Math.floor(iterations / 10)) === 0) {
				console.log(`  Iteration ${i + 1}/${iterations}: ${opDuration.toFixed(2)}ms`);
			}
		}

		const totalTime = performance.now() - startTime;

		// Calculate statistics
		const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
		const minTime = Math.min(...times);
		const maxTime = Math.max(...times);
		const variance =
			times.reduce((sum, time) => sum + (time - averageTime) ** 2, 0) / times.length;
		const standardDeviation = Math.sqrt(variance);
		const throughput = 1000 / averageTime; // Operations per second
		const efficiency = (minTime / averageTime) * 100; // Efficiency percentage

		const result: BenchmarkResult = {
			operation: operationName,
			iterations,
			averageTime,
			minTime,
			maxTime,
			standardDeviation,
			throughput,
			memoryPeak,
			efficiency,
		};

		// Store benchmark result
		const stmt = this.db.prepare(`
      INSERT INTO benchmark_results 
      (operation, iterations, average_time, min_time, max_time, standard_deviation, throughput, memory_peak, efficiency, tenant_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

		stmt.run(
			operationName,
			iterations,
			averageTime,
			minTime,
			maxTime,
			standardDeviation,
			throughput,
			memoryPeak,
			efficiency,
			tenantId,
		);

		console.log(`✅ Benchmark complete:`);
		console.log(`  Average: ${averageTime.toFixed(2)}ms`);
		console.log(`  Throughput: ${throughput.toFixed(2)} ops/sec`);
		console.log(`  Memory peak: ${(memoryPeak / 1024 / 1024).toFixed(1)}MB`);
		console.log(`  Efficiency: ${efficiency.toFixed(1)}%`);

		return result;
	}

	/**
	 * Generate comprehensive performance report
	 */
	async generateReport(
		tenantId: string = "default",
		dateRange?: { start: Date; end: Date },
	): Promise<PerformanceReport> {
		const start = dateRange?.start || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
		const end = dateRange?.end || new Date();

		console.log(`📊 Generating performance report for tenant: ${tenantId}`);
		console.log(`📅 Date range: ${start.toISOString()} to ${end.toISOString()}`);

		// Get metrics from database
		const metrics = this.db
			.query(`
      SELECT * FROM performance_metrics 
      WHERE tenant_id = ? AND timestamp BETWEEN ? AND ?
      ORDER BY timestamp ASC
    `)
			.all(tenantId, start.toISOString(), end.toISOString()) as any[];

		// Get benchmarks
		const benchmarks = this.db
			.query(`
      SELECT * FROM benchmark_results 
      WHERE tenant_id = ? AND created_at BETWEEN ? AND ?
      ORDER BY created_at DESC
      LIMIT 50
    `)
			.all(tenantId, start.toISOString(), end.toISOString()) as any[];

		// Calculate summary
		const totalOperations = metrics.length;
		const averageThroughput =
			metrics.length > 0
				? metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length
				: 0;
		const peakMemoryUsage =
			metrics.length > 0 ? Math.max(...metrics.map((m) => m.memory_usage || 0)) : 0;

		const operationBreakdown: Record<string, number> = {};
		metrics.forEach((metric) => {
			operationBreakdown[metric.operation] =
				(operationBreakdown[metric.operation] || 0) + 1;
		});

		// Calculate trends
		const trends = {
			throughput: metrics.map((m) => ({
				timestamp: new Date(m.timestamp),
				value: m.throughput,
			})),
			latency: metrics.map((m) => ({
				timestamp: new Date(m.timestamp),
				value: m.duration,
			})),
			memory: metrics.map((m) => ({
				timestamp: new Date(m.timestamp),
				value: m.memory_usage || 0,
			})),
		};

		// Generate recommendations
		const recommendations = this.generateRecommendations(metrics, benchmarks);

		const report: PerformanceReport = {
			tenantId,
			dateRange: { start, end },
			summary: {
				totalOperations,
				averageThroughput,
				peakMemoryUsage,
				operationBreakdown,
			},
			benchmarks: benchmarks.map((b) => ({
				operation: b.operation,
				iterations: b.iterations,
				averageTime: b.average_time,
				minTime: b.min_time,
				maxTime: b.max_time,
				standardDeviation: b.standard_deviation,
				throughput: b.throughput,
				memoryPeak: b.memory_peak,
				efficiency: b.efficiency,
			})),
			trends,
			recommendations,
		};

		console.log(`📈 Report generated:`);
		console.log(`  Total operations: ${totalOperations}`);
		console.log(`  Average throughput: ${averageThroughput.toFixed(2)} MB/s`);
		console.log(`  Peak memory: ${(peakMemoryUsage / 1024 / 1024).toFixed(1)}MB`);

		return report;
	}

	/**
	 * Get real-time performance metrics
	 */
	getRealTimeMetrics(
		tenantId: string = "default",
		limit: number = 100,
	): PerformanceMetric[] {
		return this.metrics.filter((metric) => metric.tenantId === tenantId).slice(-limit);
	}

	/**
	 * Analyze performance trends
	 */
	analyzeTrends(
		tenantId: string = "default",
		hours: number = 24,
	): {
		throughputTrend: "increasing" | "decreasing" | "stable";
		latencyTrend: "increasing" | "decreasing" | "stable";
		memoryTrend: "increasing" | "decreasing" | "stable";
		recommendations: string[];
	} {
		const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
		const recentMetrics = this.metrics
			.filter((metric) => metric.tenantId === tenantId && metric.timestamp >= cutoff)
			.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

		if (recentMetrics.length < 2) {
			return {
				throughputTrend: "stable",
				latencyTrend: "stable",
				memoryTrend: "stable",
				recommendations: ["Insufficient data for trend analysis"],
			};
		}

		const calculateTrend = (
			values: number[],
		): "increasing" | "decreasing" | "stable" => {
			const firstHalf = values.slice(0, Math.floor(values.length / 2));
			const secondHalf = values.slice(Math.floor(values.length / 2));

			const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
			const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

			const change = (secondAvg - firstAvg) / firstAvg;

			if (change > 0.1) return "increasing";
			if (change < -0.1) return "decreasing";
			return "stable";
		};

		const throughputTrend = calculateTrend(recentMetrics.map((m) => m.throughput));
		const latencyTrend = calculateTrend(recentMetrics.map((m) => m.duration));
		const memoryTrend = calculateTrend(recentMetrics.map((m) => m.memoryUsage || 0));

		const recommendations: string[] = [];

		if (throughputTrend === "decreasing") {
			recommendations.push(
				"⚠️ Throughput is decreasing - investigate performance bottlenecks",
			);
		}
		if (latencyTrend === "increasing") {
			recommendations.push("⚠️ Latency is increasing - optimize operation performance");
		}
		if (memoryTrend === "increasing") {
			recommendations.push("⚠️ Memory usage is increasing - check for memory leaks");
		}

		return {
			throughputTrend,
			latencyTrend,
			memoryTrend,
			recommendations,
		};
	}

	/**
	 * Set custom performance threshold
	 */
	setThreshold(metric: string, warning: number, critical: number, unit: string): void {
		this.thresholds.set(metric, { metric, warning, critical, unit });
	}

	/**
	 * Get performance alerts
	 */
	getAlerts(tenantId: string = "default", resolved: boolean = false): any[] {
		return this.db
			.query(`
      SELECT * FROM performance_alerts 
      WHERE tenant_id = ? AND resolved = ?
      ORDER BY created_at DESC
    `)
			.all(tenantId, resolved);
	}

	/**
	 * Clear performance metrics
	 */
	clearMetrics(olderThanHours: number = 24): void {
		const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

		this.db
			.prepare(`
      DELETE FROM performance_metrics 
      WHERE timestamp < ?
    `)
			.run(cutoff.toISOString());

		// Clear in-memory cache
		this.metrics.splice(0, this.metrics.length);
	}

	/**
	 * Export performance data
	 */
	exportData(tenantId?: string, format: "json" | "csv" = "json"): string {
		const query = tenantId
			? "SELECT * FROM performance_metrics WHERE tenant_id = ? ORDER BY timestamp"
			: "SELECT * FROM performance_metrics ORDER BY timestamp";

		const data = tenantId
			? (this.db.query(query).all(tenantId) as any[])
			: (this.db.query(query).all() as any[]);

		if (format === "csv") {
			const headers = Object.keys(data[0] || {}).join(",");
			const rows = data.map((row) => Object.values(row).join(","));
			return [headers, ...rows].join("\n");
		}

		return JSON.stringify(data, null, 2);
	}

	// ─── Private Helper Methods ────────────────────────────────────────────────────
	private checkThresholds(metric: PerformanceMetric): void {
		const checks = [
			{ name: "throughput", value: metric.throughput },
			{ name: "latency", value: metric.duration },
			{ name: "memoryUsage", value: metric.memoryUsage || 0 },
			{ name: "cpuUsage", value: metric.cpuUsage || 0 },
		];

		for (const check of checks) {
			const threshold = this.thresholds.get(check.name);
			if (!threshold) continue;

			let level: "warning" | "critical" | null = null;
			let message = "";

			if (check.value >= threshold.critical) {
				level = "critical";
				message = `Critical: ${check.name} is ${check.value}${threshold.unit} (threshold: ${threshold.critical}${threshold.unit})`;
			} else if (check.value >= threshold.warning) {
				level = "warning";
				message = `Warning: ${check.name} is ${check.value}${threshold.unit} (threshold: ${threshold.warning}${threshold.unit})`;
			}

			if (level) {
				this.db
					.prepare(`
          INSERT INTO performance_alerts 
          (metric_name, current_value, threshold_level, tenant_id, message)
          VALUES (?, ?, ?, ?, ?)
        `)
					.run(check.name, check.value, level, metric.tenantId, message);
			}
		}
	}

	private generateRecommendations(metrics: any[], benchmarks: any[]): string[] {
		const recommendations: string[] = [];

		if (metrics.length === 0) {
			recommendations.push(
				"📊 No performance data available - start monitoring operations",
			);
			return recommendations;
		}

		const avgThroughput =
			metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length;
		const avgLatency = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
		const maxMemory = Math.max(...metrics.map((m) => m.memory_usage || 0));

		if (avgThroughput < 10) {
			recommendations.push(
				"🚀 Low throughput detected - consider optimizing compression settings or increasing resources",
			);
		}

		if (avgLatency > 1000) {
			recommendations.push(
				"⚡ High latency detected - investigate operation bottlenecks and optimization opportunities",
			);
		}

		if (maxMemory > 512 * 1024 * 1024) {
			recommendations.push(
				"💾 High memory usage detected - monitor for memory leaks and optimize data structures",
			);
		}

		if (benchmarks.length > 0) {
			const worstBenchmark = benchmarks.reduce((worst, current) =>
				current.efficiency < worst.efficiency ? current : worst,
			);

			if (worstBenchmark.efficiency < 70) {
				recommendations.push(
					`📈 Low efficiency in ${worstBenchmark.operation} - consider optimization or refactoring`,
				);
			}
		}

		// Operation-specific recommendations
		const operationCounts = metrics.reduce(
			(acc, m) => {
				acc[m.operation] = (acc[m.operation] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		const mostFrequentOp = Object.entries(operationCounts).sort(
			([, a], [, b]) => b - a,
		)[0];

		if (mostFrequentOp) {
			recommendations.push(
				`🎯 Most frequent operation: ${mostFrequentOp[0]} (${mostFrequentOp[1]} times) - consider optimization priority`,
			);
		}

		if (recommendations.length === 0) {
			recommendations.push(
				"✅ Performance is within acceptable ranges - continue monitoring",
			);
		}

		return recommendations;
	}

	/**
	 * Close database connection
	 */
	close(): void {
		this.db.close();
	}
}

// ─── Export singleton instance ───────────────────────────────────────────────────
export const performanceAnalyzer = new PerformanceAnalyzer();
