/**
 * @fileoverview Forensic Movement Logger Base Class
 * @module logging/forensic-movement-logger
 *
 * Base class for logging bookmaker API calls and line movements for forensic analysis.
 *
 * Provides core functionality for:
 * - Bookmaker API call logging to forensic database
 * - Standard `fetchCompressedOdds()` implementation
 * - Database schema management (`line_movement_audit_v2`)
 *
 * **Extended by**: {@link CorrectedForensicLogger} which adds URL entity parsing correction.
 */

import { Database } from "bun:sqlite";
import type { ForensicDatabase } from "./types";

// Re-export types for convenience
export type { ForensicDatabase } from "./types";

export interface BookmakerConfig {
	baseUrl: string;
	apiKey?: string;
	headers?: Record<string, string>;
}

export interface ForensicLoggerConfig {
	bookmakers: Map<string, BookmakerConfig>;
	dbPath?: string;
}

/**
 * Base class for forensic logging of bookmaker API calls
 *
 * This class provides the foundation for logging all bookmaker API interactions
 * to a forensic database for compliance and security auditing.
 *
 * **Key Features**:
 * - Logs all API calls with full URL, parameters, and response metadata
 * - Maintains immutable audit trail in SQLite database
 * - Provides `fetchCompressedOdds()` method for standard bookmaker API calls
 *
 * **Override Points**:
 * - `fetchCompressedOdds()` - Override to add custom validation/logging
 * - `getExpectedParameterCount()` - Override for custom parameter counting logic
 *
 * @example
 * ```typescript
 * const logger = new ForensicMovementLogger({
 *   bookmakers: new Map([
 *     ['bookmaker', { baseUrl: 'https://api.example.com' }]
 *   ])
 * });
 *
 * const odds = await logger.fetchCompressedOdds('bookmaker', 'event-123');
 * ```
 */
export class ForensicMovementLogger {
	protected config: ForensicLoggerConfig;
	protected db: ForensicDatabase;

	constructor(config: ForensicLoggerConfig) {
		this.config = config;
		this.db = new Database(config.dbPath || "./data/research.db", {
			create: true,
		});
		this.initializeDatabase();
	}

	/**
	 * Initialize forensic database schema
	 */
	protected initializeDatabase(): void {
		this.db.run(`
			CREATE TABLE IF NOT EXISTS line_movement_audit_v2 (
				auditId TEXT PRIMARY KEY,
				bookmaker TEXT NOT NULL,
				eventId TEXT NOT NULL,
				raw_url TEXT NOT NULL,
				parsed_params TEXT,
				response_status INTEGER,
				response_size INTEGER,
				timestamp INTEGER NOT NULL
			)
		`);

		this.db.run(`
			CREATE INDEX IF NOT EXISTS idx_bookmaker ON line_movement_audit_v2(bookmaker);
			CREATE INDEX IF NOT EXISTS idx_event ON line_movement_audit_v2(eventId);
			CREATE INDEX IF NOT EXISTS idx_timestamp ON line_movement_audit_v2(timestamp);
		`);
	}

	/**
	 * Fetch compressed odds from bookmaker API
	 * Override this method in subclasses to add custom validation
	 */
	async fetchCompressedOdds(bookmaker: string, eventId: string): Promise<any> {
		const bookmakerConfig = this.config.bookmakers.get(bookmaker);
		if (!bookmakerConfig) {
			throw new Error(`Bookmaker not configured: ${bookmaker}`);
		}

		const url = `${bookmakerConfig.baseUrl}/v2/events/${eventId}/odds`;

		try {
			const response = await fetch(url, {
				headers: bookmakerConfig.headers || {},
			});

			// Log the API call
			this.logApiCall({
				bookmaker,
				eventId,
				url,
				status: response.status,
				size: (await response.clone().arrayBuffer()).byteLength,
			});

			if (!response.ok) {
				throw new Error(`API call failed: ${response.status}`);
			}

			return await response.json();
		} catch (error) {
			// Log error
			this.logApiCall({
				bookmaker,
				eventId,
				url,
				status: 0,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Log API call to forensic database
	 */
	protected logApiCall(data: {
		bookmaker: string;
		eventId: string;
		url: string;
		status?: number;
		size?: number;
		error?: string;
	}): void {
		const auditId = Bun.randomUUIDv7();
		const parsedParams = new URL(data.url).searchParams.toString();

		this.db.run(
			`
			INSERT INTO line_movement_audit_v2 (
				auditId, bookmaker, eventId, raw_url, parsed_params,
				response_status, response_size, timestamp
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`,
			[
				auditId,
				data.bookmaker,
				data.eventId,
				data.url,
				parsedParams,
				data.status || null,
				data.size || null,
				Date.now(),
			],
		);
	}

	/**
	 * Get expected parameter count for a URL
	 * Override in subclasses for custom logic
	 */
	protected getExpectedParameterCount(url: string): number {
		// Default: count actual parameters (can be overridden)
		try {
			return [...new URL(url).searchParams].length;
		} catch {
			return 0;
		}
	}

	/**
	 * Close database connection
	 */
	close(): void {
		this.db.close();
	}
}
