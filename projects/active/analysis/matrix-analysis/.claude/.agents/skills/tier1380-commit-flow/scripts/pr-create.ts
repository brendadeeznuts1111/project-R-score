#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA PR Creator
 * Create GitHub PRs with proper formatting
 */

import { $ } from "bun";

interface PRConfig {
	title: string;
	body: string;
	base: string;
	draft: boolean;
}

async function generatePRBody(): Promise<string> {
	const branch = (await $`git branch --show-current`.text()).trim();
	const commits =
		await $`git log origin/${branch}..HEAD --pretty=format:"%s" 2>/dev/null || echo ""`.text();

	const sections = [
		"## Summary",
		"",
		"<!-- Brief description of changes -->",
		"",
		"## Changes",
		"",
	];

	// Add commit list
	if (commits.trim()) {
		for (const commit of commits.trim().split("\n")) {
			sections.push(`- ${commit}`);
		}
	} else {
		sections.push("- <!-- List your changes -->");
	}

	sections.push(
		"",
		"## Checklist",
		"",
		"- [ ] Tests pass",
		"- [ ] Biome lint passes",
		"- [ ] Col-89 compliance",
		"- [ ] Commit messages follow Tier-1380 format",
		"",
		"## Tier-1380 Compliance",
		"",
		"- **Domain**: <!-- RUNTIME, PLATFORM, SECURITY, etc. -->",
		"- **Component**: <!-- CHROME, MATRIX, REGISTRY, etc. -->",
		"- **Tier**: 1380",
		"",
	);

	return sections.join("\n");
}

async function suggestPRTitle(): Promise<string[]> {
	const branch = (await $`git branch --show-current`.text()).trim();
	const lastCommit = await $`git log -1 --pretty=%s`.text().catch(() => "");

	const suggestions: string[] = [];

	// Parse branch name
	const branchMatch = branch.match(/^(feature|fix|hotfix)\/TIER-(\d+)-(.+)$/);
	if (branchMatch) {
		const [, _type, tier, desc] = branchMatch;
		const readableDesc = desc.replace(/-/g, " ");
		suggestions.push(`[TIER:${tier}] ${readableDesc}`);
	}

	// Parse last commit
	const commitMatch = lastCommit.match(/^\[([A-Z]+)\].*?\]\s*(.+)$/);
	if (commitMatch) {
		suggestions.push(commitMatch[2]);
	}

	if (suggestions.length === 0) {
		suggestions.push("[TIER:1380] Update implementation");
	}

	return suggestions;
}

async function checkGitHubCLI(): Promise<boolean> {
	try {
		await $`gh --version`.quiet();
		return true;
	} catch {
		return false;
	}
}

async function createPR(config: PRConfig): Promise<boolean> {
	const hasGh = await checkGitHubCLI();

	if (!hasGh) {
		console.info("❌ GitHub CLI (gh) not installed");
		console.info();
		console.info("Install from: https://cli.github.com/");
		console.info("Or create PR manually at:");

		const remote = await $`git remote get-url origin`.text().catch(() => "");
		const match = remote.match(/github\.com[:/](.+?)\.git/);
		if (match) {
			console.info(
				`  https://github.com/${match[1]}/pull/new/${await $`git branch --show-current`.text()}`,
			);
		}
		return false;
	}

	const args = [
		"pr",
		"create",
		"--title",
		config.title,
		"--body",
		config.body,
		"--base",
		config.base,
	];

	if (config.draft) {
		args.push("--draft");
	}

	try {
		const result = await $`gh ${args}`.text();
		console.info(result);
		return true;
	} catch (error) {
		console.error("❌ Failed to create PR:", error);
		return false;
	}
}

// Main
if (import.meta.main) {
	const args = Bun.argv.slice(2);

	console.info("╔════════════════════════════════════════════════════════╗");
	console.info("║     Tier-1380 OMEGA PR Creator                         ║");
	console.info("╚════════════════════════════════════════════════════════╝");
	console.info();

	// Check if gh is available
	const hasGh = await checkGitHubCLI();
	if (!hasGh) {
		console.info("⚠️  GitHub CLI not detected. Will generate PR template only.");
		console.info();
	}

	// Generate suggestions
	const titles = await suggestPRTitle();
	const body = await generatePRBody();

	console.info("Suggested PR Title:");
	console.info(`  ${titles[0]}`);
	console.info();

	// Get title from args or use suggestion
	let title = args.find((a) => !a.startsWith("--"));
	if (!title) {
		title = titles[0];
	}

	const draft = args.includes("--draft") || args.includes("-d");
	const base = args.find((a) => a.startsWith("--base="))?.split("=")[1] || "main";

	// Display PR body preview
	console.info("PR Body Preview:");
	console.info("─".repeat(50));
	console.info(body);
	console.info("─".repeat(50));
	console.info();

	if (!hasGh) {
		console.info("Save the above as your PR description.");
		process.exit(0);
	}

	// Create PR
	const success = await createPR({ title, body, base, draft });

	if (success) {
		console.info();
		console.info("✅ PR created successfully!");
	} else {
		process.exit(1);
	}
}

export { generatePRBody, suggestPRTitle, createPR, checkGitHubCLI };
