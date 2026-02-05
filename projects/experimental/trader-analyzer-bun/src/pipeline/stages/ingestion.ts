/**
 * @fileoverview Ingestion Stage
 * @description Raw data ingestion from providers with feature flag checks and rate limiting
 * @module pipeline/stages/ingestion
 */

import { Database } from "bun:sqlite";
import { err, ok } from "../../types";
import { DATABASE_PATHS, DEFAULT_RATE_LIMIT } from "../constants";
import type {
	DataSource,
	FeatureFlagManagerAdapter,
	IngestionResult,
	PipelineUser,
	RawData,
	Result,
} from "../types";

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
	/** Maximum requests per window */
	maxRequests: number;
	/** Window duration in milliseconds */
	windowMs: number;
}

/**
 * Data ingestion stage for raw data collection from providers
 *
 * Responsibilities:
 * - Validate source is enabled (feature flag check)
 * - Rate limit enforcement
 * - Store raw data with metadata
 * - Emit ingestion events
 */
export class DataIngestionStage {
	private db: Database;
	private rateLimitMap: Map<string, { count: number; resetAt: number }> =
		new Map();
	private rateLimitConfig: RateLimitConfig;

	constructor(
		dbPath = DATABASE_PATHS.pipeline,
		rateLimitConfig?: Partial<RateLimitConfig>,
	) {
		this.db = new Database(dbPath);
		this.rateLimitConfig = {
			maxRequests:
				rateLimitConfig?.maxRequests ?? DEFAULT_RATE_LIMIT.maxRequests,
			windowMs: rateLimitConfig?.windowMs ?? DEFAULT_RATE_LIMIT.windowMs,
		};
		this.initialize();
	}

	/**
	 * Initialize database schema for raw data storage
	 */
	private initialize(): void {
		this.db.run(`
			CREATE TABLE IF NOT EXISTS raw_data (
				id TEXT PRIMARY KEY,
				source_id TEXT NOT NULL,
				source_name TEXT NOT NULL,
				source_type TEXT NOT NULL,
				data_json TEXT NOT NULL,
				timestamp INTEGER NOT NULL,
				metadata_json TEXT,
				created_at INTEGER DEFAULT (unixepoch())
			)
		`);

		this.db.run(`
			CREATE INDEX IF NOT EXISTS idx_raw_data_source ON raw_data(source_id)
		`);

		this.db.run(`
			CREATE INDEX IF NOT EXISTS idx_raw_data_timestamp ON raw_data(timestamp)
		`);
	}

	/**
	 * Ingest raw data from a data source
	 *
	 * @param source - Data source metadata
	 * @param rawData - Raw data payload to ingest
	 * @param featureFlagManager - Optional feature flag manager for source validation
	 * @param user - Optional user context for feature flag checks
	 * @returns Result containing ingestion result or error
	 */
	async ingest(
		source: DataSource,
		rawData: unknown,
		featureFlagManager?: FeatureFlagManagerAdapter,
		user?: PipelineUser,
	): Promise<Result<IngestionResult>> {
		try {
			// 1. Validate source is enabled (feature flag check)
			if (source.featureFlag && featureFlagManager && user) {
				if (!featureFlagManager.isEnabled(source.featureFlag, user)) {
					return err(
						new Error(
							`Data source ${source.id} is disabled by feature flag ${source.featureFlag}`,
						),
					);
				}
			}

			// 2. Rate limit check
			const rateLimitResult = this.checkRateLimit(source.id);
			if (!rateLimitResult.ok) {
				return rateLimitResult;
			}

			// 3. Store raw data with metadata
			const rawDataRecord: RawData = {
				source,
				data: rawData,
				timestamp: Date.now(),
				metadata: {
					ingestedAt: new Date().toISOString(),
				},
			};

			const id = Bun.randomUUIDv7();
			const stmt = this.db.prepare(`
				INSERT INTO raw_data (id, source_id, source_name, source_type, data_json, timestamp, metadata_json)
				VALUES (?, ?, ?, ?, ?, ?, ?)
			`);

			stmt.run(
				id,
				source.id,
				source.name,
				source.type,
				JSON.stringify(rawData),
				rawDataRecord.timestamp,
				JSON.stringify(rawDataRecord.metadata || {}),
			);

			// 4. Emit ingestion event (could be extended with event emitter)
			const result: IngestionResult = {
				success: true,
				rawData: rawDataRecord,
				storedAt: new Date().toISOString(),
				metadata: {
					storageId: id,
					source: source.id,
				},
			};

			return ok(result);
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`Ingestion failed: ${String(error)}`),
			);
		}
	}

	/**
	 * Check rate limit for a source
	 */
	private checkRateLimit(sourceId: string): Result<void> {
		const now = Date.now();
		const limit = this.rateLimitMap.get(sourceId);
		const { maxRequests, windowMs } = this.rateLimitConfig;

		if (!limit || now > limit.resetAt) {
			this.rateLimitMap.set(sourceId, {
				count: 1,
				resetAt: now + windowMs,
			});
			return ok(undefined);
		}

		if (limit.count >= maxRequests) {
			return err(
				new Error(
					`Rate limit exceeded for source ${sourceId}. Try again after ${new Date(limit.resetAt).toISOString()}`,
				),
			);
		}

		limit.count++;
		return ok(undefined);
	}

	/**
	 * Get raw data by ID
	 */
	getRawData(id: string): RawData | null {
		const stmt = this.db.prepare(`
			SELECT * FROM raw_data WHERE id = ?
		`);

		const row = stmt.get(id) as {
			id: string;
			source_id: string;
			source_name: string;
			source_type: string;
			data_json: string;
			timestamp: number;
			metadata_json: string;
		} | null;

		if (!row) return null;

		return {
			source: {
				id: row.source_id,
				name: row.source_name,
				type: row.source_type as DataSource["type"],
			},
			data: JSON.parse(row.data_json),
			timestamp: row.timestamp,
			metadata: JSON.parse(row.metadata_json || "{}"),
		};
	}

	/**
	 * Close database connection
	 */
	close(): void {
		this.db.close();
	}
}
