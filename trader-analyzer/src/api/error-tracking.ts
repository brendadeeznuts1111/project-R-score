/**
 * @fileoverview Error Tracking and Downtime Monitoring
 * @description Track errors, downtime incidents, and error statistics
 * @module api/error-tracking
 */

import { Database } from "bun:sqlite";

/**
 * Error tracking database
 */
class ErrorTracker {
	private db: Database;

	constructor(dbPath = "data/error-tracking.db") {
		this.db = new Database(dbPath, { create: true });
		this.initialize();
	}

	/**
	 * Initialize database schema
	 */
	private initialize(): void {
		// Error log table
		this.db.run(`
			CREATE TABLE IF NOT EXISTS error_log (
				id TEXT PRIMARY KEY,
				error_code TEXT NOT NULL,
				status_code INTEGER NOT NULL,
				category TEXT NOT NULL,
				message TEXT NOT NULL,
				path TEXT,
				method TEXT,
				recoverable INTEGER DEFAULT 0,
				details TEXT,
				timestamp INTEGER NOT NULL,
				user_agent TEXT,
				ip_address TEXT
			)
		`);

		// Downtime incidents table
		this.db.run(`
			CREATE TABLE IF NOT EXISTS downtime_incidents (
				id TEXT PRIMARY KEY,
				start_time INTEGER NOT NULL,
				end_time INTEGER,
				duration_ms INTEGER,
				error_code TEXT,
				status_code INTEGER,
				reason TEXT,
				resolved INTEGER DEFAULT 0,
				impact TEXT
			)
		`);

		// Error statistics table (aggregated)
		this.db.run(`
			CREATE TABLE IF NOT EXISTS error_stats (
				error_code TEXT PRIMARY KEY,
				count INTEGER DEFAULT 0,
				last_occurred INTEGER,
				first_occurred INTEGER,
				total_downtime_ms INTEGER DEFAULT 0
			)
		`);

		// Create indexes
		this.db.run(
			`CREATE INDEX IF NOT EXISTS idx_error_timestamp ON error_log(timestamp)`,
		);
		this.db.run(
			`CREATE INDEX IF NOT EXISTS idx_error_code ON error_log(error_code)`,
		);
		this.db.run(
			`CREATE INDEX IF NOT EXISTS idx_error_category ON error_log(category)`,
		);
		this.db.run(
			`CREATE INDEX IF NOT EXISTS idx_downtime_start ON downtime_incidents(start_time)`,
		);
	}

	/**
	 * Log an error
	 */
	logError(error: {
		code: string;
		status: number;
		category: string;
		message: string;
		path?: string;
		method?: string;
		recoverable?: boolean;
		details?: Record<string, unknown>;
		userAgent?: string;
		ipAddress?: string;
	}): void {
		const id = Bun.randomUUIDv7();
		const timestamp = Date.now();

		this.db
			.prepare(
				`
			INSERT INTO error_log (
				id, error_code, status_code, category, message, path, method,
				recoverable, details, timestamp, user_agent, ip_address
			) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
		`,
			)
			.run(
				id,
				error.code,
				error.status,
				error.category,
				error.message,
				error.path || null,
				error.method || null,
				error.recoverable ? 1 : 0,
				error.details ? JSON.stringify(error.details) : null,
				timestamp,
				error.userAgent || null,
				error.ipAddress || null,
			);

		// Update error statistics
		this.updateErrorStats(error.code, timestamp);

		// Check if this is a downtime-causing error (5xx or 503)
		if (error.status >= 500 || error.status === 503) {
			this.recordDowntime(error.code, error.status, error.message);
		}
	}

	/**
	 * Update error statistics
	 */
	private updateErrorStats(errorCode: string, timestamp: number): void {
		const existing = this.db
			.prepare(`SELECT * FROM error_stats WHERE error_code = ?`)
			.get(errorCode) as { count: number; first_occurred: number } | undefined;

		if (existing) {
			this.db
				.prepare(
					`UPDATE error_stats SET count = count + 1, last_occurred = ? WHERE error_code = ?`,
				)
				.run(timestamp, errorCode);
		} else {
			this.db
				.prepare(
					`INSERT INTO error_stats (error_code, count, first_occurred, last_occurred) VALUES (?, 1, ?, ?)`,
				)
				.run(errorCode, timestamp, timestamp);
		}
	}

	/**
	 * Record downtime incident
	 */
	private recordDowntime(
		errorCode: string,
		statusCode: number,
		reason: string,
	): void {
		// Check if there's an active downtime incident
		const activeIncident = this.db
			.prepare(
				`SELECT * FROM downtime_incidents WHERE resolved = 0 ORDER BY start_time DESC LIMIT 1`,
			)
			.get() as { id: string; start_time: number } | undefined;

		if (!activeIncident) {
			// Start new downtime incident
			const id = Bun.randomUUIDv7();
			this.db
				.prepare(
					`INSERT INTO downtime_incidents (id, start_time, error_code, status_code, reason, resolved) VALUES (?, ?, ?, ?, ?, 0)`,
				)
				.run(id, Date.now(), errorCode, statusCode, reason);
		}
	}

	/**
	 * Resolve downtime incident
	 */
	resolveDowntime(): void {
		const activeIncident = this.db
			.prepare(
				`SELECT * FROM downtime_incidents WHERE resolved = 0 ORDER BY start_time DESC LIMIT 1`,
			)
			.get() as { id: string; start_time: number } | undefined;

		if (activeIncident) {
			const endTime = Date.now();
			const duration = endTime - activeIncident.start_time;

			this.db
				.prepare(
					`UPDATE downtime_incidents SET end_time = ?, duration_ms = ?, resolved = 1 WHERE id = ?`,
				)
				.run(endTime, duration, activeIncident.id);
		}
	}

	/**
	 * Get error statistics
	 */
	getErrorStats(hours = 24): {
		totalErrors: number;
		byCode: Record<string, number>;
		byCategory: Record<string, number>;
		byStatus: Record<number, number>;
		recentErrors: Array<{
			code: string;
			message: string;
			timestamp: number;
			path?: string;
		}>;
	} {
		const cutoff = Date.now() - hours * 60 * 60 * 1000;

		const total = this.db
			.prepare(`SELECT COUNT(*) as count FROM error_log WHERE timestamp > ?`)
			.get(cutoff) as { count: number } | undefined;

		const byCode = this.db
			.prepare(
				`SELECT error_code, COUNT(*) as count FROM error_log WHERE timestamp > ? GROUP BY error_code ORDER BY count DESC`,
			)
			.all(cutoff) as Array<{ error_code: string; count: number }>;

		const byCategory = this.db
			.prepare(
				`SELECT category, COUNT(*) as count FROM error_log WHERE timestamp > ? GROUP BY category ORDER BY count DESC`,
			)
			.all(cutoff) as Array<{ category: string; count: number }>;

		const byStatus = this.db
			.prepare(
				`SELECT status_code, COUNT(*) as count FROM error_log WHERE timestamp > ? GROUP BY status_code ORDER BY count DESC`,
			)
			.all(cutoff) as Array<{ status_code: number; count: number }>;

		const recentErrors = this.db
			.prepare(
				`SELECT error_code, message, timestamp, path FROM error_log WHERE timestamp > ? ORDER BY timestamp DESC LIMIT 50`,
			)
			.all(cutoff) as Array<{
			error_code: string;
			message: string;
			timestamp: number;
			path?: string;
		}>;

		return {
			totalErrors: total?.count || 0,
			byCode: Object.fromEntries(byCode.map((e) => [e.error_code, e.count])),
			byCategory: Object.fromEntries(
				byCategory.map((e) => [e.category, e.count]),
			),
			byStatus: Object.fromEntries(
				byStatus.map((e) => [e.status_code, e.count]),
			),
			recentErrors: recentErrors.map((e) => ({
				code: e.error_code,
				message: e.message,
				timestamp: e.timestamp,
				path: e.path,
			})),
		};
	}

	/**
	 * Get downtime incidents
	 */
	getDowntimeIncidents(days = 30): Array<{
		id: string;
		startTime: number;
		endTime?: number;
		durationMs?: number;
		errorCode: string;
		statusCode: number;
		reason: string;
		resolved: boolean;
	}> {
		const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

		const incidents = this.db
			.prepare(
				`SELECT * FROM downtime_incidents WHERE start_time > ? ORDER BY start_time DESC`,
			)
			.all(cutoff) as Array<{
			id: string;
			start_time: number;
			end_time?: number;
			duration_ms?: number;
			error_code: string;
			status_code: number;
			reason: string;
			resolved: number;
		}>;

		return incidents.map((inc) => ({
			id: inc.id,
			startTime: inc.start_time,
			endTime: inc.end_time,
			durationMs: inc.duration_ms,
			errorCode: inc.error_code,
			statusCode: inc.status_code,
			reason: inc.reason,
			resolved: inc.resolved === 1,
		}));
	}

	/**
	 * Get downtime summary
	 */
	getDowntimeSummary(days = 30): {
		totalIncidents: number;
		totalDowntimeMs: number;
		averageDowntimeMs: number;
		longestDowntimeMs: number;
		currentlyDown: boolean;
	} {
		const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

		const resolved = this.db
			.prepare(
				`SELECT COUNT(*) as count, SUM(duration_ms) as total FROM downtime_incidents WHERE resolved = 1 AND start_time > ?`,
			)
			.get(cutoff) as { count: number; total: number } | undefined;

		const longest = this.db
			.prepare(
				`SELECT MAX(duration_ms) as max FROM downtime_incidents WHERE resolved = 1 AND start_time > ?`,
			)
			.get(cutoff) as { max: number } | undefined;

		const active = this.db
			.prepare(
				`SELECT COUNT(*) as count FROM downtime_incidents WHERE resolved = 0`,
			)
			.get() as { count: number } | undefined;

		const totalIncidents = resolved?.count || 0;
		const totalDowntime = resolved?.total || 0;

		return {
			totalIncidents,
			totalDowntimeMs: totalDowntime,
			averageDowntimeMs:
				totalIncidents > 0 ? totalDowntime / totalIncidents : 0,
			longestDowntimeMs: longest?.max || 0,
			currentlyDown: (active?.count || 0) > 0,
		};
	}

	/**
	 * Close database connection
	 */
	close(): void {
		this.db.close();
	}
}

// Singleton instance
let tracker: ErrorTracker | null = null;

export function getErrorTracker(): ErrorTracker {
	if (!tracker) {
		tracker = new ErrorTracker();
	}
	return tracker;
}

export { ErrorTracker };
