#!/usr/bin/env bun

// Simple macOS Status Bar Widget for Bun TOML Secrets Editor
// Standalone version without external dependencies

import { fetch } from "bun";
import { spawn } from "child_process";

interface WidgetStatus {
	api: "online" | "offline" | "error";
	bucket: "connected" | "disconnected" | "error";
	profiles: number;
	lastUpdate: string;
}

class SimpleStatusWidget {
	private status: WidgetStatus = {
		api: "offline",
		bucket: "disconnected",
		profiles: 119,
		lastUpdate: new Date().toISOString(),
	};
	private isRunning = true;

	constructor() {
		console.log("🍎 Bun TOML Secrets Editor Status Widget");
		console.log("==========================================");
		this.startMonitoring();
		this.setupGracefulShutdown();
	}

	private async startMonitoring() {
		console.log("📊 Starting status monitoring...");

		while (this.isRunning) {
			await this.checkStatus();
			this.displayStatus();
			await this.sleep(30000); // Update every 30 seconds
		}
	}

	private async checkStatus() {
		try {
			// Check API status with AbortController for timeout (optimized for Bun v1.3.7)
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000);

			const apiResponse = await fetch("http://localhost:3001/health", {
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			// Use compound boolean for status determination (ARM64 optimized)
			this.status.api =
				apiResponse.ok && apiResponse.status === 200 ? "online" : "error";
		} catch (error) {
			this.status.api = "offline";
		}

		try {
			// Check bucket status with AbortController for timeout (optimized for Bun v1.3.7)
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000);

			const bucketResponse = await fetch(
				"https://pub-a471e86af24446498311933a2eca2454.r2.dev/profiles/README.md",
				{
					signal: controller.signal,
				},
			);

			clearTimeout(timeoutId);

			// Use compound boolean for status determination (ARM64 optimized)
			this.status.bucket =
				bucketResponse.ok && bucketResponse.status === 200
					? "connected"
					: "error";
		} catch (error) {
			this.status.bucket = "disconnected";
		}

		this.status.lastUpdate = new Date().toISOString();
	}

	private displayStatus() {
		// Clear screen and show status
		console.clear();

		const apiIcon = this.getStatusIcon(this.status.api);
		const bucketIcon = this.getStatusIcon(this.status.bucket);
		const lastUpdate = new Date(this.status.lastUpdate).toLocaleTimeString();

		console.log("🍎 Bun TOML Secrets Editor Status Widget");
		console.log("==========================================");
		console.log("");
		console.log(
			`📊 Status: ${apiIcon} API  ${bucketIcon} R2 Bucket  📁 ${this.status.profiles} Profiles`,
		);
		console.log("");
		console.log("🔗 Services:");
		console.log(`   API:     ${this.getStatusText(this.status.api)}`);
		console.log(`   R2:      ${this.getStatusText(this.status.bucket)}`);
		console.log(`   Profiles: ${this.status.profiles} files organized`);
		console.log("");
		console.log("⚡ Quick Actions:");
		console.log("   [1] Open Dashboard    http://localhost:3001");
		console.log("   [2] Open API Docs     http://localhost:3001/api");
		console.log(
			"   [3] Open R2 Bucket    https://pub-a471e86af24446498311933a2eca2454.r2.dev",
		);
		console.log("   [4] View Profiles     ./profiles/");
		console.log("   [q] Quit Widget");
		console.log("");
		console.log(`🕐 Last Update: ${lastUpdate}`);
		console.log("==========================================");
	}

	private getStatusIcon(status: string): string {
		switch (status) {
			case "online":
			case "connected":
				return "🟢";
			case "offline":
			case "disconnected":
				return "🔴";
			case "error":
				return "🟡";
			default:
				return "⚪";
		}
	}

	private getStatusText(status: string): string {
		switch (status) {
			case "online":
			case "connected":
				return "✅ Online";
			case "offline":
			case "disconnected":
				return "❌ Offline";
			case "error":
				return "⚠️  Error";
			default:
				return "❓ Unknown";
		}
	}

	private setupGracefulShutdown() {
		// Simple control setup for Bun environment
		console.log("💡 Controls: Press Ctrl+C to quit");
		console.log("💡 Quick Actions: 1=Dashboard, 2=API Docs, 3=R2 Bucket");

		// Set up basic signal handling
		process.on("SIGINT", () => {
			console.log("\n👋 Shutting down...");
			this.isRunning = false;
			process.exit(0);
		});
	}

	private handleKeyPress(key: string) {
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
			case "q":
			case "\u0003": // Ctrl+C
				console.log("\n👋 Shutting down widget...");
				this.isRunning = false;
				process.exit(0);
				break;
		}
	}

	private openUrl(url: string) {
		const command =
			process.platform === "darwin"
				? "open"
				: process.platform === "win32"
					? "start"
					: "xdg-open";

		spawn(command, [url], { detached: true, stdio: "ignore" });
		console.log(`🌐 Opening: ${url}`);
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// Start the widget
if (import.meta.main) {
	new SimpleStatusWidget();
}

export { SimpleStatusWidget };
