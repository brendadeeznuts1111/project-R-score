#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Git Commit with Governance
 * Automated commit creation with validation and signing
 */

import { $ } from "bun";
import { validateCommitMessage } from "./validate-message";

interface CommitOptions {
	message: string;
	sign?: boolean;
	amend?: boolean;
	noVerify?: boolean;
	coAuthor?: string;
}

interface CommitResult {
	success: boolean;
	hash?: string;
	message: string;
	errors: string[];
}

async function createCommit(options: CommitOptions): Promise<CommitResult> {
	const _errors: string[] = [];

	// Validate message format
	if (!options.noVerify) {
		const validation = validateCommitMessage(options.message);
		if (!validation.valid) {
			return {
				success: false,
				message: options.message,
				errors: validation.errors,
			};
		}
	}

	// Check for staged changes
	const staged = await $`git diff --cached --name-only`.text();
	if (!staged.trim()) {
		// Try to stage all changes
		try {
			await $`git add -A`;
			console.log("📦 Auto-staged all changes");
		} catch {
			return {
				success: false,
				message: options.message,
				errors: ["No changes to commit"],
			};
		}
	}

	// Build git commit command
	const args = ["commit", "-m", options.message];

	if (options.sign) args.push("-S");
	if (options.amend) args.push("--amend", "--no-edit");
	if (options.noVerify) args.push("--no-verify");

	try {
		const result = await $`git ${args}`.text();
		const hashMatch = result.match(/\[.+?([a-f0-9]{7})/);
		const hash = hashMatch?.[1];

		// Add co-author if specified
		if (options.coAuthor && !options.amend) {
			await $`git commit --amend --message="${options.message}\n\nCo-Authored-By: ${options.coAuthor}"`;
		}

		return {
			success: true,
			hash,
			message: options.message,
			errors: [],
		};
	} catch (error) {
		return {
			success: false,
			message: options.message,
			errors: [`Git commit failed: ${error}`],
		};
	}
}

async function suggestMessage(): Promise<string | null> {
	// Get staged files
	const files = await $`git diff --cached --name-only`.text();
	if (!files.trim()) return null;

	const fileList = files.trim().split("\n");

	// Determine domain and component
	const domains = new Set<string>();
	const components = new Set<string>();
	const types = new Set<string>();

	for (const file of fileList) {
		// Domain detection
		if (file.startsWith("src/") || file.includes("runtime")) domains.add("RUNTIME");
		if (file.startsWith("tools/") || file.includes("registry")) domains.add("PLATFORM");
		if (file.startsWith("skills/") || file.includes("skill")) domains.add("SKILLS");
		if (file.startsWith("docs/")) domains.add("DOCS");
		if (file.includes("test")) domains.add("TEST");
		if (file.includes("security") || file.includes("auth")) domains.add("SECURITY");

		// Component detection
		if (file.includes("registry")) components.add("REGISTRY");
		if (file.includes("matrix")) components.add("MATRIX");
		if (file.includes("chrome")) components.add("CHROME");
		if (file.includes("blast")) components.add("BLAST");
		if (file.includes("skill")) components.add("SKILLS");
		if (file.includes("kimi")) components.add("KIMI");

		// Type detection from diff
		if (file.includes("fix")) types.add("FIX");
		if (file.includes("feat")) types.add("FEAT");
		if (file.includes("test")) types.add("TEST");
		if (file.includes("doc")) types.add("DOCS");
		if (file.includes("refactor")) types.add("REFACTOR");
	}

	const domain = Array.from(domains)[0] || "PLATFORM";
	const component = Array.from(components)[0] || "MATRIX";
	const _type = Array.from(types)[0] || "FEAT";

	// Generate description
	const ext = fileList[0]?.split(".").pop() || "";
	let description = `Update ${ext} files`;

	if (fileList.length === 1) {
		description = `Update ${fileList[0]?.split("/").pop()}`;
	} else if (types.has("FIX")) {
		description = `Fix ${ext} issues`;
	} else if (types.has("FEAT")) {
		description = `Add ${ext} functionality`;
	}

	return `[${domain}][COMPONENT:${component}][TIER:1380] ${description}`;
}

// Main
if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const sign = args.includes("--sign") || args.includes("-S");
	const amend = args.includes("--amend");
	const noVerify = args.includes("--no-verify") || args.includes("-n");
	const coAuthorIdx = args.findIndex((a) => a === "--co-author" || a === "--co");
	const coAuthor = coAuthorIdx >= 0 ? args[coAuthorIdx + 1] : undefined;

	// Get message from args or suggest
	const message = args.find((a) => !a.startsWith("--") && !a.startsWith("-"));

	console.log("╔════════════════════════════════════════════════════════╗");
	console.log("║     Tier-1380 OMEGA Git Commit                         ║");
	console.log("╚════════════════════════════════════════════════════════╝");
	console.log();

	if (!message) {
		const suggested = await suggestMessage();
		if (suggested) {
			console.log("Suggested message:");
			console.log(`  ${suggested}`);
			console.log();
			console.log("Use with:");
			console.log(`  bun git-commit.ts "${suggested}"`);
		} else {
			console.log("❌ No staged changes. Stage files first:");
			console.log("  git add <files>");
		}
		process.exit(1);
	}

	console.log(`Message: ${message}`);
	console.log(`Sign: ${sign ? "Yes" : "No"}`);
	console.log(`Amend: ${amend ? "Yes" : "No"}`);
	console.log();

	const result = await createCommit({
		message,
		sign,
		amend,
		noVerify,
		coAuthor,
	});

	if (result.success) {
		console.log(`✅ Commit created: ${result.hash}`);
		console.log();
		console.log("Next steps:");
		console.log("  git push origin main");
	} else {
		console.log("❌ Commit failed:");
		for (const error of result.errors) {
			console.log(`  ${error}`);
		}
		process.exit(1);
	}
}

export { createCommit, suggestMessage, type CommitOptions, type CommitResult };
