#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Commit Statistics
 * Analyze commit patterns and quality metrics
 */

import { Database } from "bun:sqlite";

interface StatsResult {
	totalCommits: number;
	byDomain: Record<string, number>;
	byComponent: Record<string, number>;
	byAuthor: Record<string, number>;
	complianceRate: number;
	averageMessageLength: number;
	mostActiveDay: string;
}

function getDb(): Database {
	return new Database(`${process.env.HOME}/.matrix/commit-history.db`);
}

function generateStats(days = 30): StatsResult {
	const db = getDb();

	// Check if table exists
	const tableCheck = db
		.query("SELECT name FROM sqlite_master WHERE type='table' AND name='commits'")
		.get();

	if (!tableCheck) {
		db.close();
		return {
			totalCommits: 0,
			byDomain: {},
			byComponent: {},
			byAuthor: {},
			complianceRate: 0,
			averageMessageLength: 0,
			mostActiveDay: "N/A",
		};
	}

	// Total commits
	const totalResult = db
		.query(
			"SELECT COUNT(*) as count FROM commits WHERE date > datetime('now', '-? days')",
		)
		.get(days) as { count: number };

	// By domain
	const domainResults = db
		.query(
			"SELECT domain, COUNT(*) as count FROM commits WHERE date > datetime('now', '-? days') GROUP BY domain",
		)
		.all(days) as Array<{ domain: string; count: number }>;

	// By component
	const componentResults = db
		.query(
			"SELECT component, COUNT(*) as count FROM commits WHERE date > datetime('now', '-? days') GROUP BY component",
		)
		.all(days) as Array<{ component: string; count: number }>;

	// By author
	const authorResults = db
		.query(
			"SELECT author, COUNT(*) as count FROM commits WHERE date > datetime('now', '-? days') GROUP BY author",
		)
		.all(days) as Array<{ author: string; count: number }>;

	// Compliance rate
	const complianceResult = db
		.query(
			"SELECT AVG(valid_format) as rate FROM commits WHERE date > datetime('now', '-? days')",
		)
		.get(days) as { rate: number };

	// Average message length
	const lengthResult = db
		.query(
			"SELECT AVG(LENGTH(message)) as avg FROM commits WHERE date > datetime('now', '-? days')",
		)
		.get(days) as { avg: number };

	// Most active day
	const dayResult = db
		.query(
			"SELECT date, COUNT(*) as count FROM commits WHERE date > datetime('now', '-? days') GROUP BY date ORDER BY count DESC LIMIT 1",
		)
		.get(days) as { date: string; count: number } | null;

	db.close();

	const byDomain: Record<string, number> = {};
	for (const r of domainResults) {
		byDomain[r.domain] = r.count;
	}

	const byComponent: Record<string, number> = {};
	for (const r of componentResults) {
		byComponent[r.component] = r.count;
	}

	const byAuthor: Record<string, number> = {};
	for (const r of authorResults) {
		byAuthor[r.author] = r.count;
	}

	return {
		totalCommits: totalResult.count,
		byDomain,
		byComponent,
		byAuthor,
		complianceRate: Math.round((complianceResult.rate || 0) * 100),
		averageMessageLength: Math.round(lengthResult.avg || 0),
		mostActiveDay: dayResult?.date || "N/A",
	};
}

function renderStats(stats: StatsResult): void {
	console.info("\n📊 Commit Statistics");
	console.info("═══════════════════════════════════════════════════\n");

	console.info(`Total Commits:      ${stats.totalCommits}`);
	console.info(`Compliance Rate:    ${stats.complianceRate}%`);
	console.info(`Avg Message Length: ${stats.averageMessageLength} chars`);
	console.info(`Most Active Day:    ${stats.mostActiveDay}`);
	console.info();

	console.info("By Domain:");
	for (const [domain, count] of Object.entries(stats.byDomain).sort(
		(a, b) => b[1] - a[1],
	)) {
		console.info(
			`  ${domain.padEnd(12)} ${count.toString().padStart(4)} ${"█".repeat(Math.min(count, 20))}`,
		);
	}
	console.info();

	console.info("By Component:");
	for (const [comp, count] of Object.entries(stats.byComponent)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5)) {
		console.info(`  ${comp.padEnd(12)} ${count.toString().padStart(4)}`);
	}
	console.info();

	console.info("Top Authors:");
	for (const [author, count] of Object.entries(stats.byAuthor)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5)) {
		console.info(`  ${author.padEnd(20)} ${count.toString().padStart(4)}`);
	}
}

// Main
if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const days = Number(args.find((a) => a.startsWith("--days="))?.split("=")[1]) || 30;

	console.info("╔════════════════════════════════════════════════════════╗");
	console.info("║     Tier-1380 OMEGA Commit Statistics                  ║");
	console.info(`║     Last ${days.toString().padEnd(42)} ║`);
	console.info("╚════════════════════════════════════════════════════════╝");

	const stats = generateStats(days);
	renderStats(stats);
}

export { generateStats, renderStats, type StatsResult };
