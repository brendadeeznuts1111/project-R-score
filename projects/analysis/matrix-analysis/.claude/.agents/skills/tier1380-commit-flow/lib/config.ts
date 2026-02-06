#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Commit Flow Configuration
 * User and project-level configuration management
 */

export interface CommitFlowConfig {
	// Pre-commit settings
	autoFix: boolean;
	enableLint: boolean;
	enableTypeCheck: boolean;
	enableTests: boolean;
	enableSecretsScan: boolean;
	enableCol89: boolean;

	// Commit settings
	autoStage: boolean;
	signCommits: boolean;

	// Branch protection
	protectedBranches: string[];
	requirePRForProtected: boolean;

	// Message format
	defaultDomain: string;
	defaultComponent: string;
	defaultTier: string;

	// Dashboard
	dashboardRefreshInterval: number;
	enableDashboardTrends: boolean;
}

export const DEFAULT_CONFIG: CommitFlowConfig = {
	autoFix: false,
	enableLint: true,
	enableTypeCheck: true,
	enableTests: true,
	enableSecretsScan: true,
	enableCol89: true,

	autoStage: true,
	signCommits: false,

	protectedBranches: ["main", "master", "develop"],
	requirePRForProtected: true,

	defaultDomain: "PLATFORM",
	defaultComponent: "MATRIX",
	defaultTier: "1380",

	dashboardRefreshInterval: 5,
	enableDashboardTrends: true,
};

const CONFIG_DIR = `${process.env.HOME}/.config/tier1380-commit-flow`;
const CONFIG_FILE = `${CONFIG_DIR}/config.json`;

export async function loadConfig(): Promise<CommitFlowConfig> {
	try {
		const file = Bun.file(CONFIG_FILE);
		const content = await file.text();
		const userConfig = JSON.parse(content);
		return { ...DEFAULT_CONFIG, ...userConfig };
	} catch {
		return DEFAULT_CONFIG;
	}
}

export async function saveConfig(config: Partial<CommitFlowConfig>): Promise<void> {
	await Bun.write(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function initConfig(): Promise<void> {
	await Bun.$`mkdir -p ${CONFIG_DIR}`.quiet();

	const file = Bun.file(CONFIG_FILE);
	if (!(await file.exists())) {
		await saveConfig(DEFAULT_CONFIG);
	}
}

export function getConfigValue<K extends keyof CommitFlowConfig>(
	config: CommitFlowConfig,
	key: K,
): CommitFlowConfig[K] {
	return config[key];
}

export function setConfigValue<K extends keyof CommitFlowConfig>(
	config: CommitFlowConfig,
	key: K,
	value: CommitFlowConfig[K],
): CommitFlowConfig {
	return { ...config, [key]: value };
}

// CLI helper for config management
export async function printConfig(config: CommitFlowConfig): Promise<void> {
	console.log("Tier-1380 OMEGA Commit Flow Configuration");
	console.log();

	const sections = [
		{
			title: "Pre-commit Checks",
			keys: [
				"autoFix",
				"enableLint",
				"enableTypeCheck",
				"enableTests",
				"enableSecretsScan",
				"enableCol89",
			],
		},
		{ title: "Commit Settings", keys: ["autoStage", "signCommits"] },
		{
			title: "Branch Protection",
			keys: ["protectedBranches", "requirePRForProtected"],
		},
		{
			title: "Defaults",
			keys: ["defaultDomain", "defaultComponent", "defaultTier"],
		},
		{
			title: "Dashboard",
			keys: ["dashboardRefreshInterval", "enableDashboardTrends"],
		},
	];

	for (const section of sections) {
		console.log(`${section.title}:`);
		for (const key of section.keys) {
			const value = config[key as keyof CommitFlowConfig];
			console.log(`  ${key}: ${JSON.stringify(value)}`);
		}
		console.log();
	}
}

if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const command = args[0] || "show";

	await initConfig();
	const config = await loadConfig();

	switch (command) {
		case "show":
			await printConfig(config);
			break;

		case "set": {
			const key = args[1] as keyof CommitFlowConfig;
			const value = args[2];

			if (!key || value === undefined) {
				console.log("Usage: config.ts set <key> <value>");
				process.exit(1);
			}

			let parsedValue: unknown = value;
			if (value === "true") parsedValue = true;
			else if (value === "false") parsedValue = false;
			else if (!Number.isNaN(Number(value))) parsedValue = Number(value);
			else if (value.startsWith("[") && value.endsWith("]")) {
				parsedValue = JSON.parse(value);
			}

			const newConfig = setConfigValue(config, key, parsedValue as never);
			await saveConfig(newConfig);
			console.log(`✅ Set ${key} = ${JSON.stringify(parsedValue)}`);
			break;
		}

		case "reset":
			await saveConfig(DEFAULT_CONFIG);
			console.log("✅ Configuration reset to defaults");
			break;

		default:
			console.log("Usage:");
			console.log("  config.ts show");
			console.log("  config.ts set <key> <value>");
			console.log("  config.ts reset");
	}
}
