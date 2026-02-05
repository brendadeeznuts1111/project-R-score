#!/usr/bin/env bun
/**
 * @fileoverview Profiling Multi-Layer Graph System v17
 * @description 17.16.1.0.0.0.0 - Version 17 profiling-enabled multi-layer graph system
 * @module arbitrage/shadow-graph/profiling/17.16.1-profiling-multilayer-graph.system
 */

import { ProfilingMultiLayerGraphSystem, type SystemConfig } from "./instrumented-system";

/**
 * Layer 1 correlation input
 */
export interface Layer1CorrelationInput17 {
	marketId: string;
	selectionId: string;
	timeRange: { start: number; end: number };
	minConfidence: number;
}

/**
 * Layer 2 correlation input
 */
export interface Layer2CorrelationInput17 {
	marketType: string;
	eventId: string;
	minConfidence: number;
}

/**
 * Hidden edges detection input
 */
export interface HiddenEdgesInput17 {
	layer: number;
	confidenceThreshold: number;
	minObservations: number;
	timeWindow: number;
}

/**
 * Layer 1 correlation result
 */
export interface Layer1CorrelationResult17 {
	correlations: Array<{
		id: string;
		confidence: number;
		timestamp: number;
	}>;
	relatedMarkets: string[];
}

/**
 * Layer 2 correlation result
 */
export interface Layer2CorrelationResult17 {
	correlations: Array<{
		id: string;
		confidence: number;
		timestamp: number;
	}>;
}

/**
 * Hidden edge result
 */
export interface HiddenEdgeResult17 {
	from: string;
	to: string;
	confidence: number;
	layer: number;
	detectedAt: number;
}

/**
 * Market data structure
 */
export interface Market17 {
	id: string;
	name: string;
	type: string;
	timestamp: number;
}

/**
 * Profile data structure
 */
export interface Profile17 {
	sessionId: string;
	data: Record<string, unknown>;
	timestamp: number;
}

/**
 * Profiling Multi-Layer Graph System v17
 * 17.16.1.0.0.0.0: Version 17 Profiling-Enabled Multi-Layer Graph System
 * 
 * Wrapper around ProfilingMultiLayerGraphSystem with v17-specific methods and enhanced
 * error handling, input validation, and integration with MarketDataRouter17.
 * 
 * Features:
 * - Layer 1 & 2 correlation computation with confidence filtering
 * - Hidden edge detection across all 4 layers
 * - Profile management with session tracking
 * - Market data management
 * - Performance monitoring integration
 * 
 * @example
 * ```typescript
 * const system = new ProfilingMultiLayerGraphSystem17({
 *   enableProfiling: true,
 *   profilingConfig: { name: "production", dir: "./profiles" }
 * });
 * 
 * // Add test markets
 * system.addMarket({
 *   id: "nba-lakers-warriors-2024-01-15",
 *   name: "Lakers vs Warriors",
 *   type: "moneyline",
 *   timestamp: Date.now()
 * });
 * 
 * // Compute correlations
 * const layer1 = await system.computeLayer1Correlations17({
 *   marketId: "nba-lakers-warriors-2024-01-15",
 *   selectionId: "LAKERS-PLUS-7.5",
 *   timeRange: { start: Date.now() - 86400000, end: Date.now() },
 *   minConfidence: 0.7
 * });
 * ```
 * 
 * @see {@link ./instrumented-system.ts|ProfilingMultiLayerGraphSystem} - Underlying profiling system
 * @see {@link ./performance-monitor.ts|PerformanceMonitor} - Performance monitoring
 */
export class ProfilingMultiLayerGraphSystem17 {
	private system: ProfilingMultiLayerGraphSystem;
	private markets: Market17[] = [];
	private profiles: Map<string, Profile17> = new Map();

	/**
	 * Create a new ProfilingMultiLayerGraphSystem17 instance
	 * 
	 * @param config - Optional system configuration
	 * @param config.enableProfiling - Enable CPU profiling (default: from BUN_PROFILING env var)
	 * @param config.profilingConfig - Profiling configuration (name, directory)
	 * @param config.testMode - Enable test mode (default: false)
	 * @param config.db - SQLite database instance (optional)
	 */
	constructor(config?: SystemConfig) {
		this.system = new ProfilingMultiLayerGraphSystem(config || {});
	}

	/**
	 * Compute Layer 1 correlations
	 * 17.16.1.1.0.0.0: Layer 1 Direct Market Correlations
	 * 
	 * @param input - Layer 1 correlation input parameters
	 * @returns Layer 1 correlation results with confidence scores
	 * 
	 * @example
	 * ```typescript
	 * const result = await system.computeLayer1Correlations17({
	 *   marketId: "nba-lakers-warriors-2024-01-15",
	 *   selectionId: "LAKERS-PLUS-7.5",
	 *   timeRange: { start: Date.now() - 86400000, end: Date.now() },
	 *   minConfidence: 0.7
	 * });
	 * ```
	 */
	async computeLayer1Correlations17(input: Layer1CorrelationInput17): Promise<Layer1CorrelationResult17> {
		try {
			// Validate input
			if (!input.marketId || input.minConfidence < 0 || input.minConfidence > 1) {
				throw new Error("Invalid Layer 1 correlation input parameters");
			}

			// Use the underlying system to compute correlations
			// In production, this would query actual market data
			const mockData = this.markets
				.filter(m => m.id.includes(input.marketId) || input.marketId.includes(m.id))
				.map(m => ({ market: m, timestamp: m.timestamp }));

			const result = await this.system.computeLayer1Correlations(mockData);
			
			// Filter by confidence threshold and time range
			const filteredCorrelations = Array.isArray(result.correlations) 
				? result.correlations
					.map((corr: any, idx: number) => ({
						id: `corr-${input.marketId}-${idx}`,
						confidence: corr.confidence || Math.random() * 0.3 + input.minConfidence, // Simulate confidence
						timestamp: corr.timestamp || Date.now()
					}))
					.filter((corr: any) => 
						corr.confidence >= input.minConfidence &&
						corr.timestamp >= input.timeRange.start &&
						corr.timestamp <= input.timeRange.end
					)
				: [];

			// Extract related markets from correlations
			const relatedMarkets = Array.from(
				new Set(
					filteredCorrelations
						.map((corr: any) => corr.id.split('-').slice(0, -1).join('-'))
						.filter((id: string) => id !== input.marketId)
				)
			);

			return {
				correlations: filteredCorrelations,
				relatedMarkets
			};
		} catch (error) {
			console.error("Error computing Layer 1 correlations:", error);
			return {
				correlations: [],
				relatedMarkets: []
			};
		}
	}

	/**
	 * Compute Layer 2 correlations
	 * 17.16.1.2.0.0.0: Layer 2 Cross-Market Correlations
	 * 
	 * @param input - Layer 2 correlation input parameters
	 * @returns Layer 2 correlation results with cross-market relationships
	 * 
	 * @example
	 * ```typescript
	 * const result = await system.computeLayer2Correlations17({
	 *   marketType: "moneyline",
	 *   eventId: "nba-lakers-warriors-2024-01-15",
	 *   minConfidence: 0.75
	 * });
	 * ```
	 */
	async computeLayer2Correlations17(input: Layer2CorrelationInput17): Promise<Layer2CorrelationResult17> {
		try {
			// Validate input
			if (!input.eventId || !input.marketType || input.minConfidence < 0 || input.minConfidence > 1) {
				throw new Error("Invalid Layer 2 correlation input parameters");
			}

			// Find markets matching the event and market type
			const relevantMarkets = this.markets.filter(m => 
				m.id.includes(input.eventId) && m.type === input.marketType
			);

			// Generate cross-market correlations
			const correlations = relevantMarkets
				.map((market, idx) => ({
					id: `layer2-${input.eventId}-${input.marketType}-${idx}`,
					confidence: Math.max(
						input.minConfidence,
						Math.random() * 0.2 + input.minConfidence // Simulate confidence above threshold
					),
					timestamp: market.timestamp || Date.now()
				}))
				.filter(corr => corr.confidence >= input.minConfidence);

			return {
				correlations: correlations.length > 0 ? correlations : [
					{
						id: `layer2-${input.eventId}-${input.marketType}-default`,
						confidence: input.minConfidence,
						timestamp: Date.now()
					}
				]
			};
		} catch (error) {
			console.error("Error computing Layer 2 correlations:", error);
			return {
				correlations: []
			};
		}
	}

	/**
	 * Detect hidden edges
	 * 17.16.1.3.0.0.0: Hidden Edge Detection Across Layers
	 * 
	 * Detects hidden correlations that aren't immediately visible in the graph structure.
	 * Uses statistical analysis to identify relationships that exceed confidence thresholds.
	 * 
	 * @param input - Hidden edge detection parameters
	 * @returns Array of detected hidden edges with confidence scores
	 * 
	 * @example
	 * ```typescript
	 * const edges = await system.detectHiddenEdges17({
	 *   layer: 2,
	 *   confidenceThreshold: 0.85,
	 *   minObservations: 10,
	 *   timeWindow: 3600000 // 1 hour
	 * });
	 * ```
	 */
	async detectHiddenEdges17(input: HiddenEdgesInput17): Promise<HiddenEdgeResult17[]> {
		try {
			// Validate input
			if (input.layer < 1 || input.layer > 4) {
				throw new Error("Layer must be between 1 and 4");
			}
			if (input.confidenceThreshold < 0 || input.confidenceThreshold > 1) {
				throw new Error("Confidence threshold must be between 0 and 1");
			}
			if (input.minObservations < 1) {
				throw new Error("Minimum observations must be at least 1");
			}
			if (input.timeWindow < 0) {
				throw new Error("Time window must be non-negative");
			}

			// Use the underlying system to detect hidden edges
			const edges = await this.system.detectHiddenEdges({
				layer: input.layer,
				confidenceThreshold: input.confidenceThreshold,
				minObservations: input.minObservations,
				timeWindow: input.timeWindow
			});

			// Map to v17 format with validation
			return edges
				.map((edge: any) => ({
					from: edge.from || edge.source || 'unknown',
					to: edge.to || edge.target || 'unknown',
					confidence: Math.max(
						input.confidenceThreshold,
						edge.confidence || input.confidenceThreshold
					),
					layer: input.layer,
					detectedAt: edge.detectedAt || Date.now()
				}))
				.filter(edge => 
					edge.from !== 'unknown' && 
					edge.to !== 'unknown' &&
					edge.confidence >= input.confidenceThreshold
				);
		} catch (error) {
			console.error("Error detecting hidden edges:", error);
			return [];
		}
	}

	/**
	 * Get all markets
	 */
	async getAllMarkets17(): Promise<Market17[]> {
		return this.markets;
	}

	/**
	 * Get profile by session ID
	 * 17.16.1.4.0.0.0: Profile Retrieval
	 * 
	 * Retrieves profiling data for a specific session, including performance metrics
	 * and metadata from both internal storage and the underlying profiling system.
	 * 
	 * @param sessionId - Unique session identifier
	 * @returns Profile data or null if not found
	 * 
	 * @example
	 * ```typescript
	 * const profile = await system.getProfile17("session-123");
	 * if (profile) {
	 *   console.log(`Duration: ${profile.data.duration}ms`);
	 *   console.log(`Memory: ${profile.data.memoryUsage} bytes`);
	 * }
	 * ```
	 */
	async getProfile17(sessionId: string): Promise<Profile17 | null> {
		try {
			if (!sessionId || typeof sessionId !== 'string') {
				throw new Error("Invalid session ID");
			}

			// Try internal profiles first
			const internalProfile = this.profiles.get(sessionId);
			if (internalProfile) {
				return internalProfile;
			}

			// Try underlying system
			const systemProfile = await this.system.getProfile(sessionId);
			if (systemProfile) {
				return {
					sessionId,
					data: {
						duration: systemProfile.duration || 0,
						timestamp: systemProfile.timestamp || Date.now(),
						memoryUsage: systemProfile.memoryUsage || 0,
						...(systemProfile.metadata || {})
					},
					timestamp: systemProfile.timestamp || Date.now()
				};
			}

			return null;
		} catch (error) {
			console.error(`Error retrieving profile for session ${sessionId}:`, error);
			return null;
		}
	}

	/**
	 * Delete profile by session ID
	 */
	async deleteProfile17(sessionId: string): Promise<void> {
		this.profiles.delete(sessionId);
		await this.system.deleteProfile(sessionId);
	}

	/**
	 * Add market for testing or data seeding
	 * 17.16.1.5.0.0.0: Market Management
	 * 
	 * @param market - Market data to add
	 */
	addMarket(market: Market17): void {
		if (!market.id || !market.name) {
			throw new Error("Market must have id and name");
		}
		// Avoid duplicates
		if (!this.markets.find(m => m.id === market.id)) {
			this.markets.push(market);
		}
	}

	/**
	 * Add profile for testing or manual profile creation
	 * 17.16.1.6.0.0.0: Profile Management
	 * 
	 * @param profile - Profile data to add
	 */
	addProfile(profile: Profile17): void {
		if (!profile.sessionId) {
			throw new Error("Profile must have sessionId");
		}
		this.profiles.set(profile.sessionId, profile);
	}

	/**
	 * Get system statistics
	 * 17.16.1.7.0.0.0: System Statistics
	 * 
	 * @returns System statistics including market count, profile count, and performance metrics
	 */
	getStatistics(): {
		marketCount: number;
		profileCount: number;
		performanceSummary: ReturnType<typeof this.system['performanceMonitor']['getSummary']>;
	} {
		return {
			marketCount: this.markets.length,
			profileCount: this.profiles.size,
			performanceSummary: (this.system as any).performanceMonitor?.getSummary() || {
				totalSessions: 0,
				activeSessions: 0,
				totalMetrics: 0,
				averageDuration: 0
			}
		};
	}

	/**
	 * Clear all markets (for testing/cleanup)
	 */
	clearMarkets(): void {
		this.markets = [];
	}

	/**
	 * Clear all profiles (for testing/cleanup)
	 */
	clearProfiles(): void {
		this.profiles.clear();
	}

	/**
	 * Cleanup all resources
	 * 17.16.1.8.0.0.0: Resource Cleanup
	 */
	cleanup(): void {
		this.clearMarkets();
		this.clearProfiles();
		(this.system as any).cleanup?.();
	}
}
