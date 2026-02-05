/**
 * @fileoverview 1.1.1.1.2.3.0: Derivative Market Correlator
 * @description Detects correlations between derivative markets (e.g., player props → team totals)
 * @module arbitrage/shadow-graph/derivative-market-correlator
 */

import { Database } from "bun:sqlite";

/**
 * Derivative correlation analysis result
 */
export interface DerivativeCorrelationResult {
	correlation: number; // 1.1.1.1.2.3.1: Derivative-Market Correlator
	expectedImpact: number; // Expected line move in derivative market
	actualImpact: number; // Actual move observed
	isLeading: boolean; // Is source market leading derivative?
	statisticalSignificance: number; // 1.1.1.1.2.3.6: Statistical Significance Test
	correlationBreak: boolean; // 1.1.1.1.2.3.5: Correlation Break Detection
	breakMagnitude: number; // Magnitude of correlation break
}

/**
 * Hedge recommendation
 */
export interface HedgeRecommendation {
	hedgeNode: string;
	hedgeSize: number;
	confidence: number;
	reason: string;
}

/**
 * 1.1.1.1.2.3.1: Derivative-Market Correlator
 *
 * Detects when movements in one market should spill over to related markets.
 * Examples:
 * - Player prop moves → Team total moves (1.1.1.1.2.3.2: Player-Prop → Team-Total Edge)
 * - Quarter markets → Full game markets (1.1.1.1.2.3.3: Quarter→Full-Game Propagation)
 */
export class DerivativeMarketCorrelator {
	private readonly CORRELATION_THRESHOLD = 0.6;
	private readonly BREAK_THRESHOLD = 0.5; // 0.5 point deviation = break
	private readonly MIN_SAMPLE_SIZE = 20;

	constructor(private db: Database) {}

	/**
	 * Detect derivative correlation between two markets
	 *
	 * @param sourceNodeId - Source market node (e.g., player prop)
	 * @param derivativeNodeId - Derivative market node (e.g., team total)
	 * @param windowMs - Time window to analyze (default: 5 minutes)
	 */
	async detectDerivativeCorrelation(
		sourceNodeId: string,
		derivativeNodeId: string,
		windowMs: number = 300000,
	): Promise<DerivativeCorrelationResult> {
		const sourceMoves = await this.getRecentMoves(sourceNodeId, windowMs);
		const derivativeMoves = await this.getRecentMoves(
			derivativeNodeId,
			windowMs,
		);

		if (sourceMoves.length === 0 || derivativeMoves.length === 0) {
			return {
				correlation: 0,
				expectedImpact: 0,
				actualImpact: 0,
				isLeading: false,
				statisticalSignificance: 0,
				correlationBreak: false,
				breakMagnitude: 0,
			};
		}

		// 1.1.1.1.2.3.1: Calculate lead-lag correlation
		const { correlation, leadLagMs } = this.crossCorrelate(
			sourceMoves,
			derivativeMoves,
		);

		// Calculate expected impact based on historical regression
		const expectedImpact = await this.getExpectedImpact(
			sourceNodeId,
			derivativeNodeId,
			Math.abs(sourceMoves[0]?.line_delta || 0),
		);

		const actualImpact = derivativeMoves[0]?.line_delta || 0;

		// 1.1.1.1.2.3.5: Correlation Break Detection
		const correlationBreak =
			Math.abs(actualImpact - expectedImpact) > this.BREAK_THRESHOLD;
		const breakMagnitude = Math.abs(actualImpact - expectedImpact);

		// 1.1.1.1.2.3.6: Statistical Significance Test
		const statisticalSignificance = this.calculateStatisticalSignificance(
			sourceMoves,
			derivativeMoves,
			correlation,
		);

		return {
			correlation,
			expectedImpact,
			actualImpact,
			isLeading: leadLagMs < 0, // Source moves first
			statisticalSignificance,
			correlationBreak,
			breakMagnitude,
		};
	}

	/**
	 * 1.1.1.1.2.3.7: Auto-Hedge Recommendation
	 *
	 * Generates hedge recommendation when derivative correlation breaks
	 */
	async generateHedgeRecommendation(
		sourceNodeId: string,
		derivativeNodeId: string,
	): Promise<HedgeRecommendation | null> {
		const correlation = await this.detectDerivativeCorrelation(
			sourceNodeId,
			derivativeNodeId,
		);

		// If correlation breaks significantly
		if (
			correlation.correlationBreak &&
			correlation.breakMagnitude > this.BREAK_THRESHOLD &&
			correlation.statisticalSignificance > 0.7
		) {
			return {
				hedgeNode: derivativeNodeId,
				hedgeSize: correlation.expectedImpact * 0.7, // 70% hedge ratio
				confidence: correlation.statisticalSignificance,
				reason: `Correlation break detected: expected ${correlation.expectedImpact.toFixed(2)}, actual ${correlation.actualImpact.toFixed(2)}`,
			};
		}

		return null;
	}

	/**
	 * 1.1.1.1.2.3.4: Injury News Impact Factor
	 *
	 * Adjusts correlation expectations based on injury news
	 */
	async adjustForInjuryNews(
		nodeId: string,
		injurySeverity: "minor" | "moderate" | "major",
	): Promise<number> {
		// Impact multipliers based on injury severity
		const multipliers: Record<string, number> = {
			minor: 1.1,
			moderate: 1.5,
			major: 2.0,
		};

		return multipliers[injurySeverity] || 1.0;
	}

	/**
	 * Get recent line movements for a node
	 */
	private async getRecentMoves(
		nodeId: string,
		windowMs: number,
	): Promise<Array<{ line_delta: number; timestamp: number }>> {
		const cutoffTime = Date.now() - windowMs;

		const movements = this.db
			.query<{ line: number; timestamp: number }, [string, number]>(
				`SELECT line, timestamp 
				 FROM line_movements 
				 WHERE node_id = ?1 AND timestamp >= ?2
				 ORDER BY timestamp ASC`,
			)
			.all(nodeId, cutoffTime);

		if (movements.length < 2) {
			return [];
		}

		const deltas: Array<{ line_delta: number; timestamp: number }> = [];

		for (let i = 1; i < movements.length; i++) {
			const delta = movements[i].line - movements[i - 1].line;
			deltas.push({
				line_delta: delta,
				timestamp: movements[i].timestamp,
			});
		}

		return deltas;
	}

	/**
	 * Cross-correlate two time series
	 *
	 * Returns correlation coefficient and lead-lag relationship
	 */
	private crossCorrelate(
		seriesA: Array<{ line_delta: number; timestamp: number }>,
		seriesB: Array<{ line_delta: number; timestamp: number }>,
	): { correlation: number; leadLagMs: number } {
		if (seriesA.length === 0 || seriesB.length === 0) {
			return { correlation: 0, leadLagMs: 0 };
		}

		// Align time series
		const aligned: Array<{ a: number; b: number }> = [];

		for (const moveA of seriesA) {
			// Find closest move in series B
			const closestB = seriesB.reduce((closest, moveB) => {
				const distA = Math.abs(moveA.timestamp - closest.timestamp);
				const distB = Math.abs(moveA.timestamp - moveB.timestamp);
				return distB < distA ? moveB : closest;
			}, seriesB[0]);

			if (Math.abs(moveA.timestamp - closestB.timestamp) < 60000) {
				// Within 1 minute
				aligned.push({ a: moveA.line_delta, b: closestB.line_delta });
			}
		}

		if (aligned.length < 3) {
			return { correlation: 0, leadLagMs: 0 };
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

		const correlation =
			sumSqA > 0 && sumSqB > 0 ? numerator / Math.sqrt(sumSqA * sumSqB) : 0;

		// Calculate average lead-lag
		const leadLagSum = seriesA.reduce((sum, moveA) => {
			const closestB = seriesB.reduce((closest, moveB) => {
				const distA = Math.abs(moveA.timestamp - closest.timestamp);
				const distB = Math.abs(moveA.timestamp - moveB.timestamp);
				return distB < distA ? moveB : closest;
			}, seriesB[0]);
			return sum + (moveA.timestamp - closestB.timestamp);
		}, 0);

		const leadLagMs = leadLagSum / seriesA.length;

		return { correlation, leadLagMs };
	}

	/**
	 * Get expected impact based on historical regression
	 */
	private async getExpectedImpact(
		sourceNodeId: string,
		derivativeNodeId: string,
		sourceMoveSize: number,
	): Promise<number> {
		// Query historical correlation data
		const historical = this.db
			.query<
				{ source_move: number; derivative_move: number },
				[string, string]
			>(
				`SELECT 
					ABS(lm1.line - LAG(lm1.line) OVER (ORDER BY lm1.timestamp)) as source_move,
					ABS(lm2.line - LAG(lm2.line) OVER (ORDER BY lm2.timestamp)) as derivative_move
				 FROM line_movements lm1
				 JOIN line_movements lm2 ON ABS(lm1.timestamp - lm2.timestamp) < 60000
				 WHERE lm1.node_id = ?1 AND lm2.node_id = ?2
				   AND lm1.timestamp > ?3
				 LIMIT 50`,
			)
			.all(
				sourceNodeId,
				derivativeNodeId,
				Date.now() - 7 * 24 * 60 * 60 * 1000,
			);

		if (historical.length < this.MIN_SAMPLE_SIZE) {
			// Default regression: assume 0.5x impact
			return sourceMoveSize * 0.5;
		}

		// Simple linear regression: derivative_move = slope * source_move
		const sumX = historical.reduce((sum, h) => sum + h.source_move, 0);
		const sumY = historical.reduce((sum, h) => sum + h.derivative_move, 0);
		const sumXY = historical.reduce(
			(sum, h) => sum + h.source_move * h.derivative_move,
			0,
		);
		const sumXX = historical.reduce(
			(sum, h) => sum + h.source_move * h.source_move,
			0,
		);

		const slope =
			(sumXY - (sumX * sumY) / historical.length) /
			(sumXX - (sumX * sumX) / historical.length);

		return sourceMoveSize * (slope || 0.5);
	}

	/**
	 * Calculate statistical significance (p-value approximation)
	 */
	private calculateStatisticalSignificance(
		seriesA: Array<{ line_delta: number }>,
		seriesB: Array<{ line_delta: number }>,
		correlation: number,
	): number {
		if (seriesA.length < this.MIN_SAMPLE_SIZE) {
			return 0;
		}

		// Simplified significance test: t-statistic approximation
		const n = Math.min(seriesA.length, seriesB.length);
		const tStat =
			(correlation * Math.sqrt(n - 2)) /
			Math.sqrt(1 - correlation * correlation);

		// Approximate p-value (two-tailed)
		// For n > 30, t > 2 is roughly p < 0.05
		const pValue = Math.max(0, Math.min(1, 1 - Math.abs(tStat) / 3));

		return pValue;
	}
}
