#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Validate Multiple Commits
 * CI/CD helper for validating commit ranges
 */

import { $ } from "bun";
import { validateCommitMessage } from "./validate-message";

interface CommitValidationResult {
	hash: string;
	message: string;
	valid: boolean;
	errors: string[];
}

async function getCommitsInRange(
	base: string,
	head: string,
): Promise<Array<{ hash: string; message: string }>> {
	const log = await $`git log ${base}..${head} --pretty=format:"%H|%s"`.text();

	return log
		.trim()
		.split("\n")
		.filter(Boolean)
		.map((line) => {
			const [hash, ...messageParts] = line.split("|");
			return { hash, message: messageParts.join("|") };
		});
}

async function validateCommits(
	base: string,
	head: string,
): Promise<CommitValidationResult[]> {
	const commits = await getCommitsInRange(base, head);
	const results: CommitValidationResult[] = [];

	for (const commit of commits) {
		// Skip merge commits
		if (commit.message.startsWith("Merge ")) {
			results.push({
				hash: commit.hash,
				message: commit.message,
				valid: true,
				errors: [],
			});
			continue;
		}

		const validation = validateCommitMessage(commit.message);
		results.push({
			hash: commit.hash,
			message: commit.message,
			valid: validation.valid,
			errors: validation.errors,
		});
	}

	return results;
}

function generateReport(results: CommitValidationResult[]): string {
	const valid = results.filter((r) => r.valid).length;
	const invalid = results.filter((r) => !r.valid).length;

	let report = `# Tier-1380 OMEGA Commit Validation Report\n\n`;
	report += `**Total**: ${results.length} commits\n`;
	report += `**Valid**: ${valid} ✅\n`;
	report += `**Invalid**: ${invalid} ❌\n\n`;

	if (invalid > 0) {
		report += `## Invalid Commits\n\n`;
		for (const result of results.filter((r) => !r.valid)) {
			report += `### ${result.hash.slice(0, 7)}\n`;
			report += `**Message**: ${result.message}\n\n`;
			report += `**Errors**:\n`;
			for (const error of result.errors) {
				report += `- ${error}\n`;
			}
			report += `\n`;
		}
	}

	return report;
}

// Main
if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const base = args[0];
	const head = args[1] || "HEAD";

	if (!base) {
		console.log("Usage: validate-commits.ts <base-ref> [head-ref]");
		console.log();
		console.log("Examples:");
		console.log("  validate-commits.ts origin/main HEAD");
		console.log(
			"  validate-commits.ts ${{ github.event.pull_request.base.sha }} ${{ github.event.pull_request.head.sha }}",
		);
		process.exit(1);
	}

	console.log("╔════════════════════════════════════════════════════════╗");
	console.log("║     Tier-1380 OMEGA Commit Range Validator             ║");
	console.log("╚════════════════════════════════════════════════════════╝");
	console.log();
	console.log(`Validating commits from ${base} to ${head}...`);
	console.log();

	const results = await validateCommits(base, head);

	// Display results
	let validCount = 0;
	let invalidCount = 0;

	for (const result of results) {
		const icon = result.valid ? "✅" : "❌";
		console.log(`${icon} ${result.hash.slice(0, 7)} ${result.message.slice(0, 60)}`);

		if (!result.valid) {
			for (const error of result.errors) {
				console.log(`   ${error}`);
			}
			invalidCount++;
		} else {
			validCount++;
		}
	}

	console.log();
	console.log(`Results: ${validCount} valid, ${invalidCount} invalid`);

	// Generate report for CI
	if (process.env.CI) {
		const report = generateReport(results);
		await Bun.write("commit-validation-report.md", report);
		console.log();
		console.log("Report saved to: commit-validation-report.md");
	}

	process.exit(invalidCount > 0 ? 1 : 0);
}

export { validateCommits, getCommitsInRange, generateReport };
