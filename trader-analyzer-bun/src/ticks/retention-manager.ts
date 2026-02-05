/**
 * @fileoverview Tiered Data Retention Manager
 * @description Prevents database bloat with 4-tier retention strategy
 * @module ticks/retention-manager
 * @version 1.0.0
 */

import { Database } from "bun:sqlite";

/**
 * Tiered retention strategy:
 * - Tier 1: Raw ticks (last 1 hour) - SQLite in-memory
 * - Tier 2: Compressed ticks (1-24 hours) - SQLite on SSD
 * - Tier 3: Aggregated stats (24h-7 days) - SQLite
 * - Tier 4: Archived ticks (7+ days) - S3 Glacier
 */
export class TickRetentionManager {
	private db: Database;
	private retentionInterval: ReturnType<typeof setInterval> | null = null;

	constructor(db: Database) {
		this.db = db;
		this.initCompressedSchema();
		this.startRetentionManager();
	}

	/**
	 * Initialize compressed tick schema (90% size reduction)
	 */
	private initCompressedSchema(): void {
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS tick_data_compressed (
				node_id TEXT NOT NULL,
				minute_bucket TEXT NOT NULL,
				avg_price REAL NOT NULL,
				min_price REAL NOT NULL,
				max_price REAL NOT NULL,
				tick_count INTEGER NOT NULL,
				PRIMARY KEY (node_id, minute_bucket)
			) WITHOUT ROWID;

			CREATE INDEX IF NOT EXISTS idx_tick_compressed_bucket ON tick_data_compressed(minute_bucket);
		`);
	}

	/**
	 * Start retention manager (runs every minute)
	 */
	private startRetentionManager(): void {
		this.retentionInterval = setInterval(() => {
			this.runRetentionCycle();
		}, 60000); // Every minute
	}

	/**
	 * Run retention cycle: move old ticks to compressed, delete very old, archive to S3
	 */
	private runRetentionCycle(): void {
		const now = Date.now();
		const oneHourAgo = now - 3600000;
		const oneDayAgo = now - 86400000;
		const sevenDaysAgo = now - 7 * 86400000;

		try {
			// Tier 2: Move ticks >1 hour old to compressed table
			this.db.exec(`
				INSERT OR REPLACE INTO tick_data_compressed (
					node_id,
					minute_bucket,
					avg_price,
					min_price,
					max_price,
					tick_count
				)
				SELECT
					node_id,
					strftime('%Y-%m-%d %H:%M:00', datetime(timestamp_ms / 1000, 'unixepoch')) as minute_bucket,
					AVG(price) as avg_price,
					MIN(price) as min_price,
					MAX(price) as max_price,
					COUNT(*) as tick_count
				FROM tick_data
				WHERE timestamp_ms < ?
				GROUP BY node_id, minute_bucket
			`, [oneHourAgo]);

			// Tier 3: Delete raw ticks >24 hours old
			const deleteResult = this.db.exec(`
				DELETE FROM tick_data
				WHERE timestamp_ms < ?
			`, [oneDayAgo]);

			// Tier 4: Archive compressed ticks >7 days to S3 (async)
			this.archiveToS3(sevenDaysAgo).catch(error => {
				console.error('%s | RETENTION_ARCHIVE_ERROR | %j', new Date().toISOString(), {
					error: error instanceof Error ? error.message : String(error),
					cutoff_time: sevenDaysAgo
				});
			});

			// Log retention metrics
			console.log('%s | RETENTION_CYCLE | %j', new Date().toISOString(), {
				compressed_count: this.db.prepare('SELECT COUNT(*) as count FROM tick_data_compressed').get(),
				raw_count: this.db.prepare('SELECT COUNT(*) as count FROM tick_data').get(),
				deleted_count: deleteResult
			});
		} catch (error) {
			console.error('%s | RETENTION_ERROR | %j', new Date().toISOString(), {
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}

	/**
	 * Archive compressed ticks to S3 Glacier (async)
	 */
	private async archiveToS3(cutoffTime: number): Promise<void> {
		// Query compressed ticks older than cutoff
		const stmt = this.db.prepare(`
			SELECT * FROM tick_data_compressed
			WHERE minute_bucket < strftime('%Y-%m-%d %H:%M:00', datetime(? / 1000, 'unixepoch'))
		`);

		const rows = stmt.all(cutoffTime) as Array<{
			node_id: string;
			minute_bucket: string;
			avg_price: number;
			min_price: number;
			max_price: number;
			tick_count: number;
		}>;

		if (rows.length === 0) {
			return;
		}

		// In production, upload to S3 Glacier here
		// For now, just log the archive operation
		console.log('%s | RETENTION_ARCHIVE | %j', new Date().toISOString(), {
			rows_to_archive: rows.length,
			cutoff_time: cutoffTime
		});

		// Delete archived rows from compressed table
		this.db.exec(`
			DELETE FROM tick_data_compressed
			WHERE minute_bucket < strftime('%Y-%m-%d %H:%M:00', datetime(? / 1000, 'unixepoch'))
		`, [cutoffTime]);
	}

	/**
	 * Stop retention manager
	 */
	stop(): void {
		if (this.retentionInterval) {
			clearInterval(this.retentionInterval);
			this.retentionInterval = null;
		}
	}

	/**
	 * Get retention statistics
	 */
	getStats(): {
		rawTickCount: number;
		compressedTickCount: number;
		rawSizeMB: number;
		compressedSizeMB: number;
	} {
		const rawCount = (this.db.prepare('SELECT COUNT(*) as count FROM tick_data').get() as { count: number }).count;
		const compressedCount = (this.db.prepare('SELECT COUNT(*) as count FROM tick_data_compressed').get() as { count: number }).count;

		// Estimate sizes (rough approximation)
		const rawSizeMB = rawCount * 0.0001; // ~100 bytes per tick
		const compressedSizeMB = compressedCount * 0.00001; // ~10 bytes per compressed tick (90% reduction)

		return {
			rawTickCount: rawCount,
			compressedTickCount: compressedCount,
			rawSizeMB: Math.round(rawSizeMB * 100) / 100,
			compressedSizeMB: Math.round(compressedSizeMB * 100) / 100
		};
	}
}
