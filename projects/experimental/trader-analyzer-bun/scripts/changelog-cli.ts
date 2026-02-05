#!/usr/bin/env bun
/**
 * @fileoverview Changelog CLI Tool
 * @description Display changelog using Bun.inspect.table() with vibrant category colors
 * 
 * Usage:
 *   bun scripts/changelog-cli.ts [options]
 * 
 * Options:
 *   --limit <number>     Maximum number of entries (default: 20)
 *   --category <name>    Filter by category (feat, fix, docs, etc.)
 *   --properties <list>  Comma-separated property list (default: hash,category,message,date)
 *   --no-colors          Disable ANSI colors
 *   --group              Group by category
 *   --summary            Show summary statistics only
 */

import { displayChangelogTable, displayChangelogByCategory, displayChangelogSummary } from "../src/utils/changelog-display";
import type { ChangelogEntry } from "../src/utils/changelog-display";

async function fetchChangelog(options: {
	limit?: number;
	category?: string;
}): Promise<ChangelogEntry[]> {
	const { limit = 20, category } = options;

	// Fetch directly from git (no API server required)
	let gitCommits: ChangelogEntry[] = [];

	try {
		const gitLog = Bun.spawnSync({
			cmd: [
				"git",
				"log",
				"--oneline",
				"--decorate",
				`-${limit}`,
				"--date=iso",
				"--pretty=format:%h|%s|%ad|%an",
			],
			cwd: process.cwd(),
		}).stdout.toString();

		if (gitLog && gitLog.trim()) {
			const commits = gitLog.trim().split("\n").slice(0, limit);
			gitCommits = commits
				.map((commit) => {
					const parts = commit.split("|");
					const hash = parts[0]?.trim() || "";
					const message = parts[1]?.trim() || "";
					const dateStr = parts[2]?.trim() || "";
					const author = parts[3]?.trim() || "";

					// Extract category (same logic as API endpoint)
					let commitCategory = "other";
					const conventionalMatch = message.match(/^(\w+)(\(.+?\))?:/);
					if (conventionalMatch) {
						commitCategory = conventionalMatch[1].toLowerCase();
					} else {
						const tagMatch = message.match(/\[([^\]]+)\]/);
						if (tagMatch) {
							const tag = tagMatch[1].toLowerCase();
							if (tag.includes('api') || tag.includes('routes')) commitCategory = 'api';
							else if (tag.includes('hyper-bun') || tag.includes('hyperbun')) commitCategory = 'feat';
							else if (tag.includes('orca')) commitCategory = 'orca';
							else if (tag.includes('arbitrage')) commitCategory = 'arbitrage';
							else if (tag.includes('dashboard') || tag.includes('ui')) commitCategory = 'dashboard';
							else if (tag.includes('registry') || tag.includes('mcp')) commitCategory = 'registry';
							else if (tag.includes('security')) commitCategory = 'security';
							else if (tag.includes('docs') || tag.includes('documentation')) commitCategory = 'docs';
							else if (tag.includes('test')) commitCategory = 'test';
							else if (tag.includes('perf') || tag.includes('performance')) commitCategory = 'perf';
						} else {
							// Try keyword matching in message
							const lowerMessage = message.toLowerCase();
							if (lowerMessage.includes('feat') || lowerMessage.includes('add') || lowerMessage.includes('new')) {
								commitCategory = 'feat';
							} else if (lowerMessage.includes('fix') || lowerMessage.includes('bug') || lowerMessage.includes('error')) {
								commitCategory = 'fix';
							} else if (lowerMessage.includes('docs') || lowerMessage.includes('documentation')) {
								commitCategory = 'docs';
							} else if (lowerMessage.includes('refactor') || lowerMessage.includes('cleanup')) {
								commitCategory = 'refactor';
							} else if (lowerMessage.includes('test')) {
								commitCategory = 'test';
							} else if (lowerMessage.includes('security')) {
								commitCategory = 'security';
							} else if (lowerMessage.includes('perf') || lowerMessage.includes('performance')) {
								commitCategory = 'perf';
							}
						}
					}

					return {
						hash,
						message,
						date: dateStr,
						author,
						category: commitCategory,
					};
				})
				.filter((c) => c.hash && c.message)
				.filter((c) => !category || c.category === category);
		}
	} catch (error) {
		throw new Error(`Failed to fetch git log: ${error instanceof Error ? error.message : String(error)}`);
	}

	return gitCommits;
}

async function main() {
	const args = Bun.argv.slice(2);
	const options: {
		limit?: number;
		category?: string;
		properties?: string[];
		colors?: boolean;
		group?: boolean;
		summary?: boolean;
	} = {
		colors: true,
	};

	// Parse arguments
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--limit" && args[i + 1]) {
			options.limit = parseInt(args[i + 1]);
			i++;
		} else if (arg === "--category" && args[i + 1]) {
			options.category = args[i + 1];
			i++;
		} else if (arg === "--properties" && args[i + 1]) {
			options.properties = args[i + 1].split(",");
			i++;
		} else if (arg === "--no-colors") {
			options.colors = false;
		} else if (arg === "--group") {
			options.group = true;
		} else if (arg === "--summary") {
			options.summary = true;
		} else if (arg === "--help" || arg === "-h") {
			console.log(`
Changelog CLI Tool

Usage:
  bun scripts/changelog-cli.ts [options]

Options:
  --limit <number>        Maximum number of entries (default: 20)
  --category <name>        Filter by category (feat, fix, docs, etc.)
  --properties <list>      Comma-separated property list
                          (default: hash,category,message,date)
  --no-colors             Disable ANSI colors
  --group                 Group entries by category
  --summary               Show summary statistics only
  --help, -h              Show this help message

Examples:
  bun scripts/changelog-cli.ts
  bun scripts/changelog-cli.ts --limit 10
  bun scripts/changelog-cli.ts --category feat
  bun scripts/changelog-cli.ts --properties hash,message --no-colors
  bun scripts/changelog-cli.ts --group
  bun scripts/changelog-cli.ts --summary
			`);
			process.exit(0);
		}
	}

	try {
		const entries = await fetchChangelog({
			limit: options.limit,
			category: options.category,
		});

		if (entries.length === 0) {
			console.log("No changelog entries found.");
			process.exit(0);
		}

		if (options.summary) {
			displayChangelogSummary(entries, { colors: options.colors });
		} else if (options.group) {
			displayChangelogByCategory(entries, {
				colors: options.colors,
				limit: options.limit,
			});
		} else {
			displayChangelogTable(entries, {
				properties: options.properties,
				colors: options.colors,
				limit: options.limit,
			});
		}
	} catch (error) {
		console.error("Error:", error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}

main();
