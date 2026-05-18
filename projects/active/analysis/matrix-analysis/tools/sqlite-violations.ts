#!/usr/bin/env bun
// sqlite-violations.ts — SQLite violation count (one-liner expanded)

import { Database } from "bun:sqlite";

const dbPath = "./data/tier1380.db";

try {
	const db = new Database(dbPath);
	const result = db.query("SELECT COUNT(*) as c FROM violations").get() as { c: number };

	console.info(`📊 Col-89 violations in database: ${result.c}`);

	// Additional context
	const recent = db
		.query(
			"SELECT COUNT(*) as c FROM violations WHERE ts > strftime('%s', 'now', '-1 hour')",
		)
		.get() as { c: number };
	const today = db
		.query(
			"SELECT COUNT(*) as c FROM violations WHERE ts > strftime('%s', 'now', 'start of day')",
		)
		.get() as { c: number };

	console.info(`⏰ Last hour: ${recent.c} violations`);
	console.info(`📅 Today: ${today.c} violations`);

	db.close();
} catch (error: any) {
	console.error(`❌ Database error: ${error?.message || error}`);
	process.exit(1);
}
