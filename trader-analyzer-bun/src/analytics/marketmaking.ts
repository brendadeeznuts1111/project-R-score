/**
 * @fileoverview Market making analytics calculator
 * @description Analyzes market making performance including spreads, inventory, and PnL
 * @module analytics/marketmaking
 *
 * @example
 * const stats = calculateMMStats(trades, orders, quotes);
 * console.log(`Maker ratio: ${(stats.makerRatio * 100).toFixed(1)}%`);
 * console.log(`Net PnL: ${stats.netPnl.toFixed(2)}`);
 */

import type {
	MarketMakingStats,
	MMSession,
	Order,
	QuoteSnapshot,
	Trade,
} from "../types";

// ============ Market Making Stats Calculator ============

/**
 * Calculates comprehensive market making statistics
 *
 * Analyzes trades, orders, and quotes to compute metrics including:
 * - Maker/taker trade classification
 * - Spread analysis (average, min, max, capture)
 * - Inventory management (turnover, skew)
 * - PnL breakdown (gross, rebates, fees, net)
 * - Fill rates and risk metrics
 *
 * @param trades - Array of trades to analyze
 * @param orders - Array of orders for classification and fill rates
 * @param quotes - Array of quote snapshots for spread analysis
 * @returns Complete market making statistics
 *
 * @example
 * const stats = calculateMMStats(trades, orders, quotes);
 * console.log(`Sharpe Ratio: ${stats.sharpeRatio.toFixed(2)}`);
 */
export function calculateMMStats(
	trades: Trade[],
	orders: Order[] = [],
	quotes: QuoteSnapshot[] = [],
): MarketMakingStats {
	if (trades.length === 0) {
		return emptyMMStats();
	}

	// Sort trades chronologically
	const sorted = [...trades].sort(
		(a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
	);

	// Classify maker vs taker trades
	const { makerTrades, takerTrades } = classifyTrades(sorted, orders);

	// Volume metrics
	const totalVolume = sorted.reduce((sum, t) => sum + t.cost, 0);
	const _makerVolume = makerTrades.reduce((sum, t) => sum + t.cost, 0);

	// Spread analysis from quotes
	const spreadStats = analyzeSpread(quotes);

	// Inventory analysis
	const inventoryStats = analyzeInventory(sorted);

	// PnL breakdown
	const pnlStats = calculatePnL(sorted, orders);

	// Fill rates from orders
	const fillStats = analyzeFillRates(orders);

	// Risk metrics
	const riskStats = calculateRiskMetrics(sorted);

	return {
		// Volume & Activity
		totalTrades: sorted.length,
		makerTrades: makerTrades.length,
		takerTrades: takerTrades.length,
		makerRatio: sorted.length > 0 ? makerTrades.length / sorted.length : 0,
		totalVolume,

		// Spread Analysis
		avgSpread: spreadStats.avgSpread,
		minSpread: spreadStats.minSpread,
		maxSpread: spreadStats.maxSpread,
		spreadCapture: spreadStats.spreadCapture,

		// Inventory
		avgInventory: inventoryStats.avgInventory,
		maxInventory: inventoryStats.maxInventory,
		inventoryTurnover: inventoryStats.turnover,
		inventorySkew: inventoryStats.skew,

		// Performance
		grossPnl: pnlStats.grossPnl,
		rebates: pnlStats.rebates,
		fees: pnlStats.fees,
		netPnl: pnlStats.netPnl,
		pnlPerTrade: sorted.length > 0 ? pnlStats.netPnl / sorted.length : 0,

		// Fill Rates
		bidFillRate: fillStats.bidFillRate,
		askFillRate: fillStats.askFillRate,
		avgFillTime: fillStats.avgFillTime,

		// Risk
		maxDrawdown: riskStats.maxDrawdown,
		sharpeRatio: riskStats.sharpeRatio,
		uptimePercent: riskStats.uptimePercent,
	};
}

/**
 * Returns empty statistics object for when no trades exist
 * @internal
 */
function emptyMMStats(): MarketMakingStats {
	return {
		totalTrades: 0,
		makerTrades: 0,
		takerTrades: 0,
		makerRatio: 0,
		totalVolume: 0,
		avgSpread: 0,
		minSpread: 0,
		maxSpread: 0,
		spreadCapture: 0,
		avgInventory: 0,
		maxInventory: 0,
		inventoryTurnover: 0,
		inventorySkew: 0,
		grossPnl: 0,
		rebates: 0,
		fees: 0,
		netPnl: 0,
		pnlPerTrade: 0,
		bidFillRate: 0,
		askFillRate: 0,
		avgFillTime: 0,
		maxDrawdown: 0,
		sharpeRatio: 0,
		uptimePercent: 0,
	};
}

// ============ Trade Classification ============

/**
 * Classifies trades as maker or taker
 *
 * Uses order type, fee patterns, and order history to determine
 * whether each trade was a maker (provided liquidity) or taker (consumed liquidity).
 *
 * @param trades - Trades to classify
 * @param orders - Orders for cross-reference
 * @returns Separated maker and taker trade arrays
 * @internal
 */
function classifyTrades(
	trades: Trade[],
	orders: Order[],
): { makerTrades: Trade[]; takerTrades: Trade[] } {
	const makerTrades: Trade[] = [];
	const takerTrades: Trade[] = [];

	// Build order map for classification
	const limitOrders = new Set(
		orders.filter((o) => o.ordType === "limit").map((o) => o.orderID),
	);

	for (const trade of trades) {
		// If we have order info, use it
		if (trade.orderID && limitOrders.has(trade.orderID)) {
			makerTrades.push(trade);
		} else if (trade.ordType === "limit") {
			makerTrades.push(trade);
		} else if (trade.ordType === "market") {
			takerTrades.push(trade);
		} else {
			// Heuristic: if fee is negative or very low, likely maker
			if (trade.fee <= 0) {
				makerTrades.push(trade);
			} else {
				takerTrades.push(trade);
			}
		}
	}

	return { makerTrades, takerTrades };
}

// ============ Spread Analysis ============

/**
 * Analyzes bid-ask spread from quote snapshots
 *
 * @param quotes - Quote snapshots with bid/ask prices
 * @returns Spread statistics (avg, min, max, capture rate)
 * @internal
 */
function analyzeSpread(quotes: QuoteSnapshot[]): {
	avgSpread: number;
	minSpread: number;
	maxSpread: number;
	spreadCapture: number;
} {
	if (quotes.length === 0) {
		return { avgSpread: 0, minSpread: 0, maxSpread: 0, spreadCapture: 0 };
	}

	const spreads = quotes.map((q) => q.spread);
	const avgSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length;
	const minSpread = Math.min(...spreads);
	const maxSpread = Math.max(...spreads);

	// Spread capture: how much of the spread we capture per round-trip
	// This is a simplified calculation
	const spreadCapture = avgSpread > 0 ? 0.5 : 0; // Assume 50% capture if quoting

	return { avgSpread, minSpread, maxSpread, spreadCapture };
}

// ============ Inventory Analysis ============

/**
 * Analyzes inventory management from trade history
 *
 * Tracks position changes to compute average/max inventory,
 * turnover rate, and inventory skew (long vs short bias).
 *
 * @param trades - Chronologically sorted trades
 * @returns Inventory metrics
 * @internal
 */
function analyzeInventory(trades: Trade[]): {
	avgInventory: number;
	maxInventory: number;
	turnover: number;
	skew: number;
} {
	if (trades.length === 0) {
		return { avgInventory: 0, maxInventory: 0, turnover: 0, skew: 0 };
	}

	let position = 0;
	let totalAbsPosition = 0;
	let maxPosition = 0;
	let totalBought = 0;
	let totalSold = 0;

	const positions: number[] = [];

	for (const trade of trades) {
		const qty = trade.side === "buy" ? trade.amount : -trade.amount;
		position += qty;
		positions.push(position);

		totalAbsPosition += Math.abs(position);
		maxPosition = Math.max(maxPosition, Math.abs(position));

		if (trade.side === "buy") {
			totalBought += trade.amount;
		} else {
			totalSold += trade.amount;
		}
	}

	const avgInventory = totalAbsPosition / trades.length;
	const turnover =
		avgInventory > 0 ? (totalBought + totalSold) / 2 / avgInventory : 0;

	// Skew: -1 (short heavy) to +1 (long heavy)
	const avgPosition = positions.reduce((a, b) => a + b, 0) / positions.length;
	const skew = maxPosition > 0 ? avgPosition / maxPosition : 0;

	return {
		avgInventory,
		maxInventory: maxPosition,
		turnover,
		skew: Math.max(-1, Math.min(1, skew)),
	};
}

// ============ PnL Calculation ============

/**
 * Calculates PnL breakdown for market making
 *
 * Separates gross PnL, maker rebates, taker fees, and net result.
 *
 * @param trades - Trades with fee information
 * @param orders - Orders for rebate estimation
 * @returns PnL components (gross, rebates, fees, net)
 * @internal
 */
function calculatePnL(
	trades: Trade[],
	orders: Order[],
): { grossPnl: number; rebates: number; fees: number; netPnl: number } {
	let grossPnl = 0;
	let position = 0;
	let avgEntry = 0;
	let totalFees = 0;
	let rebates = 0;

	// Identify maker orders for rebate estimation
	const _makerOrderIds = new Set(
		orders.filter((o) => o.ordType === "limit").map((o) => o.orderID),
	);

	for (const trade of trades) {
		const fee = trade.fee;

		// Rebates are typically negative fees
		if (fee < 0) {
			rebates += Math.abs(fee);
		} else {
			totalFees += fee;
		}

		// Calculate realized PnL
		if (trade.side === "buy") {
			const newPosition = position + trade.amount;
			if (position >= 0) {
				// Opening/adding to long
				avgEntry =
					position === 0
						? trade.price
						: (avgEntry * position + trade.price * trade.amount) / newPosition;
			} else {
				// Closing short
				const closedAmount = Math.min(Math.abs(position), trade.amount);
				grossPnl += closedAmount * (avgEntry - trade.price);
			}
			position = newPosition;
		} else {
			const newPosition = position - trade.amount;
			if (position <= 0) {
				// Opening/adding to short
				avgEntry =
					position === 0
						? trade.price
						: (avgEntry * Math.abs(position) + trade.price * trade.amount) /
							Math.abs(newPosition);
			} else {
				// Closing long
				const closedAmount = Math.min(position, trade.amount);
				grossPnl += closedAmount * (trade.price - avgEntry);
			}
			position = newPosition;
		}
	}

	return {
		grossPnl,
		rebates,
		fees: totalFees,
		netPnl: grossPnl + rebates - totalFees,
	};
}

// ============ Fill Rate Analysis ============

/**
 * Analyzes order fill rates for bid and ask sides
 *
 * @param orders - All orders
 * @returns Fill rates for bids, asks, and average fill time
 * @internal
 */
function analyzeFillRates(orders: Order[]): {
	bidFillRate: number;
	askFillRate: number;
	avgFillTime: number;
} {
	if (orders.length === 0) {
		return { bidFillRate: 0, askFillRate: 0, avgFillTime: 0 };
	}

	const bidOrders = orders.filter((o) => o.side === "buy");
	const askOrders = orders.filter((o) => o.side === "sell");

	const bidFilled = bidOrders.filter(
		(o) => o.status === "filled" || o.cumQty > 0,
	);
	const askFilled = askOrders.filter(
		(o) => o.status === "filled" || o.cumQty > 0,
	);

	const bidFillRate =
		bidOrders.length > 0 ? bidFilled.length / bidOrders.length : 0;
	const askFillRate =
		askOrders.length > 0 ? askFilled.length / askOrders.length : 0;

	// Average fill time would require order creation/fill timestamps
	const avgFillTime = 0;

	return { bidFillRate, askFillRate, avgFillTime };
}

// ============ Risk Metrics ============

/**
 * Calculates risk metrics from equity curve
 *
 * Computes max drawdown, Sharpe ratio (annualized), and uptime.
 *
 * @param trades - Trade history
 * @returns Risk metrics (drawdown, Sharpe, uptime)
 * @internal
 */
function calculateRiskMetrics(trades: Trade[]): {
	maxDrawdown: number;
	sharpeRatio: number;
	uptimePercent: number;
} {
	if (trades.length < 2) {
		return { maxDrawdown: 0, sharpeRatio: 0, uptimePercent: 100 };
	}

	// Calculate equity curve
	const pnls: number[] = [];
	let position = 0;
	let avgEntry = 0;
	let runningPnl = 0;

	for (const trade of trades) {
		if (trade.side === "buy") {
			const newPosition = position + trade.amount;
			if (position < 0) {
				const closedAmount = Math.min(Math.abs(position), trade.amount);
				runningPnl += closedAmount * (avgEntry - trade.price) - trade.fee;
			}
			if (position >= 0 || newPosition > 0) {
				// ✅ Numeric safety: Prevent division by zero
				avgEntry =
					position <= 0
						? trade.price
						: newPosition > 0
							? (avgEntry * position + trade.price * trade.amount) / newPosition
							: avgEntry;
			}
			position = newPosition;
		} else {
			const newPosition = position - trade.amount;
			if (position > 0) {
				const closedAmount = Math.min(position, trade.amount);
				runningPnl += closedAmount * (trade.price - avgEntry) - trade.fee;
			}
			if (position <= 0 || newPosition < 0) {
				// ✅ Numeric safety: Prevent division by zero
				const absNewPosition = Math.abs(newPosition);
				avgEntry =
					position >= 0
						? trade.price
						: absNewPosition > 0
							? (avgEntry * Math.abs(position) + trade.price * trade.amount) /
								absNewPosition
							: avgEntry;
			}
			position = newPosition;
		}
		pnls.push(runningPnl);
	}

	// Max drawdown
	let peak = 0;
	let maxDrawdown = 0;
	for (const pnl of pnls) {
		peak = Math.max(peak, pnl);
		const drawdown = peak - pnl;
		maxDrawdown = Math.max(maxDrawdown, drawdown);
	}

	// Sharpe ratio (simplified daily)
	const returns = pnls.slice(1).map((p, i) => p - pnls[i]);
	// ✅ Numeric safety: Prevent division by zero
	if (returns.length === 0) {
		return { maxDrawdown, sharpeRatio: 0, uptimePercent: 100 };
	}
	const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
	const variance =
		returns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) / returns.length;
	const stdDev = Math.sqrt(variance);
	const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

	// Uptime: percentage of time with active positions/quotes
	// Simplified: assume always active if there are trades
	const uptimePercent = 100;

	return { maxDrawdown, sharpeRatio, uptimePercent };
}

// ============ Session Builder ============

/**
 * Groups trades into market making sessions
 *
 * Sessions are separated by gaps in trading activity. Each session
 * contains its own statistics for granular analysis.
 *
 * @param trades - All trades to group
 * @param orders - Orders for session-level stats
 * @param sessionGapMinutes - Gap threshold to start new session (default: 30)
 * @returns Array of market making sessions
 *
 * @example
 * const sessions = buildMMSessions(trades, orders, 30);
 * sessions.forEach(s => {
 *   console.log(`${s.startTime}: ${s.stats.netPnl} PnL`);
 * });
 */
export function buildMMSessions(
	trades: Trade[],
	orders: Order[] = [],
	sessionGapMinutes = 30,
): MMSession[] {
	if (trades.length === 0) return [];

	const sorted = [...trades].sort(
		(a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
	);

	const sessions: MMSession[] = [];
	let sessionTrades: Trade[] = [];
	let sessionStart = sorted[0].datetime;

	for (let i = 0; i < sorted.length; i++) {
		const trade = sorted[i];
		const prevTrade = sorted[i - 1];

		if (prevTrade) {
			const gap =
				new Date(trade.datetime).getTime() -
				new Date(prevTrade.datetime).getTime();
			const gapMinutes = gap / 1000 / 60;

			if (gapMinutes > sessionGapMinutes) {
				// End current session, start new one
				if (sessionTrades.length > 0) {
					sessions.push(createSession(sessionTrades, orders, sessionStart));
				}
				sessionTrades = [];
				sessionStart = trade.datetime;
			}
		}

		sessionTrades.push(trade);
	}

	// Final session
	if (sessionTrades.length > 0) {
		sessions.push(createSession(sessionTrades, orders, sessionStart));
	}

	return sessions;
}

/**
 * Creates a session object from trades within a time range
 * @internal
 */
function createSession(
	trades: Trade[],
	orders: Order[],
	startTime: string,
): MMSession {
	const endTime = trades[trades.length - 1].datetime;
	const duration = new Date(endTime).getTime() - new Date(startTime).getTime();

	// Filter orders relevant to this session's time range
	const sessionOrders = orders.filter((o) => {
		const time = new Date(o.timestamp).getTime();
		return (
			time >= new Date(startTime).getTime() &&
			time <= new Date(endTime).getTime()
		);
	});

	return {
		id: `mm-${startTime}`,
		symbol: trades[0].symbol,
		startTime,
		endTime,
		duration,
		trades,
		quotes: [], // Would need to be populated from quote data
		stats: calculateMMStats(trades, sessionOrders, []),
	};
}

// ============ Quote Analysis ============

/**
 * Analyzes quote quality and market conditions
 *
 * @param quotes - Quote snapshots to analyze
 * @returns Quote metrics (spread, mid price, imbalance, volatility)
 *
 * @example
 * const analysis = analyzeQuotes(quotes);
 * console.log(`Avg spread: ${analysis.avgSpreadBps.toFixed(2)} bps`);
 */
export function analyzeQuotes(quotes: QuoteSnapshot[]): {
	avgSpreadBps: number;
	avgMidPrice: number;
	quoteImbalance: number;
	priceVolatility: number;
} {
	if (quotes.length === 0) {
		return {
			avgSpreadBps: 0,
			avgMidPrice: 0,
			quoteImbalance: 0,
			priceVolatility: 0,
		};
	}

	const avgSpreadBps =
		quotes.reduce((sum, q) => sum + q.spreadBps, 0) / quotes.length;
	const avgMidPrice =
		quotes.reduce((sum, q) => sum + q.midPrice, 0) / quotes.length;

	// Quote imbalance: positive = bid heavy, negative = ask heavy
	const totalBidSize = quotes.reduce((sum, q) => sum + q.bidSize, 0);
	const totalAskSize = quotes.reduce((sum, q) => sum + q.askSize, 0);
	const quoteImbalance =
		(totalBidSize - totalAskSize) / (totalBidSize + totalAskSize || 1);

	// Price volatility (standard deviation of mid prices)
	const midPrices = quotes.map((q) => q.midPrice);
	const variance =
		midPrices.reduce((sum, p) => sum + (p - avgMidPrice) ** 2, 0) /
		midPrices.length;
	const priceVolatility = Math.sqrt(variance);

	return { avgSpreadBps, avgMidPrice, quoteImbalance, priceVolatility };
}
