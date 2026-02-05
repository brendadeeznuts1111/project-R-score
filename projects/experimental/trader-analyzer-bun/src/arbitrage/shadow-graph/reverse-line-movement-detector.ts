/**
 * @fileoverview 1.1.1.1.2.1.0: Reverse Line Movement Detector
 * @description Detects sharp money disguised as public action via reverse line movement
 * @module arbitrage/shadow-graph/reverse-line-movement-detector
 */

import { Database } from "bun:sqlite";

/**
 * 1.1.1.1.2.1.2: Public-Betting Data Schema
 */
export interface PublicBettingData {
	market_id: string;
	ticketPercent: number; // % of public tickets on one side
	moneyPercent: number; // % of public money on one side
	timestamp: number;
	source?: string; // Data source (e.g., "sportsbook", "aggregator")
}

/**
 * Reverse Line Movement Detection Result
 */
export interface RLMDetectionResult {
	isRLM: boolean;
	sharpSide: "over" | "under" | "home" | "away" | "none";
	confidence: number; // 0-1
	publicBias: number; // Public ticket percentage
	correlationScore: number; // 1.1.1.1.2.1.3: RLM Correlation Score
	sharpContrarianIndicator: boolean; // 1.1.1.1.2.1.4: Sharp-Contrarian Indicator
	executionTimeWindow?: { start: number; end: number }; // 1.1.1.1.2.1.5: Execution-Time-Window Filter
}

/**
 * 1.1.1.1.2.1.1: Reverse-Line-Movement Detector
 *
 * Detects sharp money disguised as public action.
 * When public bets heavily on side A but line moves toward side B,
 * this indicates sharp money is on side B (contrarian play).
 */
export class ReverseLineMovementDetector {
	private readonly RLM_THRESHOLD = 0.75; // Line moves opposite to >75% public bets
	private readonly MIN_PUBLIC_PERCENT = 60; // Minimum public percentage to consider
	private readonly MIN_MOVE_SIZE = 0.25; // Minimum line move in points
	private readonly MIN_MOVE_SIZE_USD = 10000; // Minimum move size in USD

	constructor(private db: Database) {}

	/**
	 * Detect reverse line movement for a specific node
	 *
	 * @param eventId - Event identifier
	 * @param nodeId - Shadow node identifier
	 * @param windowMs - Time window to analyze (default: 60 seconds)
	 * @returns RLM detection result
	 */
	async detectRLM(
		eventId: string,
		nodeId: string,
		windowMs: number = 60000,
	): Promise<RLMDetectionResult> {
		// Fetch public betting data
		const publicData = await this.fetchPublicData(nodeId);

		// Get recent line movement
		const lineMovement = await this.getLineMovement(nodeId, windowMs);

		if (!lineMovement || publicData.ticketPercent < this.MIN_PUBLIC_PERCENT) {
			return {
				isRLM: false,
				sharpSide: "none",
				confidence: 0,
				publicBias: publicData.ticketPercent,
				correlationScore: 0,
				sharpContrarianIndicator: false,
			};
		}

		// Determine public side (which side public is betting)
		const publicSide = publicData.ticketPercent > 50 ? "over" : "under";
		const lineDirection = lineMovement.line_delta > 0 ? "over" : "under";

		// Check if line moved opposite to public (RLM detected)
		if (
			publicSide !== lineDirection &&
			Math.abs(lineMovement.line_delta) >= this.MIN_MOVE_SIZE
		) {
			// 1.1.1.1.2.1.3: RLM Correlation Score
			const correlationScore = this.calculateRLMCorrelationScore(
				publicData,
				lineMovement,
			);

			// 1.1.1.1.2.1.4: Sharp-Contrarian Indicator
			const sharpContrarianIndicator =
				publicData.ticketPercent > this.RLM_THRESHOLD * 100 &&
				Math.abs(lineMovement.line_delta) > this.MIN_MOVE_SIZE &&
				lineMovement.size_usd > this.MIN_MOVE_SIZE_USD;

			// 1.1.1.1.2.1.5: Execution-Time-Window Filter
			const executionTimeWindow = this.calculateExecutionWindow(
				lineMovement.timestamp,
				correlationScore,
			);

			return {
				isRLM: true,
				sharpSide: lineDirection,
				confidence: Math.min(
					1,
					(Math.abs(publicData.ticketPercent - 50) / 50) *
						Math.min(1, lineMovement.size_usd / 50000),
				),
				publicBias: publicData.ticketPercent,
				correlationScore,
				sharpContrarianIndicator,
				executionTimeWindow,
			};
		}

		return {
			isRLM: false,
			sharpSide: "none",
			confidence: 0,
			publicBias: publicData.ticketPercent,
			correlationScore: 0,
			sharpContrarianIndicator: false,
		};
	}

	/**
	 * 1.1.1.1.2.1.6: Multi-Bookmaker RLM Sync
	 *
	 * Detects RLM patterns across multiple bookmakers simultaneously
	 */
	async detectMultiBookmakerRLM(
		eventId: string,
		marketId: string,
	): Promise<Array<RLMDetectionResult & { bookmaker: string }>> {
		const bookmakers = this.db
			.query<{ bookmaker: string }, [string, string]>(
				`SELECT DISTINCT bookmaker 
				 FROM shadow_nodes 
				 WHERE event_id = ?1 AND market_id = ?2 AND visibility = 'display'`,
			)
			.all(eventId, marketId);

		const results: Array<RLMDetectionResult & { bookmaker: string }> = [];

		for (const { bookmaker } of bookmakers) {
			const nodeId = `${eventId}:${marketId}:${bookmaker}:full:display`;
			const rlm = await this.detectRLM(eventId, nodeId);

			if (rlm.isRLM) {
				results.push({ ...rlm, bookmaker });
			}
		}

		// Sort by confidence (highest first)
		return results.sort((a, b) => b.confidence - a.confidence);
	}

	/**
	 * Fetch public betting data for a node
	 */
	private async fetchPublicData(nodeId: string): Promise<PublicBettingData> {
		// In production, fetch from public betting data API
		// For now, simulate or query from database if stored
		const stored = this.db
			.query<
				{ ticket_percent: number; money_percent: number; timestamp: number },
				[string]
			>(
				`SELECT ticket_percent, money_percent, timestamp 
				 FROM public_betting_data 
				 WHERE node_id = ?1 
				 ORDER BY timestamp DESC 
				 LIMIT 1`,
			)
			.get(nodeId);

		if (stored) {
			return {
				market_id: nodeId,
				ticketPercent: stored.ticket_percent,
				moneyPercent: stored.money_percent,
				timestamp: stored.timestamp,
			};
		}

		// Default: no public data available
		return {
			market_id: nodeId,
			ticketPercent: 50,
			moneyPercent: 50,
			timestamp: Date.now(),
		};
	}

	/**
	 * Get recent line movement for a node
	 */
	private async getLineMovement(
		nodeId: string,
		windowMs: number,
	): Promise<{
		line_delta: number;
		size_usd: number;
		timestamp: number;
	} | null> {
		const cutoffTime = Date.now() - windowMs;

		const movements = this.db
			.query<
				{ line: number; movement_size: number; timestamp: number },
				[string, number]
			>(
				`SELECT line, movement_size, timestamp 
				 FROM line_movements 
				 WHERE node_id = ?1 AND timestamp >= ?2 
				 ORDER BY timestamp DESC 
				 LIMIT 2`,
			)
			.all(nodeId, cutoffTime);

		if (movements.length < 2) {
			return null;
		}

		const [current, previous] = movements;
		const line_delta = current.line - previous.line;

		return {
			line_delta,
			size_usd: current.movement_size * 1000 || 0, // Estimate USD size
			timestamp: current.timestamp,
		};
	}

	/**
	 * Calculate RLM correlation score
	 *
	 * Higher score = stronger RLM signal
	 */
	private calculateRLMCorrelationScore(
		publicData: PublicBettingData,
		lineMovement: { line_delta: number; size_usd: number },
	): number {
		// Factor 1: Public bias strength (how far from 50%)
		const publicBiasFactor = Math.abs(publicData.ticketPercent - 50) / 50;

		// Factor 2: Line move magnitude
		const moveMagnitudeFactor = Math.min(
			1,
			Math.abs(lineMovement.line_delta) / 1.0,
		);

		// Factor 3: Money size (larger moves = stronger signal)
		const sizeFactor = Math.min(1, lineMovement.size_usd / 50000);

		// Weighted combination
		return (
			publicBiasFactor * 0.4 + moveMagnitudeFactor * 0.3 + sizeFactor * 0.3
		);
	}

	/**
	 * Calculate optimal execution time window
	 *
	 * Returns window when RLM signal is strongest
	 */
	private calculateExecutionWindow(
		movementTimestamp: number,
		correlationScore: number,
	): { start: number; end: number } {
		// Window duration based on correlation score
		// Higher correlation = shorter window (act fast)
		const windowDurationMs = Math.max(30000, 300000 * (1 - correlationScore));

		return {
			start: movementTimestamp,
			end: movementTimestamp + windowDurationMs,
		};
	}
}
