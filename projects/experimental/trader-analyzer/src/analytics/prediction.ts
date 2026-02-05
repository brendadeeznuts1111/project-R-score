/**
 * @fileoverview Prediction market analytics calculator
 * @description Analyzes prediction market trading with calibration and edge metrics
 * @module analytics/prediction
 *
 * @example
 * const stats = calculatePredictionStats(trades, positions, markets);
 * console.log(`Win rate: ${stats.winRate.toFixed(1)}%`);
 * console.log(`Calibration: ${stats.calibrationScore}/100`);
 */

import type {
	PredictionMarket,
	PredictionPosition,
	PredictionTrade,
} from "../types";

// ============ Prediction Market Stats ============

/**
 * Comprehensive statistics for prediction market trading
 */
export interface PredictionStats {
	// Volume
	totalTrades: number;
	totalContracts: number;
	totalVolume: number; // USD

	// Performance
	resolvedPositions: number;
	winningPositions: number;
	losingPositions: number;
	winRate: number;

	// PnL
	realizedPnl: number;
	unrealizedPnl: number;
	totalPnl: number;
	avgPnlPerPosition: number;

	// Calibration (how well-calibrated are your probability estimates)
	avgEntryPrice: number;
	avgResolutionPrice: number;
	calibrationScore: number; // 0-100, how close entry prices are to outcomes

	// Categories
	categoryCounts: Record<string, number>;
	categoryPnl: Record<string, number>;

	// Timing
	avgHoldingDays: number;
	avgDaysToResolution: number;
}

/**
 * Calculates comprehensive prediction market statistics
 *
 * Analyzes trades against market resolutions to compute:
 * - Volume and PnL metrics
 * - Win rate on resolved positions
 * - Calibration score (how well entry prices predict outcomes)
 * - Category-level performance breakdown
 * - Timing metrics (holding periods)
 *
 * @param trades - Array of prediction market trades
 * @param positions - Current open positions for unrealized PnL
 * @param markets - Market data with resolution outcomes
 * @returns Complete prediction market statistics
 *
 * @example
 * const stats = calculatePredictionStats(trades, positions, markets);
 * console.log(`Calibration: ${stats.calibrationScore}/100`);
 * console.log(`Best category: ${Object.keys(stats.categoryPnl)[0]}`);
 */
export function calculatePredictionStats(
	trades: PredictionTrade[],
	positions: PredictionPosition[],
	markets: PredictionMarket[],
): PredictionStats {
	if (trades.length === 0) {
		return emptyPredictionStats();
	}

	// Build market map
	const marketMap = new Map(markets.map((m) => [m.id, m]));

	// Volume metrics
	const totalContracts = trades.reduce((sum, t) => sum + t.amount, 0);
	const totalVolume = trades.reduce((sum, t) => sum + t.cost, 0);

	// Aggregate by market to get position-level stats
	const positionByMarket = aggregateByMarket(trades);

	// Calculate outcomes
	let resolvedPositions = 0;
	let winningPositions = 0;
	let losingPositions = 0;
	let realizedPnl = 0;
	let totalEntryPrice = 0;
	let totalResolutionPrice = 0;
	const categoryCounts: Record<string, number> = {};
	const categoryPnl: Record<string, number> = {};

	for (const [marketId, pos] of positionByMarket) {
		const market = marketMap.get(marketId);

		if (market?.status === "resolved") {
			resolvedPositions++;

			// Determine if won or lost
			const resolved = market.resolution === "Yes" ? 1 : 0;
			const isYesSide = pos.side === "yes";
			const expectedPayout = isYesSide ? resolved : 1 - resolved;
			const pnl = pos.contracts * (expectedPayout - pos.avgPrice) - pos.fees;

			realizedPnl += pnl;
			totalEntryPrice += pos.avgPrice;
			totalResolutionPrice += resolved;

			if (pnl > 0) {
				winningPositions++;
			} else {
				losingPositions++;
			}
		}

		// Category tracking
		const category = market?.category || "unknown";
		categoryCounts[category] = (categoryCounts[category] || 0) + 1;
		categoryPnl[category] = (categoryPnl[category] || 0) + pos.realizedPnl;
	}

	// Unrealized PnL from open positions
	const unrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);

	// Calibration score
	const calibrationScore =
		resolvedPositions > 0
			? calculateCalibrationScore(positionByMarket, marketMap)
			: 50;

	// Timing metrics
	const holdingStats = calculateHoldingTime(trades);

	return {
		totalTrades: trades.length,
		totalContracts,
		totalVolume,
		resolvedPositions,
		winningPositions,
		losingPositions,
		winRate:
			resolvedPositions > 0 ? (winningPositions / resolvedPositions) * 100 : 0,
		realizedPnl,
		unrealizedPnl,
		totalPnl: realizedPnl + unrealizedPnl,
		avgPnlPerPosition:
			resolvedPositions > 0 ? realizedPnl / resolvedPositions : 0,
		avgEntryPrice:
			resolvedPositions > 0 ? totalEntryPrice / resolvedPositions : 0,
		avgResolutionPrice:
			resolvedPositions > 0 ? totalResolutionPrice / resolvedPositions : 0,
		calibrationScore,
		categoryCounts,
		categoryPnl,
		avgHoldingDays: holdingStats.avgHoldingDays,
		avgDaysToResolution: holdingStats.avgDaysToResolution,
	};
}

/**
 * Returns empty statistics for when no trades exist
 * @internal
 */
function emptyPredictionStats(): PredictionStats {
	return {
		totalTrades: 0,
		totalContracts: 0,
		totalVolume: 0,
		resolvedPositions: 0,
		winningPositions: 0,
		losingPositions: 0,
		winRate: 0,
		realizedPnl: 0,
		unrealizedPnl: 0,
		totalPnl: 0,
		avgPnlPerPosition: 0,
		avgEntryPrice: 0,
		avgResolutionPrice: 0,
		calibrationScore: 50,
		categoryCounts: {},
		categoryPnl: {},
		avgHoldingDays: 0,
		avgDaysToResolution: 0,
	};
}

// ============ Position Aggregation ============

/**
 * Internal representation of aggregated position by market
 * @internal
 */
interface AggregatedPosition {
	marketId: string;
	side: "yes" | "no";
	contracts: number;
	avgPrice: number;
	fees: number;
	realizedPnl: number;
	firstTrade: string;
	lastTrade: string;
}

/**
 * Aggregates trades into positions by market
 *
 * Groups trades by market ID and calculates average entry price,
 * realized PnL, and current position size.
 *
 * @param trades - Trades to aggregate
 * @returns Map of market ID to aggregated position
 * @internal
 */
function aggregateByMarket(
	trades: PredictionTrade[],
): Map<string, AggregatedPosition> {
	const positions = new Map<string, AggregatedPosition>();

	for (const trade of trades) {
		const key = trade.marketId;
		let pos = positions.get(key);

		if (!pos) {
			pos = {
				marketId: trade.marketId,
				side: trade.side === "buy" ? "yes" : "no",
				contracts: 0,
				avgPrice: 0,
				fees: 0,
				realizedPnl: 0,
				firstTrade: trade.datetime,
				lastTrade: trade.datetime,
			};
			positions.set(key, pos);
		}

		const qty = trade.side === "buy" ? trade.amount : -trade.amount;

		if ((pos.contracts > 0 && qty > 0) || (pos.contracts < 0 && qty < 0)) {
			// Adding to position
			const totalCost =
				pos.avgPrice * Math.abs(pos.contracts) + trade.price * Math.abs(qty);
			pos.contracts += qty;
			pos.avgPrice =
				pos.contracts !== 0 ? totalCost / Math.abs(pos.contracts) : 0;
		} else {
			// Reducing/closing position
			const closedQty = Math.min(Math.abs(pos.contracts), Math.abs(qty));
			const pnl =
				closedQty * (trade.price - pos.avgPrice) * (pos.contracts > 0 ? 1 : -1);
			pos.realizedPnl += pnl;
			pos.contracts += qty;
		}

		pos.fees += trade.fee;
		pos.lastTrade = trade.datetime;
	}

	return positions;
}

// ============ Calibration Score ============

/**
 * Calculates calibration score using Brier-style analysis
 *
 * Groups positions into probability buckets (0-10%, 10-20%, etc.)
 * and measures how closely entry prices match actual resolution frequencies.
 * A perfectly calibrated trader with 70% entries would see 70% resolve YES.
 *
 * @param positions - Aggregated positions by market
 * @param markets - Markets with resolution outcomes
 * @returns Score from 0-100 (100 = perfect calibration)
 * @internal
 */
function calculateCalibrationScore(
	positions: Map<string, AggregatedPosition>,
	markets: Map<string, PredictionMarket>,
): number {
	// Brier score style calibration
	// Perfect calibration: entry price of 0.7 should resolve YES 70% of the time

	const buckets: { sum: number; count: number; outcomes: number }[] = Array(10)
		.fill(null)
		.map(() => ({ sum: 0, count: 0, outcomes: 0 }));

	for (const [marketId, pos] of positions) {
		const market = markets.get(marketId);
		if (!market || market.status !== "resolved") continue;

		const entryPrice = pos.avgPrice;
		const bucketIdx = Math.min(9, Math.floor(entryPrice * 10));

		buckets[bucketIdx].sum += entryPrice;
		buckets[bucketIdx].count += 1;
		buckets[bucketIdx].outcomes += market.resolution === "Yes" ? 1 : 0;
	}

	// Calculate calibration error
	let totalError = 0;
	let totalCount = 0;

	for (const bucket of buckets) {
		if (bucket.count === 0) continue;

		const avgPrediction = bucket.sum / bucket.count;
		const actualFrequency = bucket.outcomes / bucket.count;
		const error = Math.abs(avgPrediction - actualFrequency);

		totalError += error * bucket.count;
		totalCount += bucket.count;
	}

	const avgError = totalCount > 0 ? totalError / totalCount : 0.5;

	// Convert to 0-100 score (0 error = 100, 0.5 error = 0)
	return Math.round((1 - avgError * 2) * 100);
}

// ============ Holding Time Analysis ============

/**
 * Calculates average holding time for closed positions
 *
 * @param trades - Trades to analyze
 * @returns Average holding days and days to resolution
 * @internal
 */
function calculateHoldingTime(trades: PredictionTrade[]): {
	avgHoldingDays: number;
	avgDaysToResolution: number;
} {
	// Group trades by market and calculate holding periods
	const positions = aggregateByMarket(trades);

	let totalHoldingMs = 0;
	let holdingCount = 0;

	for (const pos of positions.values()) {
		if (pos.contracts === 0) {
			// Closed position
			const holdingMs =
				new Date(pos.lastTrade).getTime() - new Date(pos.firstTrade).getTime();
			totalHoldingMs += holdingMs;
			holdingCount++;
		}
	}

	const avgHoldingDays =
		holdingCount > 0 ? totalHoldingMs / holdingCount / 1000 / 60 / 60 / 24 : 0;

	return {
		avgHoldingDays,
		avgDaysToResolution: avgHoldingDays, // Would need resolution dates for accuracy
	};
}

// ============ Edge Analysis ============

/**
 * Edge analysis results for prediction market trading
 */
export interface EdgeAnalysis {
	/** Average difference between entry price and 50% baseline */
	impliedEdge: number;
	/** Actual outcome vs entry price (realized profitability) */
	realizedEdge: number;
	/** Difference between implied and realized edge */
	edgeDecay: number;
	/** Top categories by realized edge */
	bestCategories: { category: string; edge: number }[];
}

/**
 * Analyzes trading edge in prediction markets
 *
 * Computes implied edge (deviation from 50%), realized edge
 * (actual outcomes vs entries), and identifies best-performing categories.
 *
 * @param trades - Prediction market trades
 * @param markets - Markets with resolution data
 * @returns Edge analysis with category breakdown
 *
 * @example
 * const edge = analyzeEdge(trades, markets);
 * console.log(`Realized edge: ${(edge.realizedEdge * 100).toFixed(2)}%`);
 * console.log(`Best category: ${edge.bestCategories[0]?.category}`);
 */
export function analyzeEdge(
	trades: PredictionTrade[],
	markets: PredictionMarket[],
): EdgeAnalysis {
	const marketMap = new Map(markets.map((m) => [m.id, m]));
	const positions = aggregateByMarket(trades);

	let totalImpliedEdge = 0;
	let totalRealizedEdge = 0;
	let edgeCount = 0;
	const categoryEdges: Record<string, { sum: number; count: number }> = {};

	for (const [marketId, pos] of positions) {
		const market = marketMap.get(marketId);
		if (!market || market.status !== "resolved") continue;

		const resolved = market.resolution === "Yes" ? 1 : 0;
		const isYesSide = pos.side === "yes";

		// Implied edge: entry price vs 50% (neutral)
		const impliedEdge = isYesSide
			? 0.5 - pos.avgPrice // Buying YES below 50% is positive edge
			: pos.avgPrice - 0.5; // Buying NO above 50% is positive edge

		// Realized edge: actual outcome vs entry
		const realizedEdge = isYesSide
			? resolved - pos.avgPrice
			: 1 - resolved - (1 - pos.avgPrice);

		totalImpliedEdge += impliedEdge;
		totalRealizedEdge += realizedEdge;
		edgeCount++;

		// Track by category
		const category = market.category || "unknown";
		if (!categoryEdges[category]) {
			categoryEdges[category] = { sum: 0, count: 0 };
		}
		categoryEdges[category].sum += realizedEdge;
		categoryEdges[category].count++;
	}

	const avgImpliedEdge = edgeCount > 0 ? totalImpliedEdge / edgeCount : 0;
	const avgRealizedEdge = edgeCount > 0 ? totalRealizedEdge / edgeCount : 0;

	// Best categories by edge
	const bestCategories = Object.entries(categoryEdges)
		.map(([category, data]) => ({
			category,
			edge: data.count > 0 ? data.sum / data.count : 0,
		}))
		.sort((a, b) => b.edge - a.edge)
		.slice(0, 5);

	return {
		impliedEdge: avgImpliedEdge,
		realizedEdge: avgRealizedEdge,
		edgeDecay: avgImpliedEdge - avgRealizedEdge,
		bestCategories,
	};
}

// ============ Position Sizing Analysis ============

/**
 * Position sizing analysis results
 */
export interface SizingAnalysis {
	/** Average position size in contracts */
	avgPositionSize: number;
	/** Maximum position size in contracts */
	maxPositionSize: number;
	/** Optimal bet fraction based on Kelly Criterion */
	kellyCriterion: number;
	/** Ratio of actual sizing to Kelly optimal */
	actualVsKelly: number;
}

/**
 * Analyzes position sizing relative to Kelly Criterion
 *
 * The Kelly Criterion calculates optimal bet size based on edge and odds.
 * This analysis compares actual sizing to theoretical optimal.
 *
 * @param trades - Prediction market trades
 * @param stats - Pre-calculated statistics for win rate
 * @returns Sizing analysis with Kelly comparison
 *
 * @example
 * const sizing = analyzeSizing(trades, stats);
 * console.log(`Kelly suggests: ${(sizing.kellyCriterion * 100).toFixed(1)}% of bankroll`);
 * console.log(`Actual vs Kelly: ${sizing.actualVsKelly.toFixed(2)}x`);
 */
export function analyzeSizing(
	trades: PredictionTrade[],
	stats: PredictionStats,
): SizingAnalysis {
	const positions = aggregateByMarket(trades);

	const sizes = Array.from(positions.values()).map((p) =>
		Math.abs(p.contracts),
	);
	const avgPositionSize =
		sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0;
	const maxPositionSize = sizes.length > 0 ? Math.max(...sizes) : 0;

	// Kelly Criterion: f* = (bp - q) / b
	// where b = odds, p = prob of win, q = prob of loss
	const p = stats.winRate / 100;
	const q = 1 - p;
	const avgOdds =
		stats.avgEntryPrice > 0
			? (1 - stats.avgEntryPrice) / stats.avgEntryPrice
			: 1;
	const kellyCriterion =
		avgOdds > 0 ? Math.max(0, (avgOdds * p - q) / avgOdds) : 0;

	// Fractional Kelly comparison
	const actualFraction = avgPositionSize / (maxPositionSize || 1);
	const actualVsKelly =
		kellyCriterion > 0 ? actualFraction / kellyCriterion : 0;

	return {
		avgPositionSize,
		maxPositionSize,
		kellyCriterion,
		actualVsKelly,
	};
}
