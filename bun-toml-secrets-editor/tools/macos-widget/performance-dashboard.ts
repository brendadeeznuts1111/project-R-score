#!/usr/bin/env bun
// Performance Monitoring Dashboard for ARM64 Widget
// Real-time performance visualization and alerting system

import type { ARM64OptimizedWidget } from "./arm64-optimized-widget";

interface PerformanceAlert {
	id: string;
	type: "warning" | "critical" | "info";
	message: string;
	timestamp: number;
	metric: string;
	value: number;
	threshold: number;
}

interface DashboardConfig {
	refreshInterval: number;
	alertThresholds: {
		memoryUsage: number; // MB
		latency: number; // ms
		errorRate: number; // percentage
		bufferOps: number; // ms
	};
	historySize: number;
}

class PerformanceDashboard {
	private widget: ARM64OptimizedWidget | null = null;
	private alerts: PerformanceAlert[] = [];
	private history: any[] = [];
	private config: DashboardConfig;
	private isRunning = false;
	private startTime = Date.now();

	constructor(config?: Partial<DashboardConfig>) {
		this.config = {
			refreshInterval: 5000, // 5 seconds
			alertThresholds: {
				memoryUsage: 100, // 100MB
				latency: 1000, // 1 second
				errorRate: 5, // 5%
				bufferOps: 10, // 10ms
			},
			historySize: 100,
			...config,
		};

		console.log("📊 Performance Monitoring Dashboard");
		console.log("==================================");
		console.log(`🔄 Refresh Interval: ${this.config.refreshInterval}ms`);
		console.log(`📈 History Size: ${this.config.historySize} entries`);
		console.log(`⚠️  Alert Thresholds Configured`);
		console.log("");
	}

	async startMonitoring(): Promise<void> {
		if (this.isRunning) {
			console.log("⚠️  Dashboard is already running");
			return;
		}

		this.isRunning = true;
		console.log("🚀 Starting performance monitoring dashboard...");
		console.log("");

		// Start the monitoring loop
		this.monitoringLoop();
	}

	private async monitoringLoop(): Promise<void> {
		while (this.isRunning) {
			try {
				await this.collectMetrics();
				this.displayDashboard();
				this.checkAlerts();
				await this.sleep(this.config.refreshInterval);
			} catch (error) {
				console.error(`❌ Dashboard error: ${error}`);
				await this.sleep(1000); // Wait before retrying
			}
		}
	}

	private async collectMetrics(): Promise<void> {
		const timestamp = Date.now();
		const memoryUsage = process.memoryUsage();

		// Collect current metrics (simulated since we don't have direct access to widget internals)
		const metrics = {
			timestamp,
			memory: {
				heapUsed: memoryUsage.heapUsed,
				heapTotal: memoryUsage.heapTotal,
				external: memoryUsage.external,
				rss: memoryUsage.rss,
			},
			performance: {
				// These would come from the actual widget telemetry
				bufferOps: Math.random() * 15, // Simulated
				asyncOps: Math.random() * 200, // Simulated
				latency: Math.random() * 1500, // Simulated
				errorRate: Math.random() * 10, // Simulated
			},
			system: {
				uptime: Date.now() - this.startTime,
				platform: process.platform,
				arch: process.arch,
				nodeVersion: process.version,
			},
		};

		// Add to history
		this.history.push(metrics);

		// Trim history if too large
		if (this.history.length > this.config.historySize) {
			this.history.shift();
		}
	}

	private displayDashboard(): void {
		console.clear();

		const latest = this.history[this.history.length - 1];
		if (!latest) return;

		const uptime = this.formatDuration(latest.system.uptime);
		const memoryUsage = (latest.memory.heapUsed / 1024 / 1024).toFixed(1);
		const memoryTotal = (latest.memory.heapTotal / 1024 / 1024).toFixed(1);
		const latency = latest.performance.latency.toFixed(1);
		const errorRate = latest.performance.errorRate.toFixed(1);
		const bufferOps = latest.performance.bufferOps.toFixed(2);

		// Header
		console.log("📊 Performance Monitoring Dashboard");
		console.log("==================================");
		console.log(
			`🕐 ${new Date().toLocaleString()} | ⏱️ Uptime: ${uptime} | 🖥️  ${latest.system.platform} (${latest.system.arch})`,
		);
		console.log("");

		// System Status
		console.log("🖥️  System Status");
		console.log("----------------");
		console.log(`   Memory Usage: ${memoryUsage}MB / ${memoryTotal}MB`);
		console.log(
			`   RSS Memory: ${(latest.memory.rss / 1024 / 1024).toFixed(1)}MB`,
		);
		console.log(
			`   External Memory: ${(latest.memory.external / 1024 / 1024).toFixed(1)}MB`,
		);
		console.log("");

		// Performance Metrics
		console.log("⚡ Performance Metrics");
		console.log("----------------------");
		console.log(
			`   Latency: ${latency}ms ${this.getLatencyIndicator(parseFloat(latency))}`,
		);
		console.log(
			`   Error Rate: ${errorRate}% ${this.getErrorRateIndicator(parseFloat(errorRate))}`,
		);
		console.log(
			`   Buffer Ops: ${bufferOps}ms ${this.getBufferOpsIndicator(parseFloat(bufferOps))}`,
		);
		console.log(`   Async Ops: ${latest.performance.asyncOps.toFixed(1)}ms`);
		console.log("");

		// Recent Alerts
		if (this.alerts.length > 0) {
			console.log("🚨 Recent Alerts");
			console.log("---------------");
			const recentAlerts = this.alerts.slice(-5).reverse();
			recentAlerts.forEach((alert) => {
				const icon = this.getAlertIcon(alert.type);
				const time = new Date(alert.timestamp).toLocaleTimeString();
				console.log(`   ${icon} ${time} - ${alert.message}`);
			});
			console.log("");
		}

		// Performance Trends
		if (this.history.length > 1) {
			console.log("📈 Performance Trends (Last 10 samples)");
			console.log("---------------------------------------");
			const recentHistory = this.history.slice(-10);

			console.log("   Time       | Memory | Latency | Errors | Buffer");
			console.log("   ---------- | ------ | ------- | ------ | ------");

			recentHistory.forEach((entry) => {
				const time = new Date(entry.timestamp)
					.toLocaleTimeString()
					.split(":")
					.slice(1)
					.join(":");
				const memory = (entry.memory.heapUsed / 1024 / 1024).toFixed(1);
				const latency = entry.performance.latency.toFixed(0);
				const errors = entry.performance.errorRate.toFixed(1);
				const buffer = entry.performance.bufferOps.toFixed(1);

				console.log(
					`   ${time} | ${memory.padStart(6)}MB | ${latency.padStart(6)}ms | ${errors.padStart(5)}% | ${buffer.padStart(5)}ms`,
				);
			});
			console.log("");
		}

		// Controls
		console.log("🎛️  Controls");
		console.log("-----------");
		console.log(
			"   [r] Reset Alerts    [h] Show History    [q] Quit Dashboard",
		);
		console.log("   [e] Export Data     [c] Clear History   [s] Save Snapshot");
		console.log("");

		// Footer
		console.log("==================================");
	}

	private checkAlerts(): void {
		const latest = this.history[this.history.length - 1];
		if (!latest) return;

		const memoryMB = latest.memory.heapUsed / 1024 / 1024;
		const latency = latest.performance.latency;
		const errorRate = latest.performance.errorRate;
		const bufferOps = latest.performance.bufferOps;

		// Check memory usage
		if (memoryMB > this.config.alertThresholds.memoryUsage) {
			this.addAlert({
				id: `memory-${Date.now()}`,
				type: "warning",
				message: `High memory usage: ${memoryMB.toFixed(1)}MB`,
				timestamp: Date.now(),
				metric: "memoryUsage",
				value: memoryMB,
				threshold: this.config.alertThresholds.memoryUsage,
			});
		}

		// Check latency
		if (latency > this.config.alertThresholds.latency) {
			this.addAlert({
				id: `latency-${Date.now()}`,
				type: "critical",
				message: `High latency: ${latency.toFixed(1)}ms`,
				timestamp: Date.now(),
				metric: "latency",
				value: latency,
				threshold: this.config.alertThresholds.latency,
			});
		}

		// Check error rate
		if (errorRate > this.config.alertThresholds.errorRate) {
			this.addAlert({
				id: `error-${Date.now()}`,
				type: "critical",
				message: `High error rate: ${errorRate.toFixed(1)}%`,
				timestamp: Date.now(),
				metric: "errorRate",
				value: errorRate,
				threshold: this.config.alertThresholds.errorRate,
			});
		}

		// Check buffer operations
		if (bufferOps > this.config.alertThresholds.bufferOps) {
			this.addAlert({
				id: `buffer-${Date.now()}`,
				type: "warning",
				message: `Slow buffer operations: ${bufferOps.toFixed(2)}ms`,
				timestamp: Date.now(),
				metric: "bufferOps",
				value: bufferOps,
				threshold: this.config.alertThresholds.bufferOps,
			});
		}

		// Clean old alerts (keep only last 50)
		if (this.alerts.length > 50) {
			this.alerts = this.alerts.slice(-50);
		}
	}

	private addAlert(alert: PerformanceAlert): void {
		// Avoid duplicate alerts for the same metric within a short time window
		const recentDuplicate = this.alerts
			.slice()
			.reverse()
			.find(
				(a: PerformanceAlert) =>
					a.metric === alert.metric && Date.now() - a.timestamp < 30000, // 30 seconds
			);

		if (!recentDuplicate) {
			this.alerts.push(alert);
			console.log(`🚨 ${alert.type.toUpperCase()}: ${alert.message}`);
		}
	}

	private getLatencyIndicator(latency: number): string {
		if (latency < 100) return "🟢";
		if (latency < 500) return "🟡";
		return "🔴";
	}

	private getErrorRateIndicator(errorRate: number): string {
		if (errorRate < 1) return "🟢";
		if (errorRate < 5) return "🟡";
		return "🔴";
	}

	private getBufferOpsIndicator(bufferOps: number): string {
		if (bufferOps < 5) return "🟢";
		if (bufferOps < 10) return "🟡";
		return "🔴";
	}

	private getAlertIcon(type: string): string {
		switch (type) {
			case "critical":
				return "🔴";
			case "warning":
				return "🟡";
			case "info":
				return "🔵";
			default:
				return "⚪";
		}
	}

	private formatDuration(ms: number): string {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		const remainingHours = hours % 24;
		const remainingMinutes = minutes % 60;
		const remainingSeconds = seconds % 60;

		if (days > 0) {
			return `${days}d ${remainingHours}h ${remainingMinutes}m`;
		} else if (hours > 0) {
			return `${remainingHours}h ${remainingMinutes}m ${remainingSeconds}s`;
		} else if (minutes > 0) {
			return `${remainingMinutes}m ${remainingSeconds}s`;
		} else {
			return `${remainingSeconds}s`;
		}
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	stopMonitoring(): void {
		this.isRunning = false;
		console.log("🛑 Performance monitoring dashboard stopped");
	}

	exportData(): string {
		const exportData = {
			timestamp: new Date().toISOString(),
			config: this.config,
			alerts: this.alerts,
			history: this.history,
			summary: {
				totalAlerts: this.alerts.length,
				criticalAlerts: this.alerts.filter((a) => a.type === "critical").length,
				warningAlerts: this.alerts.filter((a) => a.type === "warning").length,
				infoAlerts: this.alerts.filter((a) => a.type === "info").length,
				dataPoints: this.history.length,
			},
		};

		return JSON.stringify(exportData, null, 2);
	}

	saveSnapshot(): void {
		const snapshotData = this.exportData();
		const filename = `performance-snapshot-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

		try {
			require("fs").writeFileSync(filename, snapshotData);
			console.log(`💾 Performance snapshot saved to: ${filename}`);
		} catch (error) {
			console.error(`❌ Failed to save snapshot: ${error}`);
		}
	}

	clearHistory(): void {
		this.history = [];
		this.alerts = [];
		console.log("🗑️  History and alerts cleared");
	}

	showHistory(): void {
		if (this.history.length === 0) {
			console.log("📝 No history data available");
			return;
		}

		console.log("📝 Performance History");
		console.log("======================");

		this.history.forEach((entry, index) => {
			const time = new Date(entry.timestamp).toLocaleString();
			const memory = (entry.memory.heapUsed / 1024 / 1024).toFixed(1);
			const latency = entry.performance.latency.toFixed(1);

			console.log(
				`${index + 1}. ${time} - Memory: ${memory}MB, Latency: ${latency}ms`,
			);
		});

		console.log("");
	}
}

// CLI interface for the dashboard
async function main() {
	const dashboard = new PerformanceDashboard({
		refreshInterval: 5000,
		alertThresholds: {
			memoryUsage: 100,
			latency: 1000,
			errorRate: 5,
			bufferOps: 10,
		},
	});

	// Start monitoring
	await dashboard.startMonitoring();

	// Set up keyboard controls
	process.stdin.setRawMode(true);
	process.stdin.resume();
	process.stdin.on("data", (key) => {
		switch (key.toString()) {
			case "q":
			case "\u0003": // Ctrl+C
				dashboard.stopMonitoring();
				process.exit(0);
				break;
			case "r":
				dashboard.clearHistory();
				break;
			case "h":
				dashboard.showHistory();
				break;
			case "e":
				console.log(dashboard.exportData());
				break;
			case "c":
				dashboard.clearHistory();
				break;
			case "s":
				dashboard.saveSnapshot();
				break;
		}
	});
}

// Graceful shutdown
process.on("SIGINT", () => {
	console.log("\n👋 Shutting down performance dashboard...");
	process.exit(0);
});

if (import.meta.main) {
	main().catch(console.error);
}

export { PerformanceDashboard };
