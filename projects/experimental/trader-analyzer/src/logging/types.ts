/**
 * @fileoverview Forensic Logging Type Definitions
 * @module logging/types
 *
 * Type definitions for forensic logging database interactions.
 */

import type { Database } from "bun:sqlite";

/**
 * Forensic database client type
 * Provides type safety for database operations
 */
export type ForensicDatabase = Database;

/**
 * Expected parameter count configuration per endpoint
 */
export interface EndpointParameterConfig {
	bookmaker: string;
	endpoint: string;
	expectedParamCount: number;
	variationThreshold?: number; // Allowable variation (default: 0)
}

/**
 * Bookmaker profile with endpoint parameter configuration
 * Stored in bookmaker registry for forensic logging
 */
export interface BookmakerProfile {
	bookmaker: string;
	name: string;
	endpoints: Map<string, number>; // endpoint path -> expected param count
	defaultThreshold?: number;
	urlEncodingBehavior?: {
		handlesHtmlEntities: boolean;
		entityVariants: string[];
		securityRisk: "low" | "medium" | "high";
	};
	lastProfiled?: number;
}

/**
 * Bookmaker endpoint configuration
 */
export interface BookmakerEndpointConfig {
	bookmaker: string;
	endpoints: Map<string, number>; // endpoint -> expected param count
	defaultThreshold?: number; // Default threshold if endpoint not found
}

/**
 * Audit result with detailed information
 */
export interface AuditResult {
	auditId: string;
	bookmaker: string;
	rawUrl: string;
	paramCount: number;
	expectedParamCount: number;
	threshold: number;
	isAnomalous: boolean;
	reason?: string;
}

/**
 * HTTP error details for bookmaker API testing
 */
export interface HttpErrorDetails {
	status: number;
	statusText: string;
	reason: string;
	category: "client_error" | "server_error" | "network_error" | "unknown";
}

/**
 * Correlation graph operation result
 * Used for logging correlation graph data aggregation operations
 */
export interface CorrelationGraphOperationResult {
	operationId: string;
	eventId: string;
	timeWindow: number;
	requestId?: string;
	success: boolean;
	duration: number; // milliseconds
	nodesGenerated?: number;
	edgesGenerated?: number;
	bookmakersProcessed?: number;
	layersProcessed?: number;
	cacheHit?: boolean;
	cacheAge?: number; // seconds, if cache hit
	error?: string;
	performanceBreakdown?: {
		queryTime: number;
		nodeGenerationTime: number;
		edgeGenerationTime: number;
		layerCalculationTime: number;
		statisticsTime: number;
	};
}

/**
 * Correlation graph audit log entry
 * For compliance and forensic tracking of graph operations
 */
export interface CorrelationGraphAuditLog {
	auditId: string;
	timestamp: number;
	eventId: string;
	timeWindow: number;
	requestId: string;
	clientIp?: string;
	userAgent?: string;
	operation: "aggregate" | "cache_invalidate" | "error";
	success: boolean;
	duration: number;
	nodesCount?: number;
	edgesCount?: number;
	bookmakersCount?: number;
	cacheHit?: boolean;
	errorMessage?: string;
	metadata?: Record<string, unknown>;
}
