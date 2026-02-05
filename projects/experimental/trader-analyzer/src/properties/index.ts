/**
 * @fileoverview Properties Module
 * @description Property registry and schema exports
 * @module properties
 */

export {
	registerAllProperties,
	registerCCXTProperties,
	registerDeribitProperties,
	registerKalshiProperties,
	registerORCAProperties,
	registerPolymarketProperties,
} from "./registrations";
export { PropertyRegistry } from "./registry";
export type {
	JSONSchema,
	PropertyDefinition,
	PropertyFilters,
	PropertyLineage,
	PropertyType,
	ValidationResult,
} from "./schema";
