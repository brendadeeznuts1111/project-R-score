#!/usr/bin/env bun
/**
 * Kimi Shell Manager
 * Central management interface for Kimi Shell operations
 */

import { $ } from "bun";
import { homedir } from "os";
import { join } from "path";

const KIMI_DIR = join(homedir(), ".kimi");
const SHELL_STATE_FILE = join(KIMI_DIR, "shell-state.json");

interface ShellState {
	activeProfile?: string;
	lastCommand?: string;
	sessionStart: string;
	commandCount: number;
	integrations: {
		openclaw: boolean;
		matrix: boolean;
		mcp: boolean;
	};
}

interface CommandResult {
	success: boolean;
	output: string;
	duration: number;
}

class KimiShellManager {
	private state: ShellState;

	constructor() {
		this.state = {
			sessionStart: new Date().toISOString(),
			commandCount: 0,
			integrations: {
				openclaw: false,
				matrix: false,
				mcp: false,
			},
		};
	}

	async init(): Promise<void> {
		await this.loadState();
		await this.detectIntegrations();
	}

	/**
	 * Detect available integrations
	 */
	private async detectIntegrations(): Promise<void> {
		// Check OpenClaw
		try {
			await $`test -d ${homedir()}/openclaw`.quiet();
			this.state.integrations.openclaw = true;
		} catch {
			this.state.integrations.openclaw = false;
		}

		// Check Matrix Agent
		try {
			await $`test -d ${homedir()}/.matrix`.quiet();
			this.state.integrations.matrix = true;
		} catch {
			this.state.integrations.matrix = false;
		}

		// Check MCP config
		try {
			await $`test -f ${KIMI_DIR}/mcp.json`.quiet();
			this.state.integrations.mcp = true;
		} catch {
			this.state.integrations.mcp = false;
		}
	}

	/**
	 * Load shell state
	 */
	async loadState(): Promise<void> {
		try {
			const content = await Bun.file(SHELL_STATE_FILE).text();
			const saved = JSON.parse(content);
			this.state = { ...this.state, ...saved };
		} catch {
			// No saved state
		}
	}

	/**
	 * Save shell state
	 */
	async saveState(): Promise<void> {
		await Bun.write(SHELL_STATE_FILE, JSON.stringify(this.state, null, 2));
	}

	/**
	 * Execute command with full context
	 */
	async execute(
		command: string,
		options: {
			profile?: string;
			openclaw?: boolean;
			matrix?: boolean;
		} = {},
	): Promise<CommandResult> {
		const start = performance.now();
		this.state.commandCount++;
		this.state.lastCommand = command;

		const env: Record<string, string> = { ...process.env };

		// Load profile environment
		if (options.profile) {
			env.MATRIX_ACTIVE_PROFILE = options.profile;
			this.state.activeProfile = options.profile;
		}

		// Load OpenClaw token
		if (options.openclaw) {
			try {
				const token = await Bun.secrets.get({
					service: "com.openclaw.gateway",
					name: "gateway_token",
				});
				if (token) env.OPENCLAW_GATEWAY_TOKEN = token;
			} catch {
				// Token not available
			}
		}

		try {
			const result = await $`${{ raw: command }}`.env(env).nothrow();

			const duration = performance.now() - start;
			await this.saveState();

			return {
				success: result.exitCode === 0,
				output: result.stdout.toString() + result.stderr.toString(),
				duration,
			};
		} catch (error) {
			const duration = performance.now() - start;
			return {
				success: false,
				output: String(error),
				duration,
			};
		}
	}

	/**
	 * Switch active profile
	 */
	async switchProfile(profile: string): Promise<boolean> {
		const profilePath = join(homedir(), ".matrix", "profiles", `${profile}.json`);

		try {
			await $`test -f ${profilePath}`.quiet();
			this.state.activeProfile = profile;
			await this.saveState();
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get status overview
	 */
	async getStatus(): Promise<{
		state: ShellState;
		uptime: number;
		integrations: string[];
	}> {
		const uptime = Date.now() - new Date(this.state.sessionStart).getTime();
		const activeIntegrations = Object.entries(this.state.integrations)
			.filter(([, v]) => v)
			.map(([k]) => k);

		return {
			state: this.state,
			uptime,
			integrations: activeIntegrations,
		};
	}

	/**
	 * Display management dashboard
	 */
	async displayDashboard(): Promise<void> {
		const status = await this.getStatus();
		const uptimeMin = Math.floor(status.uptime / 60000);

		console.log("\n🐚 Kimi Shell Manager");
		console.log("=".repeat(50));

		console.log("\n📊 Session:");
		console.log(`  Started: ${new Date(this.state.sessionStart).toLocaleString()}`);
		console.log(`  Uptime: ${uptimeMin}m`);
		console.log(`  Commands: ${this.state.commandCount}`);

		if (this.state.activeProfile) {
			console.log(`  Active Profile: ${this.state.activeProfile}`);
		}

		console.log("\n🔗 Integrations:");
		for (const [name, active] of Object.entries(this.state.integrations)) {
			const icon = active ? "✅" : "❌";
			console.log(`  ${icon} ${name}`);
		}

		console.log("\n🛠️  Quick Actions:");
		console.log("  kimi-shell-manager.ts exec <cmd> [--profile=<p>]");
		console.log("  kimi-shell-manager.ts switch <profile>");
		console.log("  kimi-shell-manager.ts status");

		console.log("\n" + "=".repeat(50));
	}
}

// CLI
async function main() {
	const manager = new KimiShellManager();
	await manager.init();

	const args = Bun.argv.slice(2);
	const command = args[0];

	switch (command) {
		case "exec": {
			const cmd = args[1];
			if (!cmd) {
				console.error("Usage: exec <command>");
				process.exit(1);
			}

			const options: { profile?: string; openclaw?: boolean } = {};

			// Parse options
			for (let i = 2; i < args.length; i++) {
				if (args[i].startsWith("--profile=")) {
					options.profile = args[i].split("=")[1];
				} else if (args[i] === "--openclaw") {
					options.openclaw = true;
				}
			}

			const result = await manager.execute(cmd, options);
			console.log(result.output);
			process.exit(result.success ? 0 : 1);
		}

		case "switch": {
			const profile = args[1];
			if (!profile) {
				console.error("Usage: switch <profile>");
				process.exit(1);
			}

			const success = await manager.switchProfile(profile);
			if (success) {
				console.log(`✅ Switched to profile: ${profile}`);
			} else {
				console.error(`❌ Profile not found: ${profile}`);
				process.exit(1);
			}
			break;
		}

		case "status":
			await manager.displayDashboard();
			break;

		case "integrations": {
			const status = await manager.getStatus();
			console.log("Active integrations:", status.integrations.join(", "));
			break;
		}

		default:
			await manager.displayDashboard();
	}
}

export { KimiShellManager };

if (import.meta.main) {
	main().catch(console.error);
}
