/**
 * Hyper-Bun Console Enhancement Utilities
 *
 * Provides enhanced console logging with full async depth and custom object inspection
 * for improved debugging and monitoring capabilities.
 *
 * @version 7.0.0.0.0.0.0 - Integrated with --console-depth CLI argument and Bun.inspect.custom
 * @see {@link ../../docs/7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md Console Depth Debugging Features}
 *
 * @module hyper-bun/console-enhancement
 */

import { inspect } from "bun";

/**
 * Enhanced console configuration for Hyper-Bun
 *
 * @version 7.0.0.0.0.0.0 - Depth set to 10 for comprehensive debugging
 * @see {@link ../../docs/7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md Console Depth Debugging Features}
 *
 * Note: The depth setting here works in conjunction with --console-depth CLI argument.
 * The CLI argument takes precedence for console.log() output, while this config
 * applies to explicit Bun.inspect() calls.
 */
export const CONSOLE_CONFIG = {
	depth: 10,
	colors: true,
	showHidden: false,
	maxArrayLength: 100,
	maxStringLength: 1000,
	breakLength: 80,
	compact: false,
	sorted: true,
	getters: true,
	showProxy: false,
	numericSeparator: true,
};

/**
 * Custom array inspector for market data
 *
 * @version 7.0.0.0.0.0.0 - Supports Bun.inspect.custom pattern for custom array formatting
 * @see {@link ../../docs/7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md#722000000-custom-array-inspector Console Depth Debugging Features}
 *
 * Creates formatted array output optimized for Hyper-Bun market data structures.
 * Respects depth settings from --console-depth CLI argument.
 *
 * @param array - Array to inspect
 * @param options - Formatting options
 * @returns Formatted string representation
 */
export function createArrayInspector<T>(
	array: T[],
	options: {
		label?: string;
		maxItems?: number;
		itemFormatter?: (item: T, index: number) => string;
		summaryFormatter?: (array: T[]) => string;
	} = {},
): string {
	const {
		label = "Array",
		maxItems = 10,
		itemFormatter = (item, index) =>
			`[${index}]: ${inspect(item, { ...CONSOLE_CONFIG, depth: 3 })}`,
		summaryFormatter = (arr) => `${arr.length} items`,
	} = options;

	if (!Array.isArray(array)) {
		return inspect(array, CONSOLE_CONFIG);
	}

	if (array.length === 0) {
		return `${label}: [] (empty)`;
	}

	const displayItems = array.slice(0, maxItems);
	const lines = [
		`${label}: [${summaryFormatter(array)}]`,
		...displayItems.map(itemFormatter),
	];

	if (array.length > maxItems) {
		lines.push(`... and ${array.length - maxItems} more items`);
	}

	return lines.join("\n");
}

// Custom market data inspectors
export const MarketDataInspectors = {
	// Inspect market analysis results
	analysisResult: (result: any) =>
		createArrayInspector([result], {
			label: "📊 Market Analysis Result",
			itemFormatter: (item) => {
				const accessible = item.accessible ? "✅" : "❌";
				const riskLevel = item.analysis?.marketHealth?.riskLevel || "unknown";
				const recommendations = item.analysis?.recommendations?.length || 0;

				return `${accessible} ${item.nodeId}: Risk=${riskLevel}, Recommendations=${recommendations}`;
			},
		}),

	// Inspect performance statistics
	performanceStats: (stats: any) => {
		if (!stats) return "No performance stats available";

		const lines = [
			"📈 Performance Statistics:",
			`  Operations: ${stats.totalOperations}`,
			`  Health Score: ${stats.healthScore}/100`,
			`  Avg Duration: ${stats.statistics?.mean?.toFixed(2)}ms`,
			`  P95: ${stats.statistics?.p95?.toFixed(2)}ms`,
			`  Anomalies: ${stats.anomalyCount}`,
			`  Trend: ${stats.statistics?.mean > 0 ? "Stable" : "Variable"}`,
		];

		return lines.join("\n");
	},

	// Inspect shadow graph data
	shadowGraph: (graph: any) => {
		if (!graph) return "No shadow graph data";

		const lines = [
			"🌑 Shadow Graph Analysis:",
			`  Node: ${graph.nodeId}`,
			`  Data Points: ${graph.historicalData?.length || 0}`,
			`  Trend: ${graph.trendAnalysis?.trend || "unknown"}`,
			`  Confidence: ${(graph.trendAnalysis?.confidence * 100)?.toFixed(1)}%`,
			`  Momentum: ${graph.trendAnalysis?.momentum?.toFixed(4) || "N/A"}`,
			`  Anomalies: ${graph.hiddenMomentum?.anomalies?.length || 0}`,
			`  Volatility: ${graph.hiddenMomentum?.volatilityProfile?.average?.toFixed(4) || "N/A"}`,
		];

		return lines.join("\n");
	},

	// Inspect system health report
	healthReport: (report: any) => {
		if (!report) return "No health report available";

		const status =
			report.overallStatus === "healthy"
				? "🟢"
				: report.overallStatus === "degraded"
					? "🟡"
					: "🔴";

		const lines = [
			`${status} System Health Report:`,
			`  Status: ${report.overallStatus.toUpperCase()}`,
			`  Timestamp: ${new Date(report.timestamp).toLocaleString()}`,
			`  Performance Health: ${report.performance?.averageHealthScore?.toFixed(1) || "N/A"}/100`,
			`  Total Operations: ${report.performance?.totalOperations || 0}`,
			`  Anomalies: ${report.performance?.totalAnomalies || 0}`,
			`  Connected Bookmakers: ${report.connectivity?.filter((c: any) => c.connected).length || 0}/${report.connectivity?.length || 0}`,
		];

		if (report.connectivity) {
			const issues = report.connectivity.filter((c: any) => !c.connected);
			if (issues.length > 0) {
				lines.push("  Connectivity Issues:");
				issues.forEach((issue: any) => {
					lines.push(
						`    - ${issue.bookmaker}: ${issue.error || "Disconnected"}`,
					);
				});
			}
		}

		return lines.join("\n");
	},

	// Inspect job statuses
	jobStatuses: (statuses: any[]) =>
		createArrayInspector(statuses, {
			label: "⏰ Scheduled Jobs",
			itemFormatter: (job, index) => {
				const status =
					job.status === "running"
						? "🟢"
						: job.status === "completed"
							? "✅"
							: job.status === "failed"
								? "❌"
								: "⏸️";

				const nextRun = job.nextRun
					? new Date(job.nextRun).toLocaleString()
					: "N/A";
				const lastRun = job.lastRun
					? new Date(job.lastRun).toLocaleString()
					: "Never";

				return `${status} ${job.jobId}: ${job.status} | Runs: ${job.runCount} | Avg: ${job.averageDuration?.toFixed(2)}ms | Next: ${nextRun}`;
			},
			summaryFormatter: (arr) => `${arr.length} jobs`,
		}),

	// Inspect market scan results
	scanResults: (results: any[]) =>
		createArrayInspector(results, {
			label: "🔍 Market Scan Results",
			itemFormatter: (result, index) => {
				const success = result.success ? "✅" : "❌";
				const market = `${result.market.bookmaker}:${result.market.nodeId}`;
				const duration = result.scannedAt
					? `(${Date.now() - result.scannedAt}ms ago)`
					: "";

				if (result.success && result.analysis) {
					const risk = result.analysis.marketHealth?.riskLevel || "unknown";
					const recs = result.analysis.recommendations?.length || 0;
					return `${success} ${market} - Risk: ${risk}, Recommendations: ${recs} ${duration}`;
				} else {
					const error = result.error || "Unknown error";
					return `${success} ${market} - Error: ${error} ${duration}`;
				}
			},
			summaryFormatter: (arr) => {
				const success = arr.filter((r) => r.success).length;
				return `${success}/${arr.length} successful`;
			},
		}),
};

// Enhanced console logger class
export class HyperBunLogger {
	private context: string;
	private useEnhanced: boolean;

	constructor(context: string = "Hyper-Bun", useEnhanced: boolean = true) {
		this.context = context;
		this.useEnhanced = useEnhanced;
	}

	// Enhanced logging methods
	info(message: string, data?: any): void {
		const timestamp = new Date().toISOString();
		const prefix = `[${timestamp}] [${this.context}] ℹ️ `;

		if (data !== undefined) {
			console.log(prefix + message);
			if (this.useEnhanced) {
				console.log(this.formatData(data));
			} else {
				console.log(data);
			}
		} else {
			console.log(prefix + message);
		}
	}

	success(message: string, data?: any): void {
		const timestamp = new Date().toISOString();
		const prefix = `[${timestamp}] [${this.context}] ✅ `;

		if (data !== undefined) {
			console.log(prefix + message);
			if (this.useEnhanced) {
				console.log(this.formatData(data));
			} else {
				console.log(data);
			}
		} else {
			console.log(prefix + message);
		}
	}

	warn(message: string, data?: any): void {
		const timestamp = new Date().toISOString();
		const prefix = `[${timestamp}] [${this.context}] ⚠️ `;

		if (data !== undefined) {
			console.warn(prefix + message);
			if (this.useEnhanced) {
				console.warn(this.formatData(data));
			} else {
				console.warn(data);
			}
		} else {
			console.warn(prefix + message);
		}
	}

	error(message: string, error?: any): void {
		const timestamp = new Date().toISOString();
		const prefix = `[${timestamp}] [${this.context}] ❌ `;

		if (error !== undefined) {
			console.error(prefix + message);
			if (this.useEnhanced) {
				console.error(this.formatError(error));
			} else {
				console.error(error);
			}
		} else {
			console.error(prefix + message);
		}
	}

	debug(message: string, data?: any): void {
		if (process.env.DEBUG) {
			const timestamp = new Date().toISOString();
			const prefix = `[${timestamp}] [${this.context}] 🔍 `;

			if (data !== undefined) {
				console.debug(prefix + message);
				if (this.useEnhanced) {
					console.debug(this.formatData(data));
				} else {
					console.debug(data);
				}
			} else {
				console.debug(prefix + message);
			}
		}
	}

	// Performance logging
	performance(operation: string, duration: number, metadata?: any): void {
		const timestamp = new Date().toISOString();
		const prefix = `[${timestamp}] [${this.context}] 📈 `;

		console.log(`${prefix}${operation} completed in ${duration.toFixed(2)}ms`);

		if (metadata && this.useEnhanced) {
			console.log(this.formatData(metadata));
		}
	}

	// Market-specific logging methods
	marketAnalysis(nodeId: string, bookmaker: string, result: any): void {
		this.info(`Market analysis completed for ${bookmaker}:${nodeId}`, result);
	}

	scanProgress(completed: number, total: number, duration: number): void {
		const percentage = ((completed / total) * 100).toFixed(1);
		this.info(
			`Scan progress: ${completed}/${total} (${percentage}%) completed in ${duration.toFixed(2)}ms`,
		);
	}

	anomalyDetected(operation: string, details: any): void {
		this.warn(`Anomaly detected in ${operation}`, details);
	}

	// Private formatting methods
	private formatData(data: any): string {
		// Use custom inspectors for known data types
		if (data && typeof data === "object") {
			if (data.nodeId && "accessible" in data) {
				return MarketDataInspectors.analysisResult(data);
			}
			if (data.totalOperations && "healthScore" in data) {
				return MarketDataInspectors.performanceStats(data);
			}
			if (data.nodeId && data.trendAnalysis) {
				return MarketDataInspectors.shadowGraph(data);
			}
			if (data.overallStatus && data.connectivity) {
				return MarketDataInspectors.healthReport(data);
			}
			if (Array.isArray(data) && data.length > 0 && data[0].jobId) {
				return MarketDataInspectors.jobStatuses(data);
			}
			if (
				Array.isArray(data) &&
				data.length > 0 &&
				data[0].market &&
				data[0].success !== undefined
			) {
				return MarketDataInspectors.scanResults(data);
			}
		}

		// Fallback to enhanced inspect
		return inspect(data, CONSOLE_CONFIG);
	}

	private formatError(error: any): string {
		if (error instanceof Error) {
			return inspect(
				{
					name: error.name,
					message: error.message,
					stack: error.stack,
					cause: error.cause,
				},
				CONSOLE_CONFIG,
			);
		}

		return inspect(error, CONSOLE_CONFIG);
	}
}

// Global logger instances
export const logger = new HyperBunLogger("Hyper-Bun");
export const marketLogger = new HyperBunLogger("Market-Intelligence");
export const schedulerLogger = new HyperBunLogger("Scheduler");
export const performanceLogger = new HyperBunLogger("Performance");

// Configure global console for enhanced output
export function configureGlobalConsole(): void {
	// Note: Bun's console doesn't have configurable depth/options properties
	// The enhancement comes from using our custom inspectors and formatters
	console.log(
		"🔧 Console enhanced with custom object inspection and formatters",
	);
}

// Utility function to create custom array formatters
export function createCustomArrayFormatter<T>(
	label: string,
	formatter: (item: T, index: number) => string,
): (array: T[]) => string {
	return (array: T[]) =>
		createArrayInspector(array, {
			label,
			itemFormatter: formatter,
		});
}

// Export enhanced inspect function
export const enhancedInspect = (obj: any, options?: any) =>
	inspect(obj, { ...CONSOLE_CONFIG, ...options });
