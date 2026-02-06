#!/usr/bin/env bun

/**
 * Kimi Shell Notification System
 * Desktop notifications, webhooks, and alerting
 */

import { homedir } from "os";
import { join } from "path";

const COLORS = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	cyan: "\x1b[36m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	gray: "\x1b[90m",
};

export type NotificationLevel = "info" | "success" | "warning" | "error";

interface NotificationOptions {
	title: string;
	message: string;
	level?: NotificationLevel;
	timeout?: number;
	icon?: string;
	actions?: string[];
}

interface WebhookConfig {
	url: string;
	method?: "GET" | "POST";
	headers?: Record<string, string>;
	template?: string;
}

interface NotificationRule {
	id: string;
	pattern: string;
	level: NotificationLevel;
	channels: ("desktop" | "webhook" | "console")[];
	enabled: boolean;
}

class NotificationManager {
	private webhooks: WebhookConfig[] = [];
	private rules: NotificationRule[] = [];

	constructor() {
		this.loadConfig();
	}

	private loadConfig(): void {
		// Default rules
		this.rules = [
			{
				id: "job-failed",
				pattern: "job:failed",
				level: "error",
				channels: ["desktop", "console"],
				enabled: true,
			},
			{
				id: "job-completed",
				pattern: "job:completed",
				level: "success",
				channels: ["console"],
				enabled: true,
			},
			{
				id: "security-alert",
				pattern: "security:*",
				level: "warning",
				channels: ["desktop", "console"],
				enabled: true,
			},
		];
	}

	/**
	 * Show desktop notification using osascript (macOS)
	 */
	async desktop(options: NotificationOptions): Promise<void> {
		const { $ } = await import("bun");

		const levelConfig = {
			info: { sound: "Glass", icon: "💬" },
			success: { sound: "Hero", icon: "✅" },
			warning: { sound: "Basso", icon: "⚠️" },
			error: { sound: "Sosumi", icon: "🚨" },
		};

		const config = levelConfig[options.level || "info"];

		// macOS notification via osascript
		if (process.platform === "darwin") {
			const script = `
        display notification "${options.message.replace(/"/g, '\\"')}" \
          with title "🐚 Kimi Shell" \
          subtitle "${options.title.replace(/"/g, '\\"')}" \
          sound name "${config.sound}"
      `;

			try {
				await $`osascript -e ${script}`.quiet();
			} catch {
				// Fallback to console
				this.console(options);
			}
		} else {
			// Linux: try notify-send
			try {
				await $`notify-send "${options.title}" "${options.message}"`.quiet();
			} catch {
				this.console(options);
			}
		}
	}

	/**
	 * Console notification
	 */
	console(options: NotificationOptions): void {
		const colors: Record<NotificationLevel, string> = {
			info: COLORS.cyan,
			success: COLORS.green,
			warning: COLORS.yellow,
			error: COLORS.red,
		};

		const icons: Record<NotificationLevel, string> = {
			info: "💬",
			success: "✅",
			warning: "⚠️",
			error: "🚨",
		};

		const color = colors[options.level || "info"];
		const icon = icons[options.level || "info"];

		console.log(`\n${color}${icon} ${COLORS.bold}${options.title}${COLORS.reset}`);
		console.log(`   ${options.message}\n`);
	}

	/**
	 * Send webhook notification
	 */
	async webhook(options: NotificationOptions, config: WebhookConfig): Promise<void> {
		const payload = {
			title: options.title,
			message: options.message,
			level: options.level,
			timestamp: new Date().toISOString(),
			source: "kimi-shell",
		};

		try {
			const response = await fetch(config.url, {
				method: config.method || "POST",
				headers: {
					"Content-Type": "application/json",
					...config.headers,
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				console.error(`Webhook failed: ${response.status}`);
			}
		} catch (error) {
			console.error(`Webhook error: ${error}`);
		}
	}

	/**
	 * Send notification through all configured channels
	 */
	async send(
		options: NotificationOptions,
		channels?: ("desktop" | "webhook" | "console")[],
	): Promise<void> {
		const targets = channels || ["console"];

		for (const channel of targets) {
			switch (channel) {
				case "desktop":
					await this.desktop(options);
					break;
				case "console":
					this.console(options);
					break;
				case "webhook":
					for (const webhook of this.webhooks) {
						await this.webhook(options, webhook);
					}
					break;
			}
		}
	}

	/**
	 * Notify based on event pattern
	 */
	async trigger(
		event: string,
		message: string,
		context?: Record<string, unknown>,
	): Promise<void> {
		for (const rule of this.rules) {
			if (!rule.enabled) continue;

			// Simple pattern matching
			const pattern = rule.pattern.replace(/\*/g, ".*");
			const regex = new RegExp(`^${pattern}$`);

			if (regex.test(event)) {
				await this.send(
					{
						title: event,
						message,
						level: rule.level,
					},
					rule.channels,
				);
			}
		}
	}

	/**
	 * Add webhook endpoint
	 */
	addWebhook(config: WebhookConfig): void {
		this.webhooks.push(config);
	}

	/**
	 * Add notification rule
	 */
	addRule(rule: NotificationRule): void {
		this.rules.push(rule);
	}

	/**
	 * List all rules
	 */
	listRules(): NotificationRule[] {
		return [...this.rules];
	}
}

// Global notification manager
export const notify = new NotificationManager();

async function main() {
	const args = Bun.argv.slice(2);
	const command = args[0];

	switch (command) {
		case "send": {
			const level = (args[1] as NotificationLevel) || "info";
			const title = args[2];
			const message = args.slice(3).join(" ");

			if (!title || !message) {
				console.error("Usage: notify.ts send <level> <title> <message>");
				process.exit(1);
			}

			await notify.send(
				{
					title,
					message,
					level,
				},
				["desktop", "console"],
			);

			break;
		}

		case "desktop": {
			const title = args[1];
			const message = args.slice(2).join(" ");

			if (!title || !message) {
				console.error("Usage: notify.ts desktop <title> <message>");
				process.exit(1);
			}

			await notify.desktop({
				title,
				message,
				level: "info",
			});

			console.log(`${COLORS.green}✓${COLORS.reset} Desktop notification sent`);
			break;
		}

		case "trigger": {
			const event = args[1];
			const message = args.slice(2).join(" ");

			if (!event || !message) {
				console.error("Usage: notify.ts trigger <event> <message>");
				process.exit(1);
			}

			await notify.trigger(event, message);
			break;
		}

		case "rules": {
			const rules = notify.listRules();
			console.log(`${COLORS.bold}Notification Rules:${COLORS.reset}\n`);

			for (const rule of rules) {
				const status = rule.enabled
					? `${COLORS.green}●${COLORS.reset}`
					: `${COLORS.gray}○${COLORS.reset}`;
				console.log(`${status} ${rule.id}`);
				console.log(`  Pattern: ${rule.pattern}`);
				console.log(`  Level: ${rule.level}`);
				console.log(`  Channels: ${rule.channels.join(", ")}`);
				console.log();
			}
			break;
		}

		case "test": {
			console.log("Sending test notifications...\n");

			await notify.send(
				{
					title: "Test Info",
					message: "This is an info notification",
					level: "info",
				},
				["console"],
			);

			await notify.send(
				{
					title: "Test Success",
					message: "Operation completed successfully",
					level: "success",
				},
				["console"],
			);

			await notify.send(
				{
					title: "Test Warning",
					message: "Something might be wrong",
					level: "warning",
				},
				["console"],
			);

			await notify.send(
				{
					title: "Test Error",
					message: "Something went wrong!",
					level: "error",
				},
				["console"],
			);

			// Desktop notification
			await notify.desktop({
				title: "Kimi Shell",
				message: "Notification system is working!",
				level: "success",
			});

			console.log(`${COLORS.green}✓${COLORS.reset} Test complete`);
			break;
		}

		default: {
			console.log("🐚 Kimi Notification System\n");
			console.log("Usage:");
			console.log("  notify.ts send <level> <title> <msg>    Send notification");
			console.log("  notify.ts desktop <title> <message>     Desktop notification only");
			console.log("  notify.ts trigger <event> <message>     Trigger by event pattern");
			console.log("  notify.ts rules                         List notification rules");
			console.log("  notify.ts test                          Run test notifications");
			console.log("\nLevels: info, success, warning, error");
			console.log("Channels: desktop (macOS), console, webhook");
		}
	}
}

if (import.meta.main) {
	main().catch(console.error);
}

export { NotificationManager };
export type { NotificationOptions, NotificationLevel, WebhookConfig, NotificationRule };
