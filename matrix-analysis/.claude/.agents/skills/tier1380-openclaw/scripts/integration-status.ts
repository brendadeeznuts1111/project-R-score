#!/usr/bin/env bun

/**
 * Integration Status Dashboard
 *
 * Shows unified status of Topics ↔ Projects ↔ Repositories ↔ Channels integration.
 */

import { $ } from "bun";
import { parse } from "yaml";
import { formatBytes, readTextFile, streamLines } from "./lib/bytes.ts";

const TOPICS_CONFIG = `${import.meta.dir}/../config/telegram-topics.yaml`;
const PROJECTS_CONFIG = `${import.meta.dir}/../config/project-topics.yaml`;

const COLORS = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	blue: "\x1b[34m",
	cyan: "\x1b[36m",
	gray: "\x1b[90m",
};

async function loadTopicsConfig() {
	const content = await readTextFile(TOPICS_CONFIG);
	if (!content) throw new Error("Failed to load topics config");
	return parse(content);
}

async function loadProjectsConfig() {
	const content = await readTextFile(PROJECTS_CONFIG);
	if (!content) throw new Error("Failed to load projects config");
	return parse(content);
}

async function checkGitHooks(projectPath: string) {
	const hooks = {
		commit: false,
		merge: false,
	};

	try {
		hooks.commit = await Bun.file(
			`${projectPath}/.git/hooks/post-commit-topic`,
		).exists();
		hooks.merge = await Bun.file(`${projectPath}/.git/hooks/post-merge-topic`).exists();
	} catch {
		// No hooks
	}

	return hooks;
}

async function checkRepo(projectPath: string) {
	try {
		const result = await $`cd ${projectPath} && git rev-parse --git-dir`.quiet();
		return result.exitCode === 0;
	} catch {
		return false;
	}
}

async function getRepoInfo(projectPath: string) {
	try {
		const remote =
			await $`cd ${projectPath} && git remote get-url origin 2>/dev/null || echo "none"`.text();
		const branch =
			await $`cd ${projectPath} && git branch --show-current 2>/dev/null || echo "none"`.text();
		return {
			remote: remote.trim(),
			branch: branch.trim(),
		};
	} catch {
		return { remote: "none", branch: "none" };
	}
}

async function showDashboard() {
	console.clear();
	console.log(`${COLORS.bold}${COLORS.cyan}`);
	console.log(
		"╔══════════════════════════════════════════════════════════════════════════╗",
	);
	console.log(
		"║     🔗 TOPIC-PROJECT-CHANNEL INTEGRATION STATUS                          ║",
	);
	console.log(
		"║     Tier-1380 OpenClaw v1.0.0                                            ║",
	);
	console.log(
		"╚══════════════════════════════════════════════════════════════════════════╝",
	);
	console.log(`${COLORS.reset}`);

	const [topicsConfig, projectsConfig] = await Promise.all([
		loadTopicsConfig(),
		loadProjectsConfig(),
	]);

	// Topics Section
	console.log(`\n${COLORS.bold}📡 Telegram Topics${COLORS.reset}`);
	console.log("─".repeat(74));

	const topics = topicsConfig.topics || {};
	for (const [id, topic] of Object.entries(topics)) {
		const t = topic as any;
		const icon = t.icon || "📋";
		const priority = t.priority || "normal";
		const color =
			priority === "high" ? COLORS.red : priority === "low" ? COLORS.gray : COLORS.green;
		console.log(
			`  ${icon} Topic ${id}: ${t.name.padEnd(15)} ${color}[${priority}]${COLORS.reset}`,
		);
	}

	// Super Topics
	console.log(`\n${COLORS.bold}🔀 Super Topics${COLORS.reset}`);
	console.log("─".repeat(74));

	const superTopics = topicsConfig.super_topics || {};
	for (const [name, st] of Object.entries(superTopics)) {
		const superTopic = st as any;
		console.log(
			`  ${superTopic.icon || "📦"} ${name.padEnd(15)} → Topics: [${superTopic.topics?.join(", ") || "none"}]`,
		);
	}

	// Projects Section
	console.log(`\n${COLORS.bold}📁 Projects${COLORS.reset}`);
	console.log("─".repeat(74));

	const projects = projectsConfig.projects || {};
	for (const [name, proj] of Object.entries(projects)) {
		const project = proj as any;
		const hasRepo = await checkRepo(project.path);
		const hooks = hasRepo
			? await checkGitHooks(project.path)
			: { commit: false, merge: false };
		const repoInfo = hasRepo
			? await getRepoInfo(project.path)
			: { remote: "none", branch: "none" };

		const repoStatus = hasRepo
			? `${COLORS.green}●${COLORS.reset}`
			: `${COLORS.red}○${COLORS.reset}`;
		const hookStatus =
			hooks.commit && hooks.merge
				? `${COLORS.green}✓ hooks${COLORS.reset}`
				: `${COLORS.yellow}⚠ hooks${COLORS.reset}`;

		console.log(
			`  ${repoStatus} ${name.padEnd(22)} → Topic ${project.default_topic}  ${hookStatus}`,
		);
		console.log(`    Path: ${project.path}`);
		if (hasRepo && repoInfo.remote !== "none") {
			console.log(
				`    Repo: ${COLORS.gray}${repoInfo.remote}${COLORS.reset} (${repoInfo.branch})`,
			);
		}
	}

	// Routing Rules Summary
	console.log(`\n${COLORS.bold}🔄 Routing Rules${COLORS.reset}`);
	console.log("─".repeat(74));

	const routing = topicsConfig.routing_rules || {};

	console.log("  Content Patterns:");
	for (const [pattern, topicId] of Object.entries(routing.content || {})) {
		console.log(`    "${pattern}" → Topic ${topicId}`);
	}

	console.log("  Command Routing:");
	for (const [cmd, topicId] of Object.entries(routing.commands || {})) {
		console.log(`    ${cmd} → Topic ${topicId}`);
	}

	// Integration Health
	console.log(`\n${COLORS.bold}🏥 Integration Health${COLORS.reset}`);
	console.log("─".repeat(74));

	const totalProjects = Object.keys(projects).length;
	let reposWithHooks = 0;
	let totalRepos = 0;

	for (const [, proj] of Object.entries(projects)) {
		const project = proj as any;
		if (await checkRepo(project.path)) {
			totalRepos++;
			const hooks = await checkGitHooks(project.path);
			if (hooks.commit && hooks.merge) reposWithHooks++;
		}
	}

	const hookHealth =
		totalRepos > 0 ? Math.round((reposWithHooks / totalRepos) * 100) : 0;
	const healthColor =
		hookHealth >= 80 ? COLORS.green : hookHealth >= 50 ? COLORS.yellow : COLORS.red;

	console.log(`  Projects Configured:  ${totalProjects}`);
	console.log(`  Git Repositories:     ${totalRepos}`);
	console.log(
		`  Hooks Installed:      ${reposWithHooks}/${totalRepos} ${healthColor}(${hookHealth}%)${COLORS.reset}`,
	);

	// Quick Actions
	console.log(`\n${COLORS.bold}⚡ Quick Actions${COLORS.reset}`);
	console.log("─".repeat(74));
	console.log(
		`  ${COLORS.cyan}kimi hooks install${COLORS.reset}        Install git hooks for all projects`,
	);
	console.log(
		`  ${COLORS.cyan}kimi watch start${COLORS.reset}          Start file watcher`,
	);
	console.log(
		`  ${COLORS.cyan}kimi project list${COLORS.reset}         List all projects`,
	);
	console.log(
		`  ${COLORS.cyan}kimi topic list${COLORS.reset}           List all topics`,
	);
	console.log(
		`  ${COLORS.cyan}kimi channel dashboard${COLORS.reset}    Open channel monitor`,
	);

	console.log();
}

async function showStats() {
	console.log(`${COLORS.bold}📊 Integration Statistics${COLORS.reset}`);
	console.log("=".repeat(74));

	// Read log files using streaming for efficiency
	const logs = {
		routing: `${import.meta.dir}/../logs/topic-routing.jsonl`,
		watch: `${import.meta.dir}/../logs/file-watch.jsonl`,
		notifications: `${import.meta.dir}/../logs/notifications.jsonl`,
	};

	for (const [name, path] of Object.entries(logs)) {
		try {
			let totalLines = 0;
			let recentLines = 0;
			const oneDayAgo = Date.now() - 86400000;

			// Stream lines to handle large files
			for await (const line of streamLines(path, { maxLines: 10000 })) {
				if (!line.trim()) continue;
				totalLines++;

				try {
					const entry = JSON.parse(line);
					if (new Date(entry.timestamp).getTime() > oneDayAgo) {
						recentLines++;
					}
				} catch {
					// Invalid JSON, skip
				}
			}

			console.log(
				`\n${name.charAt(0).toUpperCase() + name.slice(1)} Events: ${totalLines}`,
			);
			console.log(`  Last 24h: ${recentLines}`);
		} catch {
			console.log(`\n${name}: No data`);
		}
	}
}

async function showMatrix() {
	const [topicsConfig, projectsConfig] = await Promise.all([
		loadTopicsConfig(),
		loadProjectsConfig(),
	]);

	console.log(`${COLORS.bold}📋 Topic-Project Mapping Matrix${COLORS.reset}`);
	console.log("=".repeat(74));

	const topics = topicsConfig.topics || {};
	const projects = projectsConfig.projects || {};

	// Header
	let header = "Project".padEnd(25);
	for (const id of Object.keys(topics)) {
		header += `T${id} `.padStart(4);
	}
	console.log(header);
	console.log("─".repeat(74));

	// Rows
	for (const [name, proj] of Object.entries(projects)) {
		const project = proj as any;
		let row = name.padEnd(25);

		for (const id of Object.keys(topics)) {
			const mapped = project.topics?.[id]
				? "●"
				: project.default_topic === parseInt(id)
					? "○"
					: " ";
			row += mapped.padStart(4);
		}

		console.log(row);
	}

	console.log("\nLegend: ● = Has patterns, ○ = Default topic,   = Not mapped");
}

// CLI
const [, , command] = process.argv;

switch (command) {
	case "stats":
		await showStats();
		break;
	case "matrix":
		await showMatrix();
		break;
	default:
		await showDashboard();
}
