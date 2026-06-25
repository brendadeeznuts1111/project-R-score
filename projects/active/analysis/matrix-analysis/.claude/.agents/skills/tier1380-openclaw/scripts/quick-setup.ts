#!/usr/bin/env bun
/**
 * Quick Setup Script
 *
 * Non-interactive setup for Tier-1380 OpenClaw integration.
 * Detects projects and installs hooks automatically.
 */

import { $ } from "bun";
import { homedir } from "os";

const COLORS = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	cyan: "\x1b[36m",
	gray: "\x1b[90m",
};

function printBanner() {
	console.info(`${COLORS.cyan}${COLORS.bold}`);
	console.info("╔══════════════════════════════════════════════════════════════════╗");
	console.info("║           Tier-1380 OpenClaw Quick Setup                         ║");
	console.info("╚══════════════════════════════════════════════════════════════════╝");
	console.info(`${COLORS.reset}\n`);
}

async function checkPrerequisites(): Promise<boolean> {
	console.info(`${COLORS.bold}Checking prerequisites...${COLORS.reset}\n`);

	// Check Bun version
	const bunVersion = Bun.version;
	const [major, minor] = bunVersion.split(".").map(Number);
	if (major < 1 || (major === 1 && minor < 3)) {
		console.info(
			`${COLORS.red}❌ Bun ${bunVersion} is too old. Need 1.3.0+${COLORS.reset}`,
		);
		return false;
	}
	console.info(`${COLORS.green}✅${COLORS.reset} Bun ${bunVersion}`);

	// Check git
	try {
		const result = await $`git --version`.quiet();
		const gitVersion = result.stdout.toString().trim();
		console.info(`${COLORS.green}✅${COLORS.reset} ${gitVersion}`);
	} catch {
		console.info(`${COLORS.red}❌ Git not found${COLORS.reset}`);
		return false;
	}

	return true;
}

async function detectProjects(): Promise<Array<{ name: string; path: string }>> {
	console.info(`\n${COLORS.bold}Detecting projects...${COLORS.reset}\n`);

	const projects: Array<{ name: string; path: string }> = [];

	const candidates = [
		{ name: "nolarose-mcp-config", path: homedir() },
		{ name: "openclaw", path: `${homedir()}/openclaw` },
		{ name: "matrix-agent", path: `${homedir()}/matrix-agent` },
	];

	for (const proj of candidates) {
		try {
			const gitDir = `${proj.path}/.git`;
			const exists = await Bun.file(gitDir).exists();
			if (exists) {
				projects.push(proj);
				console.info(`${COLORS.green}✅${COLORS.reset} Found: ${proj.name}`);
			} else {
				console.info(`${COLORS.gray}○${COLORS.reset} Not found: ${proj.name}`);
			}
		} catch {
			console.info(`${COLORS.gray}○${COLORS.reset} Not found: ${proj.name}`);
		}
	}

	return projects;
}

async function installHooks(): Promise<void> {
	console.info(`\n${COLORS.bold}Installing git hooks...${COLORS.reset}\n`);

	try {
		const result = await $`bun ${import.meta.dir}/topic-git-hooks.ts install`.quiet();
		if (result.exitCode === 0) {
			console.info(`${COLORS.green}✅${COLORS.reset} Hooks installed`);
		} else {
			console.info(`${COLORS.yellow}⚠️${COLORS.reset} Some hooks may have failed`);
		}
	} catch (e) {
		console.info(`${COLORS.red}❌${COLORS.reset} Failed: ${e}`);
	}
}

async function verifySetup(): Promise<void> {
	console.info(`\n${COLORS.bold}Verifying setup...${COLORS.reset}\n`);

	// Test CLI commands
	const commands = [
		{ name: "Integration status", cmd: "integration" },
		{ name: "Topic list", cmd: "topic list" },
		{ name: "Project list", cmd: "project list" },
	];

	for (const { name, cmd } of commands) {
		try {
			const result =
				await $`bun ${import.meta.dir}/../kimi-shell/kimi-cli.ts ${cmd.split(" ")}`.quiet();
			if (result.exitCode === 0) {
				console.info(`${COLORS.green}✅${COLORS.reset} ${name}`);
			} else {
				console.info(
					`${COLORS.yellow}⚠️${COLORS.reset} ${name} (exit ${result.exitCode})`,
				);
			}
		} catch {
			console.info(`${COLORS.red}❌${COLORS.reset} ${name}`);
		}
	}

	// Run test suite
	console.info(`\n${COLORS.bold}Running test suite...${COLORS.reset}`);
	try {
		const result = await $`bun ${import.meta.dir}/test-integration.ts`.quiet();
		const output = result.stdout.toString();
		const passed = output.match(/(\d+) passed/);
		const failed = output.match(/(\d+) failed/);

		if (passed && failed) {
			const p = parseInt(passed[1]);
			const f = parseInt(failed[1]);
			if (f === 0) {
				console.info(`${COLORS.green}✅${COLORS.reset} All ${p} tests passed`);
			} else {
				console.info(`${COLORS.yellow}⚠️${COLORS.reset} ${p} passed, ${f} failed`);
			}
		}
	} catch {
		console.info(`${COLORS.yellow}⚠️${COLORS.reset} Test suite had issues`);
	}
}

function printSummary(projects: Array<{ name: string; path: string }>) {
	console.info(`\n${COLORS.green}${COLORS.bold}Setup complete!${COLORS.reset}\n`);

	console.info(`${COLORS.bold}Detected Projects:${COLORS.reset} ${projects.length}`);
	for (const proj of projects) {
		console.info(`  ${COLORS.green}●${COLORS.reset} ${proj.name}`);
	}

	console.info(`\n${COLORS.bold}Quick commands:${COLORS.reset}`);
	console.info(`  ${COLORS.gray}kimi integration${COLORS.reset}          View status`);
	console.info(`  ${COLORS.gray}kimi test${COLORS.reset}                 Run tests`);
	console.info(`  ${COLORS.gray}kimi topic list${COLORS.reset}           List topics`);
	console.info(`  ${COLORS.gray}kimi project list${COLORS.reset}         List projects`);
	console.info(`  ${COLORS.gray}kimi color topics${COLORS.reset}         Show colors`);
	console.info(`  ${COLORS.gray}kimi perf memory${COLORS.reset}          Memory stats`);

	console.info(
		`\n${COLORS.gray}Documentation: ~/.kimi/skills/tier1380-openclaw/README.md${COLORS.reset}`,
	);
}

async function main() {
	printBanner();

	// Check prerequisites
	const ok = await checkPrerequisites();
	if (!ok) {
		console.info(
			`\n${COLORS.red}Prerequisites not met. Please install required tools.${COLORS.reset}`,
		);
		process.exit(1);
	}

	// Detect projects
	const projects = await detectProjects();
	if (projects.length === 0) {
		console.info(`\n${COLORS.yellow}No projects detected.${COLORS.reset}`);
		console.info(
			`Add projects to ${COLORS.gray}~/.kimi/skills/tier1380-openclaw/config/project-topics.yaml${COLORS.reset}`,
		);
	}

	// Install hooks
	await installHooks();

	// Verify
	await verifySetup();

	// Summary
	printSummary(projects);
}

if (import.meta.main) {
	main().catch((e) => {
		console.error(`${COLORS.red}Error:${COLORS.reset}`, e);
		process.exit(1);
	});
}
