/**
 * @fileoverview 1.1.1.1.2.2.0: Steam Origination Graph
 * @description Tracks where steam moves originate and how they propagate
 * @module arbitrage/shadow-graph/steam-origination-graph
 */

import { Database } from "bun:sqlite";

/**
 * Steam origination analysis result
 */
export interface SteamOriginationResult {
	origins: Array<{
		nodeId: string;
		firstMoveTime: number;
		moveSize: number;
		bookmaker: string;
	}>;
	cascade: Map<string, number>; // nodeId -> time lag from origin (ms)
	aggressor: string; // Bookmaker who moved first
	latencyRanking: Array<{ bookmaker: string; avgLatency: number }>; // 1.1.1.1.2.2.4: Bookmaker Latency Ranking
	aggressorSignature: {
		pattern: string;
		confidence: number;
	}; // 1.1.1.1.2.2.5: Aggressor Bookmaker Signature
	originationConfidence: number; // 1.1.1.1.2.2.7: Origination Confidence Score
}

/**
 * 1.1.1.1.2.2.1: Steam-Move Origination Graph
 *
 * Builds a directed graph showing where steam moves originate
 * and how they propagate across bookmakers and markets
 */
export class SteamOriginationGraph {
	private readonly MIN_MOVE_SIZE = 0.25; // Minimum line move in points
	private readonly MIN_MOVE_SIZE_USD = 10000; // Minimum move size in USD
	private readonly PROPAGATION_WINDOW_MS = 300000; // 5 minutes

	constructor(private db: Database) {}

	/**
	 * Build origination graph for an event
	 *
	 * Identifies the first mover and tracks propagation cascade
	 */
	async buildOriginationGraph(
		eventId: string,
	): Promise<SteamOriginationResult> {
		// Get all movements in the last hour
		const movements = this.db
			.query<
				{
					node_id: string;
					line: number;
					movement_size: number;
					timestamp: number;
					bookmaker: string;
				},
				[string, number]
			>(
				`SELECT 
					lm.node_id, 
					lm.line, 
					lm.movement_size,
					lm.timestamp,
					sn.bookmaker
				 FROM line_movements lm
				 JOIN shadow_nodes sn ON lm.node_id = sn.node_id
				 WHERE sn.event_id = ?1 
				   AND lm.timestamp > ?2
				 ORDER BY lm.timestamp ASC`,
			)
			.all(eventId, Date.now() - 3600000); // Last hour

		if (movements.length === 0) {
			return {
				origins: [],
				cascade: new Map(),
				aggressor: "unknown",
				latencyRanking: [],
				aggressorSignature: { pattern: "none", confidence: 0 },
				originationConfidence: 0,
			};
		}

		// 1.1.1.1.2.2.2: First-Mover Identification
		const origin = this.findFirstMover(movements);

		if (!origin) {
			return {
				origins: [],
				cascade: new Map(),
				aggressor: "unknown",
				latencyRanking: [],
				aggressorSignature: { pattern: "none", confidence: 0 },
				originationConfidence: 0,
			};
		}

		// 1.1.1.1.2.2.3: Propagation Cascade Timer
		const cascade = this.buildCascadeMap(origin, movements);

		// 1.1.1.1.2.2.4: Bookmaker Latency Ranking
		const latencyRanking = this.calculateLatencyRanking(
			movements,
			origin.timestamp,
		);

		// 1.1.1.1.2.2.5: Aggressor Bookmaker Signature
		const aggressorSignature = await this.analyzeAggressorSignature(
			origin.bookmaker,
		);

		// 1.1.1.1.2.2.7: Origination Confidence Score
		const originationConfidence = this.calculateOriginationConfidence(
			origin,
			cascade,
			movements,
		);

		return {
			origins: [
				{
					nodeId: origin.node_id,
					firstMoveTime: origin.timestamp,
					moveSize: Math.abs(
						origin.line -
							this.getPreviousLine(origin.node_id, origin.timestamp),
					),
					bookmaker: origin.bookmaker,
				},
			],
			cascade,
			aggressor: origin.bookmaker,
			latencyRanking,
			aggressorSignature,
			originationConfidence,
		};
	}

	/**
	 * 1.1.1.1.2.2.6: Cross-Event Steam Clustering
	 *
	 * Identifies when steam moves cluster across multiple events
	 * (e.g., all NFL games moving simultaneously)
	 */
	async detectCrossEventSteamClustering(
		sport: string,
		windowMs: number = 600000, // 10 minutes
	): Promise<
		Array<{
			eventIds: string[];
			clusterTime: number;
			commonAggressor: string;
			confidence: number;
		}>
	> {
		const cutoffTime = Date.now() - windowMs;

		// Get all recent movements for the sport
		const movements = this.db
			.query<
				{
					event_id: string;
					node_id: string;
					timestamp: number;
					bookmaker: string;
					movement_size: number;
				},
				[string, number]
			>(
				`SELECT 
					sn.event_id,
					lm.node_id,
					lm.timestamp,
					sn.bookmaker,
					lm.movement_size
				 FROM line_movements lm
				 JOIN shadow_nodes sn ON lm.node_id = sn.node_id
				 JOIN events e ON sn.event_id = e.id
				 WHERE e.sport = ?1 
				   AND lm.timestamp > ?2
				 ORDER BY lm.timestamp ASC`,
			)
			.all(sport, cutoffTime);

		// Cluster movements by time windows
		const clusters: Map<number, Set<string>> = new Map();
		const clusterAggressors: Map<number, Map<string, number>> = new Map();

		for (const move of movements) {
			if (Math.abs(move.movement_size) < this.MIN_MOVE_SIZE) continue;

			// Round to 5-minute windows
			const windowKey = Math.floor(move.timestamp / 300000) * 300000;

			if (!clusters.has(windowKey)) {
				clusters.set(windowKey, new Set());
				clusterAggressors.set(windowKey, new Map());
			}

			clusters.get(windowKey)!.add(move.event_id);
			const aggressorCount =
				clusterAggressors.get(windowKey)!.get(move.bookmaker) || 0;
			clusterAggressors.get(windowKey)!.set(move.bookmaker, aggressorCount + 1);
		}

		// Find significant clusters (3+ events)
		const significantClusters: Array<{
			eventIds: string[];
			clusterTime: number;
			commonAggressor: string;
			confidence: number;
		}> = [];

		for (const [windowTime, eventSet] of clusters) {
			if (eventSet.size >= 3) {
				// Find most common aggressor
				const aggressors = clusterAggressors.get(windowTime)!;
				let maxCount = 0;
				let commonAggressor = "unknown";

				for (const [bookmaker, count] of aggressors) {
					if (count > maxCount) {
						maxCount = count;
						commonAggressor = bookmaker;
					}
				}

				const confidence = Math.min(1, maxCount / eventSet.size);

				significantClusters.push({
					eventIds: Array.from(eventSet),
					clusterTime: windowTime,
					commonAggressor,
					confidence,
				});
			}
		}

		return significantClusters.sort((a, b) => b.confidence - a.confidence);
	}

	/**
	 * Find the first significant mover
	 */
	private findFirstMover(
		movements: Array<{
			node_id: string;
			line: number;
			movement_size: number;
			timestamp: number;
			bookmaker: string;
		}>,
	): {
		node_id: string;
		timestamp: number;
		bookmaker: string;
		line: number;
	} | null {
		for (const move of movements) {
			if (
				Math.abs(move.movement_size) >= this.MIN_MOVE_SIZE &&
				Math.abs(move.movement_size) * 1000 >= this.MIN_MOVE_SIZE_USD
			) {
				return {
					node_id: move.node_id,
					timestamp: move.timestamp,
					bookmaker: move.bookmaker,
					line: move.line,
				};
			}
		}

		return null;
	}

	/**
	 * Build cascade map showing propagation delays
	 */
	private buildCascadeMap(
		origin: { node_id: string; timestamp: number },
		movements: Array<{ node_id: string; timestamp: number }>,
	): Map<string, number> {
		const cascade = new Map<string, number>();

		for (const move of movements) {
			if (move.node_id === origin.node_id) continue;

			const lag = move.timestamp - origin.timestamp;

			if (lag > 0 && lag <= this.PROPAGATION_WINDOW_MS) {
				cascade.set(move.node_id, lag);
			}
		}

		return cascade;
	}

	/**
	 * Calculate latency ranking for bookmakers
	 */
	private calculateLatencyRanking(
		movements: Array<{ bookmaker: string; timestamp: number }>,
		originTime: number,
	): Array<{ bookmaker: string; avgLatency: number }> {
		const bookmakerLatencies = new Map<string, number[]>();

		for (const move of movements) {
			const lag = move.timestamp - originTime;

			if (lag > 0) {
				if (!bookmakerLatencies.has(move.bookmaker)) {
					bookmakerLatencies.set(move.bookmaker, []);
				}
				bookmakerLatencies.get(move.bookmaker)!.push(lag);
			}
		}

		const ranking: Array<{ bookmaker: string; avgLatency: number }> = [];

		for (const [bookmaker, latencies] of bookmakerLatencies) {
			const avgLatency =
				latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
			ranking.push({ bookmaker, avgLatency });
		}

		return ranking.sort((a, b) => a.avgLatency - b.avgLatency);
	}

	/**
	 * Analyze aggressor bookmaker signature
	 */
	private async analyzeAggressorSignature(bookmaker: string): Promise<{
		pattern: string;
		confidence: number;
	}> {
		// Analyze historical patterns for this bookmaker
		const historicalMoves = this.db
			.query<{ movement_size: number; timestamp: number }, [string]>(
				`SELECT lm.movement_size, lm.timestamp
				 FROM line_movements lm
				 JOIN shadow_nodes sn ON lm.node_id = sn.node_id
				 WHERE sn.bookmaker = ?1
				   AND lm.timestamp > ?2
				 ORDER BY lm.timestamp DESC
				 LIMIT 100`,
			)
			.all(bookmaker, Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

		if (historicalMoves.length === 0) {
			return { pattern: "unknown", confidence: 0 };
		}

		// Analyze move size distribution
		const avgMoveSize =
			historicalMoves.reduce((sum, m) => sum + Math.abs(m.movement_size), 0) /
			historicalMoves.length;

		// Classify pattern
		let pattern = "conservative";
		if (avgMoveSize > 0.5) {
			pattern = "aggressive";
		} else if (avgMoveSize > 0.3) {
			pattern = "moderate";
		}

		const confidence = Math.min(1, historicalMoves.length / 50);

		return { pattern, confidence };
	}

	/**
	 * Calculate origination confidence score
	 */
	private calculateOriginationConfidence(
		origin: { node_id: string; timestamp: number },
		cascade: Map<string, number>,
		allMovements: Array<{ timestamp: number }>,
	): number {
		// Factor 1: Cascade size (more followers = higher confidence)
		const cascadeFactor = Math.min(1, cascade.size / 10);

		// Factor 2: Time isolation (was this truly first?)
		const earlierMovements = allMovements.filter(
			(m) =>
				m.timestamp < origin.timestamp &&
				m.timestamp > origin.timestamp - 60000,
		);
		const isolationFactor =
			earlierMovements.length === 0
				? 1
				: Math.max(0, 1 - earlierMovements.length / 5);

		// Factor 3: Cascade consistency (do followers arrive in expected order?)
		const cascadeLatencies = Array.from(cascade.values());
		const avgLatency =
			cascadeLatencies.length > 0
				? cascadeLatencies.reduce((a, b) => a + b, 0) / cascadeLatencies.length
				: 0;
		const consistencyFactor = avgLatency > 0 && avgLatency < 120000 ? 1 : 0.5;

		return (
			cascadeFactor * 0.4 + isolationFactor * 0.3 + consistencyFactor * 0.3
		);
	}

	/**
	 * Get previous line for a node
	 */
	private getPreviousLine(nodeId: string, beforeTimestamp: number): number {
		const previous = this.db
			.query<{ line: number }, [string, number]>(
				`SELECT line 
				 FROM line_movements 
				 WHERE node_id = ?1 AND timestamp < ?2
				 ORDER BY timestamp DESC 
				 LIMIT 1`,
			)
			.get(nodeId, beforeTimestamp);

		return previous?.line || 0;
	}
}
