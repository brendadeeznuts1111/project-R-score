#!/usr/bin/env bun

/**
 * Kimi Shell Configuration Manager
 * Manage shell settings and preferences
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

const CONFIG_PATH = join(homedir(), ".kimi", "config.json");

interface ShellConfig {
	version: string;
	theme: "dark" | "light" | "auto";
	prompt: {
		enabled: boolean;
		style: "minimal" | "detailed" | "custom";
		custom?: string;
	};
	history: {
		enabled: boolean;
		maxSize: number;
		persist: boolean;
	};
	completion: {
		enabled: boolean;
		autoShow: boolean;
	};
	aliases: Record<string, string>;
	plugins: string[];
	features: {
		autoUpdate: boolean;
		notifications: boolean;
		telemetry: boolean;
	};
}

const defaultConfig: ShellConfig = {
	version: "2.0.0",
	theme: "dark",
	prompt: {
		enabled: true,
		style: "detailed",
	},
	history: {
		enabled: true,
		maxSize: 1000,
		persist: true,
	},
	completion: {
		enabled: true,
		autoShow: true,
	},
	aliases: {
		s: "settings",
		m: "monitor",
		i: "interactive",
		v: "vault",
	},
	plugins: ["git-utils", "system-info"],
	features: {
		autoUpdate: true,
		notifications: true,
		telemetry: false,
	},
};

class ConfigManager {
	private config: ShellConfig;

	constructor() {
		this.config = defaultConfig;
	}

	async load(): Promise<void> {
		try {
			const file = Bun.file(CONFIG_PATH);
			if (await file.exists()) {
				const content = await file.text();
				const loaded = JSON.parse(content);
				this.config = { ...defaultConfig, ...loaded };
			}
		} catch {
			// Use defaults
		}
	}

	async save(): Promise<void> {
		await Bun.write(CONFIG_PATH, JSON.stringify(this.config, null, 2));
	}

	get<K extends keyof ShellConfig>(key: K): ShellConfig[K] {
		return this.config[key];
	}

	set<K extends keyof ShellConfig>(key: K, value: ShellConfig[K]): void {
		this.config[key] = value;
	}

	getAlias(name: string): string | undefined {
		return this.config.aliases[name];
	}

	setAlias(name: string, command: string): void {
		this.config.aliases[name] = command;
	}

	removeAlias(name: string): void {
		delete this.config.aliases[name];
	}

	listAliases(): Record<string, string> {
		return { ...this.config.aliases };
	}

	getAll(): ShellConfig {
		return { ...this.config };
	}

	reset(): void {
		this.config = { ...defaultConfig };
	}
}

async function main() {
	const args = Bun.argv.slice(2);
	const command = args[0];
	const manager = new ConfigManager();
	await manager.load();

	switch (command) {
		case "get": {
			const key = args[1] as keyof ShellConfig;
			if (!key) {
				console.error("Usage: config-manager.ts get <key>");
				process.exit(1);
			}
			const value = manager.get(key);
			console.log(JSON.stringify(value, null, 2));
			break;
		}

		case "set": {
			const [key, ...valueParts] = args.slice(1);
			if (!key || valueParts.length === 0) {
				console.error("Usage: config-manager.ts set <key> <value>");
				process.exit(1);
			}
			const value = valueParts.join(" ");
			try {
				const parsed = JSON.parse(value);
				manager.set(key as keyof ShellConfig, parsed);
			} catch {
				manager.set(key as keyof ShellConfig, value as any);
			}
			await manager.save();
			console.log(`${COLORS.green}✓${COLORS.reset} Set ${key} = ${value}`);
			break;
		}

		case "alias": {
			const action = args[1];
			if (action === "list") {
				const aliases = manager.listAliases();
				console.log(`${COLORS.bold}Aliases:${COLORS.reset}`);
				for (const [name, cmd] of Object.entries(aliases)) {
					console.log(`  ${COLORS.cyan}${name.padEnd(10)}${COLORS.reset} → ${cmd}`);
				}
			} else if (action === "set") {
				const [name, ...cmdParts] = args.slice(2);
				if (!name || cmdParts.length === 0) {
					console.error("Usage: config-manager.ts alias set <name> <command>");
					process.exit(1);
				}
				manager.setAlias(name, cmdParts.join(" "));
				await manager.save();
				console.log(`${COLORS.green}✓${COLORS.reset} Alias '${name}' created`);
			} else if (action === "remove") {
				const name = args[2];
				if (!name) {
					console.error("Usage: config-manager.ts alias remove <name>");
					process.exit(1);
				}
				manager.removeAlias(name);
				await manager.save();
				console.log(`${COLORS.green}✓${COLORS.reset} Alias '${name}' removed`);
			}
			break;
		}

		case "show": {
			const config = manager.getAll();
			console.log(`${COLORS.bold}Current Configuration:${COLORS.reset}\n`);
			console.log(JSON.stringify(config, null, 2));
			break;
		}

		case "reset": {
			manager.reset();
			await manager.save();
			console.log(`${COLORS.green}✓${COLORS.reset} Configuration reset to defaults`);
			break;
		}

		case "path": {
			console.log(CONFIG_PATH);
			break;
		}

		default: {
			console.log(`${COLORS.bold}🐚 Kimi Shell Configuration Manager${COLORS.reset}\n`);
			console.log("Usage:");
			console.log("  config-manager.ts get <key>           Get configuration value");
			console.log("  config-manager.ts set <key> <value>   Set configuration value");
			console.log("  config-manager.ts alias list          List aliases");
			console.log("  config-manager.ts alias set <n> <c>   Create alias");
			console.log("  config-manager.ts alias remove <n>    Remove alias");
			console.log("  config-manager.ts show                Show all config");
			console.log("  config-manager.ts reset               Reset to defaults");
			console.log("  config-manager.ts path                Show config file path");
			console.log("\nExamples:");
			console.log("  config-manager.ts set theme light");
			console.log("  config-manager.ts alias set st status");
		}
	}
}

if (import.meta.main) {
	main().catch(console.error);
}

export { ConfigManager, defaultConfig };
