/**
 * @fileoverview Transformation Stage
 * @description Normalize raw data to canonical format with ORCA UUIDs
 * @module pipeline/stages/transformation
 */

import { ORCA_NAMESPACE } from "../../orca/namespace";
import { PropertyRegistry } from "../../properties/registry";
import type { CanonicalData, DataSource, RawData } from "../types";
import type { Result } from "../../types";
import { err, ok } from "../../types";

/**
 * Data transformation stage for normalizing raw data to canonical format
 *
 * Responsibilities:
 * - Extract properties from raw data based on registered property definitions
 * - Generate ORCA UUIDs for canonical identifiers
 * - Normalize formats (numbers, dates, etc.)
 * - Validate against property schemas from registry
 */
export class DataTransformationStage {
	private propertyRegistry?: PropertyRegistry;

	/**
	 * Set the property registry for schema validation and property extraction
	 */
	setPropertyRegistry(registry: PropertyRegistry): void {
		this.propertyRegistry = registry;
	}

	/**
	 * Transform raw data to canonical format
	 */
	async transform(
		rawData: RawData,
		source: DataSource,
		propertySchema?: unknown,
	): Promise<Result<CanonicalData>> {
		try {
			// 1. Extract properties from raw data
			const properties = this.extractProperties(rawData.data, source);

			// 2. Generate ORCA UUIDs for canonical identifiers
			const canonicalIds = this.generateCanonicalIds(
				rawData,
				source,
				properties,
			);

			// 3. Normalize formats
			const normalized = this.normalizeFormats(properties, source);

			// 4. Validate against property schemas from registry
			if (this.propertyRegistry && source.namespace) {
				const validationResult = this.validateAgainstRegistry(
					normalized,
					source,
				);
				if (!validationResult.ok) {
					return validationResult;
				}
			} else if (propertySchema) {
				// Fallback to provided schema validation
				const validationResult = this.validateSchema(
					normalized,
					propertySchema,
				);
				if (!validationResult.ok) {
					return validationResult;
				}
			}

			const canonicalData: CanonicalData = {
				source,
				properties: normalized,
				canonicalIds,
				timestamp: rawData.timestamp,
				metadata: {
					...rawData.metadata,
					transformedAt: new Date().toISOString(),
				},
			};

			return ok(canonicalData);
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`Transformation failed: ${String(error)}`),
			);
		}
	}

	/**
	 * Extract properties from raw data based on registered property definitions
	 */
	private extractProperties(
		data: unknown,
		source: DataSource,
	): Record<string, unknown> {
		const properties: Record<string, unknown> = {};

		if (typeof data !== "object" || data === null) {
			return properties;
		}

		const obj = data as Record<string, unknown>;

		// If we have a property registry, use registered properties for extraction
		if (this.propertyRegistry && source.namespace) {
			const registeredProperties = this.propertyRegistry.query({
				namespace: source.namespace,
			});

			// Extract properties that are registered for this source
			for (const propDef of registeredProperties) {
				if (propDef.id in obj) {
					properties[propDef.id] = obj[propDef.id];
					// Track usage of this property
					this.propertyRegistry.trackUsage(propDef.id, source.namespace, undefined, "pipeline-transformation");
				}
			}
		} else {
			// Fallback: Extract common properties based on source type (legacy behavior)
			switch (source.type) {
				case "sportsbook": {
					// Extract odds, lines, volume from sportsbook data
					if ("odds" in obj) properties.odds = obj.odds;
					if ("line" in obj) properties.line = obj.line;
					if ("volume" in obj) properties.volume = obj.volume;
					if ("bookmaker" in obj) properties.bookmaker = obj.bookmaker;
					if ("marketType" in obj) properties.marketType = obj.marketType;
					break;
				}

				case "exchange": {
					// Extract price, volume, side from exchange data
					if ("price" in obj) properties.price = obj.price;
					if ("amount" in obj) properties.amount = obj.amount;
					if ("side" in obj) properties.side = obj.side;
					if ("symbol" in obj) properties.symbol = obj.symbol;
					break;
				}

				case "market": {
					// Extract question, outcomes, prices from prediction market data
					if ("question" in obj) properties.question = obj.question;
					if ("outcomes" in obj) properties.outcomes = obj.outcomes;
					if ("prices" in obj) properties.prices = obj.prices;
					if ("volume" in obj) properties.volume = obj.volume;
					break;
				}

				default: {
					// Generic extraction - include all top-level properties
					Object.assign(properties, obj);
				}
			}
		}

		return properties;
	}

	/**
	 * Generate canonical IDs using ORCA UUIDv5
	 */
	private generateCanonicalIds(
		rawData: RawData,
		source: DataSource,
		properties: Record<string, unknown>,
	): Record<string, string> {
		const canonicalIds: Record<string, string> = {};

		// Generate source-level canonical ID
		const sourceKey = `${source.id}-${source.name}-${rawData.timestamp}`;
		canonicalIds.sourceId = Bun.randomUUIDv5(sourceKey, ORCA_NAMESPACE);

		// Generate event/market IDs based on source type
		if (source.type === "sportsbook") {
			// For sportsbooks, generate event/market/selection IDs
			if (properties.sport && properties.homeTeam && properties.awayTeam) {
				const eventKey = `${properties.sport}-${properties.homeTeam}-${properties.awayTeam}-${properties.startTime || rawData.timestamp}`;
				canonicalIds.eventId = Bun.randomUUIDv5(
					String(eventKey).toLowerCase(),
					ORCA_NAMESPACE,
				);
			}

			if (canonicalIds.eventId && properties.marketType) {
				const marketKey = `${canonicalIds.eventId}-${properties.marketType}-${properties.period || "full"}-${properties.line || ""}`;
				canonicalIds.marketId = Bun.randomUUIDv5(
					marketKey.toLowerCase(),
					ORCA_NAMESPACE,
				);
			}
		} else if (source.type === "exchange") {
			// For exchanges, generate symbol-based IDs
			if (properties.symbol) {
				const symbolKey = `${source.id}-${properties.symbol}`;
				canonicalIds.symbolId = Bun.randomUUIDv5(
					symbolKey.toLowerCase(),
					ORCA_NAMESPACE,
				);
			}
		} else if (source.type === "market") {
			// For prediction markets, generate market IDs
			if (properties.question || properties.id) {
				const marketKey = `${source.id}-${properties.question || properties.id}`;
				canonicalIds.marketId = Bun.randomUUIDv5(
					String(marketKey).toLowerCase(),
					ORCA_NAMESPACE,
				);
			}
		}

		return canonicalIds;
	}

	/**
	 * Normalize formats (e.g., convert strings to numbers, standardize dates)
	 */
	private normalizeFormats(
		properties: Record<string, unknown>,
		source: DataSource,
	): Record<string, unknown> {
		const normalized: Record<string, unknown> = { ...properties };

		// Normalize numeric properties
		for (const [key, value] of Object.entries(normalized)) {
			if (typeof value === "string") {
				// Try to parse numbers
				if (
					key.includes("price") ||
					key.includes("odds") ||
					key.includes("line")
				) {
					const num = Number.parseFloat(value);
					if (!Number.isNaN(num)) {
						normalized[key] = num;
					}
				}
				// Normalize timestamps
				if (key.includes("time") || key.includes("date")) {
					const date = new Date(value);
					if (!Number.isNaN(date.getTime())) {
						normalized[key] = date.toISOString();
					}
				}
			}
		}

		return normalized;
	}

	/**
	 * Validate data against property schemas from registry
	 */
	private validateAgainstRegistry(
		data: Record<string, unknown>,
		source: DataSource,
	): Result<void> {
		if (!this.propertyRegistry || !source.namespace) {
			return ok(undefined);
		}

		// Get all registered properties for this source
		const registeredProperties = this.propertyRegistry.query({
			namespace: source.namespace,
		});

		// Validate each property that exists in the data
		for (const propDef of registeredProperties) {
			if (propDef.id in data) {
				const value = data[propDef.id];
				const validation = this.propertyRegistry.validate(propDef.id, value, source.namespace);
				if (!validation.valid) {
					return err(new Error(`Property ${propDef.id} validation failed: ${validation.errors?.join(", ")}`));
				}
			}
		}

		return ok(undefined);
	}

	/**
	 * Validate data against schema (basic implementation)
	 */
	private validateSchema(
		data: Record<string, unknown>,
		schema: unknown,
	): Result<void> {
		// Basic validation - can be extended with JSON Schema validation
		if (!schema || typeof schema !== "object") {
			return ok(undefined);
		}

		// For now, just check that required properties exist
		const schemaObj = schema as Record<string, unknown>;
		if (schemaObj.required && Array.isArray(schemaObj.required)) {
			const required = schemaObj.required as string[];
			for (const prop of required) {
				if (!(prop in data)) {
					return err(new Error(`Missing required property: ${prop}`));
				}
			}
		}

		return ok(undefined);
	}
}
