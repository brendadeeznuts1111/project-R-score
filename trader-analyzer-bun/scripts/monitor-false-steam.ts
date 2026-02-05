#!/usr/bin/env bun
/**
 * @fileoverview False Steam Rate Monitor
 * @description Monitor false steam rates in real-time for bookmakers
 */

import { UrlAnomalyPatternEngine } from "../src/research/patterns/url-anomaly-patterns";
import { Database } from "bun:sqlite";

interface MonitorOptions {
	bookmaker: string;
	window?: string; // e.g., "5m", "1h", "24h"
	alertThreshold?: number; // Default: 0.1 (10%)
	interval?: number; // Check interval in seconds (default: 60)
}

function parseWindow(window: string): number {
	const match = window.match(/^(\d+)([mhd])$/);
	if (!match) {
		throw new Error(`Invalid window format: ${window}. Use format like "5m", "1h", "24h"`);
	}

	const value = parseInt(match[1]);
	const unit = match[2];

	switch (unit) {
		case "m":
			return value * 60; // minutes to seconds
		case "h":
			return value * 3600; // hours to seconds
		case "d":
			return value * 86400; // days to seconds
		default:
			throw new Error(`Unknown unit: ${unit}`);
	}
}

async function monitorFalseSteam(options: MonitorOptions) {
	const db = new Database("./data/research.db", { create: true });
	const engine = new UrlAnomalyPatternEngine(db);

	const windowSeconds = options.window ? parseWindow(options.window) : 3600; // Default: 1 hour
	const hours = windowSeconds / 3600;
	const alertThreshold = options.alertThreshold || 0.1;
	const interval = options.interval || 60;

	console.log(`🔍 Monitoring false steam rate for ${options.bookmaker}`);
	console.log(`   Window: ${options.window || "1h"} (${hours.toFixed(2)} hours)`);
	console.log(`   Alert Threshold: ${(alertThreshold * 100).toFixed(1)}%`);
	console.log(`   Check Interval: ${interval}s\n`);

	let checkCount = 0;

	const checkRate = async () => {
		checkCount++;
		const rate = engine.calculateFalseSteamRate(options.bookmaker, hours);
		const percentage = rate * 100;
		const timestamp = new Date().toISOString();

		const status = rate > alertThreshold ? "🚨 ALERT" : rate > alertThreshold * 0.5 ? "⚠️  WARNING" : "✅ OK";

		console.log(`[${timestamp}] ${status} | False Steam Rate: ${percentage.toFixed(2)}%`);

		if (rate > alertThreshold) {
			console.error(`\n🚨 ALERT: False steam rate (${percentage.toFixed(2)}%) exceeds threshold (${(alertThreshold * 100).toFixed(1)}%)`);
			console.error(`   Bookmaker: ${options.bookmaker}`);
			console.error(`   Window: ${options.window || "1h"}\n`);
		}
	};

	// Initial check
	await checkRate();

	// Periodic checks
	const intervalId = setInterval(async () => {
		await checkRate();
	}, interval * 1000);

	// Handle graceful shutdown
	process.on("SIGINT", () => {
		console.log(`\n\n📊 Summary: Checked ${checkCount} times`);
		clearInterval(intervalId);
		engine.close();
		db.close();
		process.exit(0);
	});

	// Keep process alive
	await new Promise(() => {});
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: MonitorOptions = {
	bookmaker: "",
};

for (let i = 0; i < args.length; i++) {
	const arg = args[i];
	switch (arg) {
		case "--bookmaker":
		case "-b":
			options.bookmaker = args[++i];
			break;
		case "--window":
		case "-w":
			options.window = args[++i];
			break;
		case "--alert-threshold":
		case "-t":
			options.alertThreshold = parseFloat(args[++i]);
			break;
		case "--interval":
		case "-i":
			options.interval = parseInt(args[++i]);
			break;
		case "--help":
		case "-h":
			console.log(`
Usage: bun run scripts/monitor-false-steam.ts [options]

Options:
  --bookmaker, -b <name>     Bookmaker to monitor (required)
  --window, -w <time>        Time window (e.g., "5m", "1h", "24h") (default: "1h")
  --alert-threshold, -t <n>  Alert threshold (0.0-1.0) (default: 0.1)
  --interval, -i <seconds>   Check interval in seconds (default: 60)
  --help, -h                 Show this help message

Examples:
  bun run scripts/monitor-false-steam.ts --bookmaker DraftKings --window 5m
  bun run scripts/monitor-false-steam.ts -b FanDuel -w 1h -t 0.15 -i 30
			`);
			process.exit(0);
	}
}

if (!options.bookmaker) {
	console.error("Error: --bookmaker is required");
	console.error("Use --help for usage information");
	process.exit(1);
}

monitorFalseSteam(options).catch((error) => {
	console.error("Monitor error:", error);
	process.exit(1);
});
