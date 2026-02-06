#!/usr/bin/env bun
/**
 * Tier-1380 OpenClaw Integration Script
 *
 * Provides unified CLI for OpenClaw Gateway, Matrix Agent, and Telegram Bot
 * management with Bun-native APIs and Tier-1380 compliance.
 */

import { existsSync } from "fs";
import { join } from "path";

// Configuration
const CONFIG = {
	gateway: {
		port: 18789,
		host: "127.0.0.1",
		tailscale: "nolas-mac-mini.tailb53dda.ts.net",
		configPath: "~/.openclaw/openclaw.json",
	},
	matrix: {
		configPath: "~/.matrix/agent/config.json",
		profilesPath: "~/.matrix/profiles",
	},
	secrets: {
		service: "com.openclaw.gateway",
		tokenName: "gateway_token",
	},
	monitoring: {
		prometheusPort: 9090,
		dashboardPath: "~/monitoring/dashboard/index.html",
	},
};

// Type definitions
interface StatusResponse {
	component: string;
	status: "healthy" | "degraded" | "down";
	latency?: number;
	version?: string;
	message?: string;
}

interface ComponentHealth {
	name: string;
	check: () => Promise<StatusResponse>;
}

// Utility functions
const expandPath = (path: string): string => {
	if (path.startsWith("~")) {
		return join(process.env.HOME || "/Users/nolarose", path.slice(1));
	}
	return path;
};

const _getToken = async (): Promise<string | null> => {
	try {
		if (typeof Bun !== "undefined" && Bun.secrets) {
			return await Bun.secrets.get({
				service: CONFIG.secrets.service,
				name: CONFIG.secrets.tokenName,
			});
		}
	} catch {
		// Fallback to environment
	}
	return process.env.OPENCLAW_GATEWAY_TOKEN || null;
};

const checkPort = async (port: number, host: string): Promise<boolean> => {
	try {
		const conn = await Bun.connect({
			hostname: host,
			port: port,
		});
		conn.end();
		return true;
	} catch {
		return false;
	}
};

// Health check functions
const checkGateway = async (): Promise<StatusResponse> => {
	const start = performance.now();
	const isRunning = await checkPort(CONFIG.gateway.port, CONFIG.gateway.host);
	const latency = Math.round(performance.now() - start);

	if (!isRunning) {
		return {
			component: "OpenClaw Gateway",
			status: "down",
			message: `Port ${CONFIG.gateway.port} not responding`,
		};
	}

	// Try WebSocket upgrade
	try {
		const ws = new WebSocket(`ws://${CONFIG.gateway.host}:${CONFIG.gateway.port}/`);
		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error("Timeout")), 2000);
			ws.onopen = () => {
				clearTimeout(timeout);
				ws.close();
				resolve();
			};
			ws.onerror = () => {
				clearTimeout(timeout);
				reject(new Error("WS Error"));
			};
		});

		return {
			component: "OpenClaw Gateway",
			status: "healthy",
			latency,
			version: "v2026.1.30",
		};
	} catch {
		return {
			component: "OpenClaw Gateway",
			status: "degraded",
			latency,
			message: "HTTP responding but WS upgrade failed",
		};
	}
};

const checkMatrixAgent = async (): Promise<StatusResponse> => {
	const configPath = expandPath(CONFIG.matrix.configPath);

	if (!existsSync(configPath)) {
		return {
			component: "Matrix Agent",
			status: "down",
			message: "Config not found",
		};
	}

	try {
		const config = await Bun.file(configPath).json();
		return {
			component: "Matrix Agent",
			status: "healthy",
			version: config.version || "v1.0.0",
			message: `Name: ${config.name || "unknown"}`,
		};
	} catch (e) {
		return {
			component: "Matrix Agent",
			status: "degraded",
			message: `Config parse error: ${e}`,
		};
	}
};

const checkTelegramBot = async (): Promise<StatusResponse> => {
	const configPath = expandPath(CONFIG.gateway.configPath);

	try {
		const config = await Bun.file(configPath).json();
		const telegramEnabled = config.channels?.telegram?.enabled;

		if (!telegramEnabled) {
			return {
				component: "Telegram Bot",
				status: "down",
				message: "Disabled in config",
			};
		}

		const botToken = config.channels?.telegram?.botToken;
		if (!botToken) {
			return {
				component: "Telegram Bot",
				status: "degraded",
				message: "No bot token configured",
			};
		}

		return {
			component: "Telegram Bot",
			status: "healthy",
			message: "@mikehuntbot_bot",
		};
	} catch {
		return {
			component: "Telegram Bot",
			status: "down",
			message: "Config error",
		};
	}
};

const checkPrometheus = async (): Promise<StatusResponse> => {
	const isRunning = await checkPort(CONFIG.monitoring.prometheusPort, "127.0.0.1");

	if (!isRunning) {
		return {
			component: "Prometheus",
			status: "down",
			message: `Port ${CONFIG.monitoring.prometheusPort} not responding`,
		};
	}

	try {
		const res = await fetch(
			`http://127.0.0.1:${CONFIG.monitoring.prometheusPort}/api/v1/status/targets`,
		);
		if (res.ok) {
			return {
				component: "Prometheus",
				status: "healthy",
				message: "Metrics collection active",
			};
		}
		throw new Error("Bad response");
	} catch {
		return {
			component: "Prometheus",
			status: "degraded",
			message: "Port open but API not responding",
		};
	}
};

// Display functions
const displayStatus = async () => {
	const checks: ComponentHealth[] = [
		{ name: "Gateway", check: checkGateway },
		{ name: "Matrix Agent", check: checkMatrixAgent },
		{ name: "Telegram Bot", check: checkTelegramBot },
		{ name: "Prometheus", check: checkPrometheus },
	];

	console.log("\n🐾 Tier-1380 OpenClaw Status\n");
	console.log("─".repeat(60));

	const results: StatusResponse[] = [];

	for (const { name, check } of checks) {
		process.stdout.write(`Checking ${name}... `);
		const result = await check();
		results.push(result);

		const icon =
			result.status === "healthy" ? "✓" : result.status === "degraded" ? "⚠" : "✗";
		const color =
			result.status === "healthy"
				? "\x1b[32m"
				: result.status === "degraded"
					? "\x1b[33m"
					: "\x1b[31m";
		const reset = "\x1b[0m";

		console.log(`${color}${icon}${reset} ${result.status.toUpperCase()}`);

		if (result.latency) {
			console.log(`      Latency: ${result.latency}ms`);
		}
		if (result.version) {
			console.log(`      Version: ${result.version}`);
		}
		if (result.message && result.status !== "healthy") {
			console.log(`      ${color}${result.message}${reset}`);
		}
	}

	console.log("─".repeat(60));

	const healthy = results.filter((r) => r.status === "healthy").length;
	const total = results.length;

	console.log(`\nSummary: ${healthy}/${total} components healthy`);

	if (healthy === total) {
		console.log("\x1b[32m✓ All systems operational\x1b[0m");
	} else if (healthy >= total / 2) {
		console.log("\x1b[33m⚠ Some components degraded\x1b[0m");
	} else {
		console.log("\x1b[31m✗ Multiple components down\x1b[0m");
	}

	console.log();
};

const displayInfo = async () => {
	console.log("\n🐾 Tier-1380 OpenClaw Integration\n");

	const info = {
		"Gateway Version": "v2026.1.30",
		"Gateway Port": CONFIG.gateway.port,
		"Local URL": `http://${CONFIG.gateway.host}:${CONFIG.gateway.port}`,
		"Tailscale URL": `https://${CONFIG.gateway.tailscale}`,
		"Matrix Agent": "v1.0.0",
		"Migrated From": "clawdbot v2026.1.17-1",
		"Telegram Bot": "@mikehuntbot_bot",
		"Prometheus Port": CONFIG.monitoring.prometheusPort,
	};

	console.log(Bun.inspect.table(info));
	console.log();
};

// Command handlers
const commands: Record<string, () => Promise<void>> = {
	status: displayStatus,
	info: displayInfo,

	gateway: async () => {
		const gateway = await checkGateway();
		console.log("\n🌐 OpenClaw Gateway\n");
		console.log(
			Bun.inspect.table({
				Status: gateway.status,
				Version: gateway.version || "N/A",
				Latency: gateway.latency ? `${gateway.latency}ms` : "N/A",
				Port: CONFIG.gateway.port,
				"Tailscale Host": CONFIG.gateway.tailscale,
			}),
		);
		console.log();
	},

	matrix: async () => {
		const agent = await checkMatrixAgent();
		console.log("\n🤖 Matrix Agent\n");
		console.log(
			Bun.inspect.table({
				Status: agent.status,
				Version: agent.version || "N/A",
				Config: expandPath(CONFIG.matrix.configPath),
				Profiles: expandPath(CONFIG.matrix.profilesPath),
			}),
		);
		console.log();
	},

	telegram: async () => {
		const bot = await checkTelegramBot();
		console.log("\n📱 Telegram Bot\n");
		console.log(
			Bun.inspect.table({
				Status: bot.status,
				Username: bot.message || "N/A",
				"Config Path": expandPath(CONFIG.gateway.configPath),
			}),
		);
		console.log();
	},

	migrate: async () => {
		console.log("\n🔄 Migration from clawdbot\n");

		const legacyPath = expandPath("~/.clawdbot");
		const matrixPath = expandPath("~/.matrix");
		const markerPath = join(matrixPath, ".migrated-from-clawdbot");

		if (!existsSync(legacyPath)) {
			console.log("No legacy clawdbot installation found.");
			return;
		}

		if (existsSync(markerPath)) {
			console.log("Migration already completed.");
			console.log(`Marker: ${markerPath}`);
			return;
		}

		console.log("Legacy installation found at:", legacyPath);
		console.log("Matrix path:", matrixPath);
		console.log("\nTo migrate, run:");
		console.log("  matrix-agent migrate");
		console.log("\nOr manually copy configuration and create marker:");
		console.log(`  touch ${markerPath}`);
		console.log();
	},

	health: async () => {
		const all = await Promise.all([
			checkGateway(),
			checkMatrixAgent(),
			checkTelegramBot(),
			checkPrometheus(),
		]);

		console.log(JSON.stringify(all, null, 2));
	},

	help: async () => {
		console.log(`
🐾 Tier-1380 OpenClaw Integration

Usage: openclaw-integration.ts <command>

Commands:
  status       Show component status
  info         Show system information
  gateway      Show gateway details
  matrix       Show Matrix Agent details
  telegram     Show Telegram Bot details
  migrate      Check migration status
  health       Output health as JSON
  help         Show this help

Aliases (add to .zshrc):
  alias ocstatus='bun ~/.kimi/skills/tier1380-openclaw/scripts/openclaw-integration.ts status'
  alias ocinfo='bun ~/.kimi/skills/tier1380-openclaw/scripts/openclaw-integration.ts info'
  alias ochealth='bun ~/.kimi/skills/tier1380-openclaw/scripts/openclaw-integration.ts health'
`);
	},
};

// Main
const main = async () => {
	const cmd = process.argv[2] || "status";

	if (commands[cmd]) {
		await commands[cmd]();
	} else {
		console.error(`Unknown command: ${cmd}`);
		console.log("Run 'openclaw-integration.ts help' for usage.");
		process.exit(1);
	}
};

main().catch((err) => {
	console.error("Error:", err);
	process.exit(1);
});
