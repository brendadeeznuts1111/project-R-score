/**
 * @fileoverview 1.1.1.1.2.5.0: Cross-Sport Arbitrage Matrix
 * @description Finds hidden edges across sports (e.g., shared players, weather, futures)
 * @module arbitrage/shadow-graph/cross-sport-arbitrage
 */

import { Database } from "bun:sqlite";

/**
 * Cross-sport edge
 */
export interface CrossSportEdge {
	sportA: string;
	sportB: string;
	correlation: number;
	arbOpportunity: boolean;
	requiredHedge: number;
	edgeType: "player" | "weather" | "futures" | "team";
	confidence: number;
}

/**
 * 1.1.1.1.2.5.1: Cross-Sport Arbitrage Matrix
 *
 * Finds hidden edges across sports when:
 * - Shared players affect multiple sports (1.1.1.1.2.5.3: Shared-Player Prop Link)
 * - Weather affects outdoor sports (1.1.1.1.2.5.4: Weather-Derived Edges)
 * - Championship futures correlate (1.1.1.1.2.5.5: Championship Futures Hedge)
 */
export class CrossSportArbitrage {
	private readonly MIN_CORRELATION = 0.6;
	private readonly TIME_WINDOW_MS = 7200000; // 2 hours

	constructor(private db: Database) {}

	/**
	 * Find cross-sport edges for a player
	 *
	 * Example: NBA player props affecting NFL player props when player crosses sports
	 */
	async findCrossSportEdges(playerName: string): Promise<CrossSportEdge[]> {
		const eventsA = await this.findPlayerEvents(playerName, "nba");
		const eventsB = await this.findPlayerEvents(playerName, "nfl");

		const edges: CrossSportEdge[] = [];

		for (const eventA of eventsA) {
			for (const eventB of eventsB) {
				// Check if events overlap in time
				if (
					Math.abs(eventA.startTime - eventB.startTime) < this.TIME_WINDOW_MS
				) {
					const correlation = await this.calculateCrossCorrelation(
						eventA.id,
						eventB.id,
					);

					if (correlation > this.MIN_CORRELATION) {
						edges.push({
							sportA: "nba",
							sportB: "nfl",
							correlation,
							arbOpportunity: correlation > 0.8,
							requiredHedge: 1 / correlation - 1, // Hedge ratio
							edgeType: "player",
							confidence: correlation,
						});
					}
				}
			}
		}

		return edges;
	}

	/**
	 * 1.1.1.1.2.5.2: Correlated Event Discovery
	 *
	 * Discovers events that are correlated across sports
	 */
	async discoverCorrelatedEvents(
		sportA: string,
		sportB: string,
	): Promise<
		Array<{
			eventA: string;
			eventB: string;
			correlation: number;
			reason: string;
		}>
	> {
		const eventsA = await this.getUpcomingEvents(sportA);
		const eventsB = await this.getUpcomingEvents(sportB);

		const correlations: Array<{
			eventA: string;
			eventB: string;
			correlation: number;
			reason: string;
		}> = [];

		for (const eventA of eventsA) {
			for (const eventB of eventsB) {
				// Check time proximity
				if (
					Math.abs(eventA.startTime - eventB.startTime) < this.TIME_WINDOW_MS
				) {
					// Check for shared players
					const sharedPlayers = await this.findSharedPlayers(
						eventA.id,
						eventB.id,
					);
					if (sharedPlayers.length > 0) {
						const correlation = await this.calculateCrossCorrelation(
							eventA.id,
							eventB.id,
						);
						if (correlation > this.MIN_CORRELATION) {
							correlations.push({
								eventA: eventA.id,
								eventB: eventB.id,
								correlation,
								reason: `Shared players: ${sharedPlayers.join(", ")}`,
							});
						}
					}

					// Check for weather correlation (if both outdoor)
					if (await this.isWeatherCorrelated(eventA.id, eventB.id)) {
						const correlation = await this.calculateCrossCorrelation(
							eventA.id,
							eventB.id,
						);
						if (correlation > this.MIN_CORRELATION) {
							correlations.push({
								eventA: eventA.id,
								eventB: eventB.id,
								correlation,
								reason: "Weather correlation",
							});
						}
					}
				}
			}
		}

		return correlations;
	}

	/**
	 * 1.1.1.1.2.5.6: Cross-Sport Liquidity Weighting
	 *
	 * Adjusts arbitrage capacity based on cross-sport liquidity
	 */
	calculateLiquidityWeighting(
		sportA: string,
		sportB: string,
		liquidityA: number,
		liquidityB: number,
	): number {
		// Weight by sport liquidity factors
		const sportFactors: Record<string, number> = {
			nfl: 1.2,
			nba: 1.0,
			mlb: 0.8,
			nhl: 0.7,
		};

		const factorA = sportFactors[sportA] || 1.0;
		const factorB = sportFactors[sportB] || 1.0;

		// Weighted minimum
		return Math.min(liquidityA * factorA, liquidityB * factorB);
	}

	/**
	 * 1.1.1.1.2.5.7: Simultaneous Execution Manager
	 *
	 * Manages simultaneous execution across sports
	 */
	async executeSimultaneous(
		edges: CrossSportEdge[],
	): Promise<
		Array<{ edge: CrossSportEdge; executed: boolean; profit: number }>
	> {
		const results: Array<{
			edge: CrossSportEdge;
			executed: boolean;
			profit: number;
		}> = [];

		for (const edge of edges) {
			if (edge.arbOpportunity) {
				// Execute trades simultaneously
				const executed = await this.executeCrossSportTrade(edge);
				const profit = executed ? edge.correlation * 0.02 : 0; // Estimate profit

				results.push({ edge, executed, profit });
			}
		}

		return results;
	}

	/**
	 * Find events for a player in a sport
	 */
	private async findPlayerEvents(
		playerName: string,
		sport: string,
	): Promise<Array<{ id: string; startTime: number }>> {
		// Query events with player props
		return this.db
			.query<{ id: string; start_time: number }, [string, string]>(
				`SELECT DISTINCT e.id, e.start_time
				 FROM events e
				 JOIN shadow_nodes sn ON sn.event_id = e.id
				 WHERE e.sport = ?1
				   AND sn.market_id LIKE ?2
				   AND e.start_time > ?3`,
			)
			.all(sport, `%${playerName}%`, Date.now());
	}

	/**
	 * Calculate cross-correlation between two events
	 */
	private async calculateCrossCorrelation(
		eventIdA: string,
		eventIdB: string,
	): Promise<number> {
		// Get movements for both events
		const movementsA = await this.getEventMovements(eventIdA);
		const movementsB = await this.getEventMovements(eventIdB);

		if (movementsA.length === 0 || movementsB.length === 0) {
			return 0;
		}

		// Align time series and calculate correlation
		const aligned: Array<{ a: number; b: number }> = [];

		for (const moveA of movementsA) {
			const closestB = movementsB.reduce((closest, moveB) => {
				const distA = Math.abs(moveA.timestamp - closest.timestamp);
				const distB = Math.abs(moveA.timestamp - moveB.timestamp);
				return distB < distA ? moveB : closest;
			}, movementsB[0]);

			if (Math.abs(moveA.timestamp - closestB.timestamp) < 300000) {
				// Within 5 minutes
				aligned.push({ a: moveA.line_delta, b: closestB.line_delta });
			}
		}

		if (aligned.length < 5) {
			return 0;
		}

		// Calculate Pearson correlation
		const meanA = aligned.reduce((sum, p) => sum + p.a, 0) / aligned.length;
		const meanB = aligned.reduce((sum, p) => sum + p.b, 0) / aligned.length;

		let numerator = 0;
		let sumSqA = 0;
		let sumSqB = 0;

		for (const point of aligned) {
			const diffA = point.a - meanA;
			const diffB = point.b - meanB;
			numerator += diffA * diffB;
			sumSqA += diffA * diffA;
			sumSqB += diffB * diffB;
		}

		return sumSqA > 0 && sumSqB > 0
			? numerator / Math.sqrt(sumSqA * sumSqB)
			: 0;
	}

	/**
	 * Get upcoming events for a sport
	 */
	private async getUpcomingEvents(
		sport: string,
	): Promise<Array<{ id: string; startTime: number }>> {
		return this.db
			.query<{ id: string; start_time: number }, [string, number]>(
				`SELECT id, start_time 
				 FROM events 
				 WHERE sport = ?1 AND start_time > ?2
				 ORDER BY start_time ASC
				 LIMIT 50`,
			)
			.all(sport, Date.now());
	}

	/**
	 * Find shared players between events
	 */
	private async findSharedPlayers(
		eventIdA: string,
		eventIdB: string,
	): Promise<string[]> {
		// Extract player names from market IDs
		const playersA = await this.extractPlayersFromMarkets(eventIdA);
		const playersB = await this.extractPlayersFromMarkets(eventIdB);

		return playersA.filter((p) => playersB.includes(p));
	}

	/**
	 * Extract player names from market IDs
	 */
	private async extractPlayersFromMarkets(eventId: string): Promise<string[]> {
		const markets = this.db
			.query<{ market_id: string }, [string]>(
				`SELECT DISTINCT market_id 
				 FROM shadow_nodes 
				 WHERE event_id = ?1 AND market_id LIKE '%player%'`,
			)
			.all(eventId);

		// Simple extraction: assume player name is in market_id
		// In production, use NLP or structured data
		return markets.map((m) => m.market_id.split("_")[0]).filter(Boolean);
	}

	/**
	 * Check if events are weather-correlated
	 */
	private async isWeatherCorrelated(
		eventIdA: string,
		eventIdB: string,
	): Promise<boolean> {
		// Check if both are outdoor sports
		const eventA = await this.getEventInfo(eventIdA);
		const eventB = await this.getEventInfo(eventIdB);

		const outdoorSports = ["nfl", "mlb", "nhl"]; // Simplified

		return (
			outdoorSports.includes(eventA.sport) &&
			outdoorSports.includes(eventB.sport) &&
			Math.abs(eventA.startTime - eventB.startTime) < 3600000 // Within 1 hour
		);
	}

	/**
	 * Get event movements
	 */
	private async getEventMovements(eventId: string): Promise<
		Array<{
			line_delta: number;
			timestamp: number;
		}>
	> {
		const movements = this.db
			.query<{ line: number; timestamp: number }, [string, number]>(
				`SELECT lm.line, lm.timestamp
				 FROM line_movements lm
				 JOIN shadow_nodes sn ON lm.node_id = sn.node_id
				 WHERE sn.event_id = ?1
				   AND lm.timestamp > ?2
				 ORDER BY lm.timestamp ASC`,
			)
			.all(eventId, Date.now() - 24 * 60 * 60 * 1000);

		const deltas: Array<{ line_delta: number; timestamp: number }> = [];

		for (let i = 1; i < movements.length; i++) {
			deltas.push({
				line_delta: movements[i].line - movements[i - 1].line,
				timestamp: movements[i].timestamp,
			});
		}

		return deltas;
	}

	/**
	 * Get event info
	 */
	private async getEventInfo(
		eventId: string,
	): Promise<{ sport: string; startTime: number }> {
		const event = this.db
			.query<{ sport: string; start_time: number }, [string]>(
				`SELECT sport, start_time FROM events WHERE id = ?1`,
			)
			.get(eventId);

		return event || { sport: "unknown", startTime: Date.now() };
	}

	/**
	 * Execute cross-sport trade
	 */
	private async executeCrossSportTrade(edge: CrossSportEdge): Promise<boolean> {
		// Placeholder: implement actual trade execution
		console.log(`Executing cross-sport trade: ${edge.sportA} ↔ ${edge.sportB}`);
		return true;
	}
}
