#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Governance Dashboard
 * Real-time terminal dashboard for commit governance monitoring
 */

import { Database } from "bun:sqlite";
import { $ } from "bun";

interface DashboardConfig {
	refreshInterval: number;
	showTrends: boolean;
	alertThreshold: number;
}

interface DashboardState {
	commits: number;
	validFormat: number;
	failedChecks: number;
	lastCommit: string;
	trend: number[];
}

const DB_PATH = `${process.env.HOME}/.matrix/commit-history.db`;

function clearScreen(): void {
	console.log("\x1b[2J\x1b[0f");
}

function renderBox(title: string, content: string[], width = 60): string[] {
	const lines: string[] = [];
	const top = `╔${"═".repeat(width - 2)}╗`;
	const bottom = `╚${"═".repeat(width - 2)}╝`;

	lines.push(top);
	lines.push(`║${title.padStart((width + title.length) / 2).padEnd(width - 2)}║`);
	lines.push(`╠${"═".repeat(width - 2)}╣`);

	for (const line of content) {
		lines.push(`║${line.slice(0, width - 2).padEnd(width - 2)}║`);
	}

	lines.push(bottom);
	return lines;
}

function renderGauge(label: string, value: number, max = 100, width = 40): string {
	const filled = Math.round((value / max) * width);
	const bar = "█".repeat(filled) + "░".repeat(width - filled);
	const pct = Math.round((value / max) * 100);
	return `${label.padEnd(12)} ${bar} ${pct}%`;
}

function getState(): DashboardState {
	try {
		const db = new Database(DB_PATH);

		// Total commits
		const commitsResult = db.query("SELECT COUNT(*) as count FROM commits").get() as {
			count: number;
		};

		// Valid format percentage
		const validResult = db
			.query("SELECT AVG(valid_format) as rate FROM commits")
			.get() as {
			rate: number;
		};

		// Failed checks
		const failedResult = db
			.query("SELECT COUNT(*) as count FROM precommit_checks WHERE failed > 0")
			.get() as { count: number };

		// Last commit
		const lastResult = db
			.query("SELECT message, date FROM commits ORDER BY date DESC LIMIT 1")
			.get() as { message: string; date: string } | null;

		// Trend (last 7 days)
		const trendResult = db
			.query(`
			SELECT AVG(valid_format) * 100 as rate
			FROM commits
			WHERE date > datetime('now', '-7 days')
			GROUP BY date(date)
			ORDER BY date(date)
		`)
			.all() as { rate: number }[];

		db.close();

		return {
			commits: commitsResult.count,
			validFormat: Math.round((validResult.rate || 0) * 100),
			failedChecks: failedResult.count,
			lastCommit: lastResult
				? `${lastResult.message.slice(0, 40)}… (${lastResult.date.slice(0, 10)})`
				: "No commits",
			trend: trendResult.map((r) => Math.round(r.rate)),
		};
	} catch {
		return {
			commits: 0,
			validFormat: 0,
			failedChecks: 0,
			lastCommit: "No data",
			trend: [],
		};
	}
}

async function renderDashboard(config: DashboardConfig): Promise<void> {
	clearScreen();

	const state = getState();
	const now = new Date().toISOString();

	console.log();

	// Header
	const headerLines = renderBox(
		"Tier-1380 OMEGA Governance Dashboard",
		[
			`Timestamp: ${now.slice(0, 19)}`,
			`Status: ${state.validFormat >= config.alertThreshold ? "✅ HEALTHY" : "⚠️  WARNING"}`,
		],
		70,
	);
	console.log(headerLines.join("\n"));
	console.log();

	// Metrics
	const metricLines = renderBox(
		"Metrics",
		[
			"",
			renderGauge("Commits", Math.min(state.commits, 1000), 1000),
			"",
			renderGauge("Valid Format", state.validFormat),
			"",
			renderGauge("Failed Checks", Math.max(0, 100 - state.failedChecks * 10)),
			"",
		],
		70,
	);
	console.log(metricLines.join("\n"));
	console.log();

	// Recent activity
	const activityLines = renderBox(
		"Recent Activity",
		[`Last: ${state.lastCommit}`, "", `Failed Check Runs: ${state.failedChecks}`],
		70,
	);
	console.log(activityLines.join("\n"));
	console.log();

	// Trend
	if (config.showTrends && state.trend.length > 0) {
		const trendContent: string[] = [""];
		for (let i = 0; i < state.trend.length; i++) {
			const day = state.trend[i];
			const bar = "█".repeat(Math.round(day / 5));
			trendContent.push(`Day ${i + 1}: ${bar} ${day}%`);
		}
		trendContent.push("");

		const trendLines = renderBox("7-Day Compliance Trend", trendContent, 70);
		console.log(trendLines.join("\n"));
		console.log();
	}

	// Quick actions
	console.log("Commands: [r]efresh [s]ync [q]uit");
}

async function runInteractiveDashboard(config: DashboardConfig): Promise<void> {
	// Initial render
	await renderDashboard(config);

	// Set up stdin for input
	process.stdin.setRawMode(true);
	process.stdin.resume();
	process.stdin.setEncoding("utf8");

	process.stdin.on("data", async (key: string) => {
		switch (key) {
			case "q":
			case "\u0003": // Ctrl+C
				console.log("\n👋 Dashboard closed");
				process.exit(0);
				break;
			case "r":
				await renderDashboard(config);
				break;
			case "s":
				console.log("\n🔄 Syncing from git...");
				await $`bun ${import.meta.dir}/commit-history.ts sync`.quiet();
				await renderDashboard(config);
				break;
		}
	});

	// Auto-refresh
	setInterval(() => renderDashboard(config), config.refreshInterval * 1000);
}

// Main
if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const once = args.includes("--once");
	const refreshInterval =
		Number(args.find((a) => a.startsWith("--interval="))?.split("=")[1]) || 5;

	const config: DashboardConfig = {
		refreshInterval,
		showTrends: !args.includes("--no-trends"),
		alertThreshold: 80,
	};

	if (once) {
		await renderDashboard(config);
	} else {
		console.log("Starting dashboard... Press 'q' to quit");
		await new Promise((resolve) => setTimeout(resolve, 1000));
		await runInteractiveDashboard(config);
	}
}

export {
	renderDashboard,
	runInteractiveDashboard,
	type DashboardConfig,
	type DashboardState,
};
