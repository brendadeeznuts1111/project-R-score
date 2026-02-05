/**
 * @fileoverview Usage Analytics
 * @description Track property access and API usage for analytics and billing
 * @module analytics/usage
 */

import type { SQLQueryBindings } from "bun:sqlite";
import { Database } from "bun:sqlite";
import { DATABASE_PATHS } from "../pipeline/constants";
import type { PipelineUser } from "../pipeline/types";
import type { Result } from "../types";
import { err, ok } from "../types";

/**
 * Usage event types
 */
export type UsageEventType =
	| "property_access"
	| "api_call"
	| "pipeline_processing"
	| "data_transformation";

/**
 * Database row types for type safety
 */
interface UsageEventRow {
	id: string;
	type: string;
	user_id: string;
	resource: string;
	namespace?: string;
	metadata_json?: string;
	timestamp: number;
	response_time?: number;
	success: number;
	error_message?: string;
	created_at: number;
}

interface SummaryRow {
	total_events: number;
	successful_events: number;
	avg_response_time?: number;
}

interface TypeCountRow {
	type: string;
	count: number;
}

interface UserCountRow {
	user_id: string;
	count: number;
}

interface ResourceCountRow {
	resource: string;
	count: number;
}

/**
 * Usage event data
 */
export interface UsageEvent {
	/** Unique event ID */
	id: string;
	/** Event type */
	type: UsageEventType;
	/** User who triggered the event */
	userId: string;
	/** Property or endpoint accessed */
	resource: string;
	/** Namespace (e.g., provider namespace) */
	namespace?: string;
	/** Additional metadata */
	metadata?: Record<string, unknown>;
	/** Timestamp */
	timestamp: number;
	/** Response time in milliseconds */
	responseTime?: number;
	/** Success status */
	success: boolean;
	/** Error message if failed */
	error?: string;
}

/**
 * Usage statistics
 */
export interface UsageStats {
	/** Total events */
	totalEvents: number;
	/** Events by type */
	eventsByType: Record<UsageEventType, number>;
	/** Events by user */
	eventsByUser: Record<string, number>;
	/** Events by resource */
	eventsByResource: Record<string, number>;
	/** Average response time */
	avgResponseTime: number;
	/** Success rate */
	successRate: number;
	/** Time range */
	timeRange: { start: number; end: number };
}

/**
 * Usage analytics tracker
 */
export class UsageTracker {
	private db: Database;
	private buffer: UsageEvent[] = [];
	private flushInterval: NodeJS.Timeout | null = null;

	constructor(dbPath = DATABASE_PATHS.usage) {
		this.db = new Database(dbPath);
		this.initialize();
		this.startFlushInterval();
	}

	/**
	 * Initialize database schema
	 */
	private initialize(): void {
		this.db.run(`
			CREATE TABLE IF NOT EXISTS usage_events (
				id TEXT PRIMARY KEY,
				type TEXT NOT NULL,
				user_id TEXT NOT NULL,
				resource TEXT NOT NULL,
				namespace TEXT,
				metadata_json TEXT,
				timestamp INTEGER NOT NULL,
				response_time INTEGER,
				success INTEGER NOT NULL,
				error_message TEXT,
				created_at INTEGER DEFAULT (unixepoch())
			)
		`);

		// Create indexes for efficient queries
		this.db.run(
			`CREATE INDEX IF NOT EXISTS idx_usage_events_type ON usage_events(type)`,
		);
		this.db.run(
			`CREATE INDEX IF NOT EXISTS idx_usage_events_user ON usage_events(user_id)`,
		);
		this.db.run(
			`CREATE INDEX IF NOT EXISTS idx_usage_events_resource ON usage_events(resource)`,
		);
		this.db.run(
			`CREATE INDEX IF NOT EXISTS idx_usage_events_timestamp ON usage_events(timestamp)`,
		);
	}

	/**
	 * Start periodic flush interval
	 */
	private startFlushInterval(): void {
		this.flushInterval = setInterval(() => {
			this.flushBuffer();
		}, 5000); // Flush every 5 seconds
	}

	/**
	 * Stop flush interval
	 */
	stop(): void {
		if (this.flushInterval) {
			clearInterval(this.flushInterval);
			this.flushInterval = null;
		}
		this.flushBuffer(); // Final flush
		this.db.close();
	}

	/**
	 * Track a usage event
	 */
	async trackEvent(
		event: Omit<UsageEvent, "id" | "timestamp">,
	): Promise<Result<void>> {
		try {
			const fullEvent: UsageEvent = {
				...event,
				id: `usage_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
				timestamp: Date.now(),
			};

			// Add to buffer for batch processing
			this.buffer.push(fullEvent);

			// Flush immediately if buffer is getting large
			if (this.buffer.length >= 100) {
				await this.flushBuffer();
			}

			return ok(undefined);
		} catch (error) {
			return err(
				error instanceof Error ? error : new Error("Failed to track event"),
			);
		}
	}

	/**
	 * Track property access
	 */
	async trackPropertyAccess(
		user: PipelineUser,
		propertyId: string,
		namespace: string,
		metadata?: Record<string, unknown>,
		responseTime?: number,
		success = true,
		error?: string,
	): Promise<Result<void>> {
		return this.trackEvent({
			type: "property_access",
			userId: user.id,
			resource: propertyId,
			namespace,
			metadata,
			responseTime,
			success,
			error,
		});
	}

	/**
	 * Track API call
	 */
	async trackApiCall(
		user: PipelineUser,
		endpoint: string,
		method: string,
		responseTime?: number,
		success = true,
		error?: string,
	): Promise<Result<void>> {
		return this.trackEvent({
			type: "api_call",
			userId: user.id,
			resource: `${method} ${endpoint}`,
			metadata: { method, endpoint },
			responseTime,
			success,
			error,
		});
	}

	/**
	 * Track pipeline processing
	 */
	async trackPipelineProcessing(
		user: PipelineUser,
		sourceId: string,
		stage: string,
		responseTime?: number,
		success = true,
		error?: string,
	): Promise<Result<void>> {
		return this.trackEvent({
			type: "pipeline_processing",
			userId: user.id,
			resource: sourceId,
			metadata: { stage },
			responseTime,
			success,
			error,
		});
	}

	/**
	 * Flush buffered events to database
	 */
	private async flushBuffer(): Promise<void> {
		if (this.buffer.length === 0) return;

		const events = [...this.buffer];
		this.buffer = [];

		try {
			const stmt = this.db.prepare(`
				INSERT INTO usage_events (
					id, type, user_id, resource, namespace, metadata_json,
					timestamp, response_time, success, error_message
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			`);

			for (const event of events) {
				stmt.run(
					event.id,
					event.type,
					event.userId,
					event.resource,
					event.namespace || null,
					event.metadata ? JSON.stringify(event.metadata) : null,
					event.timestamp,
					event.responseTime || null,
					event.success ? 1 : 0,
					event.error || null,
				);
			}
		} catch (error) {
			console.error("Failed to flush usage events:", error);
			// Re-add events to buffer for retry
			this.buffer.unshift(...events);
		}
	}

	/**
	 * Get usage statistics for a time range
	 */
	getUsageStats(
		startTime: number,
		endTime: number,
		userId?: string,
	): Result<UsageStats> {
		try {
			let query = `
				SELECT
					COUNT(*) as total_events,
					SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_events,
					AVG(response_time) as avg_response_time
				FROM usage_events
				WHERE timestamp BETWEEN ? AND ?
			`;
			const params: SQLQueryBindings[] = [startTime, endTime];

			if (userId) {
				query += " AND user_id = ?";
				params.push(userId);
			}

			const summaryRow = this.db.prepare(query).get(...params) as
				| SummaryRow
				| undefined;

			if (!summaryRow) {
				return err(
					new Error("No usage data found for the specified time range"),
				);
			}

			// Get events by type
			const typeQuery = `
				SELECT type, COUNT(*) as count
				FROM usage_events
				WHERE timestamp BETWEEN ? AND ?
				${userId ? "AND user_id = ?" : ""}
				GROUP BY type
			`;
			const typeRows = this.db
				.prepare(typeQuery)
				.all(...params) as TypeCountRow[];

			// Get events by user
			const userQuery = `
				SELECT user_id, COUNT(*) as count
				FROM usage_events
				WHERE timestamp BETWEEN ? AND ?
				GROUP BY user_id
			`;
			const userRows = this.db
				.prepare(userQuery)
				.all(startTime, endTime) as UserCountRow[];

			// Get events by resource
			const resourceQuery = `
				SELECT resource, COUNT(*) as count
				FROM usage_events
				WHERE timestamp BETWEEN ? AND ?
				${userId ? "AND user_id = ?" : ""}
				GROUP BY resource
				ORDER BY count DESC
				LIMIT 50
			`;
			const resourceRows = this.db
				.prepare(resourceQuery)
				.all(...params) as ResourceCountRow[];

			const eventsByType: Record<UsageEventType, number> = {
				property_access: 0,
				api_call: 0,
				pipeline_processing: 0,
				data_transformation: 0,
			};

			for (const row of typeRows) {
				eventsByType[row.type as UsageEventType] = row.count;
			}

			const eventsByUser: Record<string, number> = {};
			for (const row of userRows) {
				eventsByUser[row.user_id] = row.count;
			}

			const eventsByResource: Record<string, number> = {};
			for (const row of resourceRows) {
				eventsByResource[row.resource] = row.count;
			}

			const stats: UsageStats = {
				totalEvents: summaryRow.total_events || 0,
				eventsByType,
				eventsByUser,
				eventsByResource,
				avgResponseTime: summaryRow.avg_response_time || 0,
				successRate:
					summaryRow.total_events > 0
						? (summaryRow.successful_events / summaryRow.total_events) * 100
						: 0,
				timeRange: { start: startTime, end: endTime },
			};

			return ok(stats);
		} catch (error) {
			return err(
				error instanceof Error ? error : new Error("Failed to get usage stats"),
			);
		}
	}

	/**
	 * Get recent events
	 */
	getRecentEvents(limit = 100, userId?: string): Result<UsageEvent[]> {
		try {
			const query = `
				SELECT * FROM usage_events
				WHERE 1=1
				${userId ? "AND user_id = ?" : ""}
				ORDER BY timestamp DESC
				LIMIT ?
			`;
			const params: SQLQueryBindings[] = [];

			if (userId) {
				params.push(userId);
			}
			params.push(limit);

			const rows = this.db.prepare(query).all(...params) as UsageEventRow[];

			const events: UsageEvent[] = rows.map((row) => ({
				id: row.id,
				type: row.type as UsageEventType,
				userId: row.user_id,
				resource: row.resource,
				namespace: row.namespace,
				metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
				timestamp: row.timestamp,
				responseTime: row.response_time,
				success: row.success === 1,
				error: row.error_message,
			}));

			return ok(events);
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error("Failed to get recent events"),
			);
		}
	}
}

/**
 * Global usage tracker instance
 */
let globalUsageTracker: UsageTracker | null = null;

/**
 * Get or create the global usage tracker
 */
export function getUsageTracker(): UsageTracker {
	if (!globalUsageTracker) {
		globalUsageTracker = new UsageTracker();
	}
	return globalUsageTracker;
}

/**
 * Cleanup function for graceful shutdown
 */
export function cleanupUsageTracker(): void {
	if (globalUsageTracker) {
		globalUsageTracker.stop();
		globalUsageTracker = null;
	}
}
