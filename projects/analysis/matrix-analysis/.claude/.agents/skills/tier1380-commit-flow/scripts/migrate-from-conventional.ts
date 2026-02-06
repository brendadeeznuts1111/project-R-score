#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Migration Tool
 * Migrate from conventional commits to Tier-1380 format
 */

import { $ } from "bun";

interface ConventionalCommit {
	hash: string;
	message: string;
	type: string;
	scope: string | null;
	subject: string;
}

const TYPE_MAPPING: Record<string, { domain: string; type: string }> = {
	feat: { domain: "PLATFORM", type: "FEAT" },
	fix: { domain: "RUNTIME", type: "FIX" },
	docs: { domain: "DOCS", type: "DOCS" },
	style: { domain: "STYLE", type: "STYLE" },
	refactor: { domain: "PLATFORM", type: "REFACTOR" },
	perf: { domain: "RUNTIME", type: "PERF" },
	test: { domain: "TEST", type: "TEST" },
	chore: { domain: "CONFIG", type: "CHORE" },
	ci: { domain: "INFRA", type: "CHORE" },
	build: { domain: "BUILD", type: "CHORE" },
};

const SCOPE_MAPPING: Record<string, string> = {
	api: "API",
	cli: "CLI",
	core: "MATRIX",
	ui: "UI",
	test: "TEST",
	docs: "DOCS",
	deps: "BUILD",
	config: "CONFIG",
	"*": "MATRIX",
};

function parseConventionalCommit(message: string): ConventionalCommit | null {
	// pattern: type(scope): subject
	const pattern = /^(\w+)(?:\(([^)]+)\))?\s*:\s*(.+)$/;
	const match = message.match(pattern);

	if (!match) return null;

	return {
		hash: "",
		message,
		type: match[1],
		scope: match[2] || null,
		subject: match[3],
	};
}

function convertToTier1380(conv: ConventionalCommit): string {
	const mapping = TYPE_MAPPING[conv.type] || {
		domain: "PLATFORM",
		type: "FEAT",
	};
	const component = conv.scope
		? SCOPE_MAPPING[conv.scope] || conv.scope.toUpperCase()
		: "MATRIX";

	return `[${mapping.domain}][COMPONENT:${component}][TIER:1380] ${conv.subject}`;
}

async function getRecentCommits(
	count = 10,
): Promise<Array<{ hash: string; message: string }>> {
	const log = await $`git log -${count} --pretty=format:"%H|%s"`.text();

	return log
		.trim()
		.split("\n")
		.filter(Boolean)
		.map((line) => {
			const [hash, ...messageParts] = line.split("|");
			return { hash, message: messageParts.join("|") };
		});
}

// Main
if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const dryRun = !args.includes("--apply");

	console.log("╔════════════════════════════════════════════════════════╗");
	console.log("║     Tier-1380 OMEGA Migration Tool                     ║");
	console.log(
		`${`║     Mode: ${dryRun ? "DRY RUN (preview only)" : "LIVE (will apply changes)"}`.padEnd(
			55,
		)}║`,
	);
	console.log("╚════════════════════════════════════════════════════════╝");
	console.log();

	const commits = await getRecentCommits(20);

	console.log(`Analyzing ${commits.length} recent commits...\n`);

	let convertedCount = 0;

	for (const commit of commits) {
		const parsed = parseConventionalCommit(commit.message);

		if (parsed) {
			const tier1380 = convertToTier1380(parsed);
			console.log(`Original: ${commit.message.slice(0, 50)}`);
			console.log(`Tier-1380: ${tier1380.slice(0, 50)}`);
			console.log();
			convertedCount++;
		}
	}

	console.log(`Found ${convertedCount} conventional commits`);
	console.log();

	if (dryRun) {
		console.log("This was a dry run. No changes were made.");
		console.log();
		console.log("To rewrite commits, run:");
		console.log("  bun migrate-from-conventional.ts --apply");
		console.log();
		console.log("⚠️  Warning: Rewriting history will change commit hashes!");
		console.log("   Only do this on local branches before pushing.");
	} else {
		console.log(
			"Apply mode not yet implemented. Use git rebase -i to manually rewrite.",
		);
		console.log();
		console.log("Suggested commands:");
		console.log("  git rebase -i HEAD~20");
		console.log("  # Then mark commits for 'reword'");
	}
}

export { parseConventionalCommit, convertToTier1380, TYPE_MAPPING, SCOPE_MAPPING };
