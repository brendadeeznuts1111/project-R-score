/**
 * @fileoverview Input Validation for Multi-Layer Correlation Graph
 * @description Zod schemas and validation utilities
 * @module arbitrage/shadow-graph/multi-layer-validation
 */

import { z } from "zod";

/**
 * Event ID validation schema
 * Supports formats like:
 * - nba-lakers-warriors-2024-01-15
 * - nba-2025-12-06-lakers-warriors
 * - nfl-20240101-1200
 */
export const EventIdSchema = z
	.string()
	.min(10)
	.max(100)
	.regex(/^[a-z]+-[\w-]{6,}$/, "Invalid event ID format");

/**
 * Node ID validation schema
 */
export const NodeIdSchema = z.string().min(10).max(200);

/**
 * Layer validation schema
 */
export const LayerSchema = z.union([
	z.literal(1),
	z.literal(2),
	z.literal(3),
	z.literal(4),
]);

/**
 * Confidence validation schema
 */
export const ConfidenceSchema = z.number().min(0).max(1);

/**
 * Build multi-layer graph input schema
 */
export const BuildGraphInputSchema = z.object({
	eventId: EventIdSchema,
	maxLayers: z.number().int().min(1).max(4).optional().default(4),
	layers: z.union([
		z.string().regex(/^(1|2|3|4|all)$/),
		z.array(z.number().int().min(1).max(4)),
	]).optional(),
	includeHiddenEdges: z.boolean().optional().default(true),
	maxNodesPerLayer: z.number().int().min(1).optional().default(100),
});

/**
 * Query layer anomalies input schema
 */
export const QueryLayerAnomaliesInputSchema = z.object({
	eventId: EventIdSchema,
	layer: LayerSchema,
	minConfidence: ConfidenceSchema.optional().default(0.6),
});

/**
 * Predict propagation input schema
 */
export const PredictPropagationInputSchema = z.object({
	sourceNodeId: NodeIdSchema,
	targetNodeId: NodeIdSchema,
	maxDepth: z.number().int().min(1).max(10).optional().default(4),
});

/**
 * Find cross-sport edges input schema
 */
export const FindCrossSportEdgesInputSchema = z.object({
	sport1: z.string().min(2).max(10),
	sport2: z.string().min(2).max(10),
	sharedEntity: z.string().optional(),
	minStrength: ConfidenceSchema.optional().default(0.7),
});

/**
 * Stream anomalies input schema
 */
export const StreamAnomaliesInputSchema = z.object({
	eventId: EventIdSchema,
	layers: z.array(LayerSchema).optional(),
	minConfidence: ConfidenceSchema.optional().default(0.5),
	duration: z.number().int().min(1).max(3600).optional().default(60),
});

/**
 * Generate visualization input schema
 */
export const GenerateVisualizationInputSchema = z.object({
	eventId: EventIdSchema,
	layout: z
		.enum(["force", "hierarchical", "circular"])
		.optional()
		.default("hierarchical"),
	format: z.enum(["json", "graphml"]).optional().default("json"),
});

/**
 * Validate and sanitize input
 */
export function validateInput<T>(schema: z.ZodSchema<T>, input: unknown): T {
	try {
		return schema.parse(input);
	} catch (error: unknown) {
		// Handle ZodError - check for errors property safely
		if (error instanceof z.ZodError) {
			// Access errors property directly (may not be enumerable in Bun)
			const zodError = error as z.ZodError;
			const errors = (zodError as any).errors;
			if (Array.isArray(errors)) {
				const errorMessages = errors.map((e: any) => e.message || String(e)).join(", ");
				throw new Error(`Validation failed: ${errorMessages}`);
			}
			// Fallback to error message if errors array not available
			throw new Error(`Validation failed: ${zodError.message || "Invalid input"}`);
		}
		
		// Handle error objects that might have errors array
		if (error && typeof error === "object") {
			const errObj = error as Record<string, unknown>;
			// Try to access errors property directly
			const errors = (errObj as any).errors;
			if (Array.isArray(errors)) {
				const errorMessages = errors
					.map((e: unknown) => {
						if (typeof e === "object" && e !== null && "message" in e) {
							return (e as { message: string }).message;
						}
						return String(e);
					})
					.join(", ");
				throw new Error(`Validation failed: ${errorMessages}`);
			}
		}
		
		// Re-throw original error if it's not a validation error
		if (error instanceof Error) {
			throw error;
		}
		throw new Error(`Validation failed: ${String(error)}`);
	}
}
