/**
 * @fileoverview Property Schema
 * @description Property definition types with versioning and lineage
 * @module properties/schema
 */

/**
 * Property type enumeration
 */
export type PropertyType = "number" | "string" | "boolean" | "object" | "array";

/**
 * JSON Schema type (simplified)
 */
export interface JSONSchema {
	type?: PropertyType | PropertyType[];
	properties?: Record<string, JSONSchema>;
	required?: string[];
	items?: JSONSchema;
	enum?: unknown[];
	minimum?: number;
	maximum?: number;
	pattern?: string;
	format?: string;
	description?: string;
}

/**
 * Property lineage tracking
 */
export interface PropertyLineage {
	sourceProperty: string; // Original property ID
	transformation: string; // "normalize", "aggregate", "calculate"
	timestamp: number;
	version: string;
}

/**
 * Property definition with versioning
 */
export interface PropertyDefinition {
	id: string; // "price", "odds", "volume"
	namespace: string; // "@orca/markets", "@nexus/arbitrage"
	version: string; // "1.2.0"
	type: PropertyType;
	schema: JSONSchema;
	metadata: {
		description: string;
		unit?: string; // "USD", "percentage", "ms"
		source: string; // Which data source provides this
		lineage: PropertyLineage[]; // Where this property comes from
		tags: string[]; // "financial", "real-time", "derived"
	};
	accessControl: {
		roles: string[]; // ["admin", "trader", "analyst"]
		featureFlags: string[]; // ["premium-data", "beta-features"]
	};
}

/**
 * Property filters for querying
 */
export interface PropertyFilters {
	namespace?: string;
	tags?: string[];
	roles?: string[];
	featureFlags?: string[];
	version?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
	valid: boolean;
	errors?: string[];
	warnings?: string[];
}
