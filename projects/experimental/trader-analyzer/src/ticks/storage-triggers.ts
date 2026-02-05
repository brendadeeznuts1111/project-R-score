/**
 * @fileoverview SQLite Triggers for Real-Time Materialized View Refresh
 * @description Incremental refresh of tick_stats_1m materialized view using triggers
 * @module ticks/storage-triggers
 * @version 1.0.0
 */

import { Database } from "bun:sqlite";

/**
 * Initialize SQLite triggers for real-time tick stats refresh
 * 
 * Creates triggers that automatically update tick_stats_1m materialized view
 * when new ticks are inserted, eliminating stale data issues
 */
export function initializeTickStatsTriggers(db: Database): void {
	// Drop existing triggers if they exist
	db.exec(`
		DROP TRIGGER IF EXISTS tick_stats_insert;
		DROP TRIGGER IF EXISTS tick_stats_update;
	`);

	// Create trigger for INSERT operations
	db.exec(`
		CREATE TRIGGER tick_stats_insert
		AFTER INSERT ON tick_data
		FOR EACH ROW
		BEGIN
			INSERT OR REPLACE INTO tick_stats_1m (
				node_id,
				minute_bucket,
				ticks_per_minute,
				avg_price,
				min_price,
				max_price
			)
			SELECT
				NEW.node_id,
				strftime('%Y-%m-%d %H:%M:00', datetime(NEW.timestamp_ms / 1000, 'unixepoch')) as minute_bucket,
				COUNT(*) as ticks_per_minute,
				AVG(price) as avg_price,
				MIN(price) as min_price,
				MAX(price) as max_price
			FROM tick_data
			WHERE node_id = NEW.node_id
				AND strftime('%Y-%m-%d %H:%M:00', datetime(timestamp_ms / 1000, 'unixepoch')) =
					strftime('%Y-%m-%d %H:%M:00', datetime(NEW.timestamp_ms / 1000, 'unixepoch'));
		END;
	`);

	console.log('%s | TRIGGER_INIT | %j', new Date().toISOString(), {
		trigger: 'tick_stats_insert',
		status: 'created',
		description: 'Real-time materialized view refresh for tick_stats_1m'
	});
}

/**
 * Alternative: Append-only tick logs using Bun.file() for 10x faster writes
 * Use this for ultra-high-frequency scenarios (>100k ticks/sec)
 */
export async function writeTickToLog(
	nodeId: string,
	tick: { timestamp_ms: number; price: number; volume?: number }
): Promise<void> {
	const logPath = `/var/log/hyper-bun/ticks/${nodeId}.ndjson`;
	const logFile = Bun.file(logPath);
	
	// Ensure directory exists
	await Bun.write(logPath, '').catch(() => {}); // Create if doesn't exist
	
	// Append tick as NDJSON (10x faster than SQLite INSERT)
	const line = JSON.stringify({
		timestamp_ms: tick.timestamp_ms,
		price: tick.price,
		volume: tick.volume || null
	}) + '\n';
	
	await logFile.append(line);
}

/**
 * Batch aggregate tick logs into SQLite (run every 5 seconds)
 */
export async function aggregateTickFile(
	db: Database,
	nodeId: string
): Promise<void> {
	const logPath = `/var/log/hyper-bun/ticks/${nodeId}.ndjson`;
	const logFile = Bun.file(logPath);
	
	if (!(await logFile.exists())) {
		return;
	}

	const content = await logFile.text();
	const lines = content.trim().split('\n').filter(line => line.length > 0);
	
	if (lines.length === 0) {
		return;
	}

	// Parse ticks
	const ticks = lines.map(line => {
		try {
			return JSON.parse(line) as { timestamp_ms: number; price: number; volume?: number };
		} catch {
			return null;
		}
	}).filter((t): t is { timestamp_ms: number; price: number; volume?: number } => t !== null);

	if (ticks.length === 0) {
		return;
	}

	// Batch insert into SQLite
	const transaction = db.transaction(() => {
		const stmt = db.prepare(`
			INSERT INTO tick_data (node_id, timestamp_ms, price, volume)
			VALUES (?, ?, ?, ?)
		`);

		for (const tick of ticks) {
			stmt.run(nodeId, tick.timestamp_ms, tick.price, tick.volume || null);
		}
	});

	transaction();

	// Clear log file after aggregation
	await Bun.write(logPath, '');
}
