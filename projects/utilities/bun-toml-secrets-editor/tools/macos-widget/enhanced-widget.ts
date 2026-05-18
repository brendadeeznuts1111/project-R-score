#!/usr/bin/env bun

// Enhanced Status Widget with Advanced Features
// Includes monitoring, analytics, notifications, and more

import { fetch } from "bun";
import { spawn } from "child_process";
import { readFile, writeFile } from "fs/promises";

interface EnhancedWidgetStatus {
	api: "online" | "offline" | "error";
	bucket: "connected" | "disconnected" | "error";
	profiles: number;
	lastUpdate: string;
	responseTime: number;
	uptime: number;
	memoryUsage: NodeJS.MemoryUsage;
	cpuUsage: NodeJS.CpuUsage;
	errorCount: number;
	successRate: number;
	historicalData: StatusSnapshot[];
}

interface StatusSnapshot {
	timestamp: string;
	apiStatus: string;
	bucketStatus: string;
	responseTime: number;
	memoryUsage: number;
}

interface NotificationConfig {
	enabled: boolean;
	apiFailure: boolean;
	bucketFailure: boolean;
	performanceThreshold: number;
	soundEnabled: boolean;
}

interface WidgetConfig {
	theme: "light" | "dark" | "auto";
	refreshInterval: number;
	maxHistorySize: number;
	notifications: NotificationConfig;
	analytics: boolean;
	logging: boolean;
}

class EnhancedStatusWidget {
	private status: EnhancedWidgetStatus;
	private config!: WidgetConfig; // Definitely assigned in initializeConfig
	private isRunning = true;
	private startTime: number;
	private logFile: string;
	private configPath: string;

	// Constants
	private readonly API_URL = "http://localhost:3001/health";
	private readonly BUCKET_URL =
		"https://pub-a471e86af24446498311933a2eca2454.r2.dev/profiles/README.md";
	private readonly DEFAULT_CONFIG: WidgetConfig = {
		theme: "auto",
		refreshInterval: 30000,
		maxHistorySize: 100,
		notifications: {
			enabled: true,
			apiFailure: true,
			bucketFailure: true,
			performanceThreshold: 1000, // ms
			soundEnabled: false,
		},
		analytics: true,
		logging: true,
	};

	constructor() {
		this.startTime = Date.now();
		this.logFile = `${process.cwd()}/logs/widget.log`;
		this.configPath = `${process.cwd()}/config/widget-config.json`;

		this.status = {
			api: "offline",
			bucket: "disconnected",
			profiles: 119,
			lastUpdate: new Date().toISOString(),
			responseTime: 0,
			uptime: 0,
			memoryUsage: process.memoryUsage(),
			cpuUsage: process.cpuUsage(),
			errorCount: 0,
			successRate: 0,
			historicalData: [],
		};

		this.initializeConfig();
		this.setupDirectories();
		this.startWidget();
	}

	private async initializeConfig() {
		try {
			const configData = await readFile(this.configPath, "utf-8");
			this.config = { ...this.DEFAULT_CONFIG, ...JSON.parse(configData) };
		} catch {
			this.config = this.DEFAULT_CONFIG;
			await this.saveConfig();
		}
	}

	private async saveConfig() {
		try {
			await writeFile(this.configPath, JSON.stringify(this.config, null, 2));
		} catch (error) {
			console.error("Failed to save config:", error);
		}
	}

	private setupDirectories() {
		const dirs = ["logs", "config", "data"];
		dirs.forEach((dir) => {
			try {
				require("fs").mkdirSync(dir, { recursive: true });
			} catch (e) {
				// Directory might already exist
			}
		});
	}

	private async startWidget() {
		console.info("🚀 Enhanced Status Widget v2.0");
		console.info("===============================");
		console.info("✨ Enhanced Features:");
		console.info("   • Historical data tracking");
		console.info("   • Performance analytics");
		console.info("   • Smart notifications");
		console.info("   • Configurable themes");
		console.info("   • Advanced logging");
		console.info("   • Memory/CPU monitoring");
		console.info("   • Error tracking & recovery");
		console.info("===============================");

		this.setupGracefulShutdown();
		await this.startMonitoring();
	}

	private async startMonitoring() {
		console.info("⚡ Starting enhanced monitoring...");

		while (this.isRunning) {
			await this.checkStatusEnhanced();
			this.updateMetrics();
			this.displayStatusEnhanced();
			await this.checkNotifications();
			await this.sleep(this.config.refreshInterval);
		}
	}

	private async checkStatusEnhanced() {
		const checkStart = performance.now();

		try {
			// Parallel status checks
			const [apiResult, bucketResult] = await Promise.allSettled([
				this.checkAPIStatus(),
				this.checkBucketStatus(),
			]);

			// Update status with error tracking
			const previousApi = this.status.api;
			const previousBucket = this.status.bucket;

			this.status.api =
				apiResult.status === "fulfilled" && apiResult.value
					? "online"
					: apiResult.status === "rejected"
						? "offline"
						: "error";
			this.status.bucket =
				bucketResult.status === "fulfilled" && bucketResult.value
					? "connected"
					: bucketResult.status === "rejected"
						? "disconnected"
						: "error";

			// Track errors
			if (this.status.api === "error" || this.status.api === "offline") {
				if (previousApi !== this.status.api) this.status.errorCount++;
			}
			if (
				this.status.bucket === "error" ||
				this.status.bucket === "disconnected"
			) {
				if (previousBucket !== this.status.bucket) this.status.errorCount++;
			}

			this.status.responseTime = performance.now() - checkStart;
		} catch (error) {
			this.status.errorCount++;
			this.status.responseTime = performance.now() - checkStart;
			await this.logError("Status check failed", error);
		}

		this.status.lastUpdate = new Date().toISOString();
		this.updateHistoricalData();
	}

	private async checkAPIStatus(): Promise<boolean> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000);

		try {
			const response = await fetch(this.API_URL, {
				signal: controller.signal,
				headers: {
					"User-Agent": "Enhanced-Widget/2.0",
					Accept: "application/json",
					"Cache-Control": "no-cache",
				},
			});

			clearTimeout(timeoutId);
			return response.ok && response.status >= 200 && response.status < 300;
		} catch {
			clearTimeout(timeoutId);
			return false;
		}
	}

	private async checkBucketStatus(): Promise<boolean> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000);

		try {
			const response = await fetch(this.BUCKET_URL, {
				signal: controller.signal,
				headers: {
					"User-Agent": "Enhanced-Widget/2.0",
					Accept: "text/plain",
					"Cache-Control": "no-cache",
				},
			});

			clearTimeout(timeoutId);
			return response.ok && response.status === 200;
		} catch {
			clearTimeout(timeoutId);
			return false;
		}
	}

	private updateMetrics() {
		this.status.uptime = Date.now() - this.startTime;
		this.status.memoryUsage = process.memoryUsage();
		this.status.cpuUsage = process.cpuUsage(this.status.cpuUsage);

		// Calculate success rate
		if (this.status.historicalData.length > 0) {
			const successful = this.status.historicalData.filter(
				(snapshot) =>
					snapshot.apiStatus === "online" &&
					snapshot.bucketStatus === "connected",
			).length;
			this.status.successRate =
				(successful / this.status.historicalData.length) * 100;
		}
	}

	private updateHistoricalData() {
		const snapshot: StatusSnapshot = {
			timestamp: this.status.lastUpdate,
			apiStatus: this.status.api,
			bucketStatus: this.status.bucket,
			responseTime: this.status.responseTime,
			memoryUsage: this.status.memoryUsage.heapUsed,
		};

		this.status.historicalData.push(snapshot);

		// Maintain max history size
		if (this.status.historicalData.length > this.config.maxHistorySize) {
			this.status.historicalData = this.status.historicalData.slice(
				-this.config.maxHistorySize,
			);
		}

		// Save historical data if analytics enabled
		if (this.config.analytics) {
			this.saveAnalytics();
		}
	}

	private async saveAnalytics() {
		try {
			const analyticsPath = `${process.cwd()}/data/analytics.json`;
			await writeFile(
				analyticsPath,
				JSON.stringify(
					{
						lastUpdate: new Date().toISOString(),
						currentStatus: this.status,
						config: this.config,
					},
					null,
					2,
				),
			);
		} catch (error) {
			// Silently fail analytics to not interrupt main functionality
		}
	}

	private displayStatusEnhanced() {
		console.clear();

		const theme = this.getThemeColors();
		const uptime = this.formatUptime(this.status.uptime);
		const memoryMB = Math.round(this.status.memoryUsage.heapUsed / 1024 / 1024);
		const avgResponse = this.getAverageResponseTime();
		const successRate = this.status.successRate.toFixed(1);

		const apiIcon = this.getStatusIcon(this.status.api);
		const bucketIcon = this.getStatusIcon(this.status.bucket);
		const perfIndicator = this.getPerformanceIndicator(avgResponse);

		console.info(`${theme.header}🚀 Enhanced Status Widget v2.0${theme.reset}`);
		console.info(
			`${theme.divider}===============================${theme.reset}`,
		);
		console.info(
			`${theme.status}📊 Status: ${apiIcon} API  ${bucketIcon} R2 Bucket  📁 ${this.status.profiles} Profiles${theme.reset}`,
		);
		console.info(
			`${theme.performance}⚡ Performance: ${perfIndicator} ${avgResponse}ms avg | 🎯 ${successRate}% success${theme.reset}`,
		);
		console.info(
			`${theme.metrics}📈 Metrics: ${uptime} uptime | ${memoryMB}MB memory | ${this.status.errorCount} errors${theme.reset}`,
		);
		console.info("");
		console.info(`${theme.services}🔗 Services:${theme.reset}`);
		console.info(`   API:     ${this.getStatusText(this.status.api)}`);
		console.info(`   R2:      ${this.getStatusText(this.status.bucket)}`);
		console.info(`   Profiles: ${this.status.profiles} files organized`);
		console.info("");
		console.info(`${theme.actions}⚡ Enhanced Actions:${theme.reset}`);
		console.info("   [1] Open Dashboard    http://localhost:3001");
		console.info("   [2] Open API Docs     http://localhost:3001/api");
		console.info(
			"   [3] Open R2 Bucket    https://pub-a471e86af24446498311933a2eca2454.r2.dev",
		);
		console.info("   [4] View Profiles     ./profiles/");
		console.info("   [p] Performance Stats");
		console.info("   [h] Historical Data");
		console.info("   [c] Configuration");
		console.info("   [l] View Logs");
		console.info("   [a] Analytics Report");
		console.info("   [t] Toggle Theme");
		console.info("   [r] Reset Metrics");
		console.info("   [q] Quit Widget");
		console.info("");
		console.info(
			`${theme.info}🕐 Last Update: ${new Date(this.status.lastUpdate).toLocaleTimeString()} | Theme: ${this.config.theme}${theme.reset}`,
		);
		console.info(`${theme.footer}✨ Enhanced Features Active${theme.reset}`);
		console.info(
			`${theme.divider}===============================${theme.reset}`,
		);
	}

	private getThemeColors() {
		const isDark =
			this.config.theme === "dark" ||
			(this.config.theme === "auto" && new Date().getHours() >= 18);

		return {
			header: isDark ? "\x1b[36m" : "\x1b[94m",
			divider: isDark ? "\x1b[90m" : "\x1b[37m",
			status: isDark ? "\x1b[32m" : "\x1b[92m",
			performance: isDark ? "\x1b[33m" : "\x1b[93m",
			metrics: isDark ? "\x1b[35m" : "\x1b[95m",
			services: isDark ? "\x1b[34m" : "\x1b[96m",
			actions: isDark ? "\x1b[31m" : "\x1b[91m",
			info: isDark ? "\x1b[37m" : "\x1b[90m",
			footer: isDark ? "\x1b[32m" : "\x1b[92m",
			reset: "\x1b[0m",
		};
	}

	private formatUptime(ms: number): string {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days}d ${hours % 24}h`;
		if (hours > 0) return `${hours}h ${minutes % 60}m`;
		if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
		return `${seconds}s`;
	}

	private getAverageResponseTime(): number {
		if (this.status.historicalData.length === 0)
			return this.status.responseTime;
		const sum = this.status.historicalData.reduce(
			(acc, snapshot) => acc + snapshot.responseTime,
			0,
		);
		return sum / this.status.historicalData.length;
	}

	private getPerformanceIndicator(avgResponse: number): string {
		return avgResponse < 200 ? "🟢" : avgResponse < 500 ? "🟡" : "🔴";
	}

	private getStatusIcon(status: string): string {
		return status === "online" || status === "connected"
			? "🟢"
			: status === "offline" || status === "disconnected"
				? "🔴"
				: status === "error"
					? "🟡"
					: "⚪";
	}

	private getStatusText(status: string): string {
		return status === "online" || status === "connected"
			? "✅ Online"
			: status === "offline" || status === "disconnected"
				? "❌ Offline"
				: status === "error"
					? "⚠️  Error"
					: "❓ Unknown";
	}

	private async checkNotifications() {
		if (!this.config.notifications.enabled) return;

		// Check for performance issues
		const avgResponse = this.getAverageResponseTime();
		if (avgResponse > this.config.notifications.performanceThreshold) {
			await this.sendNotification(
				"Performance Alert",
				`Average response time: ${avgResponse.toFixed(0)}ms`,
			);
		}

		// Check for service failures
		if (this.config.notifications.apiFailure && this.status.api !== "online") {
			await this.sendNotification(
				"API Alert",
				`API status: ${this.status.api}`,
			);
		}

		if (
			this.config.notifications.bucketFailure &&
			this.status.bucket !== "connected"
		) {
			await this.sendNotification(
				"Bucket Alert",
				`R2 Bucket status: ${this.status.bucket}`,
			);
		}
	}

	private async sendNotification(title: string, message: string) {
		const notification = `[${new Date().toLocaleTimeString()}] ${title}: ${message}`;
		console.info(`\n🔔 ${notification}`);

		if (this.config.logging) {
			await this.logEvent("NOTIFICATION", notification);
		}

		// System notification (macOS)
		if (process.platform === "darwin") {
			spawn(
				"osascript",
				["-e", `display notification "${message}" with title "${title}"`],
				{ stdio: "ignore" },
			);
		}
	}

	private async logEvent(type: string, message: string) {
		try {
			const logEntry = `[${new Date().toISOString()}] ${type}: ${message}\n`;
			await writeFile(this.logFile, logEntry, { flag: "a" });
		} catch (error) {
			// Silently fail logging
		}
	}

	private async logError(message: string, error: any) {
		await this.logEvent("ERROR", `${message}: ${error.message || error}`);
	}

	private setupGracefulShutdown() {
		console.info(
			"💡 Enhanced Controls: p=Stats, h=History, c=Config, l=Logs, a=Analytics, t=Theme, r=Reset, q=Quit",
		);

		process.on("SIGINT", async () => {
			console.info("\n👋 Shutting down enhanced widget...");
			await this.saveAnalytics();
			this.isRunning = false;
			process.exit(0);
		});

		process.stdin.setRawMode(true);
		process.stdin.resume();
		process.stdin.on("data", (key) => {
			this.handleKeyPress(key.toString());
		});
	}

	private async handleKeyPress(key: string) {
		switch (key) {
			case "1":
				this.openUrl("http://localhost:3001");
				break;
			case "2":
				this.openUrl("http://localhost:3001/api");
				break;
			case "3":
				this.openUrl("https://pub-a471e86af24446498311933a2eca2454.r2.dev");
				break;
			case "4":
				this.openUrl("file://" + process.cwd() + "/profiles/");
				break;
			case "p":
				this.showPerformanceStats();
				break;
			case "h":
				this.showHistoricalData();
				break;
			case "c":
				this.showConfiguration();
				break;
			case "l":
				this.showLogs();
				break;
			case "a":
				this.showAnalyticsReport();
				break;
			case "t":
				this.toggleTheme();
				break;
			case "r":
				this.resetMetrics();
				break;
			case "q":
			case "\u0003":
				console.info("\n👋 Shutting down enhanced widget...");
				this.isRunning = false;
				process.exit(0);
		}
	}

	private async showPerformanceStats() {
		console.info("\n📊 Enhanced Performance Statistics");
		console.info("=================================");
		console.info(
			`⚡ Current Response: ${this.status.responseTime.toFixed(2)}ms`,
		);
		console.info(
			`📈 Average Response: ${this.getAverageResponseTime().toFixed(2)}ms`,
		);
		console.info(`🎯 Success Rate: ${this.status.successRate.toFixed(1)}%`);
		console.info(`🕐 Uptime: ${this.formatUptime(this.status.uptime)}`);
		console.info(
			`💾 Memory Usage: ${Math.round(this.status.memoryUsage.heapUsed / 1024 / 1024)}MB`,
		);
		console.info(`🔧 Error Count: ${this.status.errorCount}`);
		console.info(`📊 Data Points: ${this.status.historicalData.length}`);
		console.info(
			`🔄 Refresh Interval: ${(this.config.refreshInterval / 1000).toFixed(1)}s`,
		);
		console.info("=================================\n");
	}

	private showHistoricalData() {
		console.info("\n📈 Historical Data Summary");
		console.info("==========================");

		if (this.status.historicalData.length === 0) {
			console.info("No historical data available yet.");
			return;
		}

		const recent = this.status.historicalData.slice(-10);
		console.info("Last 10 status checks:");
		recent.forEach((snapshot, index) => {
			const time = new Date(snapshot.timestamp).toLocaleTimeString();
			const apiIcon = this.getStatusIcon(snapshot.apiStatus);
			const bucketIcon = this.getStatusIcon(snapshot.bucketStatus);
			console.info(
				`  ${index + 1}. ${time} - ${apiIcon} API ${bucketIcon} R2 (${snapshot.responseTime.toFixed(0)}ms)`,
			);
		});
		console.info("==========================\n");
	}

	private async showConfiguration() {
		console.info("\n⚙️ Configuration");
		console.info("================");
		console.info(`🎨 Theme: ${this.config.theme}`);
		console.info(
			`🔄 Refresh: ${(this.config.refreshInterval / 1000).toFixed(1)}s`,
		);
		console.info(`📊 History: ${this.config.maxHistorySize} entries`);
		console.info(
			`🔔 Notifications: ${this.config.notifications.enabled ? "Enabled" : "Disabled"}`,
		);
		console.info(
			`📈 Analytics: ${this.config.analytics ? "Enabled" : "Disabled"}`,
		);
		console.info(`📝 Logging: ${this.config.logging ? "Enabled" : "Disabled"}`);
		console.info("================");
		console.info("Press [t] to toggle theme, [r] to reset metrics");
		console.info("================\n");
	}

	private async showLogs() {
		try {
			const logs = await readFile(this.logFile, "utf-8");
			const logLines = logs.split("\n").slice(-20); // Last 20 lines
			console.info("\n📝 Recent Logs");
			console.info("===============");
			logLines.forEach((line) => {
				if (line.trim()) console.info(line);
			});
			console.info("===============\n");
		} catch {
			console.info("\n📝 No logs available yet.\n");
		}
	}

	private async showAnalyticsReport() {
		console.info("\n📊 Analytics Report");
		console.info("==================");

		if (this.status.historicalData.length === 0) {
			console.info("No data available for analytics.");
			return;
		}

		const responseTimes = this.status.historicalData.map((s) => s.responseTime);
		const avgResponse =
			responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
		const minResponse = Math.min(...responseTimes);
		const maxResponse = Math.max(...responseTimes);

		const apiUptime = this.status.historicalData.filter(
			(s) => s.apiStatus === "online",
		).length;
		const bucketUptime = this.status.historicalData.filter(
			(s) => s.bucketStatus === "connected",
		).length;

		console.info(
			`📈 Response Time - Avg: ${avgResponse.toFixed(2)}ms, Min: ${minResponse.toFixed(2)}ms, Max: ${maxResponse.toFixed(2)}ms`,
		);
		console.info(
			`🟢 API Uptime: ${((apiUptime / this.status.historicalData.length) * 100).toFixed(1)}%`,
		);
		console.info(
			`☁️  Bucket Uptime: ${((bucketUptime / this.status.historicalData.length) * 100).toFixed(1)}%`,
		);
		console.info(
			`🎯 Overall Success Rate: ${this.status.successRate.toFixed(1)}%`,
		);
		console.info(`📊 Total Samples: ${this.status.historicalData.length}`);
		console.info("==================\n");
	}

	private async toggleTheme() {
		const themes: Array<"light" | "dark" | "auto"> = ["light", "dark", "auto"];
		const currentIndex = themes.indexOf(this.config.theme);
		this.config.theme = themes[(currentIndex + 1) % themes.length];
		await this.saveConfig();
		console.info(`\n🎨 Theme changed to: ${this.config.theme}\n`);
	}

	private resetMetrics() {
		this.status.historicalData = [];
		this.status.errorCount = 0;
		this.status.successRate = 0;
		this.startTime = Date.now();
		console.info("\n📊 Metrics reset successfully!\n");
	}

	private openUrl(url: string) {
		const command =
			process.platform === "darwin"
				? "open"
				: process.platform === "win32"
					? "start"
					: "xdg-open";
		spawn(command, [url], { detached: true, stdio: "ignore" });
		console.info(`🌐 Opening: ${url}`);
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// Start the enhanced widget
if (import.meta.main) {
	new EnhancedStatusWidget();
}

export { EnhancedStatusWidget };
