/**
 * @fileoverview Property Registry v17
 * @description 17.15.0.0.0.0.0 - RadianceTyped property registry queries
 * @module 17.15.0.0.0.0.0-radiance/registry.properties.17
 */

import { emitRadianceDiscovery17 } from "./emit.radiance.17";
import type { PropertyDefinition } from "./types.radiance.17";
import { ROUTING_REGISTRY_NAMES } from "../../utils/rss-constants";

/**
 * Query Properties Registry v17
 * 
 * @param filters - Optional filters for querying properties
 * @returns Array of PropertyDefinition items
 */
export async function queryPropertiesRegistry17(
	filters?: {
		namespace?: string;
		version?: string;
		validationMode?: "strict" | "lax" | "legacy";
	},
): Promise<PropertyDefinition[]> {
	// Import actual registry implementation
	const { PropertyRegistry } = await import("../../properties/registry");
	const registry = new PropertyRegistry();

	try {
		const props = registry.query ? registry.query(filters || {}) : [];
		
		// Transform to RadianceTyped PropertyDefinition
		return props.map((prop: any) => ({
			...prop,
			id: prop.id?.startsWith("prop_") ? prop.id : `prop_${prop.id}`,
			__category: ROUTING_REGISTRY_NAMES.PROPERTIES as const,
			__version: "17.15.0" as const,
			__radianceChannel: "radiance-properties" as const,
			__semanticType: "PropertyDefinition",
		})) as PropertyDefinition[];
	} finally {
		registry.close();
	}
}

/**
 * Mutate Properties Registry v17
 * 
 * @param property - Property definition to add/update
 */
export async function mutatePropertiesRegistry17(
	property: Omit<PropertyDefinition, "__category" | "__version" | "__radianceChannel" | "__semanticType">,
): Promise<void> {
	const { PropertyRegistry } = await import("../../properties/registry");
	const registry = new PropertyRegistry();

	try {
		// Use registry mutation methods
		if (registry.register) {
			await registry.register(property as any);
		}
	} finally {
		registry.close();
	}
}

/**
 * Validate Property Conformance v17
 * 
 * @param property - Property to validate
 * @returns Validation result
 */
export function validatePropertyConformance17(
	property: PropertyDefinition,
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (!property.id.startsWith("prop_")) {
		errors.push("Property ID must start with 'prop_'");
	}

	if (!property.version.match(/^v\d+\.\d+\.\d+$/)) {
		errors.push("Property version must match semantic version pattern");
	}

	if (!["strict", "lax", "legacy"].includes(property.validationMode)) {
		errors.push("Invalid validation mode");
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Probe Properties Health v17
 * 
 * @returns Health status
 */
export async function probePropertiesHealth17(): Promise<{
	healthy: boolean;
	status: "healthy" | "degraded" | "offline";
	lastChecked: number;
}> {
	try {
		const props = await queryPropertiesRegistry17();
		// Emit discovery event on successful health check
		emitRadianceDiscovery17(
			ROUTING_REGISTRY_NAMES.PROPERTIES,
			"radiance-properties",
			"health_check_success",
			{ itemCount: props.length },
			"info",
		);

		return {
			healthy: true,
			status: "healthy",
			lastChecked: Date.now(),
		};
	} catch (error) {
		// Emit failure event on health check failure
		if (error instanceof Error) {
			const { emitRadianceFailure17 } = await import("./emit.radiance.17");
			emitRadianceFailure17(ROUTING_REGISTRY_NAMES.PROPERTIES, "radiance-properties", error, "HEALTH_CHECK_FAILED");
		}

		return {
			healthy: false,
			status: "offline",
			lastChecked: Date.now(),
		};
	}
}
