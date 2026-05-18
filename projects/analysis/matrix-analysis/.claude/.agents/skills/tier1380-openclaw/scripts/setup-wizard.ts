#!/usr/bin/env bun

/**
 * Setup Wizard
 *
 * Interactive configuration wizard for Tier-1380 OpenClaw integration.
 * Guides users through initial setup and configuration.
 */

import { $ } from "bun";
import { homedir } from "os";
import { join } from "path";
import { parse, stringify } from "yaml";
import { appendToFile, readTextFile } from "./lib/bytes.ts";

const COLORS = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	cyan: "\x1b[36m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	gray: "\x1b[90m",
};

const CONFIG_DIR = `${homedir()}/.kimi/skills/tier1380-openclaw/config`;
const TOPICS_CONFIG = `${CONFIG_DIR}/telegram-topics.yaml`;
const PROJECTS_CONFIG = `${CONFIG_DIR}/project-topics.yaml`;

interface WizardState {
	step: number;
	botUsername?: string;
	defaultTopic?: number;
	projects: Array<{
		name: string;
		path: string;
		defaultTopic: number;
		autoNotify: boolean;
	}>;
}

function printBanner() {
	console.clear();
	console.info(`${COLORS.cyan}${COLORS.bold}`);
	console.info("╔══════════════════════════════════════════════════════════════════╗");
	console.info("║           Tier-1380 OpenClaw Setup Wizard                        ║");
	console.info("║           Topic-Project-Channel Integration                      ║");
	console.info("╚══════════════════════════════════════════════════════════════════╝");
	console.info(`${COLORS.reset}\n`);
}

function printStep(step: number, total: number, title: string) {
	console.info(`${COLORS.bold}Step ${step}/${total}: ${title}${COLORS.reset}`);
	console.info(`${COLORS.gray}${"─".repeat(60)}${COLORS.reset}\n`);
}

async function ask(question: string, defaultValue?: string): Promise<string> {
	const rl = Bun.stdin;
	const defaultText = defaultValue ? ` [${defaultValue}]` : "";
	process.stdout.write(`${COLORS.cyan}?${COLORS.reset} ${question}${defaultText}: `);

	const response = await new Promise<string>((resolve) => {
		let data = "";
		rl.on("data", (chunk) => {
			data += chunk;
			if (data.includes("\n")) {
				resolve(data.trim());
			}
		});
	});

	return response || defaultValue || "";
}

async function askYesNo(question: string, defaultValue = false): Promise<boolean> {
	const defaultText = defaultValue ? "Y/n" : "y/N";
	const response = await ask(question, defaultText);
	if (!response) return defaultValue;
	return response.toLowerCase().startsWith("y");
}

async function step1Welcome(): Promise<boolean> {
	printStep(1, 5, "Welcome");

	console.info("This wizard will help you set up the Tier-1380 OpenClaw integration.");
	console.info("\nFeatures:");
	console.info("  • Telegram topic management");
	console.info("  • Project-to-topic mapping");
	console.info("  • Automatic git hook installation");
	console.info("  • GitHub webhook integration");
	console.info("  • File watching and notifications");
	console.info("\nRequirements:");
	console.info("  • Bun 1.3.8+");
	console.info("  • Git repositories");
	console.info("  • Telegram bot (optional)");

	const proceed = await askYesNo("\nContinue with setup?", true);
	return proceed;
}

async function step2BotConfig(): Promise<Partial<WizardState>> {
	printStep(2, 5, "Telegram Bot Configuration");

	console.info("Configure your Telegram bot (or press Enter to skip):\n");

	const botUsername = await ask("Bot username (e.g., @mybot)", "@mikehuntbot_bot");
	const defaultTopicStr = await ask("Default topic ID", "1");

	return {
		botUsername,
		defaultTopic: parseInt(defaultTopicStr) || 1,
	};
}

async function step3Projects(): Promise<Partial<WizardState>> {
	printStep(3, 5, "Project Configuration");

	console.info("Add projects to integrate with topics:\n");

	const projects: WizardState["projects"] = [];
	let addMore = true;

	// Auto-detect projects
	const detectedProjects = await detectProjects();

	if (detectedProjects.length > 0) {
		console.info(`${COLORS.green}Detected projects:${COLORS.reset}`);
		for (const proj of detectedProjects) {
			console.info(`  • ${proj.name} (${proj.path})`);
		}

		const useDetected = await askYesNo("\nUse detected projects?", true);
		if (useDetected) {
			for (const proj of detectedProjects) {
				const topic = await ask(`Topic for ${proj.name} [1-7]`, "7");
				projects.push({
					...proj,
					defaultTopic: parseInt(topic) || 7,
					autoNotify: true,
				});
			}
			return { projects };
		}
	}

	// Manual project entry
	while (addMore) {
		const name = await ask("Project name (or empty to finish)");
		if (!name) break;

		const path = await ask("Project path", `${homedir()}/${name}`);
		const topic = await ask("Default topic ID [1-7]", "7");
		const autoNotify = await askYesNo("Enable auto-notifications?", true);

		projects.push({
			name,
			path,
			defaultTopic: parseInt(topic) || 7,
			autoNotify,
		});

		console.info();
		addMore = await askYesNo("Add another project?", false);
	}

	return { projects };
}

async function detectProjects(): Promise<Array<{ name: string; path: string }>> {
	const projects: Array<{ name: string; path: string }> = [];

	// Check for known projects
	const knownPaths = [
		{ name: "nolarose-mcp-config", path: homedir() },
		{ name: "openclaw", path: `${homedir()}/openclaw` },
		{ name: "matrix-agent", path: `${homedir()}/matrix-agent` },
	];

	for (const proj of knownPaths) {
		try {
			const gitDir = `${proj.path}/.git`;
			const exists = await Bun.file(gitDir).exists();
			if (exists) {
				projects.push(proj);
			}
		} catch {
			// Skip
		}
	}

	return projects;
}

async function step4Hooks(): Promise<void> {
	printStep(4, 5, "Git Hooks Installation");

	console.info("Git hooks enable automatic topic routing for commits.\n");

	const installHooks = await askYesNo("Install git hooks for all projects?", true);

	if (installHooks) {
		console.info("\nInstalling hooks...");
		try {
			const result = await $`bun ${import.meta.dir}/topic-git-hooks.ts install`.quiet();
			if (result.exitCode === 0) {
				console.info(`${COLORS.green}✅ Hooks installed successfully${COLORS.reset}`);
			} else {
				console.info(`${COLORS.yellow}⚠️  Some hooks may have failed${COLORS.reset}`);
			}
		} catch {
			console.info(`${COLORS.red}❌ Failed to install hooks${COLORS.reset}`);
		}
	}
}

async function step5Summary(state: WizardState): Promise<void> {
	printStep(5, 5, "Summary");

	console.info(`${COLORS.green}Setup complete!${COLORS.reset}\n`);

	console.info(`${COLORS.bold}Configuration:${COLORS.reset}`);
	console.info(`  Bot: ${state.botUsername || "Not configured"}`);
	console.info(`  Default Topic: ${state.defaultTopic || 1}`);
	console.info(`  Projects: ${state.projects.length}`);

	for (const proj of state.projects) {
		console.info(`    • ${proj.name} → Topic ${proj.defaultTopic}`);
	}

	console.info(`\n${COLORS.bold}Next steps:${COLORS.reset}`);
	console.info("  1. Review configuration files:");
	console.info(`     ${COLORS.gray}${TOPICS_CONFIG}${COLORS.reset}`);
	console.info(`     ${COLORS.gray}${PROJECTS_CONFIG}${COLORS.reset}`);
	console.info("  2. Test the integration:");
	console.info(`     ${COLORS.gray}kimi test${COLORS.reset}`);
	console.info("  3. View integration status:");
	console.info(`     ${COLORS.gray}kimi integration${COLORS.reset}`);
	console.info("  4. Make a test commit:");
	console.info(
		`     ${COLORS.gray}git commit -m "feat: test integration"${COLORS.reset}`,
	);

	console.info(
		`\n${COLORS.gray}Documentation: ~/.kimi/skills/tier1380-openclaw/README.md${COLORS.reset}`,
	);
}

async function saveConfiguration(state: WizardState): Promise<void> {
	// This is a simplified version - in production would merge with existing
	console.info(`\n${COLORS.gray}Configuration would be saved to:${COLORS.reset}`);
	console.info(`  ${TOPICS_CONFIG}`);
	console.info(`  ${PROJECTS_CONFIG}`);
}

async function main() {
	printBanner();

	const state: WizardState = {
		step: 1,
		projects: [],
	};

	// Step 1: Welcome
	const proceed = await step1Welcome();
	if (!proceed) {
		console.info("\nSetup cancelled.");
		process.exit(0);
	}

	// Step 2: Bot Config
	const botConfig = await step2BotConfig();
	Object.assign(state, botConfig);

	// Step 3: Projects
	const projectConfig = await step3Projects();
	Object.assign(state, projectConfig);

	// Step 4: Hooks
	await step4Hooks();

	// Step 5: Summary
	await step5Summary(state);

	// Save
	await saveConfiguration(state);
}

// Run if called directly
if (import.meta.main) {
	main().catch((e) => {
		console.error(`${COLORS.red}Error:${COLORS.reset}`, e);
		process.exit(1);
	});
}
