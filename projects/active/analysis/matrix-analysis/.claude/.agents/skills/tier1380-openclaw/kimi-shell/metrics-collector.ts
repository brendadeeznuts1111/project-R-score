#!/usr/bin/env bun
/**
 * Kimi Shell Metrics Collector
 * Collects and manages performance metrics for the shell environment
 */

import { $ } from "bun";
import { homedir } from "os";
import { join } from "path";

const METRICS_DIR = join(homedir(), ".kimi", "metrics");
const METRICS_FILE = join(METRICS_DIR, "shell-metrics.jsonl");

interface MetricEntry {
	timestamp: string;
	category: "performance" | "usage" | "error" | "system";
	name: string;
	value: number;
	unit: string;
	metadata?: Record<string, unknown>;
}

interface SystemStats {
	cpuUsage: number;
	memoryUsage: number;
	diskUsage: number;
	uptime: number;
}

class MetricsCollector {
	private metrics: MetricEntry[] = [];

	async init(): Promise<void> {
		// Ensure metrics directory exists
		await $`mkdir -p ${METRICS_DIR}`.quiet();
	}

	/**
	 * Record a metric
	 */
	record(metric: Omit<MetricEntry, "timestamp">): void {
		const entry: MetricEntry = {
			...metric,
			timestamp: new Date().toISOString(),
		};
		this.metrics.push(entry);
	}

	/**
	 * Collect system stats
	 */
	async collectSystemStats(): Promise<SystemStats> {
		const start = performance.now();

		// Memory usage
		const memUsage = process.memoryUsage();
		const memoryMB = Math.round(memUsage.heapUsed / 1024 / 1024);

		// CPU usage (simplified)
		const cpuUsage = 0; // Would need more complex calculation

		// Disk usage
		let diskUsage = 0;
		try {
			const result = await $`df -h ~ | tail -1 | awk '{print $5}' | sed 's/%//'`
				.quiet()
				.text();
			diskUsage = parseInt(result.trim()) || 0;
		} catch {
			diskUsage = 0;
		}

		// Uptime
		const uptime = process.uptime();

		const duration = performance.now() - start;

		// Record metrics
		this.record({
			category: "system",
			name: "memory_usage_mb",
			value: memoryMB,
			unit: "MB",
		});

		this.record({
			category: "performance",
			name: "stats_collection_time",
			value: duration,
			unit: "ms",
		});

		return {
			cpuUsage,
			memoryUsage: memoryMB,
			diskUsage,
			uptime,
		};
	}

	/**
	 * Collect command execution metrics
	 */
	async recordCommandExecution(
		command: string,
		duration: number,
		exitCode: number,
	): Promise<void> {
		this.record({
			category: "usage",
			name: "command_execution",
			value: duration,
			unit: "ms",
			metadata: {
				command: command.split(" ")[0],
				exit_code: exitCode,
				success: exitCode === 0,
			},
		});
	}

	/**
	 * Get metrics summary
	 */
	getSummary(): {
		total: number;
		byCategory: Record<string, number>;
		recent: MetricEntry[];
	} {
		const byCategory: Record<string, number> = {};

		for (const metric of this.metrics) {
			byCategory[metric.category] = (byCategory[metric.category] || 0) + 1;
		}

		return {
			total: this.metrics.length,
			byCategory,
			recent: this.metrics.slice(-10),
		};
	}

	/**
	 * Save metrics to file
	 */
	async save(): Promise<void> {
		const lines = this.metrics.map((m) => JSON.stringify(m)).join("\n");
		await Bun.write(METRICS_FILE, lines + "\n", { append: true });
		this.metrics = []; // Clear after saving
	}

	/**
	 * Load historical metrics
	 */
	async load(): Promise<MetricEntry[]> {
		try {
			const content = await Bun.file(METRICS_FILE).text();
			return content
				.trim()
				.split("\n")
				.filter((line) => line)
				.map((line) => JSON.parse(line));
		} catch {
			return [];
		}
	}

	/**
	 * Display metrics dashboard
	 */
	async displayDashboard(): Promise<void> {
		const stats = await this.collectSystemStats();
		const summary = this.getSummary();

		console.info("\n📊 Kimi Shell Metrics Dashboard");
		console.info("=".repeat(50));

		console.info("\n🖥️  System Stats:");
		console.info(`  Memory Usage: ${stats.memoryUsage} MB`);
		console.info(`  Disk Usage: ${stats.diskUsage}%`);
		console.info(
			`  Uptime: ${Math.floor(stats.uptime / 60)}m ${Math.floor(stats.uptime % 60)}s`,
		);

		console.info("\n📈 Metrics Summary:");
		console.info(`  Total Metrics: ${summary.total}`);
		for (const [cat, count] of Object.entries(summary.byCategory)) {
			console.info(`  ${cat}: ${count}`);
		}

		if (summary.recent.length > 0) {
			console.info("\n🕐 Recent Metrics:");
			for (const m of summary.recent.slice(-5)) {
				const time = new Date(m.timestamp).toLocaleTimeString();
				console.info(`  ${time} [${m.category}] ${m.name}: ${m.value}${m.unit}`);
			}
		}

		console.info("\n" + "=".repeat(50));
	}
}

// CLI
async function main() {
	const collector = new MetricsCollector();
	await collector.init();

	const args = Bun.argv.slice(2);
	const command = args[0];

	switch (command) {
		case "collect":
			await collector.collectSystemStats();
			await collector.save();
			console.info("✅ Metrics collected");
			break;

		case "dashboard":
			await collector.displayDashboard();
			break;

		case "record": {
			const category = args[1] as MetricEntry["category"];
			const name = args[2];
			const value = parseFloat(args[3]);
			const unit = args[4] || "count";

			if (!category || !name || Number.isNaN(value)) {
				console.info(
					"Usage: metrics-collector.ts record <category> <name> <value> [unit]",
				);
				process.exit(1);
			}

			collector.record({ category, name, value, unit });
			await collector.save();
			console.info(`✅ Recorded: ${name} = ${value}${unit}`);
			break;
		}

		case "export": {
			const metrics = await collector.load();
			console.info(JSON.stringify(metrics, null, 2));
			break;
		}

		default:
			console.info("Kimi Shell Metrics Collector");
			console.info("");
			console.info("Commands:");
			console.info("  collect              Collect system metrics");
			console.info("  dashboard            Show metrics dashboard");
			console.info("  record <cat> <name> <val> [unit]  Record a metric");
			console.info("  export               Export all metrics as JSON");
			break;
	}
}

export { MetricsCollector };

if (import.meta.main) {
	main().catch(console.error);
}
