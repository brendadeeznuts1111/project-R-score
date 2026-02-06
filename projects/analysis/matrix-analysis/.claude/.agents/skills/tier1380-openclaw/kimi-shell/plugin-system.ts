#!/usr/bin/env bun

/**
 * Kimi Shell Plugin System
 * Extensible plugin architecture for custom commands
 */

import { homedir } from "os";
import { join } from "path";

const COLORS = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	cyan: "\x1b[36m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	gray: "\x1b[90m",
};

export interface Plugin {
	name: string;
	version: string;
	description: string;
	author?: string;
	commands: PluginCommand[];
	init?: () => void | Promise<void>;
	cleanup?: () => void | Promise<void>;
}

export interface PluginCommand {
	name: string;
	description: string;
	args?: string[];
	handler: (args: string[]) => void | Promise<void>;
}

export class PluginManager {
	private plugins: Map<string, Plugin> = new Map();
	private pluginDir: string;

	constructor() {
		this.pluginDir = join(homedir(), ".kimi", "plugins");
	}

	async loadPlugin(plugin: Plugin): Promise<void> {
		if (this.plugins.has(plugin.name)) {
			throw new Error(`Plugin '${plugin.name}' is already loaded`);
		}

		if (plugin.init) {
			await plugin.init();
		}

		this.plugins.set(plugin.name, plugin);
	}

	async unloadPlugin(name: string): Promise<void> {
		const plugin = this.plugins.get(name);
		if (!plugin) {
			throw new Error(`Plugin '${name}' not found`);
		}

		if (plugin.cleanup) {
			await plugin.cleanup();
		}

		this.plugins.delete(name);
	}

	getPlugin(name: string): Plugin | undefined {
		return this.plugins.get(name);
	}

	getAllPlugins(): Plugin[] {
		return Array.from(this.plugins.values());
	}

	getCommand(pluginName: string, commandName: string): PluginCommand | undefined {
		const plugin = this.plugins.get(pluginName);
		return plugin?.commands.find((c) => c.name === commandName);
	}

	listCommands(): { plugin: string; command: string; description: string }[] {
		const commands: { plugin: string; command: string; description: string }[] = [];

		for (const [pluginName, plugin] of this.plugins) {
			for (const cmd of plugin.commands) {
				commands.push({
					plugin: pluginName,
					command: cmd.name,
					description: cmd.description,
				});
			}
		}

		return commands;
	}

	async executeCommand(
		pluginName: string,
		commandName: string,
		args: string[],
	): Promise<void> {
		const command = this.getCommand(pluginName, commandName);
		if (!command) {
			throw new Error(`Command '${pluginName}:${commandName}' not found`);
		}

		await command.handler(args);
	}
}

// Built-in plugins
export const builtinPlugins: Plugin[] = [
	{
		name: "git-utils",
		version: "1.0.0",
		description: "Git utility commands",
		commands: [
			{
				name: "status",
				description: "Show git status summary",
				handler: async () => {
					const { $ } = await import("bun");
					const result = await $`git status --short`.nothrow();
					console.log(result.stdout.toString() || "Clean working tree");
				},
			},
			{
				name: "recent",
				description: "Show recent commits",
				handler: async (args) => {
					const { $ } = await import("bun");
					const count = args[0] || "5";
					const result = await $`git log --oneline -${count}`.nothrow();
					console.log(result.stdout.toString());
				},
			},
		],
	},
	{
		name: "system-info",
		version: "1.0.0",
		description: "System information commands",
		commands: [
			{
				name: "bun",
				description: "Show Bun version and info",
				handler: () => {
					console.log(`${COLORS.cyan}Bun v${Bun.version}${COLORS.reset}`);
					console.log(`  Platform: ${process.platform}`);
					console.log(`  Arch: ${process.arch}`);
					console.log(`  PID: ${process.pid}`);
				},
			},
			{
				name: "env",
				description: "Show environment info",
				handler: () => {
					console.log(`${COLORS.cyan}Environment:${COLORS.reset}`);
					console.log(`  NODE_ENV: ${process.env.NODE_ENV || "not set"}`);
					console.log(`  TIER: ${process.env.TIER || "not set"}`);
					console.log(`  FW_MODE: ${process.env.FW_MODE || "not set"}`);
				},
			},
		],
	},
];

async function main() {
	const args = Bun.argv.slice(2);
	const command = args[0];

	const manager = new PluginManager();

	// Load built-in plugins
	for (const plugin of builtinPlugins) {
		await manager.loadPlugin(plugin);
	}

	switch (command) {
		case "list": {
			console.log(`${COLORS.bold}Loaded Plugins:${COLORS.reset}\n`);
			for (const plugin of manager.getAllPlugins()) {
				console.log(
					`  ${COLORS.green}●${COLORS.reset} ${COLORS.bold}${plugin.name}${COLORS.reset} v${plugin.version}`,
				);
				console.log(`    ${COLORS.gray}${plugin.description}${COLORS.reset}`);
			}
			break;
		}

		case "commands": {
			const commands = manager.listCommands();
			console.log(`${COLORS.bold}Available Commands:${COLORS.reset}\n`);
			for (const cmd of commands) {
				console.log(
					`  ${COLORS.cyan}${cmd.plugin}:${cmd.command}${COLORS.reset} - ${cmd.description}`,
				);
			}
			break;
		}

		case "exec": {
			const [pluginName, commandName, ...execArgs] = args.slice(1);
			if (!pluginName || !commandName) {
				console.error("Usage: plugin-system.ts exec <plugin> <command> [args...]");
				process.exit(1);
			}
			await manager.executeCommand(pluginName, commandName, execArgs);
			break;
		}

		default: {
			console.log(`${COLORS.bold}🐚 Kimi Shell Plugin System${COLORS.reset}\n`);
			console.log("Usage:");
			console.log("  plugin-system.ts list              List loaded plugins");
			console.log("  plugin-system.ts commands          List available commands");
			console.log("  plugin-system.ts exec <p> <c>      Execute plugin command");
			console.log("\nExample:");
			console.log("  plugin-system.ts exec git-utils status");
			console.log("  plugin-system.ts exec system-info bun");
		}
	}
}

if (import.meta.main) {
	main().catch(console.error);
}

export { PluginManager };
