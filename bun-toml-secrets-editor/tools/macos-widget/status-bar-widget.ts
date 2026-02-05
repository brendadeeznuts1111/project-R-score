#!/usr/bin/env bun

// macOS Status Bar Widget for Bun TOML Secrets Editor
// Shows API status, bucket health, and system metrics

import { listen } from "@tauri-apps/api/event";
import { StatusBar } from "@tauri-apps/api/window";
import { fetch } from "bun";

interface WidgetStatus {
	api: "online" | "offline" | "error";
	bucket: "connected" | "disconnected" | "error";
	profiles: number;
	lastUpdate: string;
}

class SecretsEditorWidget {
	private statusBar: StatusBar | null = null;
	private status: WidgetStatus = {
		api: "offline",
		bucket: "disconnected",
		profiles: 0,
		lastUpdate: new Date().toISOString(),
	};
	private updateInterval: NodeJS.Timeout | null = null;

	constructor() {
		this.init();
	}

	private async init() {
		try {
			// Create status bar item
			this.statusBar = new StatusBar();
			await this.statusBar.create();

			// Set initial text
			await this.updateDisplay();

			// Start monitoring
			this.startMonitoring();

			console.log("🍎 macOS Status Bar Widget initialized");
		} catch (error) {
			console.error("❌ Failed to initialize widget:", error);
		}
	}

	private startMonitoring() {
		// Update every 30 seconds
		this.updateInterval = setInterval(async () => {
			await this.checkStatus();
			await this.updateDisplay();
		}, 30000);

		// Initial check
		this.checkStatus();
	}

	private async checkStatus() {
		try {
			// Check API status
			const apiResponse = await fetch("http://localhost:3001/health", {
				timeout: 5000,
			});

			this.status.api = apiResponse.ok ? "online" : "error";

			// Check bucket status
			const bucketResponse = await fetch(
				"https://pub-a471e86af24446498311933a2eca2454.r2.dev/profiles/README.md",
				{
					timeout: 5000,
				},
			);

			this.status.bucket = bucketResponse.ok ? "connected" : "error";

			// Get profile count (simulated - in real app would fetch from API)
			this.status.profiles = 119; // From our organization

			this.status.lastUpdate = new Date().toISOString();
		} catch (error) {
			console.error("Status check failed:", error);
			this.status.api = "offline";
			this.status.bucket = "disconnected";
		}
	}

	private async updateDisplay() {
		if (!this.statusBar) return;

		const apiIcon = this.getStatusIcon(this.status.api);
		const bucketIcon = this.getStatusIcon(this.status.bucket);

		const text = `${apiIcon} API ${bucketIcon} R2 📊 ${this.status.profiles}`;

		try {
			await this.statusBar.setText(text);
			await this.statusBar.setTooltip(this.getTooltip());
		} catch (error) {
			console.error("Failed to update display:", error);
		}
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

	private getTooltip(): string {
		const apiStatus =
			this.status.api.charAt(0).toUpperCase() + this.status.api.slice(1);
		const bucketStatus =
			this.status.bucket.charAt(0).toUpperCase() + this.status.bucket.slice(1);
		const lastUpdate = new Date(this.status.lastUpdate).toLocaleTimeString();

		return `Bun TOML Secrets Editor Status
🔗 API: ${apiStatus}
☁️  R2 Bucket: ${bucketStatus}
📁 Profiles: ${this.status.profiles} files
🕐 Last Update: ${lastUpdate}

Click to open dashboard`;
	}

	public async destroy() {
		if (this.updateInterval) {
			clearInterval(this.updateInterval);
		}
		if (this.statusBar) {
			await this.statusBar.destroy();
		}
	}
}

import { app, BrowserWindow, Menu } from "electron";
// Alternative implementation using macOS menubar library (Node.js version)
import * as menubar from "menubar";

class MacOSSystemWidget {
	private mb: any;
	private status: WidgetStatus = {
		api: "offline",
		bucket: "disconnected",
		profiles: 0,
		lastUpdate: new Date().toISOString(),
	};

	constructor() {
		this.initElectronWidget();
	}

	private initElectronWidget() {
		this.mb = menubar({
			index: `file://${__dirname}/widget.html`,
			tooltip: "Bun TOML Secrets Editor",
			icon: this.getIconPath(),
			preloadWindow: true,
			window: {
				width: 300,
				height: 200,
				webPreferences: {
					nodeIntegration: true,
					contextIsolation: false,
				},
			},
		});

		this.mb.on("ready", () => {
			console.log("🍎 macOS Status Bar Widget ready");
			this.startMonitoring();
			this.setupMenu();
		});
	}

	private startMonitoring() {
		setInterval(async () => {
			await this.checkStatus();
			this.updateTray();
		}, 30000);

		this.checkStatus();
	}

	private async checkStatus() {
		try {
			// Check API
			const apiResponse = await fetch("http://localhost:3001/health");
			this.status.api = apiResponse.ok ? "online" : "error";

			// Check bucket
			const bucketResponse = await fetch(
				"https://pub-a471e86af24446498311933a2eca2454.r2.dev/profiles/README.md",
			);
			this.status.bucket = bucketResponse.ok ? "connected" : "error";

			this.status.profiles = 119;
			this.status.lastUpdate = new Date().toISOString();
		} catch (error) {
			this.status.api = "offline";
			this.status.bucket = "disconnected";
		}
	}

	private updateTray() {
		if (!this.mb.tray) return;

		const apiIcon = this.getStatusIcon(this.status.api);
		const bucketIcon = this.getStatusIcon(this.status.bucket);
		const title = `${apiIcon} ${bucketIcon} 📊 ${this.status.profiles}`;

		this.mb.tray.setTitle(title);
		this.mb.tray.setToolTip(this.getTooltip());
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

	private getTooltip(): string {
		const apiStatus =
			this.status.api.charAt(0).toUpperCase() + this.status.api.slice(1);
		const bucketStatus =
			this.status.bucket.charAt(0).toUpperCase() + this.status.bucket.slice(1);
		const lastUpdate = new Date(this.status.lastUpdate).toLocaleTimeString();

		return `API: ${apiStatus} | R2: ${bucketStatus} | Profiles: ${this.status.profiles} | ${lastUpdate}`;
	}

	private getIconPath(): string {
		// Return path to icon file (create a simple icon)
		return __dirname + "/icon.png";
	}

	private setupMenu() {
		const template = [
			{
				label: "Open Dashboard",
				click: () => {
					this.openDashboard();
				},
			},
			{
				label: "API Health",
				click: () => {
					this.openUrl("http://localhost:3001/health");
				},
			},
			{
				label: "R2 Bucket",
				click: () => {
					this.openUrl("https://pub-a471e86af24446498311933a2eca2454.r2.dev");
				},
			},
			{ type: "separator" },
			{
				label: "Refresh Status",
				click: () => {
					this.checkStatus();
					this.updateTray();
				},
			},
			{
				label: "Quit",
				click: () => {
					app.quit();
				},
			},
		];

		const contextMenu = Menu.buildFromTemplate(template);
		this.mb.tray.setContextMenu(contextMenu);
	}

	private openDashboard() {
		this.openUrl("http://localhost:3001");
	}

	private openUrl(url: string) {
		// Use appropriate method for opening URLs
		if (process.platform === "darwin") {
			require("child_process").exec(`open "${url}"`);
		} else if (process.platform === "win32") {
			require("child_process").exec(`start "${url}"`);
		} else {
			require("child_process").exec(`xdg-open "${url}"`);
		}
	}
}

// Auto-start based on environment
if (typeof window !== "undefined" && window.__TAURI__) {
	// Tauri environment
	new SecretsEditorWidget();
} else if (typeof require !== "undefined") {
	// Electron/Node.js environment
	app.whenReady().then(() => {
		new MacOSSystemWidget();
	});
}

export { SecretsEditorWidget, MacOSSystemWidget };
