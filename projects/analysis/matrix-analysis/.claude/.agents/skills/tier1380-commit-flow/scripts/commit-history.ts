#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Commit History & Analytics
 * Track commit quality and governance compliance over time
 */

import { Database } from "bun:sqlite";
import { $ } from "bun";

interface CommitEntry {
	id?: number;
	hash: string;
	message: string;
	domain: string;
	component: string;
	tier: number;
	author: string;
	date: string;
	validFormat: boolean;
	passedChecks: number;
	totalChecks: number;
}

interface AnalyticsResult {
	totalCommits: number;
	validFormatRate: number;
	avgChecksPassed: number;
	topDomains: { domain: string; count: number }[];
	topComponents: { component: string; count: number }[];
	complianceTrend: { date: string; rate: number }[];
}

const DB_PATH = `${process.env.HOME}/.matrix/commit-history.db`;

function getDb(): Database {
	const db = new Database(DB_PATH);

	db.exec(`
		CREATE TABLE IF NOT EXISTS commits (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			hash TEXT UNIQUE,
			message TEXT,
			domain TEXT,
			component TEXT,
			tier INTEGER,
			author TEXT,
			date TEXT,
			valid_format INTEGER,
			passed_checks INTEGER,
			total_checks INTEGER,
			created_at TEXT DEFAULT CURRENT_TIMESTAMP
		)
	`);

	return db;
}

async function recordCommit(entry: CommitEntry): Promise<void> {
	const db = getDb();

	db.query(`
		INSERT OR REPLACE INTO commits
		(hash, message, domain, component, tier, author, date, valid_format, passed_checks, total_checks)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`).run(
		entry.hash,
		entry.message,
		entry.domain,
		entry.component,
		entry.tier,
		entry.author,
		entry.date,
		entry.validFormat ? 1 : 0,
		entry.passedChecks,
		entry.totalChecks,
	);

	db.close();
}

async function syncFromGit(): Promise<number> {
	const db = getDb();
	let count = 0;

	try {
		// Get recent commits
		const log = await $`git log --pretty=format:"%H|%s|%an|%ad" --date=iso -50`.text();
		const commits = log.trim().split("\n");

		for (const line of commits) {
			const [hash, message, author, date] = line.split("|");
			if (!hash || !message) continue;

			// Parse message format
			const match = message.match(
				/^\[([A-Z]+)\](?:\[COMPONENT:)?([A-Z]+)\]?(?:\[TIER:(\d+)\])?/,
			);
			const domain = match?.[1] || "UNKNOWN";
			const component = match?.[2] || "UNKNOWN";
			const tier = Number(match?.[3]) || 0;
			const validFormat = !!match;

			// Check if exists
			const existing = db.query("SELECT id FROM commits WHERE hash = ?").get(hash);
			if (existing) continue;

			db.query(`
				INSERT INTO commits
				(hash, message, domain, component, tier, author, date, valid_format, passed_checks, total_checks)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`).run(
				hash,
				message,
				domain,
				component,
				tier,
				author,
				date,
				validFormat ? 1 : 0,
				0,
				0,
			);

			count++;
		}
	} catch {
		// Git command failed
	}

	db.close();
	return count;
}

function generateAnalytics(_days = 30): AnalyticsResult {
	const db = getDb();

	// Total commits
	const totalResult = db.query("SELECT COUNT(*) as count FROM commits").get() as {
		count: number;
	};

	// Valid format rate
	const validResult = db
		.query(
			`SELECT AVG(valid_format) as rate FROM commits WHERE date > datetime('now', '-${_days} days')`,
		)
		.get() as { rate: number };

	// Average checks passed
	const checksResult = db
		.query(
			"SELECT AVG(CAST(passed_checks AS FLOAT) / total_checks) as avg FROM commits WHERE total_checks > 0",
		)
		.get() as { avg: number };

	// Top domains
	const topDomains = db
		.query(`
		SELECT domain, COUNT(*) as count
		FROM commits
		GROUP BY domain
		ORDER BY count DESC
		LIMIT 5
	`)
		.all() as { domain: string; count: number }[];

	// Top components
	const topComponents = db
		.query(`
		SELECT component, COUNT(*) as count
		FROM commits
		GROUP BY component
		ORDER BY count DESC
		LIMIT 5
	`)
		.all() as { component: string; count: number }[];

	// Compliance trend (last 14 days)
	const trend = db
		.query(`
		SELECT
			date(date) as day,
			AVG(valid_format) * 100 as rate
		FROM commits
		WHERE date > datetime('now', '-14 days')
		GROUP BY day
		ORDER BY day
	`)
		.all() as { date: string; rate: number }[];

	db.close();

	return {
		totalCommits: totalResult.count,
		validFormatRate: Math.round((validResult.rate || 0) * 100),
		avgChecksPassed: Math.round((checksResult.avg || 0) * 100),
		topDomains,
		topComponents,
		complianceTrend: trend.map((t) => ({
			date: t.date,
			rate: Math.round(t.rate),
		})),
	};
}

function displayHistory(limit = 20): void {
	const db = getDb();

	const commits = db
		.query(`
		SELECT hash, message, domain, component, tier, author, date, valid_format
		FROM commits
		ORDER BY date DESC
		LIMIT ?
	`)
		.all(limit) as Array<{
		hash: string;
		message: string;
		domain: string;
		component: string;
		tier: number;
		author: string;
		date: string;
		valid_format: number;
	}>;

	db.close();

	console.log("\n📜 Recent Commits:");
	console.log();

	const rows = commits.map((c) => ({
		Hash: c.hash.slice(0, 7),
		Domain: c.domain,
		Component: c.component,
		Valid: c.valid_format ? "✅" : "❌",
		Message: c.message.slice(0, 50) + (c.message.length > 50 ? "…" : ""),
	}));

	console.log(Bun.inspect.table(rows));
}

function displayAnalytics(): void {
	const analytics = generateAnalytics();

	console.log("\n📊 Commit Analytics");
	console.log();

	console.log(`Total Commits:      ${analytics.totalCommits}`);
	console.log(`Valid Format Rate:  ${analytics.validFormatRate}%`);
	console.log(`Avg Checks Passed:  ${analytics.avgChecksPassed}%`);
	console.log();

	console.log("Top Domains:");
	for (const { domain, count } of analytics.topDomains) {
		console.log(`  ${domain}: ${count}`);
	}
	console.log();

	console.log("Top Components:");
	for (const { component, count } of analytics.topComponents) {
		console.log(`  ${component}: ${count}`);
	}
	console.log();

	if (analytics.complianceTrend.length > 0) {
		console.log("Compliance Trend (14 days):");
		for (const { date, rate } of analytics.complianceTrend) {
			const bar = "█".repeat(Math.round(rate / 10));
			console.log(`  ${date} ${bar} ${rate}%`);
		}
	}
}

// Main
if (import.meta.main) {
	const command = Bun.argv[2] || "history";

	console.log("╔════════════════════════════════════════════════════════╗");
	console.log("║     Tier-1380 OMEGA Commit History                     ║");
	console.log("╚════════════════════════════════════════════════════════╝");

	switch (command) {
		case "sync": {
			const count = await syncFromGit();
			console.log(`\n🔄 Synced ${count} new commits from git`);
			break;
		}

		case "analytics": {
			displayAnalytics();
			break;
		}
		default: {
			displayHistory();
			break;
		}
	}
}

export {
	recordCommit,
	syncFromGit,
	generateAnalytics,
	type CommitEntry,
	type AnalyticsResult,
};
