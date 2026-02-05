#!/usr/bin/env bun
/**
 * @fileoverview GitHub CLI - Bun-native GitHub operations
 * @description Zero-dependency GitHub API client using native Bun APIs
 * @module cli/github
 *
 * Bun 1.3 Features Used:
 * - Native fetch (faster than node-fetch)
 * - Bun.env for environment variables
 * - Bun.argv for CLI args
 * - Bun.write for file output
 * - console.table for structured output
 */

import { colors } from "../utils/bun";

const GITHUB_API = "https://api.github.com";
const TOKEN = Bun.env.GITHUB_TOKEN || Bun.env.GH_TOKEN;

// ANSI color codes
const c = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	cyan: "\x1b[36m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	magenta: "\x1b[35m",
	blue: "\x1b[34m",
};

function checkToken(): void {
	if (!TOKEN) {
		console.error(`${c.red}GITHUB_TOKEN or GH_TOKEN not set${c.reset}`);
		console.error(
			`${c.dim}Set GITHUB_TOKEN or GH_TOKEN environment variable${c.reset}`,
		);
		process.exit(1);
	}
}

const headers = {
	Authorization: `Bearer ${TOKEN}`,
	Accept: "application/vnd.github+json",
	"X-GitHub-Api-Version": "2022-11-28",
	"User-Agent": "nexus-bun/1.0",
};

// ============ Types ============
interface PR {
	number: number;
	title: string;
	state: string;
	mergeable: boolean | null;
	merged: boolean;
	html_url: string;
	user: { login: string };
	created_at: string;
	merged_at: string | null;
	merge_commit_sha: string | null;
	additions: number;
	deletions: number;
	changed_files: number;
	head: { ref: string };
	base: { ref: string };
	draft?: boolean;
	labels?: Array<{ name: string; color: string }>;
	reviewers?: Array<{ login: string }>;
}

interface Commit {
	sha: string;
	commit: {
		message: string;
		author: { name: string; date: string };
	};
	author?: { login: string };
}

interface Issue {
	number: number;
	title: string;
	state: string;
	html_url: string;
	user: { login: string };
	created_at: string;
	labels: Array<{ name: string; color: string }>;
	body?: string;
}

interface Release {
	tag_name: string;
	name: string;
	body: string;
	published_at: string;
	prerelease: boolean;
	html_url: string;
}

interface Repo {
	name: string;
	full_name: string;
	description: string;
	html_url: string;
	language: string;
	stargazers_count: number;
	forks_count: number;
	open_issues_count: number;
	default_branch: string;
}

// ============ API Helpers ============
async function ghFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
	const url = path.startsWith("http") ? path : `${GITHUB_API}${path}`;
	const res = await fetch(url, {
		...options,
		headers: { ...headers, ...options.headers },
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(
			`GitHub API ${res.status}: ${(err as any).message || res.statusText}`,
		);
	}

	return res.json();
}

// ============ Box Drawing Helper ============
function box(lines: string[], title?: string): string {
	const width = 70;
	const pad = (s: string, w: number) =>
		s + " ".repeat(Math.max(0, w - s.length));

	let out = `${c.cyan}╔${"═".repeat(width)}╗${c.reset}\n`;

	if (title) {
		out += `${c.cyan}║${c.reset} ${c.bold}${title}${c.reset}${" ".repeat(width - title.length - 1)}${c.cyan}║${c.reset}\n`;
		out += `${c.cyan}╠${"═".repeat(width)}╣${c.reset}\n`;
	}

	for (const line of lines) {
		out += `${c.cyan}║${c.reset} ${pad(line, width - 1)}${c.cyan}║${c.reset}\n`;
	}

	out += `${c.cyan}╚${"═".repeat(width)}╝${c.reset}`;
	return out;
}

// ============ Commands ============

/**
 * Get PR details
 */
async function getPR(owner: string, repo: string, pr: number): Promise<void> {
	const data = await ghFetch<PR>(`/repos/${owner}/${repo}/pulls/${pr}`);

	const stateColor = data.merged
		? c.green
		: data.state === "open"
			? c.yellow
			: c.red;
	const stateText = data.merged ? "MERGED" : data.state.toUpperCase();

	const lines = [
		`${c.green}PR #${data.number}${c.reset} ${data.title.slice(0, 50)}`,
		"",
		`${c.dim}State${c.reset}       ${stateColor}${stateText}${c.reset}`,
		`${c.dim}Branch${c.reset}      ${c.cyan}${data.head.ref}${c.reset} → ${data.base.ref}`,
		`${c.dim}Author${c.reset}      ${data.user.login}`,
		`${c.dim}Created${c.reset}     ${new Date(data.created_at).toLocaleString()}`,
	];

	if (data.merged_at) {
		lines.push(
			`${c.dim}Merged${c.reset}      ${new Date(data.merged_at).toLocaleString()}`,
		);
	}

	lines.push(
		`${c.dim}Commit${c.reset}      ${data.merge_commit_sha?.slice(0, 7) || "N/A"}`,
	);
	lines.push("");
	lines.push(
		`${c.green}+${data.additions}${c.reset} / ${c.red}-${data.deletions}${c.reset} ${c.dim}(${data.changed_files} files)${c.reset}`,
	);

	if (data.labels && data.labels.length > 0) {
		const labelStr = data.labels
			.map((l) => `${c.blue}${l.name}${c.reset}`)
			.join(", ");
		lines.push(`${c.dim}Labels${c.reset}     ${labelStr}`);
	}

	lines.push("");
	lines.push(`${c.dim}${data.html_url}${c.reset}`);

	console.log("\n" + box(lines, `${owner}/${repo}`) + "\n");
}

/**
 * List PRs
 */
async function listPRs(
	owner: string,
	repo: string,
	state = "all",
): Promise<void> {
	const data = await ghFetch<PR[]>(
		`/repos/${owner}/${repo}/pulls?state=${state}&per_page=20`,
	);

	console.log(`\n${c.cyan}${c.bold}PRs for ${owner}/${repo}${c.reset}\n`);

	const rows = data.map((pr) => ({
		"#": pr.number,
		title: pr.title.slice(0, 40),
		state: pr.merged ? `${c.green}MERGED${c.reset}` : pr.state.toUpperCase(),
		author: pr.user.login,
		date: new Date(pr.created_at).toLocaleDateString(),
		branch: `${pr.head.ref} → ${pr.base.ref}`,
	}));

	console.table(rows);
}

/**
 * Get recent commits
 */
async function getCommits(
	owner: string,
	repo: string,
	limit = 5,
): Promise<void> {
	const data = await ghFetch<Commit[]>(
		`/repos/${owner}/${repo}/commits?per_page=${limit}`,
	);

	console.log(
		`\n${c.cyan}${c.bold}Recent commits for ${owner}/${repo}${c.reset}\n`,
	);

	const lines = data.map(
		(commit) =>
			`${c.yellow}${commit.sha.slice(0, 7)}${c.reset} ${commit.commit.message.split("\n")[0].slice(0, 50)} ${c.dim}(${commit.commit.author.name})${c.reset}`,
	);

	console.log(box(lines, "COMMITS"));
}

/**
 * Merge PR
 */
async function mergePR(
	owner: string,
	repo: string,
	pr: number,
	method: "merge" | "squash" | "rebase" = "squash",
): Promise<void> {
	const data = await ghFetch<{ sha: string; merged: boolean }>(
		`/repos/${owner}/${repo}/pulls/${pr}/merge`,
		{
			method: "PUT",
			body: JSON.stringify({ merge_method: method }),
		},
	);

	if (data.merged) {
		console.log(`\n${c.green}${c.bold}PR #${pr} merged successfully${c.reset}`);
		console.log(`${c.dim}Commit: ${data.sha.slice(0, 7)}${c.reset}\n`);
	}
}

/**
 * List issues
 */
async function listIssues(
	owner: string,
	repo: string,
	state = "open",
): Promise<void> {
	const data = await ghFetch<Issue[]>(
		`/repos/${owner}/${repo}/issues?state=${state}&per_page=20`,
	);

	console.log(`\n${c.cyan}${c.bold}Issues for ${owner}/${repo}${c.reset}\n`);

	const rows = data.map((issue) => ({
		"#": issue.number,
		title: issue.title.slice(0, 40),
		state: issue.state.toUpperCase(),
		author: issue.user.login,
		labels: issue.labels.map((l) => l.name).join(", ") || "none",
		date: new Date(issue.created_at).toLocaleDateString(),
	}));

	console.table(rows);
}

/**
 * Get repository info
 */
async function getRepo(owner: string, repo: string): Promise<void> {
	const data = await ghFetch<Repo>(`/repos/${owner}/${repo}`);

	const lines = [
		`${c.bold}${data.full_name}${c.reset}`,
		"",
		`${c.dim}Description${c.reset}  ${data.description || "N/A"}`,
		`${c.dim}Language${c.reset}     ${data.language || "N/A"}`,
		`${c.dim}Branch${c.reset}       ${data.default_branch}`,
		"",
		`${c.green}⭐ ${data.stargazers_count}${c.reset}  ${c.blue}🍴 ${data.forks_count}${c.reset}  ${c.yellow}⚠️ ${data.open_issues_count}${c.reset}`,
		"",
		`${c.dim}${data.html_url}${c.reset}`,
	];

	console.log("\n" + box(lines, "REPOSITORY") + "\n");
}

/**
 * List releases
 */
async function listReleases(
	owner: string,
	repo: string,
	limit = 10,
): Promise<void> {
	const data = await ghFetch<Release[]>(
		`/repos/${owner}/${repo}/releases?per_page=${limit}`,
	);

	console.log(`\n${c.cyan}${c.bold}Releases for ${owner}/${repo}${c.reset}\n`);

	const rows = data.map((release) => ({
		tag: release.tag_name,
		name: release.name.slice(0, 30),
		prerelease: release.prerelease ? `${c.yellow}yes${c.reset}` : "no",
		date: new Date(release.published_at).toLocaleDateString(),
	}));

	console.table(rows);
}

/**
 * Create PR
 */
async function createPR(
	owner: string,
	repo: string,
	title: string,
	head: string,
	base: string,
	body?: string,
): Promise<void> {
	const data = await ghFetch<PR>(`/repos/${owner}/${repo}/pulls`, {
		method: "POST",
		body: JSON.stringify({
			title,
			head,
			base,
			body: body || "",
		}),
	});

	console.log(`\n${c.green}${c.bold}PR created successfully${c.reset}`);
	console.log(`${c.dim}PR #${data.number}: ${data.html_url}${c.reset}\n`);
}

// ============ CLI ============
const HELP = `
${c.cyan}${c.bold}GitHub CLI - Bun-native GitHub operations${c.reset}

${c.yellow}Commands:${c.reset}
  pr <owner> <repo> <number>          View PR details
  prs <owner> <repo> [state]         List PRs (all|open|closed)
  create-pr <owner> <repo> <title> <head> <base> [body]
                                      Create a new PR
  merge <owner> <repo> <pr> [method] Merge PR (merge|squash|rebase)
  commits <owner> <repo> [n]         Recent commits
  issues <owner> <repo> [state]      List issues (open|closed|all)
  repo <owner> <repo>                Repository info
  releases <owner> <repo> [n]       List releases

${c.yellow}Examples:${c.reset}
  bun run github pr owner repo 1
  bun run github prs owner repo open
  bun run github create-pr owner repo "Title" feature main
  bun run github merge owner repo 123 squash
  bun run github commits owner repo 10
  bun run github issues owner repo open
  bun run github repo owner repo
  bun run github releases owner repo 5

${c.dim}Requires: GITHUB_TOKEN or GH_TOKEN environment variable${c.reset}
`;

async function main(): Promise<void> {
	// Bun.argv format: [ '/path/to/bun', '/path/to/cli.ts', '--flag1', '--flag2', 'value' ]
	// Skip first two elements (bun executable and script path)
	const args = Bun.argv.slice(2);
	const [cmd, ...rest] = args;

	if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
		console.log(HELP);
		return;
	}

	// Check token for all commands except help
	checkToken();

	try {
		switch (cmd) {
			case "pr":
				if (rest.length < 3) {
					console.error(`${c.red}Usage: pr <owner> <repo> <number>${c.reset}`);
					process.exit(1);
				}
				await getPR(rest[0], rest[1], parseInt(rest[2]));
				break;

			case "prs":
				if (rest.length < 2) {
					console.error(`${c.red}Usage: prs <owner> <repo> [state]${c.reset}`);
					process.exit(1);
				}
				await listPRs(rest[0], rest[1], rest[2] || "all");
				break;

			case "create-pr":
				if (rest.length < 4) {
					console.error(
						`${c.red}Usage: create-pr <owner> <repo> <title> <head> <base> [body]${c.reset}`,
					);
					process.exit(1);
				}
				await createPR(rest[0], rest[1], rest[2], rest[3], rest[4], rest[5]);
				break;

			case "merge":
				if (rest.length < 3) {
					console.error(
						`${c.red}Usage: merge <owner> <repo> <pr> [method]${c.reset}`,
					);
					process.exit(1);
				}
				await mergePR(
					rest[0],
					rest[1],
					parseInt(rest[2]),
					(rest[3] as any) || "squash",
				);
				break;

			case "commits":
				if (rest.length < 2) {
					console.error(`${c.red}Usage: commits <owner> <repo> [n]${c.reset}`);
					process.exit(1);
				}
				await getCommits(rest[0], rest[1], parseInt(rest[2]) || 5);
				break;

			case "issues":
				if (rest.length < 2) {
					console.error(
						`${c.red}Usage: issues <owner> <repo> [state]${c.reset}`,
					);
					process.exit(1);
				}
				await listIssues(rest[0], rest[1], rest[2] || "open");
				break;

			case "repo":
				if (rest.length < 2) {
					console.error(`${c.red}Usage: repo <owner> <repo>${c.reset}`);
					process.exit(1);
				}
				await getRepo(rest[0], rest[1]);
				break;

			case "releases":
				if (rest.length < 2) {
					console.error(`${c.red}Usage: releases <owner> <repo> [n]${c.reset}`);
					process.exit(1);
				}
				await listReleases(rest[0], rest[1], parseInt(rest[2]) || 10);
				break;

			default:
				console.error(`${c.red}Unknown command: ${cmd}${c.reset}`);
				console.log(HELP);
				process.exit(1);
		}
	} catch (error) {
		console.error(
			`${c.red}Error: ${error instanceof Error ? error.message : String(error)}${c.reset}`,
		);
		process.exit(1);
	}
}

if (import.meta.main) {
	main();
}
