#!/usr/bin/env bun

/**
 * Tier-1380 OMEGA Health Check
 * Diagnose commit flow installation and configuration
 */

import { Database } from "bun:sqlite";
import { $ } from "bun";

interface HealthResult {
	component: string;
	status: "ok" | "warning" | "error";
	message: string;
}

async function runHealthCheck(): Promise<HealthResult[]> {
	const results: HealthResult[] = [];

	// Check Bun version
	const bunVersion = Bun.version;
	const bunOk = Bun.semver.satisfies(bunVersion, ">=1.3.0");
	results.push({
		component: "Bun Runtime",
		status: bunOk ? "ok" : "error",
		message: bunOk ? `v${bunVersion}` : `v${bunVersion} (need >= 1.3.0)`,
	});

	// Check Git
	try {
		const gitVersion = await $`git --version`.text();
		results.push({
			component: "Git",
			status: "ok",
			message: gitVersion.trim(),
		});
	} catch {
		results.push({
			component: "Git",
			status: "error",
			message: "Not installed",
		});
	}

	// Check Git repo
	try {
		await $`git rev-parse --git-dir`.quiet();
		results.push({
			component: "Git Repository",
			status: "ok",
			message: "Inside git repo",
		});
	} catch {
		results.push({
			component: "Git Repository",
			status: "error",
			message: "Not in a git repo",
		});
	}

	// Check hooks
	const gitDir = await $`git rev-parse --git-dir`.text().catch(() => "");
	const hooksDir = `${gitDir.trim()}/hooks`;
	const requiredHooks = [
		"pre-commit",
		"prepare-commit-msg",
		"commit-msg",
		"post-commit",
		"pre-push",
	];

	for (const hook of requiredHooks) {
		try {
			const content = await Bun.file(`${hooksDir}/${hook}`).text();
			const isTier1380 = content.includes("Tier-1380 OMEGA");
			results.push({
				component: `Hook: ${hook}`,
				status: isTier1380 ? "ok" : "warning",
				message: isTier1380 ? "Installed" : "Custom/other",
			});
		} catch {
			results.push({
				component: `Hook: ${hook}`,
				status: "warning",
				message: "Not installed",
			});
		}
	}

	// Check configuration
	const configPath = `${process.env.HOME}/.config/tier1380-commit-flow/config.json`;
	try {
		const _config = await Bun.file(configPath).json();
		results.push({
			component: "Configuration",
			status: "ok",
			message: `Found at ${configPath}`,
		});
	} catch {
		results.push({
			component: "Configuration",
			status: "warning",
			message: `Not found at ${configPath}`,
		});
	}

	// Check database
	const dbPath = `${process.env.HOME}/.matrix/commit-history.db`;
	try {
		const db = new Database(dbPath);
		const tableCheck = db
			.query("SELECT name FROM sqlite_master WHERE type='table' AND name='commits'")
			.get();
		db.close();
		results.push({
			component: "Database",
			status: tableCheck ? "ok" : "warning",
			message: tableCheck ? "Ready" : "Exists but empty",
		});
	} catch {
		results.push({
			component: "Database",
			status: "warning",
			message: "Not initialized",
		});
	}

	// Check alias
	const shellRc = process.env.SHELL?.includes("zsh")
		? `${process.env.HOME}/.zshrc`
		: `${process.env.HOME}/.bashrc`;
	try {
		const rcContent = await Bun.file(shellRc).text();
		const hasAlias = rcContent.includes("tier1380");
		results.push({
			component: "Shell Alias",
			status: hasAlias ? "ok" : "warning",
			message: hasAlias ? `Found in ${shellRc}` : `Not found in ${shellRc}`,
		});
	} catch {
		results.push({
			component: "Shell Alias",
			status: "warning",
			message: `Could not read ${shellRc}`,
		});
	}

	return results;
}

function renderResults(results: HealthResult[]): void {
	console.log();
	console.log("Health Check Results:");
	console.log("═══════════════════════════════════════════════════\n");

	let ok = 0;
	let warning = 0;
	let error = 0;

	for (const result of results) {
		const icon =
			result.status === "ok" ? "✅" : result.status === "warning" ? "⚠️" : "❌";
		console.log(`${icon} ${result.component.padEnd(20)} ${result.message}`);

		if (result.status === "ok") ok++;
		else if (result.status === "warning") warning++;
		else error++;
	}

	console.log();
	console.log(`Summary: ${ok} OK, ${warning} warnings, ${error} errors`);

	if (error > 0) {
		console.log();
		console.log("Fix errors with:");
		console.log("  bun ~/.kimi/skills/tier1380-commit-flow/setup.ts");
	}
}

// Main
if (import.meta.main) {
	console.log("╔════════════════════════════════════════════════════════╗");
	console.log("║     Tier-1380 OMEGA Health Check                       ║");
	console.log("╚════════════════════════════════════════════════════════╝");

	const results = await runHealthCheck();
	renderResults(results);

	const hasErrors = results.some((r) => r.status === "error");
	process.exit(hasErrors ? 1 : 0);
}

export { runHealthCheck, renderResults, type HealthResult };
