#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Commit Squash Helper
 * Interactive squash tool with message validation
 */

import { $ } from "bun";

interface CommitInfo {
	hash: string;
	message: string;
	author: string;
	date: string;
}

async function getCommits(count = 10): Promise<CommitInfo[]> {
	try {
		const log =
			await $`git log -${count} --pretty=format:"%h%x00%s%x00%an%x00%ad" --date=short`.text();

		return log
			.trim()
			.split("\n")
			.filter(Boolean)
			.map((line) => {
				const [hash, ...rest] = line.split("\0");
				const [message, author, date] = rest.join("\0").split("\0");
				return {
					hash,
					message: message ?? "",
					author: author ?? "",
					date: date ?? "",
				};
			});
	} catch {
		return [];
	}
}

async function squashCommits(count: number, message: string): Promise<boolean> {
	const origHead = (await $`git rev-parse HEAD`.text()).trim();
	try {
		// Soft reset to target commit
		await $`git reset --soft HEAD~${count}`.quiet();

		// Create new commit
		await $`git commit -m ${message}`.quiet();

		return true;
	} catch (error) {
		// Attempt to restore original HEAD
		await $`git reset --soft ${origHead}`.quiet().nothrow();
		const detail = error instanceof Error ? error.message : String(error);
		console.error("❌ Squash failed (original HEAD restored):", detail);
		return false;
	}
}

function validateSquashMessage(message: string): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Check Tier-1380 format
	const pattern = /^\[([A-Z]+)\](?:\[COMPONENT:([A-Z]+)\])?\[TIER:(\d+)\] /;
	if (!pattern.test(message)) {
		errors.push(
			"Message should follow Tier-1380 format: [DOMAIN][COMPONENT:NAME][TIER:XXXX] Description",
		);
	}

	// Check length
	if (message.length > 72) {
		errors.push(`Message is ${message.length} chars (recommended: ≤72)`);
	}

	return { valid: errors.length === 0, errors };
}

async function suggestSquashMessage(commits: CommitInfo[]): Promise<string> {
	// Try to find common domain/component from commits
	const domains = new Set<string>();
	const components = new Set<string>();

	for (const commit of commits) {
		const match = commit.message.match(/^\[([A-Z]+)\](?:\[COMPONENT:([A-Z]+)\])?/);
		if (match) {
			domains.add(match[1]);
			if (match[2]) components.add(match[2]);
		}
	}

	const domain = Array.from(domains)[0] || "PLATFORM";
	const component = Array.from(components)[0] || "MATRIX";

	return `[${domain}][COMPONENT:${component}][TIER:1380] ${commits.length} commits squashed`;
}

// Main
if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const count = Number(args[0]) || 0;

	console.log("╔════════════════════════════════════════════════════════╗");
	console.log("║       Tier-1380 OMEGA Commit Squash Helper             ║");
	console.log("╚════════════════════════════════════════════════════════╝");
	console.log();

	// Get recent commits
	const commits = await getCommits(10);

	console.log("Recent commits:");
	commits.slice(0, 5).forEach((commit, i) => {
		console.log(`  ${i + 1}. ${commit.hash} ${commit.message.slice(0, 50)}`);
	});
	console.log();

	if (count === 0) {
		console.log("Usage:");
		console.log("  bun commit-squash.ts <count> [message]");
		console.log();
		console.log("Examples:");
		console.log(
			'  bun commit-squash.ts 3 "[RUNTIME][CHROME][TIER:1380] Add entropy feature"',
		);
		console.log();
		console.log("This will squash the last 3 commits into 1.");
		process.exit(0);
	}

	if (count > commits.length) {
		console.log(`❌ Only ${commits.length} commits available`);
		process.exit(1);
	}

	// Get commits to squash
	const toSquash = commits.slice(0, count);

	console.log(`Squashing ${count} commits:`);
	for (const commit of toSquash) {
		console.log(`  • ${commit.hash} ${commit.message}`);
	}
	console.log();

	// Get message (filter out flags like --confirm)
	const message = args
		.slice(1)
		.filter((a) => !a.startsWith("--"))
		.join(" ");
	if (!message) {
		const suggestion = await suggestSquashMessage(toSquash);
		console.log(`Suggested message: ${suggestion}`);
		console.log();
		console.log("Run with message:");
		console.log(`  bun commit-squash.ts ${count} "${suggestion}"`);
		process.exit(0);
	}

	// Validate message
	const validation = validateSquashMessage(message);
	if (!validation.valid) {
		console.log("⚠️  Message validation warnings:");
		for (const error of validation.errors) {
			console.log(`  ${error}`);
		}
		console.log();
	}

	console.log(`New commit message: ${message}`);
	console.log();
	console.log("Run with --confirm to execute:");
	console.log(`  bun commit-squash.ts ${count} "${message}" --confirm`);
	console.log();

	if (args.includes("--confirm")) {
		const success = await squashCommits(count, message);
		if (success) {
			console.log("✅ Commits squashed successfully!");
			console.log();
			console.log("New commit:");
			const newCommit = await $`git log -1 --oneline`.text();
			console.log(`  ${newCommit}`);
		} else {
			process.exit(1);
		}
	}
}

export { getCommits, squashCommits, validateSquashMessage, suggestSquashMessage };
