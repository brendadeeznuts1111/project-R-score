#!/usr/bin/env bun
/**
 * OpenClaw Status Command
 *
 * Check status of OpenClaw Gateway, Matrix Agent, and related components
 */

import { fmt } from "../../.claude/lib/cli.ts";
import { EXIT_CODES } from "../../.claude/lib/exit-codes.ts";
import { DEFAULT_HOST, OPENCLAW_GATEWAY_PORT, PROMETHEUS_PORT } from "../constants.ts";

interface ComponentStatus {
	name: string;
	status: "healthy" | "degraded" | "down";
	version?: string;
	latency?: number;
	message?: string;
	url?: string;
}

const checkPort = async (port: number, host: string): Promise<boolean> => {
	try {
		const conn = await Bun.connect({ hostname: host, port });
		conn.end();
		return true;
	} catch {
		return false;
	}
};

const checkGateway = async (): Promise<ComponentStatus> => {
	const start = performance.now();
	const isRunning = await checkPort(OPENCLAW_GATEWAY_PORT, DEFAULT_HOST);
	const latency = Math.round(performance.now() - start);
	const url = `ws://${DEFAULT_HOST}:${OPENCLAW_GATEWAY_PORT}`;

	if (!isRunning) {
		return {
			name: "OpenClaw Gateway",
			status: "down",
			message: `Port ${OPENCLAW_GATEWAY_PORT} not responding`,
			url,
		};
	}

	return {
		name: "OpenClaw Gateway",
		status: "healthy",
		version: "v2026.1.30",
		latency,
		url,
	};
};

const checkMatrixAgent = async (): Promise<ComponentStatus> => {
	try {
		const configPath = `${process.env.HOME}/.matrix/agent/config.json`;
		const file = Bun.file(configPath);
		const config = await file.json();
		return {
			name: "Matrix Agent",
			status: "healthy",
			version: config.version || "v1.0.0",
			url: `file://${configPath}`,
		};
	} catch {
		return {
			name: "Matrix Agent",
			status: "down",
			message: "Config not found or invalid",
			url: `file://${process.env.HOME}/.matrix/agent/config.json`,
		};
	}
};

const checkTelegramBot = async (): Promise<ComponentStatus> => {
	try {
		const configPath = `${process.env.HOME}/.openclaw/openclaw.json`;
		const file = Bun.file(configPath);
		const config = await file.json();
		const enabled = config.channels?.telegram?.enabled;

		return {
			name: "Telegram Bot",
			status: enabled ? "healthy" : "degraded",
			message: enabled ? "@mikehuntbot_bot" : "Disabled in config",
		};
	} catch {
		return {
			name: "Telegram Bot",
			status: "down",
			message: "Config error",
		};
	}
};

const checkPrometheus = async (): Promise<ComponentStatus> => {
	const isRunning = await checkPort(PROMETHEUS_PORT, DEFAULT_HOST);
	const url = `http://${DEFAULT_HOST}:${PROMETHEUS_PORT}`;

	if (!isRunning) {
		return {
			name: "Prometheus",
			status: "down",
			message: `Port ${PROMETHEUS_PORT} not responding`,
			url,
		};
	}

	return {
		name: "Prometheus",
		status: "healthy",
		url,
	};
};

const getStatusIcon = (status: string): string => {
	switch (status) {
		case "healthy":
			return `${fmt.ok("")}●`;
		case "degraded":
			return `${fmt.warn("")}●`;
		case "down":
			return `${fmt.fail("")}●`;
		default:
			return "○";
	}
};

export async function openclawStatus(
	options: { json?: boolean; watch?: boolean; interval?: number } = {},
): Promise<void> {
	const { json = false, watch = false, interval = 5000 } = options;

	const checkAll = async (): Promise<ComponentStatus[]> => {
		return Promise.all([
			checkGateway(),
			checkMatrixAgent(),
			checkTelegramBot(),
			checkPrometheus(),
		]);
	};

	const display = async () => {
		const results = await checkAll();

		if (json) {
			console.log(JSON.stringify(results, null, 2));
			return;
		}

		console.log(fmt.bold("\n🐾 OpenClaw Infrastructure Status\n"));
		console.log("─".repeat(70));

		for (const r of results) {
			const icon = getStatusIcon(r.status);
			const statusColor =
				r.status === "healthy"
					? (m: string) => fmt.ok(m)
					: r.status === "degraded"
						? (m: string) => fmt.warn(m)
						: (m: string) => fmt.fail(m);

			console.log(`${icon} ${fmt.bold(r.name)} ${statusColor(r.status.toUpperCase())}`);

			if (r.version) console.log(`   Version: ${r.version}`);
			if (r.latency) console.log(`   Latency: ${r.latency}ms`);
			if (r.url) console.log(`   URL: ${fmt.dim(r.url)}`);
			if (r.message && r.status !== "healthy")
				console.log(`   ${statusColor(r.message)}`);
			console.log();
		}

		console.log("─".repeat(70));

		const healthy = results.filter((r) => r.status === "healthy").length;
		const total = results.length;

		if (healthy === total) {
			console.log(fmt.ok(`\n✓ All ${total} components operational`));
		} else if (healthy >= total / 2) {
			console.log(fmt.warn(`\n⚠ ${healthy}/${total} components healthy`));
		} else {
			console.log(fmt.fail(`\n✗ ${healthy}/${total} components healthy`));
		}

		if (watch) {
			console.log(fmt.dim(`\n[Refreshing every ${interval}ms... Press Ctrl+C to exit]`));
		} else {
			console.log();
		}
	};

	if (watch) {
		// Clear screen and show status
		const show = async () => {
			console.clear();
			await display();
		};

		await show();
		setInterval(show, interval);
	} else {
		await display();
	}
}

export async function openclawHealth(): Promise<void> {
	console.log(fmt.bold("\n🏥 OpenClaw Health Report\n"));

	const checks = [
		{ name: "Gateway Config", path: `${process.env.HOME}/.openclaw/openclaw.json` },
		{
			name: "Matrix Agent Config",
			path: `${process.env.HOME}/.matrix/agent/config.json`,
		},
		{ name: "Profiles Directory", path: `${process.env.HOME}/.matrix/profiles` },
		{ name: "Logs Directory", path: `${process.env.HOME}/.matrix/logs` },
	];

	const results = [];

	for (const check of checks) {
		const exists = await Bun.file(check.path).exists();
		const stat = exists ? await Bun.file(check.path).stat() : null;

		results.push({
			name: check.name,
			path: check.path,
			exists,
			size: stat?.size,
			modified: stat?.mtime,
		});

		const icon = exists ? fmt.ok("✓") : fmt.fail("✗");
		console.log(`${icon} ${check.name}`);
		console.log(`   ${fmt.dim(check.path)}`);
		if (stat) {
			console.log(`   Size: ${stat.size} bytes, Modified: ${stat.mtime?.toISOString()}`);
		}
		console.log();
	}

	const allExist = results.every((r) => r.exists);

	if (allExist) {
		console.log(fmt.ok("✓ All health checks passed"));
	} else {
		console.log(fmt.warn("⚠ Some components missing"));
		process.exit(EXIT_CODES.ERROR);
	}
}

export async function openclawInfo(): Promise<void> {
	const info = {
		"Gateway Version": "v2026.1.30",
		"Gateway Port": OPENCLAW_GATEWAY_PORT,
		"Local URL": `http://${DEFAULT_HOST}:${OPENCLAW_GATEWAY_PORT}`,
		"Tailscale URL": "https://nolas-mac-mini.tailb53dda.ts.net",
		"Matrix Agent": "v1.0.0",
		"Migrated From": "clawdbot v2026.1.17-1",
		"Telegram Bot": "@mikehuntbot_bot",
		"Prometheus Port": PROMETHEUS_PORT,
		"Config Path": `${process.env.HOME}/.openclaw/openclaw.json`,
		"Profiles Path": `${process.env.HOME}/.matrix/profiles`,
		"Logs Path": `${process.env.HOME}/.matrix/logs`,
	};

	console.log(fmt.bold("\n🐾 OpenClaw System Information\n"));
	console.log(Bun.inspect.table(info));
	console.log();
}
