#!/usr/bin/env bun
/**
 * @fileoverview Correlation Engine v17
 * @description 6.1.1.2.2.8.1.1.2.8.2 - Service for calculating multi-dimensional sub-market correlations
 * @module api/routes/17.16.8-correlation-engine
 *
 * @see {@link ../../../docs/ANTI-PATTERNS.md|Anti-Patterns Guide} for coding best practices
 * @see {@link ../../../docs/NAMING-CONVENTIONS.md|Naming Conventions} for code style guidelines
 */

import { Database } from "bun:sqlite";
import type {
	CorrelationPair,
	CorrelationConfig,
	SubMarketCorrelationMatrix,
	ContextualCorrelationAttributes,
	MarketOfferingNode,
	FhSpreadDeviationOptions,
	FhSpreadDeviationResult,
} from "./17.16.8-submarket-correlation-types";
import type { SubMarketShadowGraphBuilder } from "../../../hyper-bun/shadow-graph-builder";

/**
 * 6.1.1.2.2.8.1.1.2.8.2: CorrelationEngine17 Service
 * 
 * This service is responsible for performing complex statistical analysis on historical
 * line movement data to derive deep sub-market correlations.
 */
export class CorrelationEngine17 {
	private db: Database;
	private shadowGraphBuilder: SubMarketShadowGraphBuilder;
	private metrics?: any; // PrometheusClient placeholder

	/**
	 * 6.1.1.2.2.8.1.1.2.8.2.1: Constructor & Dependencies
	 * 
	 * @param db - Bun-native SQLite for historical line_movement_micro_v2 and url_anomaly_audit data
	 * @param shadowGraphBuilder - For access to MarketOfferingNode definitions (visibility, parentage, etc.)
	 * @param metrics - Optional PrometheusClient to expose correlation calculation performance
	 */
	constructor(
		db: Database,
		shadowGraphBuilder: SubMarketShadowGraphBuilder,
		metrics?: any
	) {
		this.db = db;
		this.shadowGraphBuilder = shadowGraphBuilder;
		this.metrics = metrics;
		this.initializeDatabase();
	}

	/**
	 * Initialize correlation storage tables
	 */
	private initializeDatabase(): void {
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS correlation_pairs (
				pairId TEXT PRIMARY KEY,
				eventId TEXT NOT NULL,
				sourceNodeId TEXT NOT NULL,
				targetNodeId TEXT NOT NULL,
				coefficient REAL NOT NULL,
				p_value REAL NOT NULL,
				temporalLag_ms INTEGER NOT NULL,
				observationCount INTEGER NOT NULL,
				calculationMethod TEXT DEFAULT 'pearson',
				sourceExposureLevel TEXT,
				targetExposureLevel TEXT,
				lastUpdated INTEGER NOT NULL,
				createdAt INTEGER DEFAULT (unixepoch())
			);
			
			CREATE INDEX IF NOT EXISTS idx_correlation_event ON correlation_pairs(eventId);
			CREATE INDEX IF NOT EXISTS idx_correlation_source ON correlation_pairs(sourceNodeId);
			CREATE INDEX IF NOT EXISTS idx_correlation_target ON correlation_pairs(targetNodeId);
			CREATE INDEX IF NOT EXISTS idx_correlation_coeff ON correlation_pairs(coefficient);
			CREATE INDEX IF NOT EXISTS idx_correlation_updated ON correlation_pairs(lastUpdated DESC);
		`);
	}

	/**
	 * 6.1.1.2.2.8.1.1.2.8.2.2: calculateEventCorrelationMatrix
	 * 
	 * The primary method to calculate the correlation matrix for a given event.
	 * 
	 * @param eventId - The event identifier
	 * @param config - Configuration parameters for correlation calculation
	 * @returns Promise resolving to SubMarketCorrelationMatrix
	 * 
	 * @example Formula: Calculate correlations for an event, including dark pools, and verify key output.
	 * Test Formula: const matrix = await mlgs.correlationEngine.calculateEventCorrelationMatrix('nfl-2025-001', { observationWindow_ms: 3600000, includeDarkPools: true, minObservationCount: 10 });
	 * Expected Result: matrix.eventId === 'nfl-2025-001' and matrix.correlations.some(c => c.sourceExposureLevel === 'dark_pool' && c.coefficient > 0.7 && c.temporalLag_ms > 0)
	 */
	async calculateEventCorrelationMatrix(
		eventId: string,
		config: CorrelationConfig = {}
	): Promise<SubMarketCorrelationMatrix> {
		const startTime = performance.now();

		// Apply defaults
		const {
			observationWindow_ms = 3600000, // 1 hour default
			minObservationCount = 10,
			includeDarkPools = false,
			temporalLagMax_ms = 300000, // 5 minutes default
			significanceThreshold = 0.05,
			correlationMethod = 'pearson',
			minCoefficient = 0.3,
			contextAttributes,
		} = config;

		// Step 1: Retrieve all MarketOfferingNodes for the eventId
		const nodes = await this.getMarketNodesForEvent(eventId, {
			includeDarkPools,
			contextAttributes,
		});

		if (nodes.length < 2) {
			return {
				eventId,
				observationWindow_ms,
				correlations: [],
				contextAttributes,
				calculatedAt: Date.now(),
				totalNodesAnalyzed: nodes.length,
				totalPairsEvaluated: 0,
			};
		}

		// Step 2: Fetch historical line_movement_micro_v2 data for each node
		const endTime = Date.now();
		const startTimeWindow = endTime - observationWindow_ms;

		const nodeMovements = new Map<string, Array<{ timestamp: number; line_value: number }>>();

		for (const node of nodes) {
			const movements = await this.getNodeMovements(
				node.nodeId,
				startTimeWindow,
				endTime
			);
			if (movements.length >= minObservationCount) {
				nodeMovements.set(node.nodeId, movements);
			}
		}

		// Step 3: Calculate correlations for each significant pair
		const correlations: CorrelationPair[] = [];
		const nodeArray = Array.from(nodeMovements.keys());
		const totalPairsEvaluated = (nodeArray.length * (nodeArray.length - 1)) / 2;

		for (let i = 0; i < nodeArray.length; i++) {
			for (let j = i + 1; j < nodeArray.length; j++) {
				const sourceNodeId = nodeArray[i];
				const targetNodeId = nodeArray[j];

				const sourceMovements = nodeMovements.get(sourceNodeId)!;
				const targetMovements = nodeMovements.get(targetNodeId)!;

				// Calculate correlation with temporal lag analysis
				const correlation = this.calculateCorrelationWithLag(
					sourceMovements,
					targetMovements,
					temporalLagMax_ms,
					correlationMethod
				);

				if (
					correlation &&
					Math.abs(correlation.coefficient) >= minCoefficient &&
					correlation.p_value <= significanceThreshold &&
					correlation.observationCount >= minObservationCount
				) {
					// Enrich with node metadata
					const sourceNode = nodes.find(n => n.nodeId === sourceNodeId);
					const targetNode = nodes.find(n => n.nodeId === targetNodeId);

					correlations.push({
						...correlation,
						sourceExposureLevel: sourceNode?.exposureLevel,
						targetExposureLevel: targetNode?.exposureLevel,
						lastUpdated: Date.now(),
					});

					// Store in database for future queries
					await this.storeCorrelationPair(eventId, {
						...correlation,
						sourceExposureLevel: sourceNode?.exposureLevel,
						targetExposureLevel: targetNode?.exposureLevel,
					});
				}
			}
		}

		const duration = performance.now() - startTime;
		if (this.metrics) {
			this.metrics.recordCorrelationCalculation(duration, correlations.length);
		}

		return {
			eventId,
			observationWindow_ms,
			correlations,
			contextAttributes,
			calculatedAt: Date.now(),
			totalNodesAnalyzed: nodes.length,
			totalPairsEvaluated,
		};
	}

	/**
	 * 6.1.1.2.2.8.1.1.2.8.2.3: queryCorrelations
	 * 
	 * Allows querying the stored correlation data based on specific contextual attributes.
	 * 
	 * @param attributes - Contextual attributes for filtering
	 * @returns Promise resolving to array of CorrelationPair
	 */
	async queryCorrelations(
		attributes: ContextualCorrelationAttributes
	): Promise<CorrelationPair[]> {
		const conditions: string[] = [];
		const params: any[] = [];

		if (attributes.sourceBookmaker && attributes.sourceBookmaker !== 'ANY') {
			conditions.push(`sourceNodeId LIKE ?`);
			params.push(`%:${attributes.sourceBookmaker}:%`);
		}

		if (attributes.targetBookmaker && attributes.targetBookmaker !== 'ANY') {
			conditions.push(`targetNodeId LIKE ?`);
			params.push(`%:${attributes.targetBookmaker}:%`);
		}

		if (attributes.sourceExposureLevel) {
			conditions.push(`sourceExposureLevel = ?`);
			params.push(attributes.sourceExposureLevel);
		}

		if (attributes.targetExposureLevel) {
			conditions.push(`targetExposureLevel = ?`);
			params.push(attributes.targetExposureLevel);
		}

		if (attributes.minCoefficient !== undefined) {
			conditions.push(`ABS(coefficient) >= ?`);
			params.push(attributes.minCoefficient);
		}

		if (attributes.maxPValue !== undefined) {
			conditions.push(`p_value <= ?`);
			params.push(attributes.maxPValue);
		}

		if (attributes.minObservationCount !== undefined) {
			conditions.push(`observationCount >= ?`);
			params.push(attributes.minObservationCount);
		}

		const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
		const query = `SELECT * FROM correlation_pairs ${whereClause} ORDER BY ABS(coefficient) DESC LIMIT 1000`;

		const results = this.db.prepare(query).all(...params) as any[];

		return results.map(row => ({
			sourceNodeId: row.sourceNodeId,
			targetNodeId: row.targetNodeId,
			coefficient: row.coefficient,
			p_value: row.p_value,
			temporalLag_ms: row.temporalLag_ms,
			observationCount: row.observationCount,
			lastUpdated: row.lastUpdated,
			calculationMethod: row.calculationMethod || 'pearson',
			sourceExposureLevel: row.sourceExposureLevel,
			targetExposureLevel: row.targetExposureLevel,
		}));
	}

	/**
	 * Get market nodes for an event
	 * Enhanced with better filtering, metadata extraction, and exposure level detection
	 */
	private async getMarketNodesForEvent(
		eventId: string,
		options: {
			includeDarkPools: boolean;
			contextAttributes?: ContextualCorrelationAttributes;
		}
	): Promise<MarketOfferingNode[]> {
		// Build query with enhanced filtering
		// Use COALESCE to handle missing columns gracefully
		let query = `
			SELECT DISTINCT 
				nodeId, 
				eventId, 
				bookmaker, 
				COALESCE(marketType, base_line_type) as marketType, 
				period, 
				parentNodeId, 
				lastUpdated,
				base_line_type,
				sport
			FROM sub_market_nodes
			WHERE eventId = ?
		`;

		const params: any[] = [eventId];

		// Apply context attribute filters
		if (options.contextAttributes) {
			const attrs = options.contextAttributes;
			
			if (attrs.sourceMarketType || attrs.targetMarketType) {
				const marketType = attrs.sourceMarketType || attrs.targetMarketType;
				query += ` AND marketType = ?`;
				params.push(marketType);
			}

			if (attrs.sourcePeriod || attrs.targetPeriod) {
				const period = attrs.sourcePeriod || attrs.targetPeriod;
				query += ` AND period = ?`;
				params.push(period);
			}

			if (attrs.sourceBookmaker && attrs.sourceBookmaker !== 'ANY') {
				query += ` AND bookmaker = ?`;
				params.push(attrs.sourceBookmaker);
			}
		}

		// Filter out dark pools if not included
		if (!options.includeDarkPools) {
			// Filter by nodeId pattern (dark pools typically have 'dark' or ':DARK:' in nodeId)
			query += ` AND nodeId NOT LIKE '%:dark%' AND nodeId NOT LIKE '%dark_pool%' AND nodeId NOT LIKE '%:DARK:%'`;
		}

		query += ` ORDER BY bookmaker, marketType, period`;

		const results = this.db.prepare(query).all(...params) as any[];

		return results.map(row => {
			const exposureLevel = this.inferExposureLevel(row.nodeId);
			
			// Enhanced node with metadata
			// Handle cases where base_line_type might not exist in schema
			const marketType = row.marketType || (row as any).base_line_type || undefined;
			
			return {
				nodeId: row.nodeId,
				eventId: row.eventId,
				bookmaker: row.bookmaker || 'unknown',
				marketType,
				period: row.period,
				parentNodeId: row.parentNodeId,
				exposureLevel,
				lastUpdated: row.lastUpdated || Date.now(),
			};
		});
	}

	/**
	 * Get node movements from line_movement_micro_v2
	 */
	private async getNodeMovements(
		nodeId: string,
		startTime: number,
		endTime: number
	): Promise<Array<{ timestamp: number; line_value: number }>> {
		const query = `
			SELECT timestamp, line_value
			FROM line_movement_micro_v2
			WHERE nodeId = ? AND timestamp >= ? AND timestamp <= ?
			ORDER BY timestamp ASC
		`;

		const results = this.db.prepare(query).all(nodeId, startTime, endTime) as any[];

		return results.map(row => ({
			timestamp: row.timestamp,
			line_value: row.line_value || 0,
		}));
	}

	/**
	 * Calculate correlation with temporal lag analysis
	 */
	private calculateCorrelationWithLag(
		sourceMovements: Array<{ timestamp: number; line_value: number }>,
		targetMovements: Array<{ timestamp: number; line_value: number }>,
		maxLag_ms: number,
		method: 'pearson' | 'spearman' | 'kendall'
	): CorrelationPair | null {
		if (sourceMovements.length < 2 || targetMovements.length < 2) {
			return null;
		}

		// Align movements by timestamp and calculate deltas
		const sourceDeltas = this.calculateDeltas(sourceMovements);
		const targetDeltas = this.calculateDeltas(targetMovements);

		// Try different temporal lags to find maximum correlation
		let bestCorrelation: CorrelationPair | null = null;
		const lagStep = 1000; // 1 second steps
		const maxLagSteps = Math.floor(maxLag_ms / lagStep);

		for (let lagSteps = -maxLagSteps; lagSteps <= maxLagSteps; lagSteps++) {
			const lag_ms = lagSteps * lagStep;
			const aligned = this.alignWithLag(sourceDeltas, targetDeltas, lag_ms);

			if (aligned.source.length < 2) continue;

			const correlation = this.calculateCorrelation(
				aligned.source,
				aligned.target,
				method
			);

			if (
				!bestCorrelation ||
				Math.abs(correlation.coefficient) > Math.abs(bestCorrelation.coefficient)
			) {
				bestCorrelation = {
					sourceNodeId: '', // Will be set by caller
					targetNodeId: '', // Will be set by caller
					coefficient: correlation.coefficient,
					p_value: correlation.p_value,
					temporalLag_ms: lag_ms,
					observationCount: aligned.source.length,
					lastUpdated: Date.now(),
					calculationMethod: method,
				};
			}
		}

		return bestCorrelation;
	}

	/**
	 * Calculate deltas (changes) from movement array
	 */
	private calculateDeltas(
		movements: Array<{ timestamp: number; line_value: number }>
	): Array<{ timestamp: number; delta: number }> {
		const deltas: Array<{ timestamp: number; delta: number }> = [];

		for (let i = 1; i < movements.length; i++) {
			const delta = movements[i].line_value - movements[i - 1].line_value;
			if (delta !== 0) {
				deltas.push({
					timestamp: movements[i].timestamp,
					delta,
				});
			}
		}

		return deltas;
	}

	/**
	 * Align two delta arrays with a temporal lag
	 */
	private alignWithLag(
		source: Array<{ timestamp: number; delta: number }>,
		target: Array<{ timestamp: number; delta: number }>,
		lag_ms: number
	): { source: number[]; target: number[] } {
		const aligned: { source: number[]; target: number[] } = { source: [], target: [] };

		for (const sourcePoint of source) {
			const targetTime = sourcePoint.timestamp + lag_ms;
			const targetPoint = target.find(
				t => Math.abs(t.timestamp - targetTime) < 5000 // 5 second tolerance
			);

			if (targetPoint) {
				aligned.source.push(sourcePoint.delta);
				aligned.target.push(targetPoint.delta);
			}
		}

		return aligned;
	}

	/**
	 * Calculate correlation coefficient (simplified Pearson)
	 */
	private calculateCorrelation(
		x: number[],
		y: number[],
		method: 'pearson' | 'spearman' | 'kendall'
	): { coefficient: number; p_value: number } {
		if (x.length !== y.length || x.length < 2) {
			return { coefficient: 0, p_value: 1 };
		}

		// Simplified Pearson correlation
		const n = x.length;
		const sumX = x.reduce((a, b) => a + b, 0);
		const sumY = y.reduce((a, b) => a + b, 0);
		const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
		const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
		const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

		const numerator = n * sumXY - sumX * sumY;
		const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

		if (denominator === 0) {
			return { coefficient: 0, p_value: 1 };
		}

		const coefficient = numerator / denominator;

		// Simplified p-value calculation (t-test)
		const t = coefficient * Math.sqrt((n - 2) / (1 - coefficient * coefficient));
		const p_value = this.calculatePValue(t, n - 2);

		return { coefficient, p_value };
	}

	/**
	 * Calculate p-value from t-statistic (simplified)
	 */
	private calculatePValue(t: number, df: number): number {
		// Simplified p-value calculation
		// In production, use proper statistical library
		const absT = Math.abs(t);
		if (absT > 3) return 0.001;
		if (absT > 2) return 0.01;
		if (absT > 1.5) return 0.05;
		return 0.1;
	}

	/**
	 * Store correlation pair in database
	 */
	private async storeCorrelationPair(
		eventId: string,
		pair: Omit<CorrelationPair, 'sourceNodeId' | 'targetNodeId'> & {
			sourceNodeId: string;
			targetNodeId: string;
		}
	): Promise<void> {
		const pairId = `${pair.sourceNodeId}:${pair.targetNodeId}`;
		const stmt = this.db.prepare(`
			INSERT OR REPLACE INTO correlation_pairs (
				pairId, eventId, sourceNodeId, targetNodeId, coefficient, p_value,
				temporalLag_ms, observationCount, calculationMethod,
				sourceExposureLevel, targetExposureLevel, lastUpdated
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		stmt.run(
			pairId,
			eventId,
			pair.sourceNodeId,
			pair.targetNodeId,
			pair.coefficient,
			pair.p_value,
			pair.temporalLag_ms,
			pair.observationCount,
			pair.calculationMethod || 'pearson',
			pair.sourceExposureLevel,
			pair.targetExposureLevel,
			pair.lastUpdated
		);
	}

	/**
	 * Infer exposure level from nodeId (simplified)
	 */
	private inferExposureLevel(nodeId: string): 'displayed' | 'api_exposed' | 'dark_pool' {
		// Simplified inference - real implementation would use proper visibility tracking
		if (nodeId.includes(':DARK:') || nodeId.includes('dark')) {
			return 'dark_pool';
		}
		if (nodeId.includes(':API:') || nodeId.includes('api')) {
			return 'api_exposed';
		}
		return 'displayed';
	}

	/**
	 * 6.1.1.2.2.8.1.1.2.8.2.4: calculateFractionalSpreadDeviation
	 * 
	 * Calculates deviation of fractional/historical spreads from VWAP mainline.
	 * Detects bait lines and sharp money movements in alternate spreads.
	 * 
	 * @param marketId - The market identifier
	 * @param options - Configuration for deviation calculation
	 * @returns Promise resolving to FhSpreadDeviationResult
	 * 
	 * @example Formula: Calculate deviation for a spread market
	 * Test Formula: const deviation = await mlgs.correlationEngine.calculateFractionalSpreadDeviation('nba-game-2025001-spread', { bookmakers: ['DraftKings', 'FanDuel'], timeRange: { start: Date.now() - 3600000, end: Date.now() }, mainlineMethod: 'VWAP', deviationThreshold: 0.25, spreadType: 'point_spread' });
	 * Expected Result: deviation.marketId === 'nba-game-2025001-spread' && deviation.mainlinePrice === -7.0 && deviation.significantDeviationDetected === true && deviation.deviatingNodes.length >= 1
	 */
	async calculateFractionalSpreadDeviation(
		marketId: string,
		options: FhSpreadDeviationOptions
	): Promise<FhSpreadDeviationResult> {
		// Input validation
		if (!marketId || !options.timeRange) {
			throw new Error('Invalid marketId or timeRange');
		}

		const {
			bookmakers = ['DraftKings', 'FanDuel'],
			timeRange,
			mainlineMethod = 'VWAP',
			deviationThreshold = 0.25,
			spreadType = 'point_spread',
			period,
		} = options;

		// Step 1: Fetch historical spread data for marketId across specified bookmakers
		const spreadData = await this.getHistoricalSpreadData(
			marketId,
			bookmakers,
			timeRange,
			spreadType,
			period
		);

		if (spreadData.length === 0) {
			return {
				marketId,
				mainlinePrice: 0,
				mainlineSource: 'No data',
				deviationIndex: 0,
				deviationPercentage: 0,
				significantDeviationDetected: false,
				deviatingNodes: [],
				calculationTimestamp: Date.now(),
			};
		}

		// Step 2: Calculate mainline price using specified method
		const mainlinePrice = this.calculateMainlinePrice(spreadData, mainlineMethod);
		const mainlineSource = this.buildMainlineSource(mainlineMethod, bookmakers);

		// Step 3: Identify deviating nodes
		const deviatingNodes: FhSpreadDeviationResult['deviatingNodes'] = [];
		
		for (const node of spreadData) {
			const deviation = Math.abs(node.line - mainlinePrice);
			if (deviation >= deviationThreshold) {
				deviatingNodes.push({
					nodeId: node.nodeId,
					line: node.line,
					deviation: node.line - mainlinePrice, // Signed deviation
					bookmaker: node.bookmaker,
					exposureLevel: node.exposureLevel,
				});
			}
		}

		// Step 4: Compute aggregate deviation metrics
		const deviationIndex = deviatingNodes.length > 0
			? deviatingNodes.reduce((sum, node) => sum + Math.abs(node.deviation), 0) / deviatingNodes.length
			: 0;

		const deviationPercentage = mainlinePrice !== 0
			? (deviationIndex / Math.abs(mainlinePrice)) * 100
			: 0;

		// Step 5: Determine significance (3% threshold as per specification)
		const significantDeviationDetected = deviationPercentage > 3.0;

		// Step 6: Log for audit trail
		await this.logDeviationAnalysis({
			marketId,
			mainlinePrice,
			deviationIndex,
			significantDeviationDetected,
			nodeCount: deviatingNodes.length,
		});

		return {
			marketId,
			mainlinePrice,
			mainlineSource,
			deviationIndex,
			deviationPercentage,
			significantDeviationDetected,
			deviatingNodes,
			calculationTimestamp: Date.now(),
		};
	}

	/**
	 * Get historical spread data for a market
	 * Enhanced with better filtering, volume support, and metadata extraction
	 */
	private async getHistoricalSpreadData(
		marketId: string,
		bookmakers: string[],
		timeRange: { start: number; end: number },
		spreadType: string,
		period?: string
	): Promise<Array<{
		nodeId: string;
		line: number;
		bookmaker: string;
		exposureLevel?: 'displayed' | 'api_exposed' | 'dark_pool';
		timestamp: number;
		volume?: number;
	}>> {
		// Enhanced query with better joins and filtering
		let query = `
			SELECT DISTINCT
				lm.nodeId,
				lm.line_value as line,
				lm.timestamp,
				lm.volume,
				sn.bookmaker,
				sn.marketType,
				sn.period,
				sn.base_line_type
			FROM line_movement_micro_v2 lm
			JOIN sub_market_nodes sn ON lm.nodeId = sn.nodeId
			WHERE sn.eventId = ?
				AND lm.timestamp >= ?
				AND lm.timestamp <= ?
				AND (sn.base_line_type = ? OR sn.marketType = ?)
		`;

		const params: any[] = [marketId, timeRange.start, timeRange.end, spreadType, spreadType];

		// Filter by bookmakers
		if (bookmakers.length > 0) {
			query += ` AND sn.bookmaker IN (${bookmakers.map(() => '?').join(',')})`;
			params.push(...bookmakers);
		}

		// Filter by period
		if (period) {
			query += ` AND sn.period = ?`;
			params.push(period);
		}

		// Order by timestamp for chronological analysis
		query += ` ORDER BY lm.nodeId, lm.timestamp ASC`;

		const results = this.db.prepare(query).all(...params) as any[];

		// Group by nodeId and take most recent value per node for each unique timestamp
		const nodeDataMap = new Map<string, Array<{
			nodeId: string;
			line: number;
			bookmaker: string;
			exposureLevel?: 'displayed' | 'api_exposed' | 'dark_pool';
			timestamp: number;
			volume?: number;
		}>>();

		for (const row of results) {
			const nodeId = row.nodeId;
			if (!nodeDataMap.has(nodeId)) {
				nodeDataMap.set(nodeId, []);
			}

			nodeDataMap.get(nodeId)!.push({
				nodeId: row.nodeId,
				line: row.line || 0,
				bookmaker: row.bookmaker || 'unknown',
				exposureLevel: this.inferExposureLevel(row.nodeId),
				timestamp: row.timestamp,
				volume: row.volume || undefined,
			});
		}

		// Flatten and return all data points
		const allData: Array<{
			nodeId: string;
			line: number;
			bookmaker: string;
			exposureLevel?: 'displayed' | 'api_exposed' | 'dark_pool';
			timestamp: number;
			volume?: number;
		}> = [];

		for (const dataPoints of nodeDataMap.values()) {
			allData.push(...dataPoints);
		}

		return allData.sort((a, b) => a.timestamp - b.timestamp);
	}

	/**
	 * Calculates mainline price using VWAP, median, or consensus
	 * Enhanced with better algorithms per specification
	 */
	private calculateMainlinePrice(
		spreadData: Array<{ line: number; volume?: number; timestamp: number }>,
		method: 'VWAP' | 'median' | 'consensus'
	): number {
		if (spreadData.length === 0) return 0;

		switch (method) {
			case 'VWAP': {
				// Volume-Weighted Average Price
				const totalValue = spreadData.reduce((sum, node) => sum + (node.line * (node.volume || 1)), 0);
				const totalVolume = spreadData.reduce((sum, node) => sum + (node.volume || 1), 0);
				return totalVolume > 0 ? totalValue / totalVolume : 0;
			}

			case 'median': {
				// Median of all lines
				const sortedLines = spreadData.map(node => node.line).sort((a, b) => a - b);
				const mid = Math.floor(sortedLines.length / 2);
				return sortedLines.length % 2 === 0
					? (sortedLines[mid - 1] + sortedLines[mid]) / 2
					: sortedLines[mid];
			}

			case 'consensus': {
				// Take mode of lines weighted by bookmaker count (most common line)
				const lineCounts = new Map<number, number>();
				spreadData.forEach(node => {
					// Round to nearest 0.5 for consensus (spreads are typically in 0.5 increments)
					const roundedLine = Math.round(node.line * 2) / 2;
					lineCounts.set(roundedLine, (lineCounts.get(roundedLine) || 0) + 1);
				});
				
				if (lineCounts.size === 0) return 0;
				
				// Return the line with highest count (mode)
				const entries = Array.from(lineCounts.entries());
				entries.sort((a, b) => b[1] - a[1]); // Sort by count descending
				return entries[0][0];
			}

			default:
				throw new Error(`Unknown mainline method: ${method}`);
		}
	}

	/**
	 * Build mainline source description
	 */
	private buildMainlineSource(method: string, bookmakers: string[]): string {
		const bkList = bookmakers.length > 0 ? bookmakers.join(',') : 'all';
		return `${method}:${bkList}`;
	}

	/**
	 * Log deviation analysis for audit trail and metrics
	 */
	private async logDeviationAnalysis(data: {
		marketId: string;
		mainlinePrice: number;
		deviationIndex: number;
		significantDeviationDetected: boolean;
		nodeCount: number;
	}): Promise<void> {
		// Log to database for audit trail
		try {
			this.db.exec(`
				CREATE TABLE IF NOT EXISTS fhspread_deviation_log (
					logId INTEGER PRIMARY KEY AUTOINCREMENT,
					marketId TEXT NOT NULL,
					mainlinePrice REAL NOT NULL,
					deviationIndex REAL NOT NULL,
					deviationPercentage REAL NOT NULL,
					significantDeviationDetected INTEGER NOT NULL,
					nodeCount INTEGER NOT NULL,
					calculatedAt INTEGER NOT NULL DEFAULT (unixepoch())
				);
				
				CREATE INDEX IF NOT EXISTS idx_deviation_market ON fhspread_deviation_log(marketId);
				CREATE INDEX IF NOT EXISTS idx_deviation_timestamp ON fhspread_deviation_log(calculatedAt DESC);
				CREATE INDEX IF NOT EXISTS idx_deviation_significant ON fhspread_deviation_log(significantDeviationDetected, calculatedAt DESC);
			`);

			const stmt = this.db.prepare(`
				INSERT INTO fhspread_deviation_log (
					marketId, mainlinePrice, deviationIndex, deviationPercentage,
					significantDeviationDetected, nodeCount, calculatedAt
				) VALUES (?, ?, ?, ?, ?, ?, ?)
			`);

			const deviationPercentage = data.mainlinePrice !== 0
				? (data.deviationIndex / Math.abs(data.mainlinePrice)) * 100
				: 0;

			stmt.run(
				data.marketId,
				data.mainlinePrice,
				data.deviationIndex,
				deviationPercentage,
				data.significantDeviationDetected ? 1 : 0,
				data.nodeCount,
				Date.now()
			);
		} catch (error) {
			// Log error but don't fail the request
			console.error('Failed to log deviation analysis:', error);
		}

		// Emit metrics if metrics client available
		if (this.metrics) {
			if (data.significantDeviationDetected) {
				this.metrics.increment?.('fhspread_deviation_significant_total', {
					marketId: data.marketId
				});
			}
			
			this.metrics.gauge?.('fhspread_deviation_index', data.deviationIndex, {
				marketId: data.marketId
			});
		}
	}

	/**
	 * Get deviation history for a market (for analysis and debugging)
	 */
	async getDeviationHistory(marketId: string, limit: number = 100): Promise<Array<{
		mainlinePrice: number;
		deviationIndex: number;
		deviationPercentage: number;
		significantDeviationDetected: boolean;
		nodeCount: number;
		calculatedAt: number;
	}>> {
		try {
			const query = `
				SELECT 
					mainlinePrice, deviationIndex, deviationPercentage,
					significantDeviationDetected, nodeCount, calculatedAt
				FROM fhspread_deviation_log
				WHERE marketId = ?
				ORDER BY calculatedAt DESC
				LIMIT ?
			`;

			const results = this.db.prepare(query).all(marketId, limit) as any[];

			return results.map(row => ({
				mainlinePrice: row.mainlinePrice,
				deviationIndex: row.deviationIndex,
				deviationPercentage: row.deviationPercentage,
				significantDeviationDetected: row.significantDeviationDetected === 1,
				nodeCount: row.nodeCount,
				calculatedAt: row.calculatedAt,
			}));
		} catch (error) {
			console.error('Failed to get deviation history:', error);
			return [];
		}
	}
}
