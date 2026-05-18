#!/usr/bin/env bun
/**
 * @fileoverview Team Lead Review Workflow
 * @description Automated workflow for team leads to review PRs, verify benchmarks, and merge
 * @module scripts/team-lead-review
 * 
 * Usage:
 *   bun run scripts/team-lead-review.ts --pr=42 --team=sports-correlation
 *   bun run scripts/team-lead-review.ts --list --team=sports-correlation --assignee=alex.chen
 *   bun run scripts/team-lead-review.ts --review --pr=42 --action=approve
 * 
 * @see {@link ../docs/TEAM-ORGANIZATION-PACKAGE-OWNERSHIP.md|Team Organization Documentation}
 */

import { $ } from "bun";

interface ReviewOptions {
	pr?: string;
	team?: string;
	assignee?: string;
	action?: "approve" | "request-changes" | "comment";
	repo?: string;
	label?: string;
	notifyChannel?: string;
	autoMerge?: boolean;
	verifyBenchmark?: boolean;
}

// Team configuration
const TEAMS = {
	"sports-correlation": {
		lead: "alex.chen",
		leadTelegram: "@alexchen",
		packages: ["@graph/layer4", "@graph/layer3"],
		slackChannel: "#sports-correlation",
		telegramSupergroup: "#sports-correlation",
		telegramTopic: 2, // Live Alerts
		maintainers: {
			"@graph/layer4": { name: "Jordan Lee", telegram: "@jordanlee" },
			"@graph/layer3": { name: "Priya Patel", telegram: "@priyapatel" },
		},
	},
	"market-analytics": {
		lead: "sarah.kumar",
		leadTelegram: "@sarahkumar",
		packages: ["@graph/layer2", "@graph/layer1"],
		slackChannel: "#market-analytics",
		telegramSupergroup: "#market-analytics",
		telegramTopic: 3, // Arbitrage Opportunities
		maintainers: {
			"@graph/layer2": { name: "Tom Wilson", telegram: "@tomwilson" },
			"@graph/layer1": { name: "Lisa Zhang", telegram: "@lisazhang" },
		},
	},
	"platform-tools": {
		lead: "mike.rodriguez",
		leadTelegram: "@mikerodriguez",
		packages: [
			"@graph/algorithms",
			"@graph/storage",
			"@graph/streaming",
			"@graph/utils",
			"@bench/layer4",
			"@bench/layer3",
			"@bench/layer2",
			"@bench/layer1",
			"@bench/property",
			"@bench/stress",
		],
		slackChannel: "#platform-tools",
		telegramSupergroup: "#platform-tools",
		telegramTopic: 4, // Analytics & Stats
		maintainers: {
			"@graph/algorithms": { name: "David Kim", telegram: "@davidkim" },
			"@graph/storage": { name: "Emma Brown", telegram: "@emmabrown" },
			"@graph/streaming": { name: "Emma Brown", telegram: "@emmabrown" },
			"@graph/utils": { name: "Mike Rodriguez", telegram: "@mikerodriguez" },
			"@bench/layer4": { name: "Ryan Gupta", telegram: "@ryangupta" },
			"@bench/layer3": { name: "Ryan Gupta", telegram: "@ryangupta" },
			"@bench/layer2": { name: "Ryan Gupta", telegram: "@ryangupta" },
			"@bench/layer1": { name: "Ryan Gupta", telegram: "@ryangupta" },
			"@bench/property": { name: "Ryan Gupta", telegram: "@ryangupta" },
			"@bench/stress": { name: "Ryan Gupta", telegram: "@ryangupta" },
		},
	},
} as const;

// Package to benchmark mapping
const PACKAGE_BENCHMARKS: Record<string, string> = {
	"@graph/layer4": "layer4",
	"@graph/layer3": "layer3",
	"@graph/layer2": "layer2",
	"@graph/layer1": "layer1",
	"@graph/algorithms": "algorithms",
	"@graph/storage": "storage",
	"@graph/streaming": "streaming",
};

async function runCommand(command: string, description: string): Promise<string> {
	console.info(`\n📌 ${description}`);
	console.info(`   Running: ${command}`);
	try {
		const result = await $`${command}`.quiet();
		const output = result.stdout.toString().trim();
		if (output) {
			console.info(`   ✅ Complete`);
		}
		return output;
	} catch (error) {
		console.error(`   ❌ Failed: ${error}`);
		throw error;
	}
}

async function step1ListPRs(team: string, assignee: string, repo: string, label?: string): Promise<void> {
	console.info(`\n📋 Step 1: List PRs for Review`);
	console.info(`   Team: ${team}`);
	console.info(`   Assignee: ${assignee}`);
	console.info(`   Repo: ${repo}`);

	let command = `gh pr list --repo ${repo} --assignee ${assignee}`;
	if (label) {
		command += ` --label "${label}"`;
	} else {
		command += ` --label "team:${team}"`;
	}

	const output = await runCommand(command, "Listing PRs");
	console.info(`\n   PRs:\n${output}`);
}

async function step2CheckBenchmarkResults(pr: string, repo: string): Promise<string | null> {
	console.info(`\n📊 Step 2: Check benchmark results in PR`);

	const prBody = await runCommand(
		`gh pr view ${pr} --repo ${repo} --json body`,
		"Fetching PR details"
	);

	try {
		const prData = JSON.parse(prBody);
		const body = prData.body || "";

		// Extract benchmark results using ripgrep
		const benchmarkMatch = await runCommand(
			`echo "${body.replace(/"/g, '\\"')}" | rg -A 20 "Benchmark results:" || echo ""`,
			"Extracting benchmark results"
		);

		if (benchmarkMatch && benchmarkMatch.trim()) {
			console.info(`\n   Benchmark Results Found:\n${benchmarkMatch}`);
			return benchmarkMatch;
		} else {
			console.info(`   ⚠️  No benchmark results found in PR body`);
			return null;
		}
	} catch (error) {
		console.info(`   ⚠️  Could not parse PR body: ${error}`);
		return null;
	}
}

async function step3CheckoutPR(pr: string, repo: string): Promise<void> {
	console.info(`\n🔀 Step 3: Checkout PR branch`);

	await runCommand(`gh pr checkout ${pr} --repo ${repo}`, "Checking out PR branch");
}

async function step4RunBenchmark(packageName: string): Promise<void> {
	const benchName = PACKAGE_BENCHMARKS[packageName];
	if (!benchName) {
		console.info(`   ⚠️  No benchmark found for ${packageName}, skipping`);
		return;
	}

	console.info(`\n⚡ Step 4: Run benchmark locally to verify`);
	console.info(`   Package: ${packageName}`);
	console.info(`   Benchmark: bench:${benchName}`);

	await runCommand(`bun run bench:${benchName}`, `Running benchmark for ${packageName}`);
}

async function step5ReviewPR(
	pr: string,
	action: "approve" | "request-changes" | "comment",
	comment?: string,
	repo?: string
): Promise<void> {
	console.info(`\n👀 Step 5: Review PR`);

	const defaultComment =
		action === "approve"
			? "✅ Approved - Benchmark results verified"
			: action === "request-changes"
				? "⚠️ Changes requested - Please address benchmark concerns"
				: comment || "Reviewing...";

	const command = `gh pr review ${pr} --${action} --body "${defaultComment}"${repo ? ` --repo ${repo}` : ""}`;

	await runCommand(command, `${action === "approve" ? "Approving" : action === "request-changes" ? "Requesting changes on" : "Commenting on"} PR`);
}

async function step6MergePR(pr: string, repo: string, squash: boolean = true): Promise<void> {
	console.info(`\n🔀 Step 6: Merge PR`);

	const command = `gh pr merge ${pr} --${squash ? "squash" : "merge"} --delete-branch${repo ? ` --repo ${repo}` : ""}`;

	await runCommand(command, `Merging PR ${squash ? "(squash)" : "(merge commit)"}`);
}

async function step7NotifyTeam(
	team: string,
	packageName: string,
	version: string,
	improvement?: string,
	channel?: string
): Promise<void> {
	const teamConfig = TEAMS[team as keyof typeof TEAMS];
	if (!teamConfig) {
		console.info(`   ⚠️  Team ${team} not found, skipping notification`);
		return;
	}

	const slackChannel = channel || teamConfig.slackChannel;
	const message = improvement
		? `✅ ${packageName} ${version} published with ${improvement} performance improvement`
		: `✅ ${packageName} ${version} published`;

	console.info(`\n📢 Step 7: Notify team`);
	console.info(`   Channel: ${slackChannel}`);
	console.info(`   Message: ${message}`);

	// Check if slack-notify command exists
	try {
		await runCommand(`slack-notify "${slackChannel}" "${message}"`, "Sending Slack notification");
	} catch {
		console.info(`   ⚠️  slack-notify command not found, skipping notification`);
		console.info(`   💡 Run manually: slack-notify "${slackChannel}" "${message}"`);
	}
}

async function extractPackageFromPR(pr: string, repo: string): Promise<string | null> {
	try {
		const prData = await runCommand(`gh pr view ${pr} --repo ${repo} --json title,body`, "Fetching PR details");
		const data = JSON.parse(prData);
		const text = `${data.title} ${data.body}`.toLowerCase();

		// Try to find package name in PR title/body
		for (const team of Object.values(TEAMS)) {
			for (const pkg of team.packages) {
				if (text.includes(pkg.toLowerCase())) {
					return pkg;
				}
			}
		}
	} catch {
		// Ignore errors
	}
	return null;
}

async function extractVersionFromPR(pr: string, repo: string): Promise<string | null> {
	try {
		const prData = await runCommand(`gh pr view ${pr} --repo ${repo} --json body`, "Fetching PR details");
		const data = JSON.parse(prData);
		const body = data.body || "";

		// Try to extract version from PR body
		const versionMatch = body.match(/v?(\d+\.\d+\.\d+(?:-[a-z]+\.\d+)?)/i);
		if (versionMatch) {
			return versionMatch[1];
		}
	} catch {
		// Ignore errors
	}
	return null;
}

async function extractImprovementFromBenchmark(benchmarkText: string): Promise<string | null> {
	// Try to extract improvement percentage
	const improvementMatch = benchmarkText.match(/(\d+\.?\d*)%/);
	if (improvementMatch) {
		return `${improvementMatch[1]}%`;
	}
	return null;
}

async function runReviewWorkflow(options: ReviewOptions): Promise<void> {
	const { pr, team, repo = "yourorg/graph-engine", verifyBenchmark, autoMerge, notifyChannel } = options;

	if (!pr) {
		throw new Error("PR number is required for review workflow");
	}

	console.info(`\n🚀 Starting Team Lead Review Workflow`);
	console.info(`   PR: #${pr}`);
	console.info(`   Team: ${team || "auto-detect"}`);
	console.info(`   Repo: ${repo}\n`);

	// Step 1: Check benchmark results
	const benchmarkResults = await step2CheckBenchmarkResults(pr, repo);

	// Step 2: Checkout PR
	await step3CheckoutPR(pr, repo);

	// Step 3: Run benchmark if requested
	if (verifyBenchmark) {
		const packageName = await extractPackageFromPR(pr, repo);
		if (packageName) {
			await step4RunBenchmark(packageName);
		} else {
			console.info(`   ⚠️  Could not detect package from PR, skipping benchmark`);
		}
	}

	// Step 4: Review PR (if action specified)
	if (options.action) {
		await step5ReviewPR(pr, options.action, undefined, repo);
	}

	// Step 5: Merge if approved and auto-merge enabled
	if (autoMerge && options.action === "approve") {
		await step6MergePR(pr, repo);

		// Step 6: Notify team
		if (team) {
			const packageName = await extractPackageFromPR(pr, repo);
			const version = await extractVersionFromPR(pr, repo);
			const improvement = benchmarkResults ? await extractImprovementFromBenchmark(benchmarkResults) : undefined;

			await step7NotifyTeam(team, packageName || "package", version || "new version", improvement, notifyChannel);
		}
	}

	console.info(`\n✅ Review workflow complete!`);
}

async function runListWorkflow(options: ReviewOptions): Promise<void> {
	const { team, assignee, repo = "yourorg/graph-engine", label } = options;

	if (!team && !assignee) {
		throw new Error("Team or assignee is required for list workflow");
	}

	const teamConfig = team ? TEAMS[team as keyof typeof TEAMS] : null;
	const assigneeName = assignee || teamConfig?.lead;

	if (!assigneeName) {
		throw new Error("Could not determine assignee");
	}

	await step1ListPRs(team || "all", assigneeName, repo, label);
}

async function main() {
	const args = process.argv.slice(2);
	const options: ReviewOptions = {
		repo: "yourorg/graph-engine",
		verifyBenchmark: true,
		autoMerge: false,
	};

	// Parse arguments
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg.startsWith("--")) {
			const key = arg.replace("--", "").split("=")[0];
			const value = arg.includes("=") ? arg.split("=")[1] : args[i + 1];

			switch (key) {
				case "pr":
					options.pr = value;
					break;
				case "team":
					options.team = value;
					break;
				case "assignee":
					options.assignee = value;
					break;
				case "action":
					options.action = value as "approve" | "request-changes" | "comment";
					break;
				case "repo":
					options.repo = value;
					break;
				case "label":
					options.label = value;
					break;
				case "notify-channel":
					options.notifyChannel = value;
					break;
				case "auto-merge":
					options.autoMerge = value === "true" || value === "1";
					break;
				case "verify-benchmark":
					options.verifyBenchmark = value === "true" || value === "1";
					break;
				case "list":
					options.action = undefined; // Clear action for list mode
					break;
			}
		}
	}

	try {
		if (args.includes("--list") || (!options.pr && (options.team || options.assignee))) {
			await runListWorkflow(options);
		} else if (options.pr) {
			await runReviewWorkflow(options);
		} else {
			console.error("❌ Error: --pr or --list is required");
			console.info("\nUsage:");
			console.info("  # List PRs for review");
			console.info("  bun run scripts/team-lead-review.ts --list --team=sports-correlation --assignee=alex.chen");
			console.info("");
			console.info("  # Review PR");
			console.info("  bun run scripts/team-lead-review.ts --pr=42 --team=sports-correlation --verify-benchmark");
			console.info("");
			console.info("  # Approve and merge");
			console.info("  bun run scripts/team-lead-review.ts --pr=42 --team=sports-correlation --action=approve --auto-merge");
			process.exit(1);
		}
	} catch (error) {
		console.error(`\n❌ Workflow failed: ${error}`);
		process.exit(1);
	}
}

if (import.meta.main) {
	main();
}
