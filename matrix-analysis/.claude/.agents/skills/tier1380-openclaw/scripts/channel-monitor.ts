#!/usr/bin/env bun

/**
 * Channel Monitor
 * Monitor and manage Telegram channels with topic organization
 */

import { appendFileSync, existsSync, readFileSync } from "fs";
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

interface Message {
	id: string;
	topicId: number;
	content: string;
	timestamp: number;
	sender?: string;
	priority: "low" | "normal" | "high" | "urgent";
}

interface ChannelStats {
	totalMessages: number;
	messagesByTopic: Record<number, number>;
	messagesByPriority: Record<string, number>;
	lastActivity: number;
}

class ChannelMonitor {
	private messages: Message[] = [];
	private maxMessages = 1000;

	/**
	 * Simulate receiving a message
	 */
	receiveMessage(message: Omit<Message, "id" | "timestamp">): void {
		const msg: Message = {
			...message,
			id: crypto.randomUUID(),
			timestamp: Date.now(),
		};

		this.messages.push(msg);

		// Trim old messages
		if (this.messages.length > this.maxMessages) {
			this.messages = this.messages.slice(-this.maxMessages);
		}

		// Log to file
		this.logMessage(msg);
	}

	private logMessage(msg: Message): void {
		const logPath = join(homedir(), ".kimi", "logs", "channel-monitor.jsonl");
		const line = JSON.stringify(msg) + "\n";
		appendFileSync(logPath, line);
	}

	/**
	 * Get channel statistics
	 */
	getStats(): ChannelStats {
		const stats: ChannelStats = {
			totalMessages: this.messages.length,
			messagesByTopic: {},
			messagesByPriority: {},
			lastActivity:
				this.messages.length > 0
					? Math.max(...this.messages.map((m) => m.timestamp))
					: 0,
		};

		for (const msg of this.messages) {
			stats.messagesByTopic[msg.topicId] = (stats.messagesByTopic[msg.topicId] || 0) + 1;
			stats.messagesByPriority[msg.priority] =
				(stats.messagesByPriority[msg.priority] || 0) + 1;
		}

		return stats;
	}

	/**
	 * Get messages for a specific topic
	 */
	getMessagesByTopic(topicId: number, limit = 10): Message[] {
		return this.messages.filter((m) => m.topicId === topicId).slice(-limit);
	}

	/**
	 * Get messages by priority
	 */
	getMessagesByPriority(priority: string, limit = 10): Message[] {
		return this.messages.filter((m) => m.priority === priority).slice(-limit);
	}

	/**
	 * Display real-time dashboard
	 */
	displayDashboard(): void {
		console.clear();
		console.log(`${COLORS.bold}📊 Channel Monitor Dashboard${COLORS.reset}`);
		console.log("═══════════════════════════════════════════════════\n");

		const stats = this.getStats();

		// Overview
		console.log(`${COLORS.bold}Overview:${COLORS.reset}`);
		console.log(`  Total Messages: ${COLORS.cyan}${stats.totalMessages}${COLORS.reset}`);
		console.log(
			`  Last Activity: ${
				stats.lastActivity > 0
					? new Date(stats.lastActivity).toLocaleTimeString()
					: "No activity"
			}`,
		);
		console.log();

		// Topic distribution
		console.log(`${COLORS.bold}Messages by Topic:${COLORS.reset}`);
		const topicNames: Record<number, string> = {
			1: "📢 General",
			2: "🚨 Alerts",
			5: "📊 Logs",
			7: "💻 Development",
		};

		for (const [topicId, count] of Object.entries(stats.messagesByTopic)) {
			const id = parseInt(topicId);
			const name = topicNames[id] || `Topic ${id}`;
			const bar = "█".repeat(Math.min(count, 20));
			console.log(`  ${name.padEnd(20)} ${bar} ${count}`);
		}
		console.log();

		// Priority distribution
		console.log(`${COLORS.bold}Messages by Priority:${COLORS.reset}`);
		const priorityColors: Record<string, string> = {
			urgent: COLORS.red,
			high: COLORS.yellow,
			normal: COLORS.green,
			low: COLORS.gray,
		};

		for (const [priority, count] of Object.entries(stats.messagesByPriority)) {
			const color = priorityColors[priority] || COLORS.reset;
			console.log(`  ${color}${priority.padEnd(10)}${COLORS.reset} ${count}`);
		}
		console.log();

		// Recent messages
		console.log(`${COLORS.bold}Recent Messages:${COLORS.reset}`);
		const recent = this.messages.slice(-5).reverse();
		for (const msg of recent) {
			const topicName = topicNames[msg.topicId] || `Topic ${msg.topicId}`;
			const time = new Date(msg.timestamp).toLocaleTimeString();
			const priorityColor = priorityColors[msg.priority] || COLORS.reset;
			console.log(
				`  ${COLORS.gray}[${time}]${COLORS.reset} ${topicName} ${priorityColor}[${msg.priority}]${COLORS.reset}`,
			);
			console.log(
				`    ${msg.content.slice(0, 60)}${msg.content.length > 60 ? "..." : ""}`,
			);
		}
	}
}

// CLI
async function main() {
	const args = process.argv.slice(2);
	const command = args[0];
	const monitor = new ChannelMonitor();

	// Simulate some initial data
	monitor.receiveMessage({
		topicId: 1,
		content: "System status: OK",
		priority: "normal",
	});
	monitor.receiveMessage({
		topicId: 2,
		content: "High CPU usage detected",
		priority: "high",
	});
	monitor.receiveMessage({
		topicId: 5,
		content: "Log rotation completed",
		priority: "low",
	});
	monitor.receiveMessage({
		topicId: 7,
		content: "Deployed new feature",
		priority: "normal",
	});

	switch (command) {
		case "dashboard": {
			monitor.displayDashboard();
			break;
		}

		case "watch": {
			console.log("Starting channel monitor (Ctrl+C to exit)...\n");

			// Initial display
			monitor.displayDashboard();

			// Simulate incoming messages
			const interval = setInterval(() => {
				const topics = [1, 2, 5, 7];
				const priorities = ["low", "normal", "normal", "normal", "high"];

				const randomTopic = topics[Math.floor(Math.random() * topics.length)];
				const randomPriority = priorities[
					Math.floor(Math.random() * priorities.length)
				] as any;

				monitor.receiveMessage({
					topicId: randomTopic,
					content: `Simulated message from topic ${randomTopic}`,
					priority: randomPriority,
				});

				monitor.displayDashboard();
			}, 5000);

			process.on("SIGINT", () => {
				clearInterval(interval);
				console.log("\n\nMonitor stopped.");
				process.exit(0);
			});

			break;
		}

		case "stats": {
			const stats = monitor.getStats();
			console.log(`${COLORS.bold}Channel Statistics:${COLORS.reset}\n`);
			console.log(`Total Messages: ${stats.totalMessages}`);
			console.log(
				`Last Activity: ${
					stats.lastActivity > 0
						? new Date(stats.lastActivity).toLocaleString()
						: "Never"
				}`,
			);
			console.log("\nBy Topic:");
			for (const [id, count] of Object.entries(stats.messagesByTopic)) {
				console.log(`  Topic ${id}: ${count}`);
			}
			break;
		}

		default: {
			console.log(`${COLORS.bold}📊 Channel Monitor${COLORS.reset}\n`);
			console.log("Usage:");
			console.log("  channel-monitor.ts dashboard    Show dashboard");
			console.log("  channel-monitor.ts watch        Watch mode (live updates)");
			console.log("  channel-monitor.ts stats        Show statistics");
		}
	}
}

if (import.meta.main) {
	main().catch(console.error);
}
