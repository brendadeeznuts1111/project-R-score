/**
 * @fileoverview Statistical Analysis Database Adapter
 * @description Bridge between database audit tables and 6.7.1A.0.0.0.0 statistical analysis
 *
 * Enables 6.7.1A.0.0.0.0 to access raw performance data from:
 * - line_movement_audit_v2: Performance metrics (response times, sizes)
 * - url_anomaly_audit: Anomaly-related performance comparisons
 *
 * @module utils/statistical-analysis-database
 * @version 6.7.1A.0.0.0.0
 */

import { Database } from "bun:sqlite";
import {
	performStatisticalAnalysis,
	type StatisticalAnalysis,
	type StatisticalConfig,
	DEFAULT_STATISTICAL_CONFIG,
} from "./cpu-profiling-statistics";

/**
 * Performance metrics extracted from line_movement_audit_v2 table
 */
export interface PerformanceMetrics {
	/** Execution time samples (derived from response times or timestamps) */
	executionTimes: number[];
	/** Response sizes (bytes) */
	responseSizes: number[];
	/** Response status codes */
	responseStatuses: number[];
	/** Timestamps */
	timestamps: number[];
	/** Sample count */
	sampleCount: number;
}

/**
 * Anomaly performance metrics from url_anomaly_audit table
 */
export interface AnomalyPerformanceMetrics {
	/** Parameter count deltas (parsed - corrected) */
	paramDeltas: number[];
	/** Detection timestamps */
	detectedAt: number[];
	/** Threat levels */
	threatLevels: string[];
	/** Sample count */
	sampleCount: number;
}

/**
 * Statistical analysis result with database context
 */
export interface DatabaseStatisticalAnalysis extends StatisticalAnalysis {
	/** Database query metadata */
	metadata: {
		databasePath: string;
		tableName: string;
		queryTimeRange: {
			start: number;
			end: number;
		};
		sampleCount: number;
		filterCriteria?: Record<string, unknown>;
	};
}

/**
 * Extract performance metrics from line_movement_audit_v2 table
 *
 * Converts database records into performance samples suitable for statistical analysis.
 * Uses response_size and timestamp deltas as performance indicators.
 *
 * @param db - Database instance
 * @param options - Query options
 * @returns Performance metrics extracted from database
 */
export function extractPerformanceMetrics(
	db: Database,
	options: {
		bookmaker?: string;
		eventId?: string;
		startTime?: number;
		endTime?: number;
		limit?: number;
	} = {},
): PerformanceMetrics {
	const { bookmaker, eventId, startTime, endTime, limit = 1000 } = options;

	// Build query with optional filters
	let query = `
		SELECT 
			response_size,
			response_status,
			timestamp,
			bookmaker,
			eventId
		FROM line_movement_audit_v2
		WHERE 1=1
	`;
	const params: unknown[] = [];
	let paramIndex = 1;

	if (bookmaker) {
		query += ` AND bookmaker = ?${paramIndex++}`;
		params.push(bookmaker);
	}

	if (eventId) {
		query += ` AND eventId = ?${paramIndex++}`;
		params.push(eventId);
	}

	if (startTime) {
		query += ` AND timestamp >= ?${paramIndex++}`;
		params.push(startTime);
	}

	if (endTime) {
		query += ` AND timestamp <= ?${paramIndex++}`;
		params.push(endTime);
	}

	query += ` ORDER BY timestamp DESC LIMIT ?${paramIndex++}`;
	params.push(limit);

	const results = db
		.query<
			{
				response_size: number | null;
				response_status: number | null;
				timestamp: number;
				bookmaker: string;
				eventId: string;
			},
			unknown[]
		>(query)
		.all(...params);

	// Extract metrics
	const executionTimes: number[] = [];
	const responseSizes: number[] = [];
	const responseStatuses: number[] = [];
	const timestamps: number[] = [];

	// Calculate execution times from timestamp deltas
	const sortedResults = [...results].sort((a, b) => a.timestamp - b.timestamp);
	for (let i = 0; i < sortedResults.length; i++) {
		const current = sortedResults[i];
		timestamps.push(current.timestamp);

		// Use response_size as a proxy for execution time (larger responses = more processing)
		// Convert bytes to milliseconds (rough approximation: 1KB ≈ 1ms)
		if (current.response_size !== null && current.response_size > 0) {
			const estimatedTime = current.response_size / 1024; // KB to ms approximation
			executionTimes.push(estimatedTime);
		} else if (i > 0) {
			// Use timestamp delta as execution time estimate
			const timeDelta = current.timestamp - sortedResults[i - 1].timestamp;
			if (timeDelta > 0 && timeDelta < 60000) {
				// Reasonable range: 0-60 seconds
				executionTimes.push(timeDelta);
			}
		}

		if (current.response_size !== null) {
			responseSizes.push(current.response_size);
		}

		if (current.response_status !== null) {
			responseStatuses.push(current.response_status);
		}
	}

	return {
		executionTimes,
		responseSizes,
		responseStatuses,
		timestamps,
		sampleCount: results.length,
	};
}

/**
 * Extract anomaly performance metrics from url_anomaly_audit table
 *
 * Uses parameter count deltas as performance indicators (more parameters = more processing).
 *
 * @param db - Database instance
 * @param options - Query options
 * @returns Anomaly performance metrics
 */
export function extractAnomalyPerformanceMetrics(
	db: Database,
	options: {
		bookmaker?: string;
		threatLevel?: string;
		startTime?: number;
		endTime?: number;
		limit?: number;
	} = {},
): AnomalyPerformanceMetrics {
	const { bookmaker, threatLevel, startTime, endTime, limit = 1000 } = options;

	let query = `
		SELECT 
			parsed_param_count,
			corrected_param_count,
			detected_at,
			threat_level,
			bookmaker
		FROM url_anomaly_audit
		WHERE 1=1
	`;
	const params: unknown[] = [];
	let paramIndex = 1;

	if (bookmaker) {
		query += ` AND bookmaker = ?${paramIndex++}`;
		params.push(bookmaker);
	}

	if (threatLevel) {
		query += ` AND threat_level = ?${paramIndex++}`;
		params.push(threatLevel);
	}

	if (startTime) {
		query += ` AND detected_at >= ?${paramIndex++}`;
		params.push(startTime);
	}

	if (endTime) {
		query += ` AND detected_at <= ?${paramIndex++}`;
		params.push(endTime);
	}

	query += ` ORDER BY detected_at DESC LIMIT ?${paramIndex++}`;
	params.push(limit);

	const results = db
		.query<
			{
				parsed_param_count: number;
				corrected_param_count: number;
				detected_at: number;
				threat_level: string;
				bookmaker: string;
			},
			unknown[]
		>(query)
		.all(...params);

	const paramDeltas: number[] = [];
	const detectedAt: number[] = [];
	const threatLevels: string[] = [];

	for (const row of results) {
		const delta = row.parsed_param_count - row.corrected_param_count;
		paramDeltas.push(delta);
		detectedAt.push(row.detected_at);
		threatLevels.push(row.threat_level);
	}

	return {
		paramDeltas,
		detectedAt,
		threatLevels,
		sampleCount: results.length,
	};
}

/**
 * Perform statistical analysis on historical performance data from database
 *
 * Compares two time periods or filters to detect performance regressions/improvements
 * using actual historical data from line_movement_audit_v2.
 *
 * @param db - Database instance
 * @param baselineOptions - Query options for baseline period
 * @param currentOptions - Query options for current period
 * @param config - Statistical configuration
 * @returns Statistical analysis with database metadata
 *
 * @example
 * ```typescript
 * const db = new Database("./data/research.db");
 *
 * // Compare performance: last week vs this week
 * const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
 * const now = Date.now();
 *
 * const analysis = await analyzeHistoricalPerformance(
 *   db,
 *   { startTime: weekAgo, endTime: weekAgo + 3 * 24 * 60 * 60 * 1000 }, // Baseline: week ago
 *   { startTime: now - 3 * 24 * 60 * 60 * 1000, endTime: now }, // Current: last 3 days
 * );
 *
 * if (analysis.meanDifference.test.isSignificant) {
 *   console.log(`Performance regression detected: ${analysis.meanDifference.effectSize.magnitude} effect`);
 * }
 * ```
 */
export async function analyzeHistoricalPerformance(
	db: Database,
	baselineOptions: {
		bookmaker?: string;
		eventId?: string;
		startTime?: number;
		endTime?: number;
		limit?: number;
	},
	currentOptions: {
		bookmaker?: string;
		eventId?: string;
		startTime?: number;
		endTime?: number;
		limit?: number;
	},
	config: StatisticalConfig = DEFAULT_STATISTICAL_CONFIG,
): Promise<DatabaseStatisticalAnalysis> {
	// Extract metrics for both periods
	const baselineMetrics = extractPerformanceMetrics(db, baselineOptions);
	const currentMetrics = extractPerformanceMetrics(db, currentOptions);

	// Perform statistical analysis
	const analysis = performStatisticalAnalysis(
		baselineMetrics.executionTimes,
		currentMetrics.executionTimes,
		config,
	);

	// Add database metadata
	const startTime = Math.min(
		baselineOptions.startTime || 0,
		currentOptions.startTime || 0,
	);
	const endTime = Math.max(
		baselineOptions.endTime || Date.now(),
		currentOptions.endTime || Date.now(),
	);

	return {
		...analysis,
		metadata: {
			databasePath: "./data/research.db",
			tableName: "line_movement_audit_v2",
			queryTimeRange: {
				start: startTime,
				end: endTime,
			},
			sampleCount: baselineMetrics.sampleCount + currentMetrics.sampleCount,
			filterCriteria: {
				baseline: baselineOptions,
				current: currentOptions,
			},
		},
	};
}

/**
 * Perform statistical analysis on anomaly-related performance data
 *
 * Compares performance metrics associated with anomalies vs normal operations.
 *
 * @param db - Database instance
 * @param options - Query options
 * @param config - Statistical configuration
 * @returns Statistical analysis comparing anomaly vs normal performance
 *
 * @example
 * ```typescript
 * const db = new Database("./data/research.db");
 *
 * // Compare performance with anomalies vs without
 * const analysis = await analyzeAnomalyPerformanceImpact(
 *   db,
 *   {
 *     bookmaker: "example-bookmaker",
 *     startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
 *   }
 * );
 *
 * if (analysis.meanDifference.test.isSignificant) {
 *   console.log(`Anomalies cause ${analysis.meanDifference.effectSize.magnitude} performance impact`);
 * }
 * ```
 */
export async function analyzeAnomalyPerformanceImpact(
	db: Database,
	options: {
		bookmaker?: string;
		startTime?: number;
		endTime?: number;
		limit?: number;
	} = {},
	config: StatisticalConfig = DEFAULT_STATISTICAL_CONFIG,
): Promise<DatabaseStatisticalAnalysis> {
	const {
		startTime = Date.now() - 7 * 24 * 60 * 60 * 1000,
		endTime = Date.now(),
	} = options;

	// Get anomaly metrics
	const anomalyMetrics = extractAnomalyPerformanceMetrics(db, {
		...options,
		startTime,
		endTime,
	});

	// Get normal performance metrics (excluding anomaly periods)
	// For simplicity, we'll use all line_movement_audit_v2 data as "normal"
	// In a more sophisticated implementation, we'd exclude timestamps where anomalies occurred
	const normalMetrics = extractPerformanceMetrics(db, {
		...options,
		startTime,
		endTime,
	});

	// Convert anomaly param deltas to execution time estimates
	// More parameters = more processing time (rough estimate: 1 param = 0.5ms)
	const anomalyExecutionTimes = anomalyMetrics.paramDeltas.map(
		(delta) => Math.abs(delta) * 0.5,
	);

	// Perform statistical analysis
	const analysis = performStatisticalAnalysis(
		normalMetrics.executionTimes,
		anomalyExecutionTimes,
		config,
	);

	return {
		...analysis,
		metadata: {
			databasePath: "./data/research.db",
			tableName: "url_anomaly_audit + line_movement_audit_v2",
			queryTimeRange: {
				start: startTime,
				end: endTime,
			},
			sampleCount: anomalyMetrics.sampleCount + normalMetrics.sampleCount,
			filterCriteria: options,
		},
	};
}

/**
 * Compare performance across different bookmakers using historical data
 *
 * @param db - Database instance
 * @param bookmakers - Array of bookmaker names to compare
 * @param options - Query options
 * @param config - Statistical configuration
 * @returns Map of bookmaker comparisons
 */
export async function compareBookmakerPerformance(
	db: Database,
	bookmakers: string[],
	options: {
		startTime?: number;
		endTime?: number;
		limit?: number;
	} = {},
	config: StatisticalConfig = DEFAULT_STATISTICAL_CONFIG,
): Promise<Map<string, DatabaseStatisticalAnalysis>> {
	const comparisons = new Map<string, DatabaseStatisticalAnalysis>();

	if (bookmakers.length < 2) {
		return comparisons;
	}

	// Use first bookmaker as baseline
	const baselineBookmaker = bookmakers[0];
	const baselineMetrics = extractPerformanceMetrics(db, {
		...options,
		bookmaker: baselineBookmaker,
	});

	// Compare each other bookmaker against baseline
	for (let i = 1; i < bookmakers.length; i++) {
		const currentBookmaker = bookmakers[i];
		const currentMetrics = extractPerformanceMetrics(db, {
			...options,
			bookmaker: currentBookmaker,
		});

		const analysis = performStatisticalAnalysis(
			baselineMetrics.executionTimes,
			currentMetrics.executionTimes,
			config,
		);

		const startTime = options.startTime || 0;
		const endTime = options.endTime || Date.now();

		comparisons.set(currentBookmaker, {
			...analysis,
			metadata: {
				databasePath: "./data/research.db",
				tableName: "line_movement_audit_v2",
				queryTimeRange: {
					start: startTime,
					end: endTime,
				},
				sampleCount: baselineMetrics.sampleCount + currentMetrics.sampleCount,
				filterCriteria: {
					baselineBookmaker,
					currentBookmaker,
					...options,
				},
			},
		});
	}

	return comparisons;
}
