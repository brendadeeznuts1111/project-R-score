/**
 * @fileoverview Data Source Registry
 * @description Registry for managing data source definitions and access
 * @module sources/registry
 */

import { Database } from "bun:sqlite";
import type { FeatureFlagManager } from "../features/flags";
import { DATABASE_PATHS } from "../pipeline/constants";
import type { DataSource, PipelineUser } from "../pipeline/types";
import type { RBACManager } from "../rbac/manager";
import type { DataSourceDefinition, PropertyReference } from "./types";

/**
 * Data Source Registry
 *
 * Manages registration and discovery of data sources with:
 * - Source definition storage
 * - RBAC-based access filtering
 * - Feature flag-based filtering
 * - Property registration integration
 */
export class DataSourceRegistry {
	private db: Database;
	private sources: Map<string, DataSourceDefinition> = new Map();
	private rbacManager?: RBACManager;
	private featureFlagManager?: FeatureFlagManager;

	constructor(dbPath = DATABASE_PATHS.sources) {
		this.db = new Database(dbPath);
		this.initialize();
	}

	/**
	 * Set RBAC manager
	 */
	setRBACManager(manager: RBACManager): void {
		this.rbacManager = manager;
	}

	/**
	 * Set feature flag manager
	 */
	setFeatureFlagManager(manager: FeatureFlagManager): void {
		this.featureFlagManager = manager;
	}

	/**
	 * Initialize database schema
	 */
	private initialize(): void {
		this.db.run(`
			CREATE TABLE IF NOT EXISTS data_sources (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				namespace TEXT NOT NULL,
				version TEXT NOT NULL,
				type TEXT NOT NULL,
				package_name TEXT,
				package_version TEXT,
				properties_json TEXT,
				pipeline_config_json TEXT,
				access_control_json TEXT,
				metadata_json TEXT,
				feature_flag TEXT,
				enabled BOOLEAN DEFAULT TRUE,
				created_at INTEGER DEFAULT (unixepoch()),
				UNIQUE(namespace, version)
			)
		`);
	}

	/**
	 * Register a new data source
	 */
	async register(source: DataSourceDefinition): Promise<void> {
		// 1. Validate source definition
		this.validateSource(source);

		// 2. Store in database
		const stmt = this.db.prepare(`
			INSERT OR REPLACE INTO data_sources 
			(id, name, namespace, version, type, package_name, package_version, 
			 properties_json, pipeline_config_json, access_control_json, metadata_json, feature_flag, enabled)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		stmt.run(
			source.id,
			source.name,
			source.namespace,
			source.version,
			source.type,
			source.package.name,
			source.package.version,
			JSON.stringify(source.properties),
			JSON.stringify(source.pipeline),
			JSON.stringify(source.accessControl),
			JSON.stringify(source.metadata),
			source.accessControl.featureFlag || null,
			true,
		);

		// 3. Cache the source
		this.sources.set(source.id, source);

		// 4. Register properties (would integrate with PropertyRegistry)
		// 5. Set up pipeline stages (would integrate with PipelineOrchestrator)
		// 6. Configure RBAC scopes (would integrate with RBACManager)
		// 7. Enable feature flag (would integrate with FeatureFlagManager)
	}

	/**
	 * Validate source definition
	 */
	private validateSource(source: DataSourceDefinition): void {
		if (!source.id || !source.name || !source.namespace || !source.version) {
			throw new Error("Source must have id, name, namespace, and version");
		}

		if (!["sportsbook", "exchange", "market"].includes(source.type)) {
			throw new Error(`Invalid source type: ${source.type}`);
		}

		if (!source.package || !source.package.name || !source.package.version) {
			throw new Error("Source must have package name and version");
		}
	}

	/**
	 * Get data sources that are enabled for a user
	 *
	 * Filters sources based on:
	 * - RBAC permissions (user's role data scopes)
	 * - Feature flags (if source has a feature flag)
	 * - Source enabled status
	 *
	 * @param user - User to get enabled sources for
	 * @returns Array of data sources the user can access
	 */
	getEnabledSources(user: PipelineUser): DataSource[] {
		// Load all sources from database if not cached
		if (this.sources.size === 0) {
			this.loadAllSources();
		}

		return Array.from(this.sources.values())
			.filter((source) => {
				// Check if source is enabled
				if (!source.accessControl) {
					return false;
				}

				// RBAC check
				if (this.rbacManager) {
					const dataSource: DataSource = {
						id: source.id,
						name: source.name,
						type: source.type,
						namespace: source.namespace,
						version: source.version,
						featureFlag: source.accessControl.featureFlag,
					};

					if (!this.rbacManager.canAccess(user, dataSource)) {
						return false;
					}
				}

				// Feature flag check
				if (source.accessControl.featureFlag && this.featureFlagManager) {
					if (
						!this.featureFlagManager.isEnabled(
							source.accessControl.featureFlag,
							user,
						)
					) {
						return false;
					}
				}

				return true;
			})
			.map((source) => ({
				id: source.id,
				name: source.name,
				type: source.type,
				namespace: source.namespace,
				version: source.version,
				featureFlag: source.accessControl.featureFlag,
			}));
	}

	/**
	 * Load all sources from database
	 */
	private loadAllSources(): void {
		const stmt = this.db.prepare(`
			SELECT * FROM data_sources WHERE enabled = TRUE
		`);

		const rows = stmt.all() as Array<{
			id: string;
			name: string;
			namespace: string;
			version: string;
			type: string;
			package_name: string;
			package_version: string;
			properties_json: string;
			pipeline_config_json: string;
			access_control_json: string;
			metadata_json: string;
			feature_flag: string | null;
		}>;

		for (const row of rows) {
			const source: DataSourceDefinition = {
				id: row.id,
				name: row.name,
				namespace: row.namespace,
				version: row.version,
				type: row.type as DataSourceDefinition["type"],
				package: {
					name: row.package_name,
					version: row.package_version,
					entry: "./index", // Default entry
				},
				properties: JSON.parse(row.properties_json || "[]"),
				pipeline: JSON.parse(row.pipeline_config_json || "{}"),
				accessControl: JSON.parse(row.access_control_json || "{}"),
				metadata: JSON.parse(row.metadata_json || "{}"),
			};

			this.sources.set(source.id, source);
		}
	}

	/**
	 * Get all registered sources (without user filtering)
	 * Returns all enabled sources from the database
	 */
	getAllSources(): DataSourceDefinition[] {
		const stmt = this.db.prepare(`
			SELECT * FROM data_sources WHERE enabled = TRUE ORDER BY name
		`);

		const rows = stmt.all() as Array<{
			id: string;
			name: string;
			namespace: string;
			version: string;
			type: string;
			package_name: string;
			package_version: string;
			properties_json: string;
			pipeline_config_json: string;
			access_control_json: string;
			metadata_json: string;
			feature_flag: string | null;
		}>;

		return rows.map((row) => {
			const source: DataSourceDefinition = {
				id: row.id,
				name: row.name,
				namespace: row.namespace,
				version: row.version,
				type: row.type as DataSourceDefinition["type"],
				package: {
					name: row.package_name,
					version: row.package_version,
					entry: "./index",
				},
				properties: JSON.parse(
					row.properties_json || "[]",
				) as PropertyReference[],
				pipeline: JSON.parse(
					row.pipeline_config_json || "{}",
				) as DataSourceDefinition["pipeline"],
				accessControl: JSON.parse(
					row.access_control_json || "{}",
				) as DataSourceDefinition["accessControl"],
				metadata: JSON.parse(
					row.metadata_json || "{}",
				) as DataSourceDefinition["metadata"],
			};
			return source;
		});
	}

	/**
	 * Get source by ID
	 */
	getSource(id: string): DataSourceDefinition | null {
		if (this.sources.has(id)) {
			return this.sources.get(id)!;
		}

		const stmt = this.db.prepare(`
			SELECT * FROM data_sources WHERE id = ?
		`);

		const row = stmt.get(id) as {
			id: string;
			name: string;
			namespace: string;
			version: string;
			type: string;
			package_name: string;
			package_version: string;
			properties_json: string;
			pipeline_config_json: string;
			access_control_json: string;
			metadata_json: string;
			feature_flag: string | null;
		} | null;

		if (!row) return null;

		const source: DataSourceDefinition = {
			id: row.id,
			name: row.name,
			namespace: row.namespace,
			version: row.version,
			type: row.type as DataSourceDefinition["type"],
			package: {
				name: row.package_name,
				version: row.package_version,
				entry: "./index",
			},
			properties: JSON.parse(
				row.properties_json || "[]",
			) as PropertyReference[],
			pipeline: JSON.parse(
				row.pipeline_config_json || "{}",
			) as DataSourceDefinition["pipeline"],
			accessControl: JSON.parse(
				row.access_control_json || "{}",
			) as DataSourceDefinition["accessControl"],
			metadata: JSON.parse(
				row.metadata_json || "{}",
			) as DataSourceDefinition["metadata"],
		};

		this.sources.set(source.id, source);
		return source;
	}

	/**
	 * Close database connection
	 */
	close(): void {
		this.db.close();
	}
}
