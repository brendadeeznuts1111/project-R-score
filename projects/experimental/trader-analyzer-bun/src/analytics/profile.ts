/**
 * @fileoverview Trader profile analyzer
 * @description Analyzes trading data to generate personality profiles and insights
 * @module analytics/profile
 *
 * @example
 * const profile = analyzeTraderProfile(stats, trades, orders, sessions);
 * console.log(`Style: ${profile.style}`);
 * console.log(`Risk: ${profile.risk}`);
 * console.log(profile.insights.summary);
 */

import type {
	Order,
	PositionSession,
	Trade,
	TraderProfile,
	TradingStats,
} from "../types";

/**
 * Analyzes trading data to generate a comprehensive trader profile
 *
 * Determines trading style (scalper, day trader, swing trader, position trader),
 * risk preference (conservative, moderate, aggressive), and generates actionable insights.
 *
 * @param stats - Pre-calculated trading statistics
 * @param trades - Array of trades to analyze
 * @param orders - Array of orders for discipline metrics
 * @param sessions - Position sessions for timing analysis
 * @returns Complete trader profile with metrics and recommendations
 *
 * @example
 * const profile = analyzeTraderProfile(stats, trades, orders, sessions);
 * console.log(`${profile.risk} ${profile.style} with ${profile.metrics.winRate}% win rate`);
 */
export function analyzeTraderProfile(
	stats: TradingStats,
	trades: Trade[],
	orders: Order[],
	sessions: PositionSession[],
): TraderProfile {
	const metrics = analyzeMetrics(trades, orders, sessions, stats);
	const style = determineTradingStyle(metrics);
	const risk = determineRiskPreference(stats, metrics);
	const difficulty = determineDifficulty(stats, metrics);
	const insights = generateInsights(style, risk, stats, metrics);

	return {
		style,
		risk,
		difficulty,
		metrics,
		insights,
	};
}

/**
 * Calculates detailed trading metrics from trade history
 * @internal
 */
function analyzeMetrics(
	trades: Trade[],
	orders: Order[],
	sessions: PositionSession[],
	stats: TradingStats,
): TraderProfile["metrics"] {
	// Average holding time from sessions
	const closedSessions = sessions.filter((s) => s.status === "closed");
	const avgHoldingMs =
		closedSessions.length > 0
			? closedSessions.reduce((sum, s) => sum + s.durationMs, 0) /
				closedSessions.length
			: 0;
	const avgHoldingMinutes = avgHoldingMs / 1000 / 60;

	// Trades per week
	if (trades.length === 0) {
		return {
			winRate: 0,
			profitFactor: 0,
			avgHoldingMinutes: 0,
			tradesPerWeek: 0,
			disciplineScore: 50,
			consistencyScore: 50,
		};
	}

	const sorted = [...trades].sort(
		(a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
	);
	const firstTrade = new Date(sorted[0].datetime);
	const lastTrade = new Date(sorted[sorted.length - 1].datetime);
	const weeks = Math.max(
		1,
		(lastTrade.getTime() - firstTrade.getTime()) / (7 * 24 * 60 * 60 * 1000),
	);
	const tradesPerWeek = trades.length / weeks;

	// Discipline score
	const limitOrders = orders.filter((o) => o.ordType === "limit").length;
	const limitRatio =
		orders.length > 0 ? (limitOrders / orders.length) * 100 : 0;
	const disciplineScore = calculateDisciplineScore(limitRatio, orders);

	// Consistency score
	const consistencyScore = calculateConsistencyScore(stats, sessions);

	return {
		winRate: stats.winRate,
		profitFactor: stats.profitFactor === Infinity ? 999 : stats.profitFactor,
		avgHoldingMinutes,
		tradesPerWeek,
		disciplineScore,
		consistencyScore,
	};
}

/**
 * Calculates discipline score based on order patterns
 *
 * Scores limit order usage (40%), cancel rate (30%), and position sizing consistency (30%).
 *
 * @param limitRatio - Percentage of orders that are limit orders
 * @param orders - All orders for analysis
 * @returns Score from 0-100
 * @internal
 */
function calculateDisciplineScore(limitRatio: number, orders: Order[]): number {
	let score = 0;

	// Limit order usage (max 40 points)
	score += Math.min(40, limitRatio * 0.4);

	// Low cancel rate (max 30 points)
	const canceled = orders.filter((o) => o.status === "canceled").length;
	const cancelRate = orders.length > 0 ? canceled / orders.length : 0;
	score += Math.max(0, 30 - cancelRate * 100);

	// Consistent order sizes (max 30 points)
	const sizes = orders.filter((o) => o.orderQty > 0).map((o) => o.orderQty);
	if (sizes.length > 1) {
		const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
		const variance =
			sizes.reduce((sum, s) => sum + (s - avg) ** 2, 0) / sizes.length;
		const cv = Math.sqrt(variance) / avg;
		score += Math.max(0, 30 - cv * 30);
	} else {
		score += 15;
	}

	return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Calculates consistency score based on trading results
 *
 * Evaluates win rate consistency (40%), profit factor (30%), and PnL variance (30%).
 *
 * @param stats - Trading statistics
 * @param sessions - Position sessions for variance analysis
 * @returns Score from 0-100
 * @internal
 */
function calculateConsistencyScore(
	stats: TradingStats,
	sessions: PositionSession[],
): number {
	let score = 0;

	// Win rate consistency (max 40 points)
	if (stats.winRate >= 50) score += 40;
	else if (stats.winRate >= 40) score += 30;
	else if (stats.winRate >= 30) score += 20;
	else score += 10;

	// Profit factor (max 30 points)
	const pf = stats.profitFactor === Infinity ? 10 : stats.profitFactor;
	if (pf >= 2) score += 30;
	else if (pf >= 1.5) score += 25;
	else if (pf >= 1.2) score += 20;
	else if (pf >= 1) score += 15;
	else score += 5;

	// Session outcomes variance (max 30 points)
	const closedSessions = sessions.filter((s) => s.status === "closed");
	if (closedSessions.length > 1) {
		const pnls = closedSessions.map((s) => s.realizedPnl);
		const avg = pnls.reduce((a, b) => a + b, 0) / pnls.length;
		const variance =
			pnls.reduce((sum, p) => sum + (p - avg) ** 2, 0) / pnls.length;
		const cv = avg !== 0 ? Math.sqrt(variance) / Math.abs(avg) : 0;
		score += Math.max(0, 30 - cv * 10);
	} else {
		score += 15;
	}

	return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Determines trading style based on holding time and trade frequency
 *
 * Classification:
 * - Scalper: <30min avg hold, >100 trades/week
 * - Day Trader: <1 day avg hold, >20 trades/week
 * - Swing Trader: <1 week avg hold
 * - Position Trader: 1+ week avg hold
 *
 * @param metrics - Calculated trading metrics
 * @returns Trading style classification
 * @internal
 */
function determineTradingStyle(
	metrics: TraderProfile["metrics"],
): TraderProfile["style"] {
	const { avgHoldingMinutes, tradesPerWeek } = metrics;

	if (avgHoldingMinutes < 30 && tradesPerWeek > 100) return "scalper";
	if (avgHoldingMinutes < 1440 && tradesPerWeek > 20) return "day_trader";
	if (avgHoldingMinutes < 10080) return "swing_trader";
	return "position_trader";
}

/**
 * Determines risk preference based on trading behavior
 *
 * Factors: loss vs win ratio, letting winners run, trade frequency, discipline.
 *
 * @param stats - Trading statistics
 * @param metrics - Calculated metrics
 * @returns Risk preference: conservative, moderate, or aggressive
 * @internal
 */
function determineRiskPreference(
	stats: TradingStats,
	metrics: TraderProfile["metrics"],
): TraderProfile["risk"] {
	let riskScore = 0;

	// High avg loss relative to win
	if (stats.avgLoss > stats.avgWin * 1.5) riskScore += 2;
	else if (stats.avgLoss > stats.avgWin) riskScore += 1;

	// Low win rate with high profit factor (letting winners run)
	if (stats.winRate < 40 && stats.profitFactor > 1.5) riskScore += 2;

	// High trade frequency
	if (metrics.tradesPerWeek > 50) riskScore += 1;

	// Low discipline
	if (metrics.disciplineScore < 50) riskScore += 1;

	if (riskScore >= 4) return "aggressive";
	if (riskScore >= 2) return "moderate";
	return "conservative";
}

/**
 * Determines trading difficulty level for skill assessment
 * @internal
 */
function determineDifficulty(
	stats: TradingStats,
	metrics: TraderProfile["metrics"],
): TraderProfile["difficulty"] {
	const avgScore = (metrics.disciplineScore + metrics.consistencyScore) / 2;

	if (metrics.tradesPerWeek > 100) return "advanced";
	if (avgScore >= 70 && metrics.tradesPerWeek < 50) return "beginner";
	if (avgScore >= 50 || stats.profitFactor > 2) return "intermediate";
	return "advanced";
}

/**
 * Generates human-readable insights from trading analysis
 *
 * Creates summary, identifies strengths and weaknesses, and provides
 * actionable recommendations based on trading patterns.
 *
 * @param style - Determined trading style
 * @param risk - Determined risk preference
 * @param stats - Trading statistics
 * @param metrics - Calculated metrics
 * @returns Insights object with summary, strengths, weaknesses, and recommendations
 * @internal
 */
function generateInsights(
	style: TraderProfile["style"],
	risk: TraderProfile["risk"],
	stats: TradingStats,
	metrics: TraderProfile["metrics"],
): TraderProfile["insights"] {
	const styleNames: Record<string, string> = {
		scalper: "Scalper",
		day_trader: "Day Trader",
		swing_trader: "Swing Trader",
		position_trader: "Position Trader",
	};

	const riskNames: Record<string, string> = {
		aggressive: "Aggressive",
		moderate: "Moderate",
		conservative: "Conservative",
	};

	const summary =
		`${riskNames[risk]} ${styleNames[style]} with ${stats.winRate.toFixed(1)}% win rate, ` +
		`${stats.profitFactor.toFixed(2)} profit factor, across ${stats.totalTrades} trades.`;

	const strengths: string[] = [];
	const weaknesses: string[] = [];
	const recommendations: string[] = [];

	// Analyze strengths
	if (stats.winRate > 50)
		strengths.push(`High win rate (${stats.winRate.toFixed(1)}%)`);
	if (stats.profitFactor > 1.5)
		strengths.push(`Strong profit factor (${stats.profitFactor.toFixed(2)})`);
	if (metrics.disciplineScore > 70)
		strengths.push(`High discipline (${metrics.disciplineScore}/100)`);
	if (metrics.consistencyScore > 70)
		strengths.push(`Consistent results (${metrics.consistencyScore}/100)`);

	// Analyze weaknesses
	if (stats.winRate < 40) {
		weaknesses.push(`Low win rate (${stats.winRate.toFixed(1)}%)`);
		recommendations.push("Focus on entry timing and trade selection");
	}
	if (stats.profitFactor < 1.2) {
		weaknesses.push(`Weak profit factor (${stats.profitFactor.toFixed(2)})`);
		recommendations.push("Let winners run longer, cut losers faster");
	}
	if (metrics.disciplineScore < 50) {
		weaknesses.push(`Low discipline (${metrics.disciplineScore}/100)`);
		recommendations.push("Use more limit orders, stick to position sizes");
	}
	if (metrics.consistencyScore < 50) {
		weaknesses.push(`Inconsistent results (${metrics.consistencyScore}/100)`);
		recommendations.push("Develop a systematic approach");
	}
	if (stats.cancelRate > 30) {
		weaknesses.push(`High cancel rate (${stats.cancelRate.toFixed(1)}%)`);
		recommendations.push("Plan trades better before entering");
	}

	// Default recommendations based on style
	if (recommendations.length === 0) {
		if (style === "scalper") {
			recommendations.push(
				"Consider reducing trade frequency for better quality",
			);
		} else if (style === "day_trader") {
			recommendations.push("Track your best trading hours for optimization");
		} else {
			recommendations.push("Continue current approach, monitor for drift");
		}
	}

	return {
		summary,
		strengths: strengths.length > 0 ? strengths : ["Building track record..."],
		weaknesses:
			weaknesses.length > 0 ? weaknesses : ["No major issues detected"],
		recommendations,
	};
}
