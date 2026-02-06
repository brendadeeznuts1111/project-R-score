#!/usr/bin/env bun
/**
 * OpenClaw Commit Message Generator
 *
 * Generates Tier-1380 compliant commit messages for OpenClaw/Matrix changes.
 */

// Detect change scope from file paths
const detectScope = (files: string[]): { domain: string; component: string } => {
	const paths = files.join(" ");

	// OpenClaw specific patterns
	if (paths.includes("openclaw") || paths.includes(".openclaw")) {
		if (paths.includes("gateway") || paths.includes("server")) {
			return { domain: "OPENCLAW", component: "GATEWAY" };
		}
		if (paths.includes("telegram") || paths.includes("bot")) {
			return { domain: "OPENCLAW", component: "TELEGRAM" };
		}
		if (paths.includes("config")) {
			return { domain: "OPENCLAW", component: "CONFIG" };
		}
		return { domain: "OPENCLAW", component: "CORE" };
	}

	// Matrix specific patterns
	if (paths.includes(".matrix") || paths.includes("matrix-agent")) {
		if (paths.includes("profile")) {
			return { domain: "MATRIX", component: "PROFILES" };
		}
		if (paths.includes("agent")) {
			return { domain: "MATRIX", component: "AGENT" };
		}
		return { domain: "MATRIX", component: "CORE" };
	}

	// Monitoring
	if (paths.includes("monitoring")) {
		return { domain: "INFRA", component: "MONITORING" };
	}

	// Default
	return { domain: "OPENCLAW", component: "INTEGRATION" };
};

// Get changed files from git
const getChangedFiles = async (): Promise<string[]> => {
	try {
		const proc = Bun.spawn(["git", "diff", "--cached", "--name-only"], {
			stdout: "pipe",
		});
		const output = await new Response(proc.stdout).text();
		return output
			.trim()
			.split("\n")
			.filter((f) => f.length > 0);
	} catch {
		return [];
	}
};

// Get diff stats
const getDiffStats = async (): Promise<{
	insertions: number;
	deletions: number;
	files: number;
}> => {
	try {
		const proc = Bun.spawn(["git", "diff", "--cached", "--shortstat"], {
			stdout: "pipe",
		});
		const output = await new Response(proc.stdout).text();

		const match = output.match(
			/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/,
		);
		if (match) {
			return {
				files: parseInt(match[1], 10) || 0,
				insertions: parseInt(match[2], 10) || 0,
				deletions: parseInt(match[3], 10) || 0,
			};
		}
	} catch {
		// Ignore
	}
	return { insertions: 0, deletions: 0, files: 0 };
};

// Generate commit message
const generateMessage = async (userMessage?: string): Promise<string> => {
	const files = await getChangedFiles();
	const stats = await getDiffStats();
	const { domain, component } = detectScope(files);

	// Use user message or generate default
	let description = userMessage?.trim();
	if (!description) {
		// Auto-generate from changes
		if (files.some((f) => f.includes("test"))) {
			description = "Add tests for enhanced monitoring";
		} else if (files.some((f) => f.includes("config"))) {
			description = "Update configuration for new features";
		} else if (stats.insertions > stats.deletions * 2) {
			description = "Add new features and enhancements";
		} else if (stats.deletions > stats.insertions) {
			description = "Refactor and cleanup legacy code";
		} else {
			description = "Update components and dependencies";
		}
	}

	// Ensure description doesn't end with period
	description = description.replace(/\.$/, "");

	// Build commit message
	const header = `[${domain}][COMPONENT:${component}][TIER:1380] ${description}`;

	const body = [
		"",
		`Files changed: ${stats.files} (+${stats.insertions}/-${stats.deletions})`,
		"",
		"Components affected:",
		...files.slice(0, 10).map((f) => `- ${f}`),
		...(files.length > 10 ? [`- ... and ${files.length - 10} more`] : []),
		"",
		"Co-Authored-By: OpenClaw Integration <openclaw@factory-wager.com>",
	].join("\n");

	return header + body;
};

// Main
const main = async () => {
	const userMessage = process.argv.slice(2).join(" ");

	try {
		const message = await generateMessage(userMessage || undefined);
		console.log(message);
	} catch (err) {
		console.error("Error generating commit message:", err);
		process.exit(1);
	}
};

main();
