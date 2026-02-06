#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Pre-Push Hook
 * Validates before pushing to remote
 */

import { $ } from "bun";
import { PROTECTED_BRANCHES, validateBranchName } from "./branch-validator";

interface PushCheckResult {
	name: string;
	passed: boolean;
	details?: string;
}

async function runPrePushChecks(): Promise<PushCheckResult[]> {
	const results: PushCheckResult[] = [];

	// Check current branch
	const branch = (await $`git branch --show-current`.text()).trim();

	// Branch name validation
	const branchCheck = validateBranchName(branch);
	results.push({
		name: "Branch Name",
		passed: branchCheck.valid,
		details: branchCheck.errors.join("; ") || undefined,
	});

	// Protected branch check
	if (PROTECTED_BRANCHES.includes(branch)) {
		results.push({
			name: "Protected Branch",
			passed: false,
			details: `${branch} is protected. Use PR workflow instead of direct push.`,
		});
	}

	// Check if local is behind remote
	try {
		await $`git fetch origin ${branch}`.quiet();
		const behind = await $`git rev-list HEAD..origin/${branch} --count`.text();
		const behindCount = Number(behind.trim());

		if (behindCount > 0) {
			results.push({
				name: "Remote Sync",
				passed: false,
				details: `${behindCount} commit(s) behind origin/${branch}. Pull first.`,
			});
		} else {
			results.push({ name: "Remote Sync", passed: true });
		}
	} catch {
		results.push({ name: "Remote Sync", passed: true }); // No remote branch yet
	}

	// Check for WIP commits
	const commits = await $`git log origin/${branch}..HEAD --pretty=%s`
		.text()
		.catch(() => "");
	const wipCommits = commits
		.split("\n")
		.filter(
			(c) =>
				c.toLowerCase().includes("wip") ||
				c.toLowerCase().includes("todo") ||
				c.toLowerCase().includes("fixme"),
		);

	if (wipCommits.length > 0) {
		results.push({
			name: "WIP Commits",
			passed: false,
			details: `${wipCommits.length} WIP/TODO/FIXME commits found`,
		});
	} else {
		results.push({ name: "WIP Commits", passed: true });
	}

	// Check for large files
	const largeFiles = await checkLargeFiles();
	if (largeFiles.length > 0) {
		results.push({
			name: "Large Files",
			passed: false,
			details: `${largeFiles.length} file(s) >10MB`,
		});
	} else {
		results.push({ name: "Large Files", passed: true });
	}

	// Run governance checks
	try {
		await $`bun ~/.kimi/skills/tier1380-commit-flow/scripts/governance-check.ts staged`.quiet();
		results.push({ name: "Governance", passed: true });
	} catch {
		results.push({
			name: "Governance",
			passed: false,
			details: "Governance checks failed. Run: bun run governance",
		});
	}

	return results;
}

async function checkLargeFiles(): Promise<string[]> {
	const largeFiles: string[] = [];

	try {
		const files = await $`git diff --cached --name-only --diff-filter=A`.text();

		for (const file of files.trim().split("\n")) {
			if (!file) continue;

			const size = await $`git cat-file -s :"${file}" 2>/dev/null || echo 0`.text();
			const sizeBytes = Number(size.trim());

			if (sizeBytes > 10 * 1024 * 1024) {
				// 10MB
				largeFiles.push(`${file} (${(sizeBytes / 1024 / 1024).toFixed(1)}MB)`);
			}
		}
	} catch {
		// Ignore errors
	}

	return largeFiles;
}

// Main
if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const force = args.includes("--force") || args.includes("-f");

	console.log("╔════════════════════════════════════════════════════════╗");
	console.log("║     Tier-1380 OMEGA Pre-Push Hook                      ║");
	console.log("╚════════════════════════════════════════════════════════╝");
	console.log();

	const results = await runPrePushChecks();

	let passed = 0;
	let failed = 0;

	for (const result of results) {
		if (result.passed) {
			console.log(`✅ ${result.name}`);
			passed++;
		} else {
			console.log(`❌ ${result.name}`);
			if (result.details) {
				console.log(`   ${result.details}`);
			}
			failed++;
		}
	}

	console.log();
	console.log(`Results: ${passed} passed, ${failed} failed`);

	if (failed > 0) {
		console.log();
		console.log("⚠️  Fix failing checks before pushing");

		if (force) {
			console.log("   (Proceeding due to --force flag)");
			process.exit(0);
		}

		process.exit(1);
	} else {
		console.log();
		console.log("✨ All checks passed! Ready to push.");
	}
}

export { runPrePushChecks, checkLargeFiles };
