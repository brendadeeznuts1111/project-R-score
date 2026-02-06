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
	console.log(`${COLORS.cyan}${COLORS.bold}`);
	console.log("╔══════════════════════════════════════════════════════════════════╗");
	console.log("║           Tier-1380 OpenClaw Quick Setup                         ║");
	console.log("╚══════════════════════════════════════════════════════════════════╝");
	console.log(`${COLORS.reset}\n`);
}

async function checkPrerequisites(): Promise<boolean> {
	console.log(`${COLORS.bold}Checking prerequisites...${COLORS.reset}\n`);

	// Check Bun version
	const bunVersion = Bun.version;
	const [major, minor] = bunVersion.split(".").map(Number);
	if (major < 1 || (major === 1 && minor < 3)) {
		console.log(
			`${COLORS.red}❌ Bun ${bunVersion} is too old. Need 1.3.0+${COLORS.reset}`,
		);
		return false;
	}
	console.log(`${COLORS.green}✅${COLORS.reset} Bun ${bunVersion}`);

	// Check git
	try {
		const result = await $`git --version`.quiet();
		const gitVersion = result.stdout.toString().trim();
		console.log(`${COLORS.green}✅${COLORS.reset} ${gitVersion}`);
	} catch {
		console.log(`${COLORS.red}❌ Git not found${COLORS.reset}`);
		return false;
	}

	return true;
}

async function detectProjects(): Promise<Array<{ name: string; path: string }>> {
	console.log(`\n${COLORS.bold}Detecting projects...${COLORS.reset}\n`);

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
				console.log(`${COLORS.green}✅${COLORS.reset} Found: ${proj.name}`);
			} else {
				console.log(`${COLORS.gray}○${COLORS.reset} Not found: ${proj.name}`);
			}
		} catch {
			console.log(`${COLORS.gray}○${COLORS.reset} Not found: ${proj.name}`);
		}
	}

	return projects;
}

async function installHooks(): Promise<void> {
	console.log(`\n${COLORS.bold}Installing git hooks...${COLORS.reset}\n`);

	try {
		const result = await $`bun ${import.meta.dir}/topic-git-hooks.ts install`.quiet();
		if (result.exitCode === 0) {
			console.log(`${COLORS.green}✅${COLORS.reset} Hooks installed`);
		} else {
			console.log(`${COLORS.yellow}⚠️${COLORS.reset} Some hooks may have failed`);
		}
	} catch (e) {
		console.log(`${COLORS.red}❌${COLORS.reset} Failed: ${e}`);
	}
}

async function verifySetup(): Promise<void> {
	console.log(`\n${COLORS.bold}Verifying setup...${COLORS.reset}\n`);

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
				console.log(`${COLORS.green}✅${COLORS.reset} ${name}`);
			} else {
				console.log(
					`${COLORS.yellow}⚠️${COLORS.reset} ${name} (exit ${result.exitCode})`,
				);
			}
		} catch {
			console.log(`${COLORS.red}❌${COLORS.reset} ${name}`);
		}
	}

	// Run test suite
	console.log(`\n${COLORS.bold}Running test suite...${COLORS.reset}`);
	try {
		const result = await $`bun ${import.meta.dir}/test-integration.ts`.quiet();
		const output = result.stdout.toString();
		const passed = output.match(/(\d+) passed/);
		const failed = output.match(/(\d+) failed/);

		if (passed && failed) {
			const p = parseInt(passed[1]);
			const f = parseInt(failed[1]);
			if (f === 0) {
				console.log(`${COLORS.green}✅${COLORS.reset} All ${p} tests passed`);
			} else {
				console.log(`${COLORS.yellow}⚠️${COLORS.reset} ${p} passed, ${f} failed`);
			}
		}
	} catch {
		console.log(`${COLORS.yellow}⚠️${COLORS.reset} Test suite had issues`);
	}
}

function printSummary(projects: Array<{ name: string; path: string }>) {
	console.log(`\n${COLORS.green}${COLORS.bold}Setup complete!${COLORS.reset}\n`);

	console.log(`${COLORS.bold}Detected Projects:${COLORS.reset} ${projects.length}`);
	for (const proj of projects) {
		console.log(`  ${COLORS.green}●${COLORS.reset} ${proj.name}`);
	}

	console.log(`\n${COLORS.bold}Quick commands:${COLORS.reset}`);
	console.log(`  ${COLORS.gray}kimi integration${COLORS.reset}          View status`);
	console.log(`  ${COLORS.gray}kimi test${COLORS.reset}                 Run tests`);
	console.log(`  ${COLORS.gray}kimi topic list${COLORS.reset}           List topics`);
	console.log(`  ${COLORS.gray}kimi project list${COLORS.reset}         List projects`);
	console.log(`  ${COLORS.gray}kimi color topics${COLORS.reset}         Show colors`);
	console.log(`  ${COLORS.gray}kimi perf memory${COLORS.reset}          Memory stats`);

	console.log(
		`\n${COLORS.gray}Documentation: ~/.kimi/skills/tier1380-openclaw/README.md${COLORS.reset}`,
	);
}

async function main() {
	printBanner();

	// Check prerequisites
	const ok = await checkPrerequisites();
	if (!ok) {
		console.log(
			`\n${COLORS.red}Prerequisites not met. Please install required tools.${COLORS.reset}`,
		);
		process.exit(1);
	}

	// Detect projects
	const projects = await detectProjects();
	if (projects.length === 0) {
		console.log(`\n${COLORS.yellow}No projects detected.${COLORS.reset}`);
		console.log(
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
