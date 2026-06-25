#!/usr/bin/env bun

/**
 * Notification Manager
 *
 * Manages notification rules and delivery to Telegram topics.
 * Configures which events trigger notifications for each project.
 */

import { $ } from "bun";
import { parse } from "yaml";
import { appendToFile, readTextFile, streamLines } from "./lib/bytes.ts";

const PROJECTS_CONFIG = `${import.meta.dir}/../config/project-topics.yaml`;

interface NotificationRules {
	on_commit?: boolean;
	on_push?: boolean;
	on_merge?: boolean;
	on_pr?: boolean;
	on_issue?: boolean;
	on_release?: boolean;
	on_file_change?: boolean;
	on_test_failure?: boolean;
	on_deploy?: boolean;
}

interface ProjectConfig {
	path: string;
	default_topic: number;
	notifications?: NotificationRules;
	channels?: Record<string, { topic: number; patterns: string[] }>;
}

interface Config {
	projects: Record<string, ProjectConfig>;
}

const RULE_DESCRIPTIONS: Record<string, string> = {
	on_commit: "Git commits",
	on_push: "Git push",
	on_merge: "Branch merges",
	on_pr: "Pull requests",
	on_issue: "Issues opened/closed",
	on_release: "Releases published",
	on_file_change: "File changes (watch mode)",
	on_test_failure: "Test failures",
	on_deploy: "Deployments",
};

async function loadConfig(): Promise<Config> {
	const content = await readTextFile(PROJECTS_CONFIG);
	if (!content) throw new Error("Failed to load projects config");
	return parse(content) as Config;
}

async function saveConfig(config: Config) {
	const yaml = await import("yaml");
	const content = yaml.stringify(config);
	await Bun.write(PROJECTS_CONFIG, content);
}

function getProjectRules(project: ProjectConfig): NotificationRules {
	return {
		on_commit: true,
		on_push: true,
		on_merge: true,
		on_pr: true,
		on_issue: true,
		on_release: true,
		on_file_change: false,
		on_test_failure: true,
		on_deploy: true,
		...project.notifications,
	};
}

async function showRules(projectName?: string) {
	const config = await loadConfig();

	if (projectName) {
		const project = config.projects[projectName];
		if (!project) {
			console.error(`❌ Project ${projectName} not found`);
			return;
		}

		console.info(`🔔 Notification Rules: ${projectName}`);
		console.info("=".repeat(60));

		const rules = getProjectRules(project);
		for (const [rule, enabled] of Object.entries(rules)) {
			const status = enabled ? "✅ ON" : "❌ OFF";
			const desc = RULE_DESCRIPTIONS[rule] || rule;
			console.info(`  ${status}  ${desc}`);
		}

		// Show channel mappings
		if (project.channels) {
			console.info("\n📡 Channel Mappings:");
			for (const [channel, config] of Object.entries(project.channels)) {
				console.info(`  ${channel} → Topic ${config.topic}`);
				console.info(`     Patterns: ${config.patterns.join(", ")}`);
			}
		}
	} else {
		// Show all projects summary
		console.info("🔔 Notification Rules Summary");
		console.info("=".repeat(80));
		console.info(
			"Project".padEnd(25) +
				Object.keys(RULE_DESCRIPTIONS)
					.map((r) => r.replace("on_", "").substring(0, 4).toUpperCase())
					.join(" "),
		);
		console.info("-".repeat(80));

		for (const [name, project] of Object.entries(config.projects)) {
			const rules = getProjectRules(project);
			const indicators = Object.keys(RULE_DESCRIPTIONS)
				.map((rule) => {
					const enabled = rules[rule as keyof NotificationRules];
					return enabled ? "●" : "○";
				})
				.join("  ");
			console.info(name.padEnd(25) + indicators);
		}

		console.info("\nLegend: ● = Enabled, ○ = Disabled");
	}
}

async function setRule(projectName: string, rule: string, enabled: boolean) {
	const config = await loadConfig();
	const project = config.projects[projectName];

	if (!project) {
		console.error(`❌ Project ${projectName} not found`);
		return;
	}

	if (!RULE_DESCRIPTIONS[rule]) {
		console.error(`❌ Unknown rule: ${rule}`);
		console.info(`Available rules: ${Object.keys(RULE_DESCRIPTIONS).join(", ")}`);
		return;
	}

	project.notifications = project.notifications || {};
	project.notifications[rule as keyof NotificationRules] = enabled;

	await saveConfig(config);

	const status = enabled ? "enabled" : "disabled";
	console.info(`✅ ${RULE_DESCRIPTIONS[rule]} ${status} for ${projectName}`);
}

async function enableAll(projectName: string) {
	const config = await loadConfig();
	const project = config.projects[projectName];

	if (!project) {
		console.error(`❌ Project ${projectName} not found`);
		return;
	}

	project.notifications = {};
	for (const rule of Object.keys(RULE_DESCRIPTIONS)) {
		project.notifications[rule as keyof NotificationRules] = true;
	}

	await saveConfig(config);
	console.info(`✅ All notifications enabled for ${projectName}`);
}

async function disableAll(projectName: string) {
	const config = await loadConfig();
	const project = config.projects[projectName];

	if (!project) {
		console.error(`❌ Project ${projectName} not found`);
		return;
	}

	project.notifications = {};
	for (const rule of Object.keys(RULE_DESCRIPTIONS)) {
		project.notifications[rule as keyof NotificationRules] = false;
	}

	await saveConfig(config);
	console.info(`✅ All notifications disabled for ${projectName}`);
}

async function testNotification(projectName: string, eventType: string) {
	const config = await loadConfig();
	const project = config.projects[projectName];

	if (!project) {
		console.error(`❌ Project ${projectName} not found`);
		return;
	}

	const rules = getProjectRules(project);
	const ruleName = `on_${eventType}`;
	const isEnabled = rules[ruleName as keyof NotificationRules];

	const topicNames: Record<number, string> = {
		1: "General 📢",
		2: "Alerts 🚨",
		5: "Logs 📊",
		7: "Development 💻",
	};

	console.info(`🧪 Testing ${eventType} notification for ${projectName}`);
	console.info(`   Enabled: ${isEnabled ? "✅ Yes" : "❌ No"}`);
	console.info(
		`   Default Topic: ${project.default_topic} (${topicNames[project.default_topic]})`,
	);

	if (isEnabled) {
		console.info(`\n📨 Would send to Topic ${project.default_topic}:`);

		const messages: Record<string, string> = {
			commit: `📝 New commit in ${projectName}\n   abc123: feat: add new feature`,
			push: `🚀 Push to main in ${projectName}\n   3 commits by @user`,
			merge: `🔀 Branch merged in ${projectName}\n   feature-branch → main`,
			pr: `📋 Pull request opened\n   "Add awesome feature" by @user`,
			issue: `🐛 Issue opened\n   "Bug in production" #123`,
			release: `🎉 Release published\n   v1.2.0 - New Features`,
			file_change: `📁 File changes detected\n   5 files modified`,
			test_failure: `❌ Tests failed\n   3 tests failing in CI`,
			deploy: `🚀 Deployment completed\n   Production v1.2.0 deployed`,
		};

		console.info(`   ${messages[eventType] || "Test message"}`);

		// Log test
		const logEntry = {
			timestamp: new Date().toISOString(),
			type: "test",
			project: projectName,
			event: eventType,
			topic: project.default_topic,
			enabled: isEnabled,
		};

		const logFile = `${import.meta.dir}/../logs/notifications.jsonl`;
		await appendToFile(logFile, JSON.stringify(logEntry) + "\n", {
			rotate: true,
			maxSize: 10 * 1024 * 1024,
		});
	}
}

async function showStats() {
	const logFile = `${import.meta.dir}/../logs/notifications.jsonl`;

	console.info("📊 Notification Statistics");
	console.info("=".repeat(60));

	try {
		const stats: Record<string, number> = {};
		let total = 0;

		// Stream lines for memory efficiency
		for await (const line of streamLines(logFile, { maxLines: 50000 })) {
			if (!line.trim()) continue;

			try {
				const entry = JSON.parse(line);
				const key = `${entry.project}:${entry.event}`;
				stats[key] = (stats[key] || 0) + 1;
				total++;
			} catch {
				// Skip invalid lines
			}
		}

		console.info(`Total notifications: ${total}`);
		console.info("\nBy Project/Event:");

		const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
		for (const [key, count] of sorted.slice(0, 20)) {
			const [project, event] = key.split(":");
			console.info(`  ${project.padEnd(20)} ${event.padEnd(15)} ${count}`);
		}
	} catch {
		console.info("No notification history found");
	}
}

// CLI
const [, , command, ...args] = process.argv;

switch (command) {
	case "rules":
		await showRules(args[0]);
		break;

	case "enable":
		if (args[0] === "all" && args[1]) {
			await enableAll(args[1]);
		} else if (args[0] && args[1]) {
			await setRule(args[0], `on_${args[1]}`, true);
		} else {
			console.info("Usage: notify enable <project> <event>");
			console.info("       notify enable all <project>");
		}
		break;

	case "disable":
		if (args[0] === "all" && args[1]) {
			await disableAll(args[1]);
		} else if (args[0] && args[1]) {
			await setRule(args[0], `on_${args[1]}`, false);
		} else {
			console.info("Usage: notify disable <project> <event>");
			console.info("       notify disable all <project>");
		}
		break;

	case "test":
		if (args[0] && args[1]) {
			await testNotification(args[0], args[1]);
		} else {
			console.info("Usage: notify test <project> <event>");
			console.info(
				"Events: commit, push, merge, pr, issue, release, file_change, test_failure, deploy",
			);
		}
		break;

	case "stats":
		await showStats();
		break;

	default:
		console.info(`
Notification Manager

Usage:
  notify rules [project]             Show notification rules
  notify enable <project> <event>    Enable notification for event
  notify disable <project> <event>   Disable notification for event
  notify enable all <project>        Enable all notifications
  notify disable all <project>       Disable all notifications
  notify test <project> <event>      Test notification delivery
  notify stats                       Show notification statistics

Events:
  commit, push, merge, pr, issue, release, 
  file_change, test_failure, deploy

Examples:
  notify rules nolarose-mcp-config
  notify enable nolarose-mcp-config deploy
  notify test nolarose-mcp-config commit
`);
}
