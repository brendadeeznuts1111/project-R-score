/**
 * @fileoverview Pipeline Types
 * @description Type definitions for the enterprise data pipeline
 * @module pipeline/types
 */

import type { Result } from "../types";

// Re-export Result type for use in pipeline modules
export type { Result } from "../types";

/**
 * Data source type enumeration
 */
export type DataSourceType = "sportsbook" | "exchange" | "market" | "file";

/**
 * Data source identifier with metadata
 */
export interface DataSource {
	/** Unique identifier for the data source (e.g., "pinnacle", "polymarket") */
	id: string;
	/** Human-readable name */
	name: string;
	/** Type of data source */
	type: DataSourceType;
	/** Namespace for scoped packages (e.g., "@nexus/providers/sharp-books") */
	namespace?: string;
	/** Version string (e.g., "1.2.0") */
	version?: string;
	/** Feature flag that gates access to this source */
	featureFlag?: string;
}

/**
 * Raw data payload from ingestion stage
 */
export interface RawData {
	/** Source that provided this data */
	source: DataSource;
	/** Raw data payload (structure depends on source type) */
	data: unknown;
	/** Unix timestamp in milliseconds when data was received */
	timestamp: number;
	/** Additional metadata about the ingestion */
	metadata?: Record<string, unknown>;
}

/**
 * Result of data ingestion operation
 */
export interface IngestionResult {
	/** Whether ingestion succeeded */
	success: boolean;
	/** The raw data that was ingested */
	rawData: RawData;
	/** ISO 8601 timestamp when data was stored */
	storedAt: string;
	/** Additional metadata about the ingestion result */
	metadata?: Record<string, unknown>;
	/** Error if ingestion failed */
	error?: Error;
}

/**
 * Canonical data format after transformation stage
 */
export interface CanonicalData {
	/** Source that provided the original data */
	source: DataSource;
	/** Extracted properties from the raw data */
	properties: Record<string, unknown>;
	/** Canonical identifiers (UUIDs) for entities (e.g., eventId, marketId) */
	canonicalIds: Record<string, string>;
	/** Unix timestamp in milliseconds */
	timestamp: number;
	/** Additional metadata */
	metadata?: Record<string, unknown>;
}

/**
 * Enriched data with analytics and correlations
 */
export interface EnrichedData extends CanonicalData {
	/** Calculated analytics metrics */
	analytics: Record<string, unknown>;
	/** Cross-source correlations */
	correlations?: Record<string, unknown>;
	/** Market tension scores (inefficiency indicators) */
	tensionScores?: Record<string, number>;
	/** Detected arbitrage opportunities */
	arbitrageOpportunities?: unknown[];
}

/**
 * Query parameters for data serving
 */
export interface DataQuery {
	/** Filter by source ID(s) */
	source?: string | string[];
	/** Filter by property names to include */
	properties?: string[];
	/** Filter by time range */
	timeRange?: { start: number; end: number };
	/** Additional custom filters */
	filters?: Record<string, unknown>;
	/** Maximum number of results to return */
	limit?: number;
	/** Offset for pagination */
	offset?: number;
}

/**
 * Served data with RBAC filtering applied
 */
export interface ServedData {
	/** The enriched data (single item or array) */
	data: EnrichedData | EnrichedData[];
	/** The query that was executed */
	query: DataQuery;
	/** Unix timestamp when data was served */
	timestamp: number;
	/** Whether RBAC filtering was applied */
	filtered: boolean;
	/** Additional metadata about the serving operation */
	metadata?: Record<string, unknown>;
}

/**
 * User context for RBAC and feature flags
 */
export interface PipelineUser {
	/** Unique user identifier */
	id: string;
	/** Username */
	username: string;
	/** User's role ID (e.g., "admin", "trader", "analyst") */
	role: string;
	/** Feature flags enabled for this user */
	featureFlags?: string[];
	/** Additional user metadata */
	metadata?: Record<string, unknown>;
}

/**
 * Interface for pipeline stages
 */
export interface PipelineStage {
	/** Stage name for logging/debugging */
	name: string;
	/** Process input data through this stage */
	process(input: unknown, context?: unknown): Promise<Result<unknown>>;
}

/**
 * Configuration for the entire pipeline
 */
export interface PipelineConfig {
	/** Configuration for each pipeline stage */
	stages: {
		/** Ingestion stage configuration */
		ingestion: IngestionStageConfig;
		/** Transformation stage configuration */
		transformation: TransformationStageConfig;
		/** Enrichment stage configuration */
		enrichment: EnrichmentStageConfig;
		/** Serving stage configuration */
		serving: ServingStageConfig;
	};
	/** Per-source pipeline configuration overrides */
	dataSources?: Record<string, DataSourcePipelineConfig>;
}

/**
 * Configuration for ingestion stage
 */
export interface IngestionStageConfig {
	/** Number of items to process in a batch */
	batchSize: number;
	/** Maximum concurrent ingestion operations */
	concurrency: number;
	/** Retry policy for failed ingestion attempts */
	retryPolicy: RetryPolicy;
}

/**
 * Configuration for transformation stage
 */
export interface TransformationStageConfig {
	/** Whether to validate data against property schemas */
	validateSchema: boolean;
	/** Whether to use strict mode (fail on validation errors) */
	strictMode: boolean;
}

/**
 * Configuration for enrichment stage
 */
export interface EnrichmentStageConfig {
	/** Enable analytics calculations */
	enableAnalytics: boolean;
	/** Enable cross-source correlation analysis */
	enableCorrelations: boolean;
	/** Enable market tension detection */
	enableTensionDetection: boolean;
}

/**
 * Configuration for serving stage
 */
export interface ServingStageConfig {
	/** Cache TTL in milliseconds */
	cacheTTL: number;
	/** Maximum number of results to return */
	maxResults: number;
}

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
	/** Maximum number of retry attempts */
	maxRetries: number;
	/** Initial backoff delay in milliseconds */
	backoffMs: number;
	/** Multiplier for exponential backoff */
	backoffMultiplier: number;
}

/**
 * Per-source pipeline configuration override
 */
export interface DataSourcePipelineConfig {
	/** The data source this config applies to */
	source: DataSource;
	/** Override ingestion stage config */
	ingestion?: Partial<IngestionStageConfig>;
	/** Override transformation stage config */
	transformation?: Partial<TransformationStageConfig>;
	/** Override enrichment stage config */
	enrichment?: Partial<EnrichmentStageConfig>;
}

/**
 * Interface for property registry integration
 */
export interface PropertyRegistryAdapter {
	/**
	 * Get property schema for a data source
	 * @param source - The data source to get schema for
	 * @returns Property schema or undefined if not found
	 */
	getSchema(source: DataSource): unknown | undefined;
	/**
	 * Get enrichment rules for a data source
	 * @param source - The data source to get rules for
	 * @returns Enrichment rules or undefined if not found
	 */
	getEnrichmentRules(source: DataSource): unknown | undefined;
}

/**
 * Interface for RBAC manager integration
 */
export interface RBACManagerAdapter {
	/**
	 * Check if user can access a data source
	 * @param user - The user to check
	 * @param source - The data source to check access for
	 * @returns True if user can access the source
	 */
	canAccess(user: PipelineUser, source: DataSource): boolean;
	/**
	 * Filter data based on user's RBAC scope
	 * @param data - The data to filter
	 * @param user - The user whose scope to apply
	 * @returns Filtered data or null if user cannot access
	 */
	filterData(data: EnrichedData, user: PipelineUser): EnrichedData | null;
}

/**
 * Interface for feature flag manager integration
 */
export interface FeatureFlagManagerAdapter {
	/**
	 * Check if a feature flag is enabled for a user
	 * @param flag - The feature flag ID
	 * @param user - The user to check
	 * @returns True if flag is enabled for user
	 */
	isEnabled(flag: string, user: PipelineUser): boolean;
}
