/**
 * @fileoverview Forensic Data Correction Engine
 * @module research/data-correction/correction-engine
 *
 * Re-processes historical data to remove URL artifact false positives.
 * Corrects steam alerts, adjusts weights, and generates correction reports.
 */

import { Database } from "bun:sqlite";

/**
 * Forensic Data Correction Engine
 *
 * Corrects historical data by:
 * - Flagging movements as artifacts
 * - Removing false steam alerts
 * - Re-calculating weights
 * - Generating correction reports
 */
export class ForensicDataCorrector {
	private db: Database;

	constructor(db: Database | string = "research.db") {
		if (typeof db === "string") {
			this.db = new Database(db, { create: true });
		} else {
			this.db = db;
		}
		this.initializeSchema();
	}

	/**
	 * Initialize schema for data correction
	 */
	private initializeSchema(): void {
		// Add artifact flag columns if they don't exist
		try {
			this.db.run(`
				ALTER TABLE line_movement_audit_v2 
				ADD COLUMN is_artifact INTEGER DEFAULT 0
			`);
		} catch {
			// Column might already exist
		}

		try {
			this.db.run(`
				ALTER TABLE line_movement_audit_v2 
				ADD COLUMN artifact_reason TEXT
			`);
		} catch {
			// Column might already exist
		}

		// Add corrected_at column to url_anomaly_audit if it doesn't exist
		try {
			this.db.run(`
				ALTER TABLE url_anomaly_audit 
				ADD COLUMN corrected_at INTEGER
			`);
		} catch {
			// Column might already exist
		}

		// Create alert_history table if it doesn't exist
		this.db.run(`
			CREATE TABLE IF NOT EXISTS alert_history (
				alertId TEXT PRIMARY KEY,
				ruleId TEXT NOT NULL,
				eventId TEXT NOT NULL,
				triggered_at INTEGER NOT NULL,
				severity TEXT,
				message TEXT
			)
		`);

		// Create line_movement_micro_v2 table if it doesn't exist
		this.db.run(`
			CREATE TABLE IF NOT EXISTS line_movement_micro_v2 (
				microId TEXT PRIMARY KEY,
				eventId TEXT NOT NULL,
				timestamp INTEGER NOT NULL,
				weight REAL DEFAULT 1.0,
				line_value REAL
			)
		`);

		// Create indexes
		this.db.run(`
			CREATE INDEX IF NOT EXISTS idx_alert_event ON alert_history(eventId);
			CREATE INDEX IF NOT EXISTS idx_alert_triggered ON alert_history(triggered_at);
			CREATE INDEX IF NOT EXISTS idx_micro_event ON line_movement_micro_v2(eventId);
			CREATE INDEX IF NOT EXISTS idx_micro_timestamp ON line_movement_micro_v2(timestamp);
		`);
	}

	/**
	 * Re-process historical data to remove URL artifact false positives
	 */
	async correctHistoricalData(
		startDate: string,
		endDate: string,
	): Promise<{
		correctedRecords: number;
		removedSteamAlerts: number;
		adjustedWeights: number;
	}> {
		// Convert dates to seconds (unixepoch) for SQLite
		const startTime = Math.floor(new Date(startDate).getTime() / 1000);
		const endTime = Math.floor(new Date(endDate).getTime() / 1000);

		const anomalies = this.db
			.query(`
			SELECT uaa.*, lmm.auditId as moveId
			FROM url_anomaly_audit uaa
			JOIN line_movement_audit_v2 lmm ON uaa.eventId = lmm.eventId
			WHERE uaa.detected_at BETWEEN ?1 AND ?2
				AND (uaa.parsed_param_count - uaa.corrected_param_count) > 3
		`)
			.all(startTime, endTime) as Array<{
			anomalyId: string;
			bookmaker: string;
			eventId: string;
			detected_at: number;
			parsed_param_count: number;
			corrected_param_count: number;
			moveId: string;
		}>;

		const stats = {
			correctedRecords: 0,
			removedSteamAlerts: 0,
			adjustedWeights: 0,
		};

		for (const anomaly of anomalies) {
			// 1. Flag movements as artifacts
			try {
				this.db.run(
					`
					UPDATE line_movement_audit_v2
					SET is_artifact = 1, artifact_reason = 'url_entity_splitting'
					WHERE auditId = ?
				`,
					[anomaly.moveId],
				);

				// Mark anomaly as corrected
				try {
					this.db.run(
						`
						UPDATE url_anomaly_audit
						SET corrected_at = ?
						WHERE anomalyId = ?
					`,
						[Math.floor(Date.now() / 1000), anomaly.anomalyId],
					);
				} catch {
					// corrected_at column might not exist yet
				}

				stats.correctedRecords++;
			} catch (error) {
				console.warn(
					`Failed to flag artifact: ${error instanceof Error ? error.message : String(error)}`,
				);
			}

			// 2. Remove false steam move alerts
			try {
				const removed = this.db
					.query(`
					DELETE FROM alert_history
					WHERE ruleId = 'steam_move_critical'
						AND eventId = ?1
						AND triggered_at BETWEEN ?2 AND ?3
				`)
					.run(
						anomaly.eventId,
						anomaly.detected_at - 10,
						anomaly.detected_at + 10,
					);
				stats.removedSteamAlerts += removed.changes || 0;
			} catch (error) {
				console.warn(
					`Failed to remove alerts: ${error instanceof Error ? error.message : String(error)}`,
				);
			}

			// 3. Re-calculate weights (remove anomaly inflation)
			try {
				this.db.run(
					`
					UPDATE line_movement_micro_v2
					SET weight = weight / 2.0 -- Penalize artifact movements
					WHERE eventId = ?
						AND timestamp BETWEEN ? AND ?
				`,
					[anomaly.eventId, anomaly.detected_at - 5, anomaly.detected_at + 5],
				);
				stats.adjustedWeights++;
			} catch (error) {
				console.warn(
					`Failed to adjust weights: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		return stats;
	}

	/**
	 * Generate correction report for auditors
	 */
	async generateCorrectionReport(): Promise<Uint8Array> {
		try {
			// Check if line_before and line_after columns exist
			const hasLineMovementData = this.checkLineMovementColumns();

			let report: Array<{
				date: string;
				bookmaker: string;
				artifacts_corrected: number;
				false_moves_removed: number;
				avg_false_move_size?: number;
			}>;

			if (hasLineMovementData) {
				report = this.db
					.query(`
					SELECT 
						DATE(detected_at, 'unixepoch') as date,
						bookmaker,
						COUNT(*) as artifacts_corrected,
						SUM(CASE WHEN lmm.is_artifact = 1 THEN 1 ELSE 0 END) as false_moves_removed,
						AVG(ABS(CAST(line_after AS REAL) - CAST(line_before AS REAL))) as avg_false_move_size
					FROM url_anomaly_audit uaa
					JOIN line_movement_audit_v2 lmm ON uaa.anomalyId = lmm.auditId
					WHERE uaa.corrected_at IS NOT NULL
					GROUP BY date, bookmaker
					ORDER BY date DESC
				`)
					.all() as Array<{
					date: string;
					bookmaker: string;
					artifacts_corrected: number;
					false_moves_removed: number;
					avg_false_move_size: number;
				}>;
			} else {
				report = this.db
					.query(`
					SELECT 
						DATE(detected_at, 'unixepoch') as date,
						bookmaker,
						COUNT(*) as artifacts_corrected,
						SUM(CASE WHEN lmm.is_artifact = 1 THEN 1 ELSE 0 END) as false_moves_removed
					FROM url_anomaly_audit uaa
					JOIN line_movement_audit_v2 lmm ON uaa.anomalyId = lmm.auditId
					WHERE uaa.corrected_at IS NOT NULL
					GROUP BY date, bookmaker
					ORDER BY date DESC
				`)
					.all() as Array<{
					date: string;
					bookmaker: string;
					artifacts_corrected: number;
					false_moves_removed: number;
				}>;
			}

			// Use zstd compression via ReadableStream
			const stream = new ReadableStream({
				start(controller) {
					controller.enqueue(new TextEncoder().encode(JSON.stringify(report)));
					controller.close();
				},
			});

			// Try zstd compression, fallback to gzip if not available
			try {
				const compressed = stream.pipeThrough(
					new CompressionStream("zstd" as CompressionFormat),
				);
				return await Bun.readableStreamToBytes(compressed);
			} catch {
				// Fallback to gzip if zstd not supported
				const compressed = stream.pipeThrough(new CompressionStream("gzip"));
				return await Bun.readableStreamToBytes(compressed);
			}
		} catch (error) {
			console.error(
				`Failed to generate correction report: ${error instanceof Error ? error.message : String(error)}`,
			);
			// Return empty compressed report on error
			const emptyStream = new ReadableStream({
				start(controller) {
					controller.enqueue(new TextEncoder().encode(JSON.stringify([])));
					controller.close();
				},
			});
			const compressed = emptyStream.pipeThrough(new CompressionStream("gzip"));
			return await Bun.readableStreamToBytes(compressed);
		}
	}

	/**
	 * Check if line movement columns exist
	 */
	private checkLineMovementColumns(): boolean {
		try {
			const result = this.db
				.query(`
				SELECT name FROM pragma_table_info('line_movement_audit_v2')
				WHERE name IN ('line_before', 'line_after')
			`)
				.all() as Array<{ name: string }>;

			return result.length === 2;
		} catch {
			return false;
		}
	}

	/**
	 * Get correction statistics
	 */
	getCorrectionStats(): {
		totalArtifacts: number;
		totalCorrected: number;
		totalAlertsRemoved: number;
		byBookmaker: Record<string, number>;
	} {
		try {
			const total = this.db
				.query(`
				SELECT 
					COUNT(*) as total_artifacts,
					SUM(CASE WHEN lmm.is_artifact = 1 THEN 1 ELSE 0 END) as total_corrected
				FROM url_anomaly_audit uaa
				LEFT JOIN line_movement_audit_v2 lmm ON uaa.anomalyId = lmm.auditId
			`)
				.get() as {
				total_artifacts: number;
				total_corrected: number;
			} | null;

			const alertsRemoved = this.db
				.query(`
				SELECT COUNT(*) as count
				FROM alert_history
				WHERE ruleId = 'steam_move_critical'
					AND message LIKE '%artifact%'
			`)
				.get() as { count: number } | null;

			const byBookmaker = this.db
				.query(`
				SELECT 
					bookmaker,
					COUNT(*) as count
				FROM url_anomaly_audit
				GROUP BY bookmaker
			`)
				.all() as Array<{ bookmaker: string; count: number }>;

			return {
				totalArtifacts: total?.total_artifacts || 0,
				totalCorrected: total?.total_corrected || 0,
				totalAlertsRemoved: alertsRemoved?.count || 0,
				byBookmaker: Object.fromEntries(
					byBookmaker.map((b) => [b.bookmaker, b.count]),
				),
			};
		} catch (error) {
			console.warn(
				`Failed to get correction stats: ${error instanceof Error ? error.message : String(error)}`,
			);
			return {
				totalArtifacts: 0,
				totalCorrected: 0,
				totalAlertsRemoved: 0,
				byBookmaker: {},
			};
		}
	}

	/**
	 * Close database connection
	 */
	close(): void {
		this.db.close();
	}
}
