#!/usr/bin/env bun
// Enhanced Widget Test Suite

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { spawn } from "child_process";
import type { readFile, writeFile } from "fs/promises";

// Mock file system operations
const mockWriteFile = mock(() => Promise.resolve());
const mockReadFile = mock(() => Promise.reject(new Error("File not found")));
const mockMkdirSync = mock(() => {});

// Mock process methods
const mockSpawn = mock(() => ({ on: mock(() => {}) }));

// Test utility class
class TestableEnhancedWidget {
	public status: any;
	public config: any;
	public isRunning: boolean;
	public startTime: number; // Make public for testing

	constructor() {
		this.startTime = Date.now();
		this.isRunning = false;
		this.status = {
			api: "offline",
			bucket: "disconnected",
			profiles: 119,
			lastUpdate: new Date().toISOString(),
			responseTime: 0,
			uptime: 0,
			memoryUsage: { heapUsed: 50000000 },
			cpuUsage: { user: 0, system: 0 },
			errorCount: 0,
			successRate: 0,
			historicalData: [],
		};

		this.config = {
			theme: "auto",
			refreshInterval: 30000,
			maxHistorySize: 100,
			notifications: {
				enabled: true,
				apiFailure: true,
				bucketFailure: true,
				performanceThreshold: 1000,
				soundEnabled: false,
			},
			analytics: true,
			logging: true,
		};
	}

	// Expose private methods for testing
	public getThemeColors() {
		const isDark =
			this.config.theme === "dark" ||
			(this.config.theme === "auto" && new Date().getHours() >= 18);

		return {
			header: isDark ? "\x1b[36m" : "\x1b[94m",
			divider: isDark ? "\x1b[90m" : "\x1b[37m",
			status: isDark ? "\x1b[32m" : "\x1b[92m",
			reset: "\x1b[0m",
		};
	}

	public formatUptime(ms: number): string {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days}d ${hours % 24}h`;
		if (hours > 0) return `${hours}h ${minutes % 60}m`;
		if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
		return `${seconds}s`;
	}

	public getAverageResponseTime(): number {
		if (this.status.historicalData.length === 0)
			return this.status.responseTime;
		const sum = this.status.historicalData.reduce(
			(acc: number, snapshot: any) => acc + snapshot.responseTime,
			0,
		);
		return sum / this.status.historicalData.length;
	}

	public getPerformanceIndicator(avgResponse: number): string {
		return avgResponse < 200 ? "🟢" : avgResponse < 500 ? "🟡" : "🔴";
	}

	public getStatusIcon(status: string): string {
		return status === "online" || status === "connected"
			? "🟢"
			: status === "offline" || status === "disconnected"
				? "🔴"
				: status === "error"
					? "🟡"
					: "⚪";
	}

	public getStatusText(status: string): string {
		return status === "online" || status === "connected"
			? "✅ Online"
			: status === "offline" || status === "disconnected"
				? "❌ Offline"
				: status === "error"
					? "⚠️  Error"
					: "❓ Unknown";
	}

	public updateHistoricalData() {
		const snapshot = {
			timestamp: this.status.lastUpdate,
			apiStatus: this.status.api,
			bucketStatus: this.status.bucket,
			responseTime: this.status.responseTime,
			memoryUsage: this.status.memoryUsage.heapUsed,
		};

		this.status.historicalData.push(snapshot);

		if (this.status.historicalData.length > this.config.maxHistorySize) {
			this.status.historicalData = this.status.historicalData.slice(
				-this.config.maxHistorySize,
			);
		}
	}

	public updateMetrics() {
		this.status.uptime = Date.now() - this.startTime;

		if (this.status.historicalData.length > 0) {
			const successful = this.status.historicalData.filter(
				(snapshot: any) =>
					snapshot.apiStatus === "online" &&
					snapshot.bucketStatus === "connected",
			).length;
			this.status.successRate =
				(successful / this.status.historicalData.length) * 100;
		}
	}

	public async toggleTheme() {
		const themes: Array<"light" | "dark" | "auto"> = ["light", "dark", "auto"];
		const currentIndex = themes.indexOf(this.config.theme);
		this.config.theme = themes[(currentIndex + 1) % themes.length];
	}

	public resetMetrics() {
		this.status.historicalData = [];
		this.status.errorCount = 0;
		this.status.successRate = 0;
		this.startTime = Date.now();
	}
}

describe("Enhanced Widget", () => {
	let widget: TestableEnhancedWidget;
	let originalFetch: typeof global.fetch;
	let originalWriteFile: typeof writeFile;
	let originalReadFile: typeof readFile;
	let originalSpawn: typeof spawn;

	beforeEach(() => {
		widget = new TestableEnhancedWidget();

		// Mock global functions
		originalFetch = global.fetch;
		originalWriteFile = (global as any).writeFile;
		originalReadFile = (global as any).readFile;
		originalSpawn = (global as any).spawn;

		global.fetch = mock((url: string) => {
			if (url.includes("localhost:3001")) {
				return Promise.resolve({ ok: true, status: 200 });
			}
			if (url.includes("pub-a471e86af24446498311933a2eca2454.r2.dev")) {
				return Promise.resolve({ ok: true, status: 200 });
			}
			return Promise.resolve({ ok: false, status: 404 });
		}) as unknown as typeof global.fetch;

		(global as any).writeFile = mockWriteFile;
		(global as any).readFile = mockReadFile;
		(global as any).spawn = mockSpawn;
	});

	afterEach(() => {
		global.fetch = originalFetch;
		(global as any).writeFile = originalWriteFile;
		(global as any).readFile = originalReadFile;
		(global as any).spawn = originalSpawn;
	});

	describe("Theme System", () => {
		it("should return dark theme colors for dark theme", () => {
			widget.config.theme = "dark";
			const colors = widget.getThemeColors();

			expect(colors.header).toBe("\x1b[36m");
			expect(colors.status).toBe("\x1b[32m");
			expect(colors.reset).toBe("\x1b[0m");
		});

		it("should return light theme colors for light theme", () => {
			widget.config.theme = "light";
			const colors = widget.getThemeColors();

			expect(colors.header).toBe("\x1b[94m");
			expect(colors.status).toBe("\x1b[92m");
			expect(colors.reset).toBe("\x1b[0m");
		});

		it("should return auto theme colors based on time", () => {
			// Mock evening time (should use dark colors)
			const originalHours = new Date().getHours;
			Date.prototype.getHours = () => 20;

			widget.config.theme = "auto";
			const colors = widget.getThemeColors();

			expect(colors.header).toBe("\x1b[36m"); // Dark theme colors

			// Restore original method
			Date.prototype.getHours = originalHours;
		});
	});

	describe("Utility Functions", () => {
		it("should format uptime correctly", () => {
			expect(widget.formatUptime(1000)).toBe("1s");
			expect(widget.formatUptime(65000)).toBe("1m 5s");
			expect(widget.formatUptime(3665000)).toBe("1h 1m");
			expect(widget.formatUptime(90065000)).toBe("1d 1h");
		});

		it("should calculate average response time", () => {
			// Test with no historical data
			expect(widget.getAverageResponseTime()).toBe(widget.status.responseTime);

			// Test with historical data
			widget.status.historicalData = [
				{ responseTime: 100 },
				{ responseTime: 200 },
				{ responseTime: 300 },
			];
			expect(widget.getAverageResponseTime()).toBe(200);
		});

		it("should return correct performance indicators", () => {
			expect(widget.getPerformanceIndicator(150)).toBe("🟢");
			expect(widget.getPerformanceIndicator(350)).toBe("🟡");
			expect(widget.getPerformanceIndicator(750)).toBe("🔴");
		});
	});

	describe("Status Functions", () => {
		it("should return correct status icons", () => {
			expect(widget.getStatusIcon("online")).toBe("🟢");
			expect(widget.getStatusIcon("connected")).toBe("🟢");
			expect(widget.getStatusIcon("offline")).toBe("🔴");
			expect(widget.getStatusIcon("disconnected")).toBe("🔴");
			expect(widget.getStatusIcon("error")).toBe("🟡");
			expect(widget.getStatusIcon("unknown")).toBe("⚪");
		});

		it("should return correct status text", () => {
			expect(widget.getStatusText("online")).toBe("✅ Online");
			expect(widget.getStatusText("connected")).toBe("✅ Online");
			expect(widget.getStatusText("offline")).toBe("❌ Offline");
			expect(widget.getStatusText("disconnected")).toBe("❌ Offline");
			expect(widget.getStatusText("error")).toBe("⚠️  Error");
			expect(widget.getStatusText("unknown")).toBe("❓ Unknown");
		});
	});

	describe("Historical Data Management", () => {
		it("should add historical data correctly", () => {
			const initialLength = widget.status.historicalData.length;
			widget.updateHistoricalData();

			expect(widget.status.historicalData.length).toBe(initialLength + 1);
			expect(
				widget.status.historicalData[widget.status.historicalData.length - 1],
			).toHaveProperty("timestamp");
			expect(
				widget.status.historicalData[widget.status.historicalData.length - 1],
			).toHaveProperty("responseTime");
		});

		it("should maintain max history size", () => {
			widget.config.maxHistorySize = 3;

			// Add more entries than max size
			for (let i = 0; i < 5; i++) {
				widget.updateHistoricalData();
			}

			expect(widget.status.historicalData.length).toBe(3);
		});
	});

	describe("Metrics Calculation", () => {
		it("should update uptime correctly", async () => {
			const initialUptime = widget.status.uptime;

			// Wait a bit to ensure time passes
			await new Promise((resolve) => setTimeout(resolve, 10));

			widget.updateMetrics();

			expect(widget.status.uptime).toBeGreaterThan(initialUptime);
		});

		it("should calculate success rate correctly", () => {
			widget.status.historicalData = [
				{ apiStatus: "online", bucketStatus: "connected" },
				{ apiStatus: "online", bucketStatus: "connected" },
				{ apiStatus: "offline", bucketStatus: "connected" },
			];

			widget.updateMetrics();
			expect(widget.status.successRate).toBe(66.66666666666666);
		});
	});

	describe("Configuration Management", () => {
		it("should toggle theme correctly", async () => {
			const initialTheme = widget.config.theme;
			await widget.toggleTheme();

			expect(widget.config.theme).not.toBe(initialTheme);

			// Test that it cycles through themes
			const themes: Array<"light" | "dark" | "auto"> = [
				"light",
				"dark",
				"auto",
			];
			const currentIndex = themes.indexOf(initialTheme);
			const expectedNextTheme = themes[(currentIndex + 1) % themes.length];

			expect(widget.config.theme).toBe(expectedNextTheme);
		});
	});

	describe("Metrics Reset", () => {
		it("should reset all metrics correctly", async () => {
			// Add some data
			widget.status.historicalData = [{ responseTime: 100 }];
			widget.status.errorCount = 5;
			widget.status.successRate = 75;

			const initialStartTime = widget.startTime;

			// Wait a bit before reset to ensure different timestamp
			await new Promise((resolve) => setTimeout(resolve, 10));

			widget.resetMetrics();

			expect(widget.status.historicalData.length).toBe(0);
			expect(widget.status.errorCount).toBe(0);
			expect(widget.status.successRate).toBe(0);
			expect(widget.startTime).toBeGreaterThan(initialStartTime);
		});
	});

	describe("Integration Tests", () => {
		it("should handle complete workflow", async () => {
			// Initial state
			expect(widget.status.api).toBe("offline");
			expect(widget.status.bucket).toBe("disconnected");

			// Update historical data
			widget.updateHistoricalData();
			widget.updateHistoricalData();

			// Wait a bit then update metrics
			await new Promise((resolve) => setTimeout(resolve, 10));
			widget.updateMetrics();

			// Verify state
			expect(widget.status.historicalData.length).toBe(2);
			expect(widget.status.uptime).toBeGreaterThan(0);

			// Test utility functions
			expect(widget.getStatusIcon("online")).toBe("🟢");
			expect(widget.formatUptime(65000)).toBe("1m 5s");
			expect(widget.getPerformanceIndicator(150)).toBe("🟢");

			// Test configuration
			await widget.toggleTheme();
			expect(["light", "dark", "auto"]).toContain(widget.config.theme);

			// Reset metrics
			widget.resetMetrics();
			expect(widget.status.historicalData.length).toBe(0);
		});
	});
});

console.log("🧪 Enhanced Widget Tests Complete!");
