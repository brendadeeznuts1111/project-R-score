#!/usr/bin/env bun

/**
 * Project-Topic Integration Manager
 * Connects local projects and repos to Telegram topics/channels
 */

import { existsSync } from "fs";
import { homedir } from "os";
// readFileSync removed - using bytes.ts utility instead
import { basename, join } from "path";
import { parse } from "yaml";
import { readTextFile } from "./lib/bytes.ts";

const COLORS = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	cyan: "\x1b[36m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	gray: "\x1b[90m",
};

const CONFIG_PATH = join(
	homedir(),
	".kimi",
	"skills",
	"tier1380-openclaw",
	"config",
	"project-topics.yaml",
);

interface Project {
	path: string;
	repo?: string;
	default_topic: number;
	topics: Record<number, string[]>;
	channels?: Record<
		string,
		{
			topic: number;
			patterns: string[];
		}
	>;
	notifications: Record<string, boolean>;
}

interface ProjectConfig {
	projects: Record<string, Project>;
	groups: Record<
		string,
		{
			name: string;
			projects: string[];
			topics: number[];
		}
	>;
	repositories: Record<
		string,
		{
			project: string;
			webhooks: Record<string, any>;
		}
	>;
	routing: {
		file_patterns: Record<string, number>;
		commit_patterns: Record<string, number>;
	};
}

class ProjectIntegration {
	private config: ProjectConfig | null = null;
	private currentProject: string | null = null;

	async loadConfig(): Promise<boolean> {
		try {
			const content = await readTextFile(CONFIG_PATH);
			if (!content) {
				console.error(`${COLORS.red}✗${COLORS.reset} Config not found: ${CONFIG_PATH}`);
				return false;
			}

			this.config = parse(content) as ProjectConfig;
			this.detectCurrentProject();
			return true;
		} catch (error) {
			console.error(`${COLORS.red}✗${COLORS.reset} Failed to load config: ${error}`);
			return false;
		}
	}

	private detectCurrentProject(): void {
		const cwd = process.cwd();

		for (const [name, project] of Object.entries(this.config?.projects || {})) {
			if (cwd === project.path || cwd.startsWith(project.path + "/")) {
				this.currentProject = name;
				break;
			}
		}
	}

	listProjects(): void {
		if (!this.config) return;

		console.log(`\n${COLORS.bold}📁 Projects${COLORS.reset}\n`);

		for (const [name, project] of Object.entries(this.config.projects)) {
			const isCurrent = name === this.currentProject;
			const marker = isCurrent ? `${COLORS.yellow} ⭐${COLORS.reset}` : "";

			console.log(`  ${COLORS.bold}${name}${COLORS.reset}${marker}`);
			console.log(`     ${COLORS.gray}Path:${COLORS.reset} ${project.path}`);
			if (project.repo) {
				console.log(`     ${COLORS.gray}Repo:${COLORS.reset} ${project.repo}`);
			}
			console.log(
				`     ${COLORS.gray}Default Topic:${COLORS.reset} ${project.default_topic}`,
			);
			console.log();
		}
	}

	listGroups(): void {
		if (!this.config) return;

		console.log(`\n${COLORS.bold}👥 Project Groups${COLORS.reset}\n`);

		for (const [key, group] of Object.entries(this.config.groups)) {
			console.log(`  ${COLORS.bold}${group.name}${COLORS.reset} (${key})`);
			console.log(
				`     ${COLORS.gray}Projects:${COLORS.reset} ${group.projects.join(", ")}`,
			);
			console.log(
				`     ${COLORS.gray}Topics:${COLORS.reset} ${group.topics.join(", ")}`,
			);
			console.log();
		}
	}

	showProject(name?: string): void {
		if (!this.config) return;

		const projectName = name || this.currentProject;
		if (!projectName) {
			console.error("No project specified and couldn't detect current project");
			return;
		}

		const project = this.config.projects[projectName];
		if (!project) {
			console.error(`Project not found: ${projectName}`);
			return;
		}

		console.log(`\n${COLORS.bold}📁 ${projectName}${COLORS.reset}\n`);
		console.log(`  ${COLORS.gray}Path:${COLORS.reset} ${project.path}`);
		console.log(
			`  ${COLORS.gray}Default Topic:${COLORS.reset} ${project.default_topic}`,
		);

		if (project.repo) {
			console.log(`  ${COLORS.gray}Repository:${COLORS.reset} ${project.repo}`);
		}

		console.log(`\n  ${COLORS.bold}Topic Mappings:${COLORS.reset}`);
		const topicNames: Record<number, string> = {
			1: "📢 General",
			2: "🚨 Alerts",
			5: "📊 Logs",
			7: "💻 Development",
		};

		for (const [topicId, patterns] of Object.entries(project.topics)) {
			const id = parseInt(topicId);
			const name = topicNames[id] || `Topic ${id}`;
			console.log(`    ${name}: ${patterns.join(", ")}`);
		}

		if (project.channels) {
			console.log(`\n  ${COLORS.bold}Channels:${COLORS.reset}`);
			for (const [channelName, channel] of Object.entries(project.channels)) {
				console.log(`    ${channelName}: Topic ${channel.topic}`);
				console.log(`      Patterns: ${channel.patterns.join(", ")}`);
			}
		}

		console.log(`\n  ${COLORS.bold}Notifications:${COLORS.reset}`);
		for (const [type, enabled] of Object.entries(project.notifications)) {
			const icon = enabled ? "✓" : "✗";
			const color = enabled ? COLORS.green : COLORS.gray;
			console.log(`    ${color}${icon}${COLORS.reset} ${type}`);
		}
	}

	routeForProject(
		projectName: string,
		message: string,
		fileType?: string,
	): { topic: number; reason: string } | null {
		if (!this.config) return null;

		const project = this.config.projects[projectName];
		if (!project) return null;

		// Check routing rules
		for (const [pattern, topicId] of Object.entries(
			this.config.routing.commit_patterns,
		)) {
			const regex = new RegExp(pattern, "i");
			if (regex.test(message)) {
				return { topic: topicId, reason: `Commit pattern: ${pattern}` };
			}
		}

		// Check file type
		if (fileType) {
			for (const [ext, topicId] of Object.entries(this.config.routing.file_patterns)) {
				if (fileType.endsWith(ext.replace("*", ""))) {
					return { topic: topicId, reason: `File type: ${ext}` };
				}
			}
		}

		// Default
		return { topic: project.default_topic, reason: "Project default" };
	}

	notify(projectName: string, event: string, data: Record<string, string>): void {
		if (!this.config) return;

		const project = this.config.projects[projectName];
		if (!project) {
			console.error(`Project not found: ${projectName}`);
			return;
		}

		// Check if notification is enabled
		const notificationKey = `on_${event}`;
		if (!project.notifications[notificationKey] && !project.notifications[event]) {
			console.log(
				`${COLORS.gray}Notification disabled for ${event} in ${projectName}${COLORS.reset}`,
			);
			return;
		}

		// Get webhook config if repo is configured
		const repo = this.config.repositories[project.repo || ""];
		if (repo && repo.webhooks[event]) {
			const webhook = repo.webhooks[event];
			let message = webhook.message;

			// Replace placeholders
			for (const [key, value] of Object.entries(data)) {
				message = message.replace(`{${key}}`, value);
			}

			const topicId = webhook.topic || project.default_topic;

			console.log(`\n${COLORS.bold}🔔 Notification for ${projectName}:${COLORS.reset}`);
			console.log(`  Event: ${event}`);
			console.log(`  Topic: ${topicId}`);
			console.log(`  Message: ${message}`);
		}
	}

	testRoute(projectName: string, message: string, fileType?: string): void {
		const result = this.routeForProject(projectName, message, fileType);

		if (result) {
			console.log(`\n${COLORS.bold}Route Test:${COLORS.reset}`);
			console.log(`  Project: ${projectName}`);
			console.log(`  Message: ${message}`);
			if (fileType) {
				console.log(`  File: ${fileType}`);
			}
			console.log(`  → Topic ${result.topic}`);
			console.log(`  Reason: ${result.reason}`);
		} else {
			console.error(`Could not route message for project: ${projectName}`);
		}
	}

	getCurrentProject(): string | null {
		return this.currentProject;
	}
}

async function main() {
	const args = process.argv.slice(2);
	const command = args[0];
	const integration = new ProjectIntegration();

	if (!(await integration.loadConfig())) {
		process.exit(1);
	}

	switch (command) {
		case "list":
			integration.listProjects();
			break;

		case "groups":
			integration.listGroups();
			break;

		case "show":
			integration.showProject(args[1]);
			break;

		case "current": {
			const current = integration.getCurrentProject();
			if (current) {
				console.log(`${COLORS.green}Current project:${COLORS.reset} ${current}`);
				integration.showProject(current);
			} else {
				console.log(
					`${COLORS.yellow}No project detected for current directory${COLORS.reset}`,
				);
			}
			break;
		}

		case "route": {
			const [projectName, ...messageParts] = args.slice(1);
			const message = messageParts.join(" ");
			if (!projectName || !message) {
				console.error(
					"Usage: project-integration.ts route <project> <message> [--file=<type>]",
				);
				process.exit(1);
			}
			integration.testRoute(projectName, message);
			break;
		}

		case "notify": {
			const [notifyProject, event, ...dataParts] = args.slice(1);
			const dataStr = dataParts.join(" ");
			let data: Record<string, string> = {};

			try {
				data = JSON.parse(dataStr);
			} catch {
				// Simple key=value parsing
				for (const part of dataParts) {
					const [key, value] = part.split("=");
					if (key && value) {
						data[key] = value;
					}
				}
			}

			integration.notify(notifyProject, event, data);
			break;
		}

		default:
			console.log(`${COLORS.bold}🔗 Project-Topic Integration${COLORS.reset}\n`);
			console.log("Usage:");
			console.log("  project-integration.ts list              List all projects");
			console.log("  project-integration.ts groups            List project groups");
			console.log("  project-integration.ts show [project]    Show project details");
			console.log("  project-integration.ts current           Show current project");
			console.log("  project-integration.ts route <p> <msg>   Test message routing");
			console.log("  project-integration.ts notify <p> <e>    Send test notification");
			console.log("\nProjects are automatically detected from current directory.");
	}
}

if (import.meta.main) {
	main().catch(console.error);
}
