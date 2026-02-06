#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Changelog Generator
 * Auto-generate changelog from Tier-1380 formatted commits
 */

import { $ } from "bun";

interface ChangelogEntry {
	version: string;
	date: string;
	changes: Array<{
		domain: string;
		component: string;
		tier: string;
		message: string;
		hash: string;
	}>;
}

const DOMAIN_EMOJI: Record<string, string> = {
	RUNTIME: "⚡",
	PLATFORM: "🏗️",
	SECURITY: "🔒",
	API: "🔌",
	UI: "🎨",
	DOCS: "📚",
	TEST: "🧪",
	BENCH: "📊",
	CONFIG: "⚙️",
	INFRA: "🖥️",
	OPENCLAW: "🤖",
	SKILLS: "🎯",
};

const _TYPE_ORDER = ["FEAT", "FIX", "PERF", "REFACTOR", "DOCS", "TEST", "CHORE"];

async function getCommits(
	since?: string,
): Promise<Array<{ hash: string; message: string; date: string }>> {
	const range = since ? `${since}..HEAD` : "-50";
	const log = await $`git log ${range} --pretty=format:"%H|%s|%ad" --date=short`.text();

	return log
		.trim()
		.split("\n")
		.filter(Boolean)
		.map((line) => {
			const [hash, message, date] = line.split("|");
			return { hash, message, date };
		});
}

function parseTier1380Commit(message: string): {
	domain: string;
	component: string;
	tier: string;
	subject: string;
	type?: string;
} | null {
	// Extended: [DOMAIN][SCOPE][TYPE][META:{TIER:1380}] Subject
	const extendedPattern =
		/^\[([A-Z]+)\]\[([A-Z:]+)\]\[(\w+)\](?:\[META:\{TIER:(\d+)\}\])?\s*(.+)$/;
	const match = message.match(extendedPattern);

	if (match) {
		return {
			domain: match[1],
			component: match[2],
			type: match[3],
			tier: match[4] || "1380",
			subject: match[5],
		};
	}

	// Standard: [DOMAIN][COMPONENT:NAME][TIER:1380] Subject
	const standardPattern = /^\[([A-Z]+)\]\[COMPONENT:([A-Z]+)\]\[TIER:(\d+)\]\s*(.+)$/;
	const stdMatch = message.match(standardPattern);

	if (stdMatch) {
		return {
			domain: stdMatch[1],
			component: stdMatch[2],
			tier: stdMatch[3],
			subject: stdMatch[4],
		};
	}

	return null;
}

async function generateChangelog(options: {
	since?: string;
	version?: string;
	output?: string;
}): Promise<void> {
	const commits = await getCommits(options.since);
	const parsed = commits
		.map((c) => ({ ...c, parsed: parseTier1380Commit(c.message) }))
		.filter((c) => c.parsed !== null);

	if (parsed.length === 0) {
		console.log("No Tier-1380 formatted commits found.");
		return;
	}

	// Group by domain
	const byDomain = new Map<string, typeof parsed>();
	for (const commit of parsed) {
		const domain = commit.parsed!.domain;
		if (!byDomain.has(domain)) {
			byDomain.set(domain, []);
		}
		byDomain.get(domain)!.push(commit);
	}

	// Generate markdown
	const version = options.version || "Unreleased";
	const date = new Date().toISOString().split("T")[0];

	let changelog = `## [${version}] - ${date}\n\n`;

	for (const [domain, commits] of byDomain) {
		const emoji = DOMAIN_EMOJI[domain] || "📝";
		changelog += `### ${emoji} ${domain}\n\n`;

		for (const commit of commits) {
			const p = commit.parsed!;
			const shortHash = commit.hash.slice(0, 7);
			changelog += `- ${p.subject} ([${shortHash}])\n`;
		}

		changelog += "\n";
	}

	if (options.output) {
		await Bun.write(options.output, changelog);
		console.log(`Changelog written to ${options.output}`);
	} else {
		console.log(changelog);
	}
}

// Main
if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const since = args.find((a) => a.startsWith("--since="))?.split("=")[1];
	const version = args.find((a) => a.startsWith("--version="))?.split("=")[1];
	const output = args.find((a) => a.startsWith("--output="))?.split("=")[1];

	console.log("╔════════════════════════════════════════════════════════╗");
	console.log("║     Tier-1380 OMEGA Changelog Generator                ║");
	console.log("╚════════════════════════════════════════════════════════╝");
	console.log();

	await generateChangelog({ since, version, output });
}

export { generateChangelog, parseTier1380Commit, DOMAIN_EMOJI };
