#!/usr/bin/env bun

/**
 * v1.3.7 Native Integration for Profile-RSS System
 * Leverages Bun v1.3.7 features for enhanced table formatting and performance
 */

import type {
	PerformanceMetrics,
	ProfileRssState,
	RssFeedState,
} from "../../../core/types/integrated-profile";
import { IntegratedProfileLoader } from "../../../core/types/integrated-profile";
import { ProfileRssBridge } from "./profile-rss-bridge";

interface V137IntegrationOptions {
	enableTableFormatting?: boolean;
	enableJson5Support?: boolean;
	enablePerformanceOptimizations?: boolean;
	outputFormat?: "table" | "json" | "csv";
}

export class V137ProfileRssIntegration {
	private bridge: ProfileRssBridge;
	private options: V137IntegrationOptions;

	constructor(bridge?: ProfileRssBridge, options: V137IntegrationOptions = {}) {
		this.bridge = bridge || new ProfileRssBridge();
		this.options = {
			enableTableFormatting: true,
			enableJson5Support: true,
			enablePerformanceOptimizations: true,
			outputFormat: "table",
			...options,
		};
	}

	// =============================================================================
	// NATIVE TABLE FORMATTING (Bun v1.3.7)
	// =============================================================================

	generateProfileRssReport(): string {
		const state = this.bridge.getCurrentState();
		const config = this.bridge.getConfig();

		if (!this.options.enableTableFormatting || typeof Bun === "undefined") {
			return this.generateFallbackReport(state, config);
		}

		try {
			// Use Bun.inspect.table for native table formatting
			const tableData = this.prepareTableData(state, config);
			return (Bun as any).inspect.table(tableData);
		} catch (error) {
			// Fallback to manual formatting if native table fails
			return this.generateFallbackReport(state, config);
		}
	}

	private prepareTableData(state: ProfileRssState, config: any): any[] {
		const feeds = Array.from(state.active_feeds.values());

		return feeds.map((feed) => ({
			feed: feed.name,
			profile: state.current_profile,
			status: feed.status,
			latency: `${feed.latency_ms}ms`,
			memory: `${state.performance_metrics.memory_usage_mb.toFixed(1)}MB`,
			heap: `${state.performance_metrics.heap_usage_mb.toFixed(1)}MB`,
			errors: feed.error_count,
			auth: feed.auth_status === "authenticated" ? "✓" : "✗",
			last_fetch: feed.last_fetch.toLocaleTimeString(),
			next_fetch: feed.next_fetch.toLocaleTimeString(),
		}));
	}

	private generateFallbackReport(state: ProfileRssState, config: any): string {
		const feeds = Array.from(state.active_feeds.values());
		const lines = [];

		lines.push("🔗 Profile-RSS Integration Report");
		lines.push("=".repeat(50));
		lines.push(`Profile: ${state.current_profile}`);
		lines.push(`Active Feeds: ${feeds.length}`);
		lines.push(
			`Memory Usage: ${state.performance_metrics.memory_usage_mb.toFixed(1)}MB`,
		);
		lines.push(
			`Average Latency: ${state.performance_metrics.fetch_latency_avg_ms.toFixed(1)}ms`,
		);
		lines.push("");

		lines.push("Feed Status:");
		lines.push("-".repeat(30));

		for (const feed of feeds) {
			lines.push(
				`${feed.name.padEnd(20)} ${feed.status.padEnd(10)} ${feed.latency_ms}ms`,
			);
		}

		return lines.join("\n");
	}

	// =============================================================================
	// METRICS TABLE FORMATTING
	// =============================================================================

	formatMetricsTable(metrics: any[]): string {
		if (!this.options.enableTableFormatting || typeof Bun === "undefined") {
			return this.generateFallbackMetricsTable({ performance: metrics });
		}

		try {
			const tableData = metrics.map((metric, index) => ({
				name: metric.name,
				value: metric.value,
				status: metric.status || "ok",
			}));

			return (Bun as any).inspect.table(tableData);
		} catch (error) {
			return this.generateFallbackMetricsTable({ performance: metrics });
		}
	}

	// =============================================================================
	// PERFORMANCE METRICS TABLE
	// =============================================================================

	generatePerformanceMetricsTable(): string {
		const metrics = this.bridge.getMetrics();

		if (!this.options.enableTableFormatting || typeof Bun === "undefined") {
			return this.generateFallbackMetricsTable(metrics);
		}

		try {
			const tableData = metrics.performance.slice(-10).map((metric, index) => ({
				time: metric.timestamp.toLocaleTimeString(),
				memory: `${metric.memory_usage_mb.toFixed(1)}MB`,
				heap: `${metric.heap_usage_mb.toFixed(1)}MB`,
				latency: `${metric.fetch_latency_avg_ms.toFixed(1)}ms`,
				error_rate: `${metric.error_rate.toFixed(1)}%`,
			}));

			return (Bun as any).inspect.table(tableData);
		} catch (error) {
			return this.generateFallbackMetricsTable(metrics);
		}
	}

	private generateFallbackMetricsTable(metrics: any): string {
		const lines = [];
		const recent = metrics.performance.slice(-5);

		lines.push("📊 Performance Metrics (Last 5)");
		lines.push("=".repeat(50));

		for (const metric of recent) {
			lines.push(
				`${metric.timestamp.toLocaleTimeString()} | ` +
					`Memory: ${metric.memory_usage_mb.toFixed(1)}MB | ` +
					`Latency: ${metric.fetch_latency_avg_ms.toFixed(1)}ms`,
			);
		}

		return lines.join("\n");
	}

	// =============================================================================
	// SECURITY STATUS TABLE
	// =============================================================================

	generateSecurityStatusTable(): string {
		const state = this.bridge.getCurrentState();

		if (!this.options.enableTableFormatting || typeof Bun === "undefined") {
			return this.generateFallbackSecurityTable(state);
		}

		try {
			const tableData = [
				{
					metric: "URL Scan Passed",
					status: state.security_status.url_scan_passed ? "✓" : "✗",
					value: "-",
				},
				{
					metric: "Certificate Valid",
					status: state.security_status.certificate_valid ? "✓" : "✗",
					value: "-",
				},
				{
					metric: "Blocked Requests",
					status: "-",
					value: state.security_status.blocked_requests.toString(),
				},
				{
					metric: "Security Violations",
					status: state.security_status.violations.length > 0 ? "✗" : "✓",
					value: state.security_status.violations.length.toString(),
				},
			];

			return (Bun as any).inspect.table(tableData);
		} catch (error) {
			return this.generateFallbackSecurityTable(state);
		}
	}

	private generateFallbackSecurityTable(state: ProfileRssState): string {
		const lines = [];

		lines.push("🔒 Security Status");
		lines.push("=".repeat(30));
		lines.push(
			`URL Scan: ${state.security_status.url_scan_passed ? "✓" : "✗"}`,
		);
		lines.push(
			`Certificate: ${state.security_status.certificate_valid ? "✓" : "✗"}`,
		);
		lines.push(`Blocked Requests: ${state.security_status.blocked_requests}`);
		lines.push(`Violations: ${state.security_status.violations.length}`);

		return lines.join("\n");
	}

	// =============================================================================
	// JSON5 CONFIGURATION SUPPORT
	// =============================================================================

	async loadJson5ProfileConfig(configPath: string): Promise<any> {
		if (!this.options.enableJson5Support || typeof Bun === "undefined") {
			throw new Error("JSON5 support requires Bun runtime");
		}

		try {
			const content = await (Bun as any).file(configPath).text();

			// Use Bun's JSON5 support if available, otherwise fallback
			if ((Bun as any).JSON5) {
				return (Bun as any).JSON5.parse(content);
			} else {
				// Fallback: try JSON, then strip comments and try again
				try {
					return JSON.parse(content);
				} catch {
					// Simple comment stripping for JSON5 fallback
					const stripped = content
						.replace(/\/\/.*$/gm, "")
						.replace(/\/\*[\s\S]*?\*\//g, "");
					return JSON.parse(stripped);
				}
			}
		} catch (error) {
			throw new Error(
				`Failed to load JSON5 config: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	// =============================================================================
	// PERFORMANCE OPTIMIZATIONS
	// =============================================================================

	async optimizedBatchFetch(feedNames: string[]): Promise<Map<string, any>> {
		if (!this.options.enablePerformanceOptimizations) {
			// Fallback to sequential fetching
			const results = new Map();
			for (const feedName of feedNames) {
				try {
					const content = await this.bridge.fetchRssFeed(feedName);
					results.set(feedName, content);
				} catch (error) {
					results.set(feedName, null);
				}
			}
			return results;
		}

		// Optimized parallel fetching with concurrency control
		const config = this.bridge.getConfig();
		const concurrency = Math.min(
			config.rss.fetch_concurrency,
			feedNames.length,
		);
		const results = new Map();

		// Process feeds in batches
		for (let i = 0; i < feedNames.length; i += concurrency) {
			const batch = feedNames.slice(i, i + concurrency);
			const batchPromises = batch.map(async (feedName) => {
				try {
					const content = await this.bridge.fetchRssFeed(feedName);
					return { feedName, content, success: true };
				} catch (error) {
					return { feedName, content: null, success: false, error };
				}
			});

			const batchResults = await Promise.all(batchPromises);

			for (const result of batchResults) {
				results.set(result.feedName, result.content);
			}
		}

		return results;
	}

	// =============================================================================
	// EXPORT FORMATS
	// =============================================================================

	exportData(format: "table" | "json" | "csv" = "table"): string {
		const state = this.bridge.getCurrentState();
		const metrics = this.bridge.getMetrics();

		switch (format) {
			case "table":
				return this.generateTableExport(state, metrics);
			case "json":
				return this.generateJsonExport(state, metrics);
			case "csv":
				return this.generateCsvExport(state, metrics);
			default:
				throw new Error(`Unsupported export format: ${format}`);
		}
	}

	private generateTableExport(state: ProfileRssState, metrics: any): string {
		const lines = [];

		lines.push("🔗 Profile-RSS Integration Export");
		lines.push("=".repeat(60));
		lines.push("");

		lines.push(this.generateProfileRssReport());
		lines.push("");

		lines.push(this.generatePerformanceMetricsTable());
		lines.push("");

		lines.push(this.generateSecurityStatusTable());

		return lines.join("\n");
	}

	private generateJsonExport(state: ProfileRssState, metrics: any): string {
		return JSON.stringify(
			{
				timestamp: new Date().toISOString(),
				state,
				metrics,
			},
			null,
			2,
		);
	}

	private generateCsvExport(state: ProfileRssState, metrics: any): string {
		const feeds = Array.from(state.active_feeds.values());
		const lines = [];

		// Header
		lines.push(
			"feed,profile,status,latency_ms,memory_mb,heap_mb,error_count,auth_status,last_fetch",
		);

		// Data rows
		for (const feed of feeds) {
			lines.push(
				[
					feed.name,
					state.current_profile,
					feed.status,
					feed.latency_ms,
					state.performance_metrics.memory_usage_mb.toFixed(2),
					state.performance_metrics.heap_usage_mb.toFixed(2),
					feed.error_count,
					feed.auth_status,
					feed.last_fetch.toISOString(),
				].join(","),
			);
		}

		return lines.join("\n");
	}

	// =============================================================================
	// PUBLIC API
	// =============================================================================

	getIntegrationInfo(): string {
		const lines = [];

		lines.push("🚀 v1.3.7 Native Integration Status");
		lines.push("=".repeat(40));
		lines.push(
			`Table Formatting: ${this.options.enableTableFormatting ? "✓" : "✗"}`,
		);
		lines.push(`JSON5 Support: ${this.options.enableJson5Support ? "✓" : "✗"}`);
		lines.push(
			`Performance Optimizations: ${this.options.enablePerformanceOptimizations ? "✓" : "✗"}`,
		);
		lines.push(`Output Format: ${this.options.outputFormat}`);
		lines.push(
			`Bun Version: ${typeof Bun !== "undefined" ? process.version : "Not available"}`,
		);

		return lines.join("\n");
	}
}

// =============================================================================
// CLI INTERFACE
// =============================================================================

interface V137CliOptions {
	config?: string;
	format?: "table" | "json" | "csv";
	mode?: "adaptive" | "manual" | "performance";
	noTable?: boolean;
	noJson5?: boolean;
	noOptimizations?: boolean;
	help?: boolean;
}

function parseV137Args(): V137CliOptions {
	const args = process.argv.slice(2);
	const options: V137CliOptions = {};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		switch (arg) {
			case "--config":
			case "-c":
				options.config = args[++i];
				break;

			case "--format":
			case "-f":
				options.format = args[++i] as any;
				break;

			case "--mode":
			case "-m":
				options.mode = args[++i] as any;
				break;

			case "--no-table":
				options.noTable = true;
				break;

			case "--no-json5":
				options.noJson5 = true;
				break;

			case "--no-optimizations":
				options.noOptimizations = true;
				break;

			case "--help":
			case "-h":
				options.help = true;
				break;

			default:
				if (arg.startsWith("--")) {
					console.error(`Unknown option: ${arg}`);
					process.exit(1);
				}
		}
	}

	return options;
}

function showV137Help(): void {
	console.log(`
🚀 v1.3.7 Profile-RSS Integration CLI

USAGE:
  bun run src/integration/v137-profile-rss-integration.ts [OPTIONS]

OPTIONS:
  -c, --config <path>        Configuration file path
  -f, --format <format>      Output format: table, json, csv
  -m, --mode <mode>          Bridge mode: adaptive, manual, performance
      --no-table             Disable native table formatting
      --no-json5             Disable JSON5 support
      --no-optimizations     Disable performance optimizations
  -h, --help                 Show this help message

EXAMPLES:
  # Generate table report with native formatting
  bun run src/integration/v137-profile-rss-integration.ts

  # Export as JSON
  bun run src/integration/v137-profile-rss-integration.ts --format json

  # Performance mode with CSV output
  bun run src/integration/v137-profile-rss-integration.ts --mode performance --format csv

  # Disable native features (fallback mode)
  bun run src/integration/v137-profile-rss-integration.ts --no-table --no-optimizations
`);
}

async function main(): Promise<void> {
	const options = parseV137Args();

	if (options.help) {
		showV137Help();
		return;
	}

	// Initialize the bridge
	const bridge = new ProfileRssBridge({
		configPath: options.config,
		profileMode: options.mode,
	});

	// Initialize v1.3.7 integration
	const integration = new V137ProfileRssIntegration(bridge, {
		enableTableFormatting: !options.noTable,
		enableJson5Support: !options.noJson5,
		enablePerformanceOptimizations: !options.noOptimizations,
		outputFormat: options.format || "table",
	});

	// Show integration info
	console.log(integration.getIntegrationInfo());
	console.log("");

	// Generate and display report
	const report = integration.exportData(options.format || "table");
	console.log(report);

	// Cleanup
	await bridge.shutdown();
}

if (import.meta.main) {
	main().catch((error) => {
		console.error("❌ v1.3.7 Integration failed:", error);
		process.exit(1);
	});
}
