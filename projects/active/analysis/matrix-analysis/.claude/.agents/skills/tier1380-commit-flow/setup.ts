#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Commit Flow Setup
 * One-time initialization for new users
 */

import { $ } from "bun";
import { initConfig } from "./lib/config";

interface SetupOptions {
	installHooks: boolean;
	createAlias: boolean;
	runTests: boolean;
}

async function checkPrerequisites(): Promise<{
	ok: boolean;
	issues: string[];
}> {
	const issues: string[] = [];

	// Check Bun version
	const bunVersion = Bun.version;
	const minVersion = "1.3.0";
	if (!Bun.semver.satisfies(bunVersion, `>=${minVersion}`)) {
		issues.push(`Bun ${bunVersion} is too old. Need >= ${minVersion}`);
	}

	// Check git
	try {
		await $`git --version`.quiet();
	} catch {
		issues.push("Git is not installed");
	}

	// Check if in a git repo
	try {
		await $`git rev-parse --git-dir`.quiet();
	} catch {
		issues.push("Not in a git repository");
	}

	return { ok: issues.length === 0, issues };
}

async function setupDatabase(): Promise<void> {
	const _dbPath = `${process.env.HOME}/.matrix/commit-history.db`;
	const dbDir = `${process.env.HOME}/.matrix`;

	await $`mkdir -p ${dbDir}`.quiet();

	// Database will be created automatically on first use
	console.info("✅ Database directory ready");
}

async function installGitHooks(): Promise<void> {
	console.info("📦 Installing git hooks...");
	const { installHooks } = await import("./scripts/install-hooks");
	await installHooks({
		enablePreCommit: true,
		enablePrepareCommitMsg: true,
		enableCommitMsg: true,
		enablePostCommit: true,
		enablePrePush: true,
		autoFix: false,
	});
}

async function createShellAlias(): Promise<void> {
	const shell = process.env.SHELL || "/bin/bash";
	const isZsh = shell.includes("zsh");
	const rcFile = isZsh ? `${process.env.HOME}/.zshrc` : `${process.env.HOME}/.bashrc`;

	const aliasLine =
		'\n# Tier-1380 OMEGA Commit Flow\nalias tier1380="bun ~/.kimi/skills/tier1380-commit-flow/cli.ts"\n';

	try {
		const rcContent = await Bun.file(rcFile).text();
		if (rcContent.includes("tier1380")) {
			console.info("✅ Alias already exists in", rcFile);
			return;
		}
	} catch {
		// File doesn't exist, will create
	}

	await Bun.write(rcFile, aliasLine, { append: true });
	console.info(`✅ Added alias to ${rcFile}`);
	console.info("   Run 'source", rcFile, "' to use immediately");
}

async function runTests(): Promise<void> {
	console.info("🧪 Running tests...");
	try {
		await $`bun test`.cwd(import.meta.dir);
		console.info("✅ All tests passed");
	} catch {
		console.info("⚠️  Some tests failed (non-critical)");
	}
}

async function printNextSteps(): Promise<void> {
	console.info();
	console.info("╔════════════════════════════════════════════════════════╗");
	console.info("║     Setup Complete!                                    ║");
	console.info("╚════════════════════════════════════════════════════════╝");
	console.info();
	console.info("Quick Start:");
	console.info("  1. Stage your changes: git add .");
	console.info(
		"  2. Generate message:   bun ~/.kimi/skills/tier1380-commit-flow/cli.ts g",
	);
	console.info(
		'  3. Commit:             bun ~/.kimi/skills/tier1380-commit-flow/cli.ts c "[MSG]"',
	);
	console.info();
	console.info("Or with alias (after sourcing your shell config):");
	console.info("  tier1380 g   # generate message");
	console.info('  tier1380 c "[RUNTIME][CHROME][TIER:1380] Fix entropy"');
	console.info();
	console.info("Documentation:");
	console.info("  ~/.kimi/skills/tier1380-commit-flow/SKILL.md");
	console.info("  ~/.kimi/skills/tier1380-commit-flow/QUICKREF.md");
	console.info();
}

// Main
if (import.meta.main) {
	const args = Bun.argv.slice(2);

	console.info("╔════════════════════════════════════════════════════════╗");
	console.info("║     Tier-1380 OMEGA Commit Flow Setup                  ║");
	console.info("╚════════════════════════════════════════════════════════╝");
	console.info();

	// Check prerequisites
	const { ok, issues } = await checkPrerequisites();
	if (!ok) {
		console.info("❌ Prerequisites not met:");
		for (const issue of issues) {
			console.info(`   • ${issue}`);
		}
		process.exit(1);
	}

	console.info("✅ Prerequisites met");
	console.info(`   Bun ${Bun.version}`);
	console.info();

	// Parse options
	const options: SetupOptions = {
		installHooks: !args.includes("--no-hooks"),
		createAlias: !args.includes("--no-alias"),
		runTests: args.includes("--test"),
	};

	// Setup steps
	await initConfig();
	console.info("✅ Configuration initialized");

	await setupDatabase();

	if (options.installHooks) {
		await installGitHooks();
	}

	if (options.createAlias) {
		await createShellAlias();
	}

	if (options.runTests) {
		await runTests();
	}

	await printNextSteps();
}

export { checkPrerequisites, setupDatabase, installGitHooks, createShellAlias };
