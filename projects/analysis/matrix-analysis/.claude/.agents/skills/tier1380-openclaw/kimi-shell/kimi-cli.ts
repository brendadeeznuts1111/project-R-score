#!/usr/bin/env bun
/**
 * Kimi CLI - Unified interface for Kimi Shell tools
 * Enhanced v2.0 with interactive mode and performance monitoring
 */

import { $ } from "bun";
import { join } from "path";

const COMMANDS = {
	metrics: {
		description: "Metrics collection and dashboard",
		script: "metrics-collector.ts",
		subcommands: ["collect", "dashboard", "record", "export"],
	},
	shell: {
		description: "Shell management and execution",
		script: "kimi-shell-manager.ts",
		subcommands: ["status", "exec", "switch", "integrations"],
	},
	settings: {
		description: "Settings dashboard",
		script: "settings-dashboard.ts",
		subcommands: [],
	},
	workflow: {
		description: "Workflow visualizer",
		script: "workflow-visualizer.ts",
		subcommands: ["mcp", "acp", "integrated", "matrix"],
	},
	vault: {
		description: "Vault credential management",
		script: "../../../../../../.factory-wager/vault.ts",
		subcommands: ["health", "list"],
	},
	interactive: {
		description: "Interactive shell mode",
		script: "interactive-mode.ts",
		subcommands: [],
	},
	monitor: {
		description: "Performance monitoring",
		script: "performance-monitor.ts",
		subcommands: ["watch", "snapshot", "report"],
	},
	plugin: {
		description: "Plugin system",
		script: "plugin-system.ts",
		subcommands: ["list", "commands", "exec"],
	},
	config: {
		description: "Configuration manager",
		script: "config-manager.ts",
		subcommands: ["get", "set", "alias", "show", "reset", "path"],
	},
	session: {
		description: "Session management",
		script: "session-manager.ts",
		subcommands: ["create", "list", "switch", "export", "import", "archive"],
	},
	error: {
		description: "Error handling",
		script: "error-handler.ts",
		subcommands: ["logs", "retry", "test"],
	},
	job: {
		description: "Background job queue",
		script: "job-queue.ts",
		subcommands: ["run", "list", "status", "logs", "cancel", "delete", "cleanup"],
	},
	log: {
		description: "Structured logging",
		script: "logger.ts",
		subcommands: ["test", "query", "tail", "path"],
	},
	security: {
		description: "Security validation",
		script: "security-guard.ts",
		subcommands: ["validate", "check-path", "policy", "test"],
	},
	notify: {
		description: "Notification system",
		script: "notify.ts",
		subcommands: ["send", "desktop", "trigger", "rules", "test"],
	},
	update: {
		description: "Auto-update manager",
		script: "auto-update.ts",
		subcommands: ["check", "install", "skip", "auto", "status", "rollback"],
	},
	telegram: {
		description: "Telegram integration",
		script: "../../../../../../matrix-agent/integrations/telegram-bridge.ts",
		subcommands: [
			"status",
			"send",
			"react",
			"sticker",
			"edit",
			"delete",
			"info",
			"stickers",
			"search-stickers",
			"reaction-level",
		],
	},
	openclaw: {
		description: "OpenClaw bridge",
		script: "../../../../../../matrix-agent/integrations/openclaw-bridge.ts",
		subcommands: ["init", "status", "telegram", "sync", "proxy"],
	},
	topic: {
		description: "Telegram topic manager",
		script: "../scripts/topic-manager.ts",
		subcommands: ["list", "super", "channels", "routing", "route", "all"],
	},
	channel: {
		description: "Channel monitor",
		script: "../scripts/channel-monitor.ts",
		subcommands: ["dashboard", "watch", "stats"],
	},
	project: {
		description: "Project integration",
		script: "../scripts/project-integration.ts",
		subcommands: ["list", "groups", "show", "current", "route", "notify"],
	},
	webhook: {
		description: "GitHub webhook bridge",
		script: "../scripts/github-webhook-bridge.ts",
		subcommands: ["simulate", "server", "test"],
	},
	hooks: {
		description: "Git hooks for topic routing",
		script: "../scripts/topic-git-hooks.ts",
		subcommands: ["install", "uninstall", "list"],
	},
	watch: {
		description: "File watcher for projects",
		script: "../scripts/project-watch.ts",
		subcommands: ["start", "status"],
	},
	integration: {
		description: "Integration status dashboard",
		script: "../scripts/integration-status.ts",
		subcommands: ["stats", "matrix"],
	},
	perf: {
		description: "JSC Performance monitoring",
		script: "../scripts/lib/jsc-monitor.ts",
		subcommands: [
			"memory",
			"gc",
			"profile",
			"monitor",
			"timezone",
			"describe",
			"snapshot",
			"drain",
		],
	},
	color: {
		description: "Color utility (Bun.color API)",
		script: "../scripts/lib/color.ts",
		subcommands: ["convert", "rgba", "ansi", "contrast", "lighten", "darken", "topics"],
	},
	test: {
		description: "Run integration test suite",
		script: "../scripts/test-integration.ts",
		subcommands: [],
	},
	setup: {
		description: "Quick setup wizard",
		script: "../scripts/quick-setup.ts",
		subcommands: [],
	},
};

const COLORS = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	cyan: "\x1b[36m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	gray: "\x1b[90m",
};

function printBanner(): void {
	console.log(`${COLORS.bold}${COLORS.cyan}`);
	console.log("╔══════════════════════════════════════════════════════════════════╗");
	console.log("║           🐚 Kimi CLI v2.0 (Tier-1380 OMEGA)                      ║");
	console.log("║           Unified Shell Interface for Matrix Agent                ║");
	console.log("╚══════════════════════════════════════════════════════════════════╝");
	console.log(`${COLORS.reset}`);
}

function printHelp(): void {
	printBanner();
	console.log("\nUsage: kimi-cli.ts <command> [args...]");
	console.log("       kimi-cli.ts interactive           # Start interactive mode");
	console.log("\nCommands:");

	for (const [name, config] of Object.entries(COMMANDS)) {
		const status =
			name === "interactive" || name === "monitor"
				? `${COLORS.green}[NEW]${COLORS.reset}`
				: "     ";
		console.log(`  ${status} ${name.padEnd(12)} ${config.description}`);
		if (config.subcommands.length > 0) {
			console.log(
				`             ${COLORS.gray}Sub: ${config.subcommands.join(", ")}${COLORS.reset}`,
			);
		}
	}

	console.log("\nExamples:");
	console.log(
		`  ${COLORS.cyan}kimi-cli.ts interactive${COLORS.reset}           # Interactive shell mode`,
	);
	console.log(
		`  ${COLORS.cyan}kimi-cli.ts monitor watch${COLORS.reset}         # Real-time performance monitor`,
	);
	console.log(
		`  ${COLORS.cyan}kimi-cli.ts metrics dashboard${COLORS.reset}     # Metrics dashboard`,
	);
	console.log(
		`  ${COLORS.cyan}kimi-cli.ts shell status${COLORS.reset}          # Shell status`,
	);
	console.log(
		`  ${COLORS.cyan}kimi-cli.ts vault health${COLORS.reset}          # Vault health check`,
	);
}

async function executeCommand(command: string, args: string[]): Promise<number> {
	const config = COMMANDS[command as keyof typeof COMMANDS];
	if (!config) {
		console.error(`Unknown command: ${command}`);
		return 1;
	}

	const scriptPath = join(import.meta.dir, config.script);

	try {
		// Scripts handle their own console output via console.log
		// We just need to execute and return exit code
		const proc = Bun.spawn(["bun", scriptPath, ...args], {
			stdout: "inherit",
			stderr: "inherit",
		});

		const exitCode = await proc.exited;
		return exitCode;
	} catch (error) {
		console.error(`Error executing ${command}:`, error);
		return 1;
	}
}

async function main(): Promise<void> {
	const args = Bun.argv.slice(2);

	// Handle no args or help
	if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
		printHelp();
		return;
	}

	// Handle version
	if (args[0] === "--version" || args[0] === "-v") {
		console.log("🐚 Kimi CLI v2.0.0 (Tier-1380 OMEGA)");
		console.log(`   Bun v${Bun.version}`);
		return;
	}

	const command = args[0];
	const subArgs = args.slice(1);

	// Check for command shortcuts
	const shortcuts: Record<string, string> = {
		i: "interactive",
		m: "monitor",
		s: "settings",
		v: "vault",
	};

	const resolvedCommand = shortcuts[command] || command;

	// Execute
	const exitCode = await executeCommand(resolvedCommand, subArgs);
	process.exit(exitCode);
}

if (import.meta.main) {
	main().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}
