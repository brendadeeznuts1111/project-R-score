#!/usr/bin/env bun

/**
 * Telegram Topic Manager
 * Manage topics, super topics, and channels for the Matrix Agent Telegram bot
 */

import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { parse } from "yaml";

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
	"telegram-topics.yaml",
);

interface Topic {
	name: string;
	description: string;
	icon: string;
	color: string;
	allow_commands: boolean;
	allow_images: boolean;
	allow_files: boolean;
	auto_reply: boolean;
	priority: string;
	mention_all?: boolean;
	suppress_notifications?: boolean;
	syntax_highlight?: boolean;
}

interface SuperTopic {
	name: string;
	icon: string;
	topics: number[];
	description: string;
}

interface TopicConfig {
	bot: {
		username: string;
		allowlist: number[];
		default_topic: number;
	};
	topics: Record<number, Topic>;
	super_topics: Record<string, SuperTopic>;
	channels: Record<
		string,
		{
			type: string;
			topic_id: number;
			[key: string]: unknown;
		}
	>;
	routing: {
		content_rules: Array<{
			pattern: string;
			topic: number;
			priority: string;
		}>;
		command_routing: Record<string, number>;
		file_routing: Record<string, number>;
	};
}

class TopicManager {
	private config: TopicConfig | null = null;

	loadConfig(): boolean {
		try {
			if (!existsSync(CONFIG_PATH)) {
				console.error(`${COLORS.red}✗${COLORS.reset} Config not found: ${CONFIG_PATH}`);
				return false;
			}

			const content = readFileSync(CONFIG_PATH, "utf-8");
			this.config = parse(content) as TopicConfig;
			return true;
		} catch (error) {
			console.error(`${COLORS.red}✗${COLORS.reset} Failed to load config: ${error}`);
			return false;
		}
	}

	listTopics(): void {
		if (!this.config) return;

		console.log(`\n${COLORS.bold}📋 Telegram Topics${COLORS.reset}`);
		console.log(`${COLORS.gray}Bot: ${this.config.bot.username}${COLORS.reset}\n`);

		for (const [id, topic] of Object.entries(this.config.topics)) {
			const topicId = parseInt(id);
			const isDefault = topicId === this.config.bot.default_topic;
			const defaultMarker = isDefault ? `${COLORS.yellow} [default]${COLORS.reset}` : "";

			console.log(
				`  ${topic.icon} ${COLORS.bold}${topic.name}${COLORS.reset} (ID: ${id})${defaultMarker}`,
			);
			console.log(`     ${COLORS.gray}${topic.description}${COLORS.reset}`);
			console.log(
				`     Priority: ${topic.priority} | Commands: ${topic.allow_commands ? "✓" : "✗"} | Files: ${topic.allow_files ? "✓" : "✗"}`,
			);
			console.log();
		}
	}

	listSuperTopics(): void {
		if (!this.config) return;

		console.log(`\n${COLORS.bold}📁 Super Topics (Topic Groups)${COLORS.reset}\n`);

		for (const [key, superTopic] of Object.entries(this.config.super_topics)) {
			console.log(
				`  ${superTopic.icon} ${COLORS.bold}${superTopic.name}${COLORS.reset} (${key})`,
			);
			console.log(`     ${COLORS.gray}${superTopic.description}${COLORS.reset}`);
			console.log(`     Topics: ${superTopic.topics.join(", ")}`);
			console.log();
		}
	}

	listChannels(): void {
		if (!this.config) return;

		console.log(`\n${COLORS.bold}📡 Channels${COLORS.reset}\n`);

		for (const [key, channel] of Object.entries(this.config.channels)) {
			console.log(`  ${COLORS.bold}${key}${COLORS.reset} (${channel.type})`);
			console.log(`     Topic ID: ${channel.topic_id}`);
			if (channel.update_frequency) {
				console.log(`     Update: ${channel.update_frequency}`);
			}
			if (channel.retention) {
				console.log(`     Retention: ${channel.retention}`);
			}
			console.log();
		}
	}

	showRoutingRules(): void {
		if (!this.config) return;

		console.log(`\n${COLORS.bold}🔄 Routing Rules${COLORS.reset}\n`);

		console.log("Content Patterns:");
		for (const rule of this.config.routing.content_rules) {
			console.log(
				`  ${COLORS.cyan}${rule.pattern}${COLORS.reset} → Topic ${rule.topic} (${rule.priority})`,
			);
		}

		console.log("\nCommand Routing:");
		for (const [cmd, topic] of Object.entries(this.config.routing.command_routing)) {
			console.log(`  /${cmd} → Topic ${topic}`);
		}

		console.log("\nFile Type Routing:");
		for (const [type, topic] of Object.entries(this.config.routing.file_routing)) {
			console.log(`  .${type} → Topic ${topic}`);
		}
	}

	routeMessage(message: string): { topic: number; reason: string } | null {
		if (!this.config) return null;

		// Check content rules
		for (const rule of this.config.routing.content_rules) {
			const regex = new RegExp(rule.pattern, "i");
			if (regex.test(message)) {
				return { topic: rule.topic, reason: `Pattern match: ${rule.pattern}` };
			}
		}

		// Check command routing
		const cmdMatch = message.match(/^\/(\w+)/);
		if (cmdMatch) {
			const cmd = cmdMatch[1];
			if (this.config.routing.command_routing[cmd]) {
				return {
					topic: this.config.routing.command_routing[cmd],
					reason: `Command: /${cmd}`,
				};
			}
		}

		// Default topic
		return { topic: this.config.bot.default_topic, reason: "Default routing" };
	}

	testRouting(message: string): void {
		const result = this.routeMessage(message);
		if (result) {
			console.log(`\n${COLORS.bold}Message:${COLORS.reset} ${message}`);
			console.log(`${COLORS.bold}Route to:${COLORS.reset} Topic ${result.topic}`);
			console.log(`${COLORS.bold}Reason:${COLORS.reset} ${result.reason}`);

			const topic = this.config?.topics[result.topic];
			if (topic) {
				console.log(
					`${COLORS.bold}Topic Name:${COLORS.reset} ${topic.icon} ${topic.name}`,
				);
			}
		}
	}
}

async function main() {
	const args = process.argv.slice(2);
	const command = args[0];
	const manager = new TopicManager();

	if (!manager.loadConfig()) {
		process.exit(1);
	}

	switch (command) {
		case "list":
			manager.listTopics();
			break;

		case "super":
			manager.listSuperTopics();
			break;

		case "channels":
			manager.listChannels();
			break;

		case "routing":
			manager.showRoutingRules();
			break;

		case "route": {
			const message = args.slice(1).join(" ");
			if (!message) {
				console.error("Usage: topic-manager.ts route <message>");
				process.exit(1);
			}
			manager.testRouting(message);
			break;
		}

		case "all":
			manager.listTopics();
			manager.listSuperTopics();
			manager.listChannels();
			manager.showRoutingRules();
			break;

		default:
			console.log(`${COLORS.bold}📋 Telegram Topic Manager${COLORS.reset}\n`);
			console.log("Usage:");
			console.log("  topic-manager.ts list        List all topics");
			console.log("  topic-manager.ts super       List super topics");
			console.log("  topic-manager.ts channels    List channels");
			console.log("  topic-manager.ts routing     Show routing rules");
			console.log("  topic-manager.ts route <msg> Test message routing");
			console.log("  topic-manager.ts all         Show everything");
			console.log("\nTopics: 1=General, 2=Alerts, 5=Logs, 7=Development");
	}
}

if (import.meta.main) {
	main().catch(console.error);
}
