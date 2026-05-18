#!/usr/bin/env bun

/**
 * GitHub Webhook → Telegram Topic Bridge
 * Routes GitHub events to appropriate Telegram topics
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
	"project-topics.yaml",
);

type GitHubEvent =
	| "push"
	| "pull_request"
	| "pull_request_review"
	| "issues"
	| "issue_comment"
	| "release"
	| "workflow_run"
	| "check_run";

interface WebhookPayload {
	event: GitHubEvent;
	repository: string;
	action?: string;
	sender: {
		login: string;
		avatar_url: string;
	};
	data: Record<string, any>;
}

class GitHubWebhookBridge {
	private config: any = null;

	loadConfig(): boolean {
		try {
			if (!existsSync(CONFIG_PATH)) {
				console.error(`${COLORS.red}✗${COLORS.reset} Config not found: ${CONFIG_PATH}`);
				return false;
			}

			const content = readFileSync(CONFIG_PATH, "utf-8");
			this.config = parse(content);
			return true;
		} catch (error) {
			console.error(`${COLORS.red}✗${COLORS.reset} Failed to load config: ${error}`);
			return false;
		}
	}

	/**
	 * Process a GitHub webhook payload
	 */
	processWebhook(payload: WebhookPayload): {
		topic: number;
		message: string;
		priority: "low" | "normal" | "high";
	} | null {
		const repoConfig = this.config?.repositories?.[payload.repository];
		if (!repoConfig) {
			console.error(`No config found for repo: ${payload.repository}`);
			return null;
		}

		const webhooks = repoConfig.webhooks;
		if (!webhooks || !webhooks[payload.event]) {
			console.info(`No webhook config for event: ${payload.event}`);
			return null;
		}

		const eventConfig = webhooks[payload.event];

		// Handle different action types
		let config = eventConfig;
		if (payload.action && eventConfig[payload.action]) {
			config = eventConfig[payload.action];
		}

		// Build message
		let message = config.message;
		const data = {
			author: payload.sender.login,
			repo: payload.repository.split("/").pop(),
			...this.extractData(payload),
		};

		// Replace placeholders
		for (const [key, value] of Object.entries(data)) {
			message = message.replace(new RegExp(`{${key}}`, "g"), String(value));
		}

		return {
			topic: config.topic || 1,
			message,
			priority: this.getPriority(payload.event, payload.action),
		};
	}

	private extractData(payload: WebhookPayload): Record<string, string> {
		const data: Record<string, string> = {};
		const d = payload.data;

		switch (payload.event) {
			case "push":
				data.branch = d.ref?.replace("refs/heads/", "") || "unknown";
				data.commit_count = String(d.commits?.length || 0);
				data.commit_message = d.head_commit?.message?.split("\n")[0] || "";
				break;

			case "pull_request":
				data.title = d.pull_request?.title || "";
				data.number = String(d.pull_request?.number || "");
				data.source = d.pull_request?.head?.ref || "";
				data.target = d.pull_request?.base?.ref || "";
				break;

			case "issues":
				data.title = d.issue?.title || "";
				data.number = String(d.issue?.number || "");
				data.labels = d.issue?.labels?.map((l: any) => l.name).join(", ") || "";
				break;

			case "release":
				data.version = d.release?.tag_name || "";
				data.name = d.release?.name || "";
				break;

			case "workflow_run":
				data.workflow = d.workflow_run?.name || "";
				data.status = d.workflow_run?.status || "";
				data.conclusion = d.workflow_run?.conclusion || "";
				break;
		}

		return data;
	}

	private getPriority(event: GitHubEvent, action?: string): "low" | "normal" | "high" {
		switch (event) {
			case "push":
				return "normal";
			case "pull_request":
				return action === "merged" ? "high" : "normal";
			case "issues":
				return action === "opened" ? "high" : "normal";
			case "release":
				return "high";
			case "workflow_run":
				return "normal";
			default:
				return "normal";
		}
	}

	/**
	 * Simulate webhook events for testing
	 */
	simulate(event: GitHubEvent, repo: string, action?: string): void {
		const payload: WebhookPayload = {
			event,
			repository: repo,
			action,
			sender: {
				login: "test-user",
				avatar_url: "",
			},
			data: this.generateMockData(event, action),
		};

		console.info(
			`${COLORS.bold}🔄 Simulating:${COLORS.reset} ${event}${action ? `:${action}` : ""}`,
		);
		console.info(`${COLORS.gray}Repository:${COLORS.reset} ${repo}`);

		const result = this.processWebhook(payload);

		if (result) {
			const topicNames: Record<number, string> = {
				1: "📢 General",
				2: "🚨 Alerts",
				5: "📊 Logs",
				7: "💻 Development",
			};

			console.info(
				`${COLORS.bold}Route:${COLORS.reset} ${topicNames[result.topic] || `Topic ${result.topic}`}`,
			);
			console.info(`${COLORS.bold}Priority:${COLORS.reset} ${result.priority}`);
			console.info(`${COLORS.bold}Message:${COLORS.reset} ${result.message}`);
		} else {
			console.info(`${COLORS.yellow}⚠ Not routed${COLORS.reset}`);
		}
	}

	private generateMockData(event: GitHubEvent, action?: string): any {
		switch (event) {
			case "push":
				return {
					ref: "refs/heads/main",
					commits: [{ message: "feat: add new feature" }],
					head_commit: { message: "feat: add new feature\n\nDetailed description" },
				};

			case "pull_request":
				return {
					pull_request: {
						title: "Add awesome feature",
						number: 42,
						head: { ref: "feature-branch" },
						base: { ref: "main" },
					},
				};

			case "issues":
				return {
					issue: {
						title: "Bug in production",
						number: 123,
						labels: [{ name: "bug" }, { name: "critical" }],
					},
				};

			case "release":
				return {
					release: {
						tag_name: "v1.2.0",
						name: "Version 1.2.0",
					},
				};

			default:
				return {};
		}
	}

	/**
	 * Start webhook server
	 */
	async startServer(port: number = 3000): Promise<void> {
		console.info(
			`${COLORS.green}🚀 Starting webhook bridge server on port ${port}${COLORS.reset}`,
		);
		console.info(
			`${COLORS.gray}Configure GitHub webhook to POST to http://localhost:${port}/webhook${COLORS.reset}\n`,
		);

		const server = Bun.serve({
			port,
			async fetch(request) {
				const url = new URL(request.url);

				if (url.pathname === "/webhook" && request.method === "POST") {
					const event = request.headers.get("X-GitHub-Event") as GitHubEvent;
					const payload = await request.json();

					console.info(`\n${COLORS.cyan}📨 Received:${COLORS.reset} ${event}`);

					const result = this.processWebhook({
						event,
						repository: payload.repository?.full_name,
						action: payload.action,
						sender: payload.sender,
						data: payload,
					});

					if (result) {
						// Here you would send to Telegram
						console.info(
							`  ${COLORS.green}✓${COLORS.reset} Routed to Topic ${result.topic}`,
						);
						console.info(`  ${COLORS.gray}${result.message}${COLORS.reset}`);

						return new Response(JSON.stringify({ success: true, topic: result.topic }), {
							status: 200,
							headers: { "Content-Type": "application/json" },
						});
					}

					return new Response(JSON.stringify({ success: false }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				}

				return new Response("Not Found", { status: 404 });
			},
		});

		console.info(`${COLORS.green}✓${COLORS.reset} Server running`);

		// Keep alive
		await new Promise(() => {});
	}
}

async function main() {
	const args = process.argv.slice(2);
	const command = args[0];
	const bridge = new GitHubWebhookBridge();

	if (!bridge.loadConfig()) {
		process.exit(1);
	}

	switch (command) {
		case "simulate": {
			const [event, repo, action] = args.slice(1);
			if (!event || !repo) {
				console.error(
					"Usage: github-webhook-bridge.ts simulate <event> <repo> [action]",
				);
				console.error("Events: push, pull_request, issues, release, workflow_run");
				process.exit(1);
			}
			bridge.simulate(event as GitHubEvent, repo, action);
			break;
		}

		case "server": {
			const port = parseInt(args[1]) || 3000;
			await bridge.startServer(port);
			break;
		}

		case "test": {
			// Test all event types
			const testRepo = "github.com/brendadeeznuts1111/matrix-analysis";
			console.info(`${COLORS.bold}Testing all webhook events...${COLORS.reset}\n`);

			bridge.simulate("push", testRepo);
			console.info();
			bridge.simulate("pull_request", testRepo, "opened");
			console.info();
			bridge.simulate("pull_request", testRepo, "merged");
			console.info();
			bridge.simulate("issues", testRepo, "opened");
			console.info();
			bridge.simulate("release", testRepo, "published");
			break;
		}

		default:
			console.info(`${COLORS.bold}🔗 GitHub Webhook → Telegram Bridge${COLORS.reset}\n`);
			console.info("Usage:");
			console.info("  github-webhook-bridge.ts simulate <event> <repo> [action]");
			console.info("  github-webhook-bridge.ts server [port]");
			console.info("  github-webhook-bridge.ts test");
			console.info("\nExamples:");
			console.info("  github-webhook-bridge.ts simulate push github.com/user/repo");
			console.info(
				"  github-webhook-bridge.ts simulate pull_request github.com/user/repo opened",
			);
			console.info("  github-webhook-bridge.ts server 3000");
	}
}

if (import.meta.main) {
	main().catch(console.error);
}
