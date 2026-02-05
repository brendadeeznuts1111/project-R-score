/**
 * @fileoverview Data Source Types
 * @description Data source definition and registration types
 * @module sources/types
 */

import type { DataSource, PipelineConfig } from "../pipeline/types";
import type { PropertyDefinition } from "../properties/schema";

/**
 * Property reference
 */
export interface PropertyReference {
	id: string;
	namespace: string;
	version?: string;
}

/**
 * Ingestion configuration
 */
export interface IngestionConfig {
	batchSize?: number;
	concurrency?: number;
	retryPolicy?: {
		maxRetries: number;
		backoffMs: number;
		backoffMultiplier: number;
	};
}

/**
 * Transformation configuration
 */
export interface TransformationConfig {
	validateSchema?: boolean;
	strictMode?: boolean;
}

/**
 * Enrichment configuration
 */
export interface EnrichmentConfig {
	enableAnalytics?: boolean;
	enableCorrelations?: boolean;
	enableTensionDetection?: boolean;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
	maxRequests: number;
	windowMs: number;
}

/**
 * Endpoint configuration
 */
export interface EndpointConfig {
	path: string;
	method: string;
	description?: string;
}

/**
 * Data source definition
 */
export interface DataSourceDefinition {
	id: string; // "circa", "pinnacle", "polymarket"
	name: string;
	namespace: string; // "@nexus/providers/sharp-books"
	version: string;
	type: "sportsbook" | "exchange" | "market";

	// Package reference
	package: {
		name: string; // "@nexus/providers-sharp-books"
		version: string;
		entry: string; // "./circa"
	};

	// Properties this source provides
	properties: PropertyReference[];

	// Pipeline configuration
	pipeline: {
		ingestion: IngestionConfig;
		transformation: TransformationConfig;
		enrichment: EnrichmentConfig[];
	};

	// Access control
	accessControl: {
		defaultRole: string; // Minimum role required
		featureFlag?: string; // Feature flag gate
		rateLimit: RateLimitConfig;
	};

	// Metadata
	metadata: {
		description: string;
		tags: string[];
		endpoints: EndpointConfig[];
		latency: number;
		reliability: number;
	};
}
