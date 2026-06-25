#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Branch Naming Validator
 * Enforces branch naming conventions
 */

import { $ } from "bun";

interface BranchValidationResult {
	valid: boolean;
	branch: string;
	errors: string[];
	warnings: string[];
	type?: string;
	scope?: string;
	description?: string;
}

// Branch naming patterns
const BRANCH_PATTERNS = {
	// Main branches
	main: /^main$/,
	master: /^master$/,
	develop: /^develop$/,

	// Feature branches: feature/TIER-XXXX-short-description
	feature: /^feature\/TIER-(\d+)-([a-z0-9-]+)$/,

	// Fix branches: fix/TIER-XXXX-short-description
	fix: /^fix\/TIER-(\d+)-([a-z0-9-]+)$/,

	// Hotfix branches: hotfix/TIER-XXXX-short-description
	hotfix: /^hotfix\/TIER-(\d+)-([a-z0-9-]+)$/,

	// Release branches: release/vX.Y.Z
	release: /^release\/v(\d+)\.(\d+)\.(\d+)$/,

	// Docs branches: docs/short-description
	docs: /^docs\/([a-z0-9-]+)$/,
};

const PROTECTED_BRANCHES = ["main", "master", "develop"];

function validateBranchName(branch: string): BranchValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Check protected branches
	if (PROTECTED_BRANCHES.includes(branch)) {
		return {
			valid: true,
			branch,
			errors: [],
			warnings: ["Protected branch - use PR workflow"],
		};
	}

	// Check against patterns
	let matched = false;
	let type = "";
	let scope = "";

	for (const [patternName, pattern] of Object.entries(BRANCH_PATTERNS)) {
		const match = branch.match(pattern);
		if (match) {
			matched = true;
			type = patternName;

			if (
				patternName === "feature" ||
				patternName === "fix" ||
				patternName === "hotfix"
			) {
				const tier = match[1];
				if (tier !== "1380") {
					warnings.push(`Tier ${tier} - verify this is correct`);
				}
				scope = match[2];
			}
			break;
		}
	}

	if (!matched) {
		errors.push("Branch name doesn't match Tier-1380 conventions");
		errors.push(
			"Expected: feature/TIER-XXXX-short-desc, fix/TIER-XXXX-short-desc, etc.",
		);
	}

	// Check length
	if (branch.length > 50) {
		warnings.push(`Branch name is ${branch.length} chars (recommended: ≤50)`);
	}

	// Check for underscores (use hyphens)
	if (branch.includes("_")) {
		errors.push("Use hyphens (-) not underscores (_)");
	}

	return {
		valid: errors.length === 0,
		branch,
		errors,
		warnings,
		type,
		scope,
	};
}

async function getCurrentBranch(): Promise<string> {
	try {
		return (await $`git branch --show-current`.text()).trim();
	} catch {
		return "unknown";
	}
}

async function suggestBranchName(): Promise<string[]> {
	// Get the last commit message
	try {
		const lastMsg = (await $`git log -1 --pretty=%s`.text()).trim();
		const match = lastMsg.match(/^\[([A-Z]+)\].*?TIER:(\d+)\]\s*(.+)$/);

		if (match) {
			const [, domain, tier, desc] = match;
			const shortDesc = desc
				.toLowerCase()
				.replace(/[^a-z0-9\s]/g, "")
				.replace(/\s+/g, "-")
				.slice(0, 30);

			const type = domain === "FIX" ? "fix" : "feature";
			return [`${type}/TIER-${tier}-${shortDesc}`];
		}
	} catch {
		// Ignore errors
	}

	return ["feature/TIER-1380-new-feature"];
}

// Main
if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const branch = args[0] || (await getCurrentBranch());

	console.info("╔════════════════════════════════════════════════════════╗");
	console.info("║     Tier-1380 OMEGA Branch Validator                   ║");
	console.info("╚════════════════════════════════════════════════════════╝");
	console.info();

	const result = validateBranchName(branch);

	console.info(`Branch: ${branch}`);
	if (result.type) {
		console.info(`Type:   ${result.type}`);
	}
	console.info();

	if (result.valid) {
		console.info("✅ Branch name is valid");
	} else {
		console.info("❌ Branch name is invalid");
	}

	if (result.errors.length > 0) {
		console.info("\nErrors:");
		for (const error of result.errors) {
			console.info(`  ❌ ${error}`);
		}
	}

	if (result.warnings.length > 0) {
		console.info("\nWarnings:");
		for (const warning of result.warnings) {
			console.info(`  ⚠️  ${warning}`);
		}
	}

	if (!result.valid) {
		const suggestions = await suggestBranchName();
		console.info("\nSuggestions:");
		for (const suggestion of suggestions) {
			console.info(`  ${suggestion}`);
		}

		console.info("\nRename with:");
		console.info(`  git branch -m ${suggestions[0]}`);
	}

	console.info();
	process.exit(result.valid ? 0 : 1);
}

export { validateBranchName, getCurrentBranch, suggestBranchName, PROTECTED_BRANCHES };
