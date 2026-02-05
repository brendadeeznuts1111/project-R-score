/**
 * @fileoverview Feature Flag Manager
 * @description Feature flag management with role-based and user-based flags
 * @module features/flags
 */

import { Database } from "bun:sqlite";
import { DATABASE_PATHS } from "../pipeline/constants";
import type { DataSource, PipelineUser } from "../pipeline/types";
import type { FeatureFlagConfig } from "./config";

/**
 * Feature Flag Manager
 *
 * Manages feature flags with support for:
 * - Role-based flags
 * - User-specific flags
 * - Gradual rollout (percentage-based)
 * - Time-based flags
 * - A/B testing assignments
 */
export class FeatureFlagManager {
	private db: Database;
	private flags: Map<string, FeatureFlagConfig> = new Map();
	private dataSources: DataSource[] = [];

	constructor(dbPath = DATABASE_PATHS.features) {
		this.db = new Database(dbPath);
		this.initialize();
	}

	/**
	 * Initialize database schema
	 */
	private initialize(): void {
		this.db.run(`
			CREATE TABLE IF NOT EXISTS feature_flags (
				id TEXT PRIMARY KEY,
				name TEXT UNIQUE NOT NULL,
				enabled BOOLEAN DEFAULT FALSE,
				rollout INTEGER DEFAULT 0,
				conditions_json TEXT,
				created_at INTEGER DEFAULT (unixepoch())
			)
		`);
	}

	/**
	 * Validate feature flag configuration
	 */
	private validateConfig(config: FeatureFlagConfig): void {
		// Validate rollout percentage
		if (config.rollout < 0 || config.rollout > 100) {
			throw new Error(
				`Invalid rollout percentage: ${config.rollout}. Must be between 0 and 100.`,
			);
		}

		// Validate conditions
		if (config.conditions.roles && !Array.isArray(config.conditions.roles)) {
			throw new Error("conditions.roles must be an array");
		}

		if (config.conditions.users && !Array.isArray(config.conditions.users)) {
			throw new Error("conditions.users must be an array");
		}

		if (config.conditions.timeRange) {
			const { start, end } = config.conditions.timeRange;
			if (typeof start !== "number" || typeof end !== "number") {
				throw new Error("timeRange.start and timeRange.end must be numbers");
			}
			if (start >= end) {
				throw new Error("timeRange.start must be less than timeRange.end");
			}
		}

		// Validate required fields
		if (!config.id || typeof config.id !== "string") {
			throw new Error("id must be a non-empty string");
		}

		if (!config.name || typeof config.name !== "string") {
			throw new Error("name must be a non-empty string");
		}
	}

	/**
	 * Register a feature flag
	 */
	registerFlag(config: FeatureFlagConfig): void {
		this.validateConfig(config);

		const stmt = this.db.prepare(`
			INSERT OR REPLACE INTO feature_flags (id, name, enabled, rollout, conditions_json)
			VALUES (?, ?, ?, ?, ?)
		`);

		stmt.run(
			config.id,
			config.name,
			config.enabled,
			config.rollout,
			JSON.stringify(config.conditions),
		);

		this.flags.set(config.id, config);
	}

	/**
	 * Check if a feature flag is enabled for a user
	 *
	 * Checks multiple conditions in order:
	 * 1. Global enabled state
	 * 2. Restrictive conditions (roles, users, time) - must pass before allowing
	 * 3. Rollout percentage check
	 * 4. User's explicit feature flags override (bypasses rollout but respects restrictive conditions)
	 *
	 * @param flag - Feature flag ID to check
	 * @param user - User to check flag for
	 * @returns True if flag is enabled for the user
	 */
	isEnabled(flag: string, user: PipelineUser): boolean {
		// Load flag from database if not cached
		if (!this.flags.has(flag)) {
			const stmt = this.db.prepare(`
				SELECT * FROM feature_flags WHERE id = ?
			`);
			const row = stmt.get(flag) as {
				id: string;
				name: string;
				enabled: boolean;
				rollout: number;
				conditions_json: string;
			} | null;

			if (!row) {
				return false; // Flag doesn't exist
			}

			let conditions;
			try {
				conditions = JSON.parse(row.conditions_json || "{}");
			} catch (e) {
				// Invalid JSON in conditions - treat as empty conditions
				conditions = {};
			}

			const config: FeatureFlagConfig = {
				id: row.id,
				name: row.name,
				enabled: row.enabled,
				rollout: Math.max(0, Math.min(100, row.rollout)), // Clamp rollout to 0-100
				conditions,
			};

			this.flags.set(flag, config);
		}

		const config = this.flags.get(flag)!;

		// 1. Check global enabled state
		if (!config.enabled) {
			return false;
		}

		// 2. Check restrictive conditions first (roles, users, time)
		// These must pass even if user has explicit flag override

		// 2a. Check role conditions
		if (config.conditions.roles && config.conditions.roles.length > 0) {
			if (!config.conditions.roles.includes(user.role)) {
				return false;
			}
		}

		// 2b. Check user-specific conditions
		if (config.conditions.users && config.conditions.users.length > 0) {
			if (!config.conditions.users.includes(user.id)) {
				return false;
			}
		}

		// 2c. Check time-based flags
		if (config.conditions.timeRange) {
			const now = Date.now();
			const { start, end } = config.conditions.timeRange;
			if (typeof start !== "number" || typeof end !== "number") {
				// Invalid time range - treat as disabled
				return false;
			}
			if (now < start || now > end) {
				return false;
			}
		}

		// 3. Check user's explicit feature flags override
		// If user explicitly has the flag, bypass rollout but still respect restrictive conditions above
		if (user.featureFlags?.includes(flag)) {
			return true;
		}

		// 4. Check rollout percentage (simple hash-based)
		// Only check if rollout is less than 100%
		if (config.rollout < 100) {
			const hash = this.hashUserId(user.id);
			const percentage = hash % 100;
			if (percentage >= config.rollout) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Get data sources that are enabled for a user based on feature flags
	 *
	 * @param user - User to get enabled sources for
	 * @returns Array of data sources that are enabled for the user
	 */
	getEnabledSources(user: PipelineUser): DataSource[] {
		return this.dataSources.filter((source) => {
			// Check if source has feature flag
			if (source.featureFlag) {
				return this.isEnabled(source.featureFlag, user);
			}
			return true; // No flag = always enabled
		});
	}

	/**
	 * Register data sources
	 */
	registerDataSources(sources: DataSource[]): void {
		this.dataSources = sources;
	}

	/**
	 * Hash user ID for consistent rollout
	 */
	private hashUserId(userId: string): number {
		let hash = 0;
		for (let i = 0; i < userId.length; i++) {
			const char = userId.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash);
	}

	/**
	 * Get all registered feature flags
	 */
	getAllFlags(): FeatureFlagConfig[] {
		const stmt = this.db.prepare(`
			SELECT * FROM feature_flags
		`);
		const rows = stmt.all() as {
			id: string;
			name: string;
			enabled: boolean;
			rollout: number;
			conditions_json: string;
		}[];

		return rows.map((row) => {
			let conditions;
			try {
				conditions = JSON.parse(row.conditions_json || "{}");
			} catch (e) {
				// Invalid JSON - return empty conditions
				conditions = {};
			}

			return {
				id: row.id,
				name: row.name,
				enabled: row.enabled,
				rollout: Math.max(0, Math.min(100, row.rollout)), // Clamp rollout to 0-100
				conditions,
			};
		});
	}

	/**
	 * Update a feature flag
	 */
	updateFlag(id: string, updates: Partial<FeatureFlagConfig>): void {
		const existing = this.flags.get(id);
		if (!existing) {
			throw new Error(`Feature flag ${id} not found`);
		}

		const updated: FeatureFlagConfig = {
			...existing,
			...updates,
			// Ensure id is preserved
			id: existing.id,
			// Merge conditions properly
			conditions: {
				...existing.conditions,
				...(updates.conditions || {}),
			},
		};

		this.registerFlag(updated);
	}

	/**
	 * Delete a feature flag
	 */
	deleteFlag(id: string): void {
		const stmt = this.db.prepare(`
			DELETE FROM feature_flags WHERE id = ?
		`);
		stmt.run(id);
		this.flags.delete(id);
	}

	/**
	 * Close database connection
	 */
	close(): void {
		this.db.close();
	}
}
