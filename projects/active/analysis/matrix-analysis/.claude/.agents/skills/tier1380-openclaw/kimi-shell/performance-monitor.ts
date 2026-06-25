#!/usr/bin/env bun
/**
 * Kimi Shell Performance Monitor
 * Real-time system metrics and performance tracking
 */

import { $ } from "bun";

const COLORS = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	cyan: "\x1b[36m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	gray: "\x1b[90m",
};

interface SystemMetrics {
	timestamp: number;
	cpu: {
		usage: number;
		loadAvg: number[];
	};
	memory: {
		used: number;
		total: number;
		percent: number;
	};
	bun: {
		version: string;
		uptime: number;
		heapUsed: number;
		heapTotal: number;
	};
}

interface MetricSnapshot {
	metrics: SystemMetrics;
	trend: "up" | "down" | "stable";
}

class PerformanceMonitor {
	private history: SystemMetrics[] = [];
	private maxHistory = 60;
	private intervalId?: Timer;

	async collect(): Promise<SystemMetrics> {
		const memUsage = process.memoryUsage();

		return {
			timestamp: Date.now(),
			cpu: {
				usage: 0, // Would need OS-specific implementation
				loadAvg: [],
			},
			memory: {
				used: memUsage.heapUsed,
				total: memUsage.heapTotal,
				percent: (memUsage.heapUsed / memUsage.heapTotal) * 100,
			},
			bun: {
				version: Bun.version,
				uptime: process.uptime(),
				heapUsed: memUsage.heapUsed,
				heapTotal: memUsage.heapTotal,
			},
		};
	}

	startMonitoring(intervalMs: number = 1000): void {
		this.intervalId = setInterval(async () => {
			const metrics = await this.collect();
			this.history.push(metrics);

			if (this.history.length > this.maxHistory) {
				this.history.shift();
			}

			this.render(metrics);
		}, intervalMs);
	}

	stopMonitoring(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = undefined;
		}
	}

	private render(metrics: SystemMetrics): void {
		console.clear();

		console.info(`${COLORS.bold}${COLORS.cyan}`);
		console.info("╔══════════════════════════════════════════════════════════════════╗");
		console.info("║           📊 Performance Monitor (Tier-1380 OMEGA)                ║");
		console.info("╚══════════════════════════════════════════════════════════════════╝");
		console.info(`${COLORS.reset}`);

		// Memory section
		const memPercent = metrics.memory.percent.toFixed(1);
		const memColor =
			metrics.memory.percent > 80
				? COLORS.red
				: metrics.memory.percent > 60
					? COLORS.yellow
					: COLORS.green;

		console.info(`\n${COLORS.bold}Memory Usage:${COLORS.reset}`);
		console.info(
			`  Heap Used:  ${memColor}${this.formatBytes(metrics.memory.used)}${COLORS.reset}`,
		);
		console.info(
			`  Heap Total: ${COLORS.gray}${this.formatBytes(metrics.memory.total)}${COLORS.reset}`,
		);
		console.info(`  Utilization: ${memColor}${memPercent}%${COLORS.reset}`);

		// Memory bar
		const barWidth = 40;
		const filled = Math.round((metrics.memory.percent / 100) * barWidth);
		const bar = "█".repeat(filled) + "░".repeat(barWidth - filled);
		console.info(`  [${memColor}${bar}${COLORS.reset}]`);

		// Bun info
		console.info(`\n${COLORS.bold}Bun Runtime:${COLORS.reset}`);
		console.info(`  Version: ${COLORS.cyan}${metrics.bun.version}${COLORS.reset}`);
		console.info(
			`  Uptime:  ${COLORS.gray}${this.formatUptime(metrics.bun.uptime)}${COLORS.reset}`,
		);

		// History sparkline
		if (this.history.length > 1) {
			console.info(`\n${COLORS.bold}Memory Trend (60s):${COLORS.reset}`);
			console.info(`  ${this.renderSparkline()}`);
		}

		// Controls
		console.info(`\n${COLORS.gray}Press Ctrl+C to exit${COLORS.reset}`);
	}

	private renderSparkline(): string {
		const blocks = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
		const values = this.history.map((m) => m.memory.percent);
		const max = Math.max(...values);
		const min = Math.min(...values);
		const range = max - min || 1;

		return values
			.slice(-30)
			.map((v) => {
				const normalized = (v - min) / range;
				const idx = Math.floor(normalized * (blocks.length - 1));
				return blocks[idx];
			})
			.join("");
	}

	private formatBytes(bytes: number): string {
		if (bytes < 1024) return `${bytes}B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
		return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
	}

	private formatUptime(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);
		return `${hours}h ${mins}m ${secs}s`;
	}

	getHistory(): SystemMetrics[] {
		return [...this.history];
	}

	exportReport(): string {
		const avgMemory =
			this.history.reduce((a, m) => a + m.memory.percent, 0) / this.history.length;
		const maxMemory = Math.max(...this.history.map((m) => m.memory.percent));

		return `
# Performance Report
Generated: ${new Date().toISOString()}
Duration: ${this.history.length}s

## Memory Statistics
- Average: ${avgMemory.toFixed(2)}%
- Peak: ${maxMemory.toFixed(2)}%
- Current: ${this.history[this.history.length - 1]?.memory.percent.toFixed(2)}%

## Runtime
- Bun Version: ${Bun.version}
- Uptime: ${this.formatUptime(process.uptime())}
`;
	}
}

async function main() {
	const args = Bun.argv.slice(2);
	const command = args[0];

	const monitor = new PerformanceMonitor();

	switch (command) {
		case "watch":
		case "monitor": {
			console.info("Starting performance monitor... Press Ctrl+C to exit");
			await new Promise((resolve) => setTimeout(resolve, 1000));

			monitor.startMonitoring(1000);

			process.on("SIGINT", () => {
				monitor.stopMonitoring();
				console.info("\n" + monitor.exportReport());
				process.exit(0);
			});
			break;
		}

		case "snapshot": {
			const metrics = await monitor.collect();
			console.info(JSON.stringify(metrics, null, 2));
			break;
		}

		case "report": {
			console.info(monitor.exportReport());
			break;
		}

		default: {
			console.info(`${COLORS.bold}🐚 Kimi Performance Monitor${COLORS.reset}\n`);
			console.info("Usage:");
			console.info("  performance-monitor.ts watch     - Real-time monitoring");
			console.info("  performance-monitor.ts snapshot  - Single metrics snapshot");
			console.info("  performance-monitor.ts report    - Generate report");
		}
	}
}

if (import.meta.main) {
	main().catch(console.error);
}

export { PerformanceMonitor };
