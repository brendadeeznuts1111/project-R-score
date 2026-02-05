/**
 * @fileoverview Property Registry
 * @description Registry for property definitions with versioning and lineage tracking
 * @module properties/registry
 */

import { Database, SQLQueryBindings } from "bun:sqlite";
import { DATABASE_PATHS } from "../pipeline/constants";
import type { Result } from "../types";
import { err, ok } from "../types";
import type {
	PropertyDefinition,
	PropertyFilters,
	PropertyLineage,
	ValidationResult,
} from "./schema";

/**
 * Property registry for managing property definitions
 */
export class PropertyRegistry {
	private db: Database;
	private cache: Map<string, PropertyDefinition> = new Map();

	constructor(dbPath = DATABASE_PATHS.properties) {
		this.db = new Database(dbPath);
		this.initialize();
	}

	/**
	 * Initialize database schema
	 */
	private initialize(): void {
		// Property definitions table
		this.db.run(`
			CREATE TABLE IF NOT EXISTS property_definitions (
				id TEXT NOT NULL,
				namespace TEXT NOT NULL,
				version TEXT NOT NULL,
				type TEXT NOT NULL,
				schema_json TEXT NOT NULL,
				metadata_json TEXT NOT NULL,
				access_control_json TEXT NOT NULL,
				created_at INTEGER DEFAULT (unixepoch()),
				PRIMARY KEY (id, namespace, version)
			)
		`);

		// Property lineage table
		this.db.run(`
			CREATE TABLE IF NOT EXISTS property_lineage (
				property_id TEXT NOT NULL,
				namespace TEXT NOT NULL,
				source_property_id TEXT,
				transformation TEXT,
				version TEXT,
				timestamp INTEGER,
				FOREIGN KEY (property_id, namespace, version) 
					REFERENCES property_definitions(id, namespace, version)
			)
		`);

		// Property usage tracking
		this.db.run(`
			CREATE TABLE IF NOT EXISTS property_usage (
				property_id TEXT NOT NULL,
				namespace TEXT NOT NULL,
				user_id TEXT,
				endpoint TEXT,
				count INTEGER DEFAULT 0,
				last_used INTEGER,
				FOREIGN KEY (property_id, namespace) 
					REFERENCES property_definitions(id, namespace)
			)
		`);

		// Create indexes
		this.db.run(`
			CREATE INDEX IF NOT EXISTS idx_property_id ON property_definitions(id)
		`);
		this.db.run(`
			CREATE INDEX IF NOT EXISTS idx_property_namespace ON property_definitions(namespace)
		`);
		this.db.run(`
			CREATE INDEX IF NOT EXISTS idx_lineage_property ON property_lineage(property_id)
		`);
		this.db.run(`
			CREATE INDEX IF NOT EXISTS idx_usage_property ON property_usage(property_id)
		`);
	}

	/**
	 * Register a property definition
	 */
	register(definition: PropertyDefinition): Result<void> {
		try {
			// Store in SQLite with versioning
			const stmt = this.db.prepare(`
				INSERT OR REPLACE INTO property_definitions 
				(id, namespace, version, type, schema_json, metadata_json, access_control_json)
				VALUES (?, ?, ?, ?, ?, ?, ?)
			`);

			stmt.run(
				definition.id,
				definition.namespace,
				definition.version,
				definition.type,
				JSON.stringify(definition.schema),
				JSON.stringify(definition.metadata),
				JSON.stringify(definition.accessControl),
			);

			// Store lineage
			if (definition.metadata.lineage.length > 0) {
				const lineageStmt = this.db.prepare(`
					INSERT INTO property_lineage 
					(property_id, namespace, source_property_id, transformation, version, timestamp)
					VALUES (?, ?, ?, ?, ?, ?)
				`);

				for (const lineage of definition.metadata.lineage) {
					lineageStmt.run(
						definition.id,
						definition.namespace,
						lineage.sourceProperty,
						lineage.transformation,
						lineage.version,
						lineage.timestamp,
					);
				}
			}

			// Cache the definition
			const cacheKey = `${definition.namespace}:${definition.id}:${definition.version}`;
			this.cache.set(cacheKey, definition);

			return ok(undefined);
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`Failed to register property: ${String(error)}`),
			);
		}
	}

	/**
	 * Get property schema for validation
	 */
	getSchema(
		propertyId: string,
		namespace?: string,
		version?: string,
	): PropertyDefinition | null {
		// Check cache first
		if (namespace && version) {
			const cacheKey = `${namespace}:${propertyId}:${version}`;
			const cached = this.cache.get(cacheKey);
			if (cached) return cached;
		}

		// Query database
		let query = `
			SELECT * FROM property_definitions
			WHERE id = ?
		`;
		const params: SQLQueryBindings[] = [propertyId];

		if (namespace) {
			query += ` AND namespace = ?`;
			params.push(namespace);
		}

		if (version) {
			query += ` AND version = ?`;
			params.push(version);
		} else {
			// Get latest version
			query += ` ORDER BY version DESC LIMIT 1`;
		}

		const stmt = this.db.prepare(query);
		const row = stmt.get(...params) as {
			id: string;
			namespace: string;
			version: string;
			type: string;
			schema_json: string;
			metadata_json: string;
			access_control_json: string;
		} | null;

		if (!row) return null;

		const definition: PropertyDefinition = {
			id: row.id,
			namespace: row.namespace,
			version: row.version,
			type: row.type as PropertyDefinition["type"],
			schema: JSON.parse(row.schema_json),
			metadata: JSON.parse(row.metadata_json),
			accessControl: JSON.parse(row.access_control_json),
		};

		// Cache it
		const cacheKey = `${definition.namespace}:${definition.id}:${definition.version}`;
		this.cache.set(cacheKey, definition);

		return definition;
	}

	/**
	 * Validate data against property schema
	 */
	validate(
		propertyId: string,
		data: unknown,
		namespace?: string,
	): ValidationResult {
		const definition = this.getSchema(propertyId, namespace);
		if (!definition) {
			return {
				valid: false,
				errors: [`Property ${propertyId} not found`],
			};
		}

		return this.validateAgainstSchema(data, definition.schema);
	}

	/**
	 * Validate data against JSON Schema
	 */
	private validateAgainstSchema(
		data: unknown,
		schema: PropertyDefinition["schema"],
	): ValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		// Basic type validation
		if (schema.type) {
			const types = Array.isArray(schema.type) ? schema.type : [schema.type];
			const dataType = Array.isArray(data)
				? "array"
				: data === null
					? "null"
					: typeof data;

			if (!types.includes(dataType as PropertyDefinition["type"])) {
				errors.push(`Expected type ${types.join(" or ")}, got ${dataType}`);
			}
		}

		// Required fields validation
		if (schema.required && typeof data === "object" && data !== null) {
			const obj = data as Record<string, unknown>;
			for (const field of schema.required) {
				if (!(field in obj)) {
					errors.push(`Missing required field: ${field}`);
				}
			}
		}

		// Properties validation
		if (schema.properties && typeof data === "object" && data !== null) {
			const obj = data as Record<string, unknown>;
			for (const [key, propSchema] of Object.entries(schema.properties)) {
				if (key in obj) {
					const result = this.validateAgainstSchema(obj[key], propSchema);
					if (!result.valid) {
						errors.push(...(result.errors || []).map((e) => `${key}.${e}`));
					}
					if (result.warnings) {
						warnings.push(...result.warnings.map((w) => `${key}.${w}`));
					}
				}
			}
		}

		// Array items validation
		if (schema.items && Array.isArray(data)) {
			for (let i = 0; i < data.length; i++) {
				const result = this.validateAgainstSchema(data[i], schema.items);
				if (!result.valid) {
					errors.push(...(result.errors || []).map((e) => `[${i}].${e}`));
				}
			}
		}

		// Number range validation
		if (schema.minimum !== undefined && typeof data === "number") {
			if (data < schema.minimum) {
				errors.push(`Value ${data} is less than minimum ${schema.minimum}`);
			}
		}
		if (schema.maximum !== undefined && typeof data === "number") {
			if (data > schema.maximum) {
				errors.push(`Value ${data} is greater than maximum ${schema.maximum}`);
			}
		}

		// Enum validation
		if (schema.enum && !schema.enum.includes(data)) {
			errors.push(`Value must be one of: ${schema.enum.join(", ")}`);
		}

		return {
			valid: errors.length === 0,
			errors: errors.length > 0 ? errors : undefined,
			warnings: warnings.length > 0 ? warnings : undefined,
		};
	}

	/**
	 * Get property lineage
	 */
	getLineage(propertyId: string, namespace?: string): PropertyLineage[] {
		let query = `
			SELECT * FROM property_lineage WHERE property_id = ?
		`;
		const params: SQLQueryBindings[] = [propertyId];

		if (namespace) {
			query += ` AND namespace = ?`;
			params.push(namespace);
		}

		const stmt = this.db.prepare(query);
		const rows = stmt.all(...params) as Array<{
			source_property_id: string | null;
			transformation: string | null;
			version: string | null;
			timestamp: number | null;
		}>;

		return rows.map((row) => ({
			sourceProperty: row.source_property_id || "",
			transformation: row.transformation || "",
			timestamp: row.timestamp || Date.now(),
			version: row.version || "1.0.0",
		}));
	}

	/**
	 * Query properties by filters
	 */
	query(filters: PropertyFilters): PropertyDefinition[] {
		let query = `SELECT * FROM property_definitions WHERE 1=1`;
		const params: SQLQueryBindings[] = [];

		if (filters.namespace) {
			query += ` AND namespace = ?`;
			params.push(filters.namespace);
		}

		if (filters.version) {
			query += ` AND version = ?`;
			params.push(filters.version);
		}

		const stmt = this.db.prepare(query);
		const rows = stmt.all(...params) as Array<{
			id: string;
			namespace: string;
			version: string;
			type: string;
			schema_json: string;
			metadata_json: string;
			access_control_json: string;
		}>;

		let definitions = rows.map((row) => ({
			id: row.id,
			namespace: row.namespace,
			version: row.version,
			type: row.type as PropertyDefinition["type"],
			schema: JSON.parse(row.schema_json),
			metadata: JSON.parse(row.metadata_json),
			accessControl: JSON.parse(row.access_control_json),
		}));

		// Filter by tags
		if (filters.tags && filters.tags.length > 0) {
			definitions = definitions.filter((def) =>
				filters.tags!.some((tag) => def.metadata.tags.includes(tag)),
			);
		}

		// Filter by roles
		if (filters.roles && filters.roles.length > 0) {
			definitions = definitions.filter((def) =>
				filters.roles!.some((role) => def.accessControl.roles.includes(role)),
			);
		}

		// Filter by feature flags
		if (filters.featureFlags && filters.featureFlags.length > 0) {
			definitions = definitions.filter((def) =>
				filters.featureFlags!.some((flag) =>
					def.accessControl.featureFlags.includes(flag),
				),
			);
		}

		return definitions;
	}

	/**
	 * Track property usage
	 */
	trackUsage(
		propertyId: string,
		namespace: string,
		userId?: string,
		endpoint?: string,
	): void {
		const stmt = this.db.prepare(`
			INSERT INTO property_usage (property_id, namespace, user_id, endpoint, count, last_used)
			VALUES (?, ?, ?, ?, 1, ?)
			ON CONFLICT(property_id, namespace, user_id, endpoint) 
			DO UPDATE SET count = count + 1, last_used = ?
		`);

		const now = Date.now();
		stmt.run(propertyId, namespace, userId || null, endpoint || null, now, now);
	}

	/**
	 * Close database connection
	 */
	close(): void {
		this.db.close();
	}
}
