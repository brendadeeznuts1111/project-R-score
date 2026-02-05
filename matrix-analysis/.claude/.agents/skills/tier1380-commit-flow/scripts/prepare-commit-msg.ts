#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Prepare Commit Message Hook
 * Helps users write proper commit messages
 */

import { $ } from "bun";

async function generateCommitTemplate(): Promise<string> {
	const branch = (await $`git branch --show-current`.text()).trim();

	// Try to extract info from branch name
	const branchMatch = branch.match(/^(feature|fix|hotfix)\/TIER-(\d+)-(.+)$/);

	let domain = "PLATFORM";
	let component = "MATRIX";
	let tier = "1380";
	let description = "Update implementation";

	if (branchMatch) {
		const [, type, branchTier, branchDesc] = branchMatch;
		tier = branchTier;
		description = branchDesc.replace(/-/g, " ");

		// Infer domain from branch type
		switch (type) {
			case "feature":
				domain = "PLATFORM";
				break;
			case "fix":
			case "hotfix":
				domain = "RUNTIME";
				break;
		}
	}

	// Get staged files to suggest component
	const stagedFiles = await $`git diff --cached --name-only`.text().catch(() => "");
	const files = stagedFiles.trim().split("\n");

	for (const file of files) {
		if (file.includes("registry") || file.includes("r2")) component = "REGISTRY";
		if (file.includes("chrome")) component = "CHROME";
		if (file.includes("matrix")) component = "MATRIX";
		if (file.includes("skill")) component = "SKILLS";
		if (file.includes("sse")) component = "SSE";
		if (file.includes("mcp")) component = "MCP";
	}

	return `[${domain}][COMPONENT:${component}][TIER:${tier}] ${description}`;
}

async function prepareCommitMsg(commitMsgFile: string): Promise<void> {
	const existingMsg = await Bun.file(commitMsgFile).text();

	// If message is already provided (not a template), don't modify
	if (existingMsg.trim() && !existingMsg.startsWith("#")) {
		return;
	}

	const template = await generateCommitTemplate();

	const helpText = `# Tier-1380 OMEGA Commit Format:
# [DOMAIN][COMPONENT:NAME][TIER:XXXX] Brief description
#
# Examples:
# [RUNTIME][COMPONENT:CHROME][TIER:1380] Add entropy caching
# [PLATFORM][COMPONENT:REGISTRY][TIER:1380] Fix R2 upload
# [SKILLS][COMPONENT:FLOW][TIER:1380] Update pre-commit hook
#
# Domains: RUNTIME, PLATFORM, SECURITY, API, UI, DOCS, TEST
# Components: CHROME, MATRIX, REGISTRY, BLAST, SKILLS, SSE, MCP
#
`;

	const newMsg = `${template}

${helpText}${existingMsg}`;

	await Bun.write(commitMsgFile, newMsg);
}

// Main
if (import.meta.main) {
	const commitMsgFile = Bun.argv[2];
	const commitSource = Bun.argv[3]; // message, template, merge, squash, commit

	if (!commitMsgFile) {
		console.log("Usage: prepare-commit-msg.ts <commit-msg-file> [commit-source]");
		process.exit(1);
	}

	// Only modify for template (not for message, merge, squash)
	if (commitSource && commitSource !== "template") {
		process.exit(0);
	}

	await prepareCommitMsg(commitMsgFile);
}

export { generateCommitTemplate, prepareCommitMsg };
