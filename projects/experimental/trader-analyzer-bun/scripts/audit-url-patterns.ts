#!/usr/bin/env bun
/**
 * @fileoverview URL Pattern Audit Script
 * @description Weekly audit of URL anomaly patterns for compliance and reporting
 */

import { UrlAnomalyPatternEngine } from "../src/research/patterns/url-anomaly-patterns";
import { Database } from "bun:sqlite";
import { writeFile } from "fs/promises";
import { join } from "path";

interface AuditOptions {
	output?: string;
	sport?: string;
	days?: number;
}

interface AuditReport {
	timestamp: string;
	sport: string;
	days: number;
	patterns: Array<{
		patternId: string;
		pattern_name: string;
		anomaly_type: string;
		affected_bookmakers: string[];
		market_impact: {
			avg_line_delta: number;
			frequency_per_hour: number;
			false_steam_probability: number;
		};
		confidence_level: number;
	}>;
	summary: {
		total_patterns: number;
		by_bookmaker: Record<string, number>;
		by_type: Record<string, number>;
		avg_false_steam_rate: number;
	};
}

async function auditUrlPatterns(options: AuditOptions) {
	const db = new Database("./data/research.db", { create: true });
	const engine = new UrlAnomalyPatternEngine(db);

	const sport = options.sport || "NBA";
	const days = options.days || 7;
	const hours = days * 24;

	console.log(`🔍 Auditing URL anomaly patterns`);
	console.log(`   Sport: ${sport}`);
	console.log(`   Period: ${days} days (${hours} hours)\n`);

	// Discover patterns
	const patterns = await engine.discoverAnomalyPatterns(sport, hours);

	// Calculate summary statistics
	const byBookmaker: Record<string, number> = {};
	const byType: Record<string, number> = {};
	let totalFalseSteamRate = 0;

	for (const pattern of patterns) {
		// Count by bookmaker
		for (const bookmaker of pattern.affected_bookmakers) {
			byBookmaker[bookmaker] = (byBookmaker[bookmaker] || 0) + 1;
		}

		// Count by type
		byType[pattern.anomaly_type] = (byType[pattern.anomaly_type] || 0) + 1;

		// Accumulate false steam rate
		totalFalseSteamRate += pattern.market_impact.false_steam_probability;
	}

	const avgFalseSteamRate = patterns.length > 0 ? totalFalseSteamRate / patterns.length : 0;

	const report: AuditReport = {
		timestamp: new Date().toISOString(),
		sport,
		days,
		patterns: patterns.map((p) => ({
			patternId: p.patternId,
			pattern_name: p.pattern_name,
			anomaly_type: p.anomaly_type,
			affected_bookmakers: p.affected_bookmakers,
			market_impact: p.market_impact,
			confidence_level: p.confidence_level,
		})),
		summary: {
			total_patterns: patterns.length,
			by_bookmaker: byBookmaker,
			by_type: byType,
			avg_false_steam_rate: avgFalseSteamRate,
		},
	};

	// Output report
	const outputPath = options.output || join(process.cwd(), `url-patterns-audit-${Date.now()}.json`);
	await writeFile(outputPath, JSON.stringify(report, null, 2));

	console.log(`✅ Audit complete`);
	console.log(`   Total Patterns: ${patterns.length}`);
	console.log(`   By Bookmaker: ${Object.entries(byBookmaker).map(([bm, count]) => `${bm}: ${count}`).join(", ")}`);
	console.log(`   By Type: ${Object.entries(byType).map(([type, count]) => `${type}: ${count}`).join(", ")}`);
	console.log(`   Avg False Steam Rate: ${(avgFalseSteamRate * 100).toFixed(2)}%`);
	console.log(`   Report saved to: ${outputPath}\n`);

	engine.close();
	db.close();
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: AuditOptions = {};

for (let i = 0; i < args.length; i++) {
	const arg = args[i];
	switch (arg) {
		case "--output":
		case "-o":
			options.output = args[++i];
			break;
		case "--sport":
		case "-s":
			options.sport = args[++i];
			break;
		case "--days":
		case "-d":
			options.days = parseInt(args[++i]);
			break;
		case "--help":
		case "-h":
			console.log(`
Usage: bun run scripts/audit-url-patterns.ts [options]

Options:
  --output, -o <path>   Output file path (default: url-patterns-audit-<timestamp>.json)
  --sport, -s <name>    Sport to audit (default: "NBA")
  --days, -d <number>   Number of days to analyze (default: 7)
  --help, -h            Show this help message

Examples:
  bun run scripts/audit-url-patterns.ts --sport NBA --days 7
  bun run scripts/audit-url-patterns.ts -o /var/log/hyper-bun/weekly-audit.json -d 30
			`);
			process.exit(0);
	}
}

auditUrlPatterns(options).catch((error) => {
	console.error("Audit error:", error);
	process.exit(1);
});
