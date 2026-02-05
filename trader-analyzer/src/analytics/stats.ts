/**
 * @fileoverview Trading statistics calculator
 * @description Calculates comprehensive trading metrics from trade history
 * @module analytics/stats
 */

import type {
	MonthlyPnl,
	Order,
	PositionSession,
	Trade,
	TradingStats,
	WalletTransaction,
} from "../types";

/**
 * Calculate comprehensive trading statistics from trade history
 *
 * @param trades - Array of trades to analyze
 * @param orders - Array of orders (optional, for fill rate metrics)
 * @param wallet - Array of wallet transactions (optional)
 * @returns Comprehensive trading statistics
 *
 * @example
 * const stats = calculateStats(trades, orders);
 * console.log(`Win Rate: ${stats.winRate.toFixed(1)}%`);
 * console.log(`Profit Factor: ${stats.profitFactor.toFixed(2)}`);
 * console.log(`Total PnL: ${stats.totalPnl.toFixed(4)}`);
 */
export function calculateStats(
	trades: Trade[],
	orders: Order[] = [],
	_wallet: WalletTransaction[] = [],
): TradingStats {
	if (trades.length === 0) {
		return emptyStats();
	}

	// Sort trades chronologically
	const sorted = [...trades].sort(
		(a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
	);

	// Volume metrics
	const totalVolume = trades.reduce((sum, t) => sum + t.amount, 0);
	const avgTradeSize = totalVolume / trades.length;

	// Time metrics
	const tradeDates = new Set(trades.map((t) => t.datetime.split("T")[0]));
	const tradingDays = tradeDates.size;
	const firstTrade = sorted[0].datetime;
	const lastTrade = sorted[sorted.length - 1].datetime;

	// PnL calculation
	const tradePnls = calculateTradePnls(sorted);
	const winningTrades = tradePnls.filter((p) => p > 0).length;
	const losingTrades = tradePnls.filter((p) => p < 0).length;
	const totalWins = tradePnls
		.filter((p) => p > 0)
		.reduce((sum, p) => sum + p, 0);
	const totalLosses = Math.abs(
		tradePnls.filter((p) => p < 0).reduce((sum, p) => sum + p, 0),
	);
	const largestWin = Math.max(0, ...tradePnls);
	const largestLoss = Math.abs(Math.min(0, ...tradePnls));

	const totalPnl = tradePnls.reduce((sum, p) => sum + p, 0);
	const totalFees = trades.reduce((sum, t) => sum + t.fee, 0);

	// Order metrics
	const filledOrders = orders.filter((o) => o.status === "filled").length;
	const canceledOrders = orders.filter((o) => o.status === "canceled").length;
	const limitOrders = orders.filter((o) => o.ordType === "limit").length;

	// Monthly PnL
	const monthlyPnl = calculateMonthlyPnl(sorted, tradePnls);

	return {
		totalTrades: trades.length,
		totalVolume,
		avgTradeSize,
		firstTrade,
		lastTrade,
		tradingDays,
		avgTradesPerDay: tradingDays > 0 ? trades.length / tradingDays : 0,
		winningTrades,
		losingTrades,
		winRate:
			winningTrades + losingTrades > 0
				? (winningTrades / (winningTrades + losingTrades)) * 100
				: 0,
		avgWin: winningTrades > 0 ? totalWins / winningTrades : 0,
		avgLoss: losingTrades > 0 ? totalLosses / losingTrades : 0,
		largestWin,
		largestLoss,
		profitFactor:
			totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
		expectancy: trades.length > 0 ? totalPnl / trades.length : 0,
		totalPnl,
		totalFees,
		netPnl: totalPnl - totalFees,
		totalOrders: orders.length,
		fillRate: orders.length > 0 ? (filledOrders / orders.length) * 100 : 0,
		cancelRate: orders.length > 0 ? (canceledOrders / orders.length) * 100 : 0,
		limitOrderPercent:
			orders.length > 0 ? (limitOrders / orders.length) * 100 : 0,
		monthlyPnl,
	};
}

/**
 * Returns empty statistics object for when no trades exist
 * @internal
 */
function emptyStats(): TradingStats {
	return {
		totalTrades: 0,
		totalVolume: 0,
		avgTradeSize: 0,
		firstTrade: null,
		lastTrade: null,
		tradingDays: 0,
		avgTradesPerDay: 0,
		winningTrades: 0,
		losingTrades: 0,
		winRate: 0,
		avgWin: 0,
		avgLoss: 0,
		largestWin: 0,
		largestLoss: 0,
		profitFactor: 0,
		expectancy: 0,
		totalPnl: 0,
		totalFees: 0,
		netPnl: 0,
		totalOrders: 0,
		fillRate: 0,
		cancelRate: 0,
		limitOrderPercent: 0,
		monthlyPnl: [],
	};
}

/**
 * Calculates PnL for each position close
 *
 * Tracks position size and average entry price, calculating realized
 * PnL each time a position is reduced or closed.
 *
 * @param trades - Chronologically sorted trades
 * @returns Array of PnL values for each position close
 * @internal
 */
function calculateTradePnls(trades: Trade[]): number[] {
	const pnls: number[] = [];
	let position = 0;
	let avgEntry = 0;

	for (const trade of trades) {
		if (trade.side === "buy") {
			const newPosition = position + trade.amount;
			if (position >= 0) {
				// Opening or adding to long
				avgEntry =
					position === 0
						? trade.price
						: (avgEntry * position + trade.price * trade.amount) / newPosition;
			} else {
				// Closing short
				const closedAmount = Math.min(Math.abs(position), trade.amount);
				const pnl = closedAmount * (avgEntry - trade.price);
				pnls.push(pnl - trade.fee);
			}
			position = newPosition;
		} else {
			const newPosition = position - trade.amount;
			if (position <= 0) {
				// Opening or adding to short
				avgEntry =
					position === 0
						? trade.price
						: (avgEntry * Math.abs(position) + trade.price * trade.amount) /
							Math.abs(newPosition);
			} else {
				// Closing long
				const closedAmount = Math.min(position, trade.amount);
				const pnl = closedAmount * (trade.price - avgEntry);
				pnls.push(pnl - trade.fee);
			}
			position = newPosition;
		}
	}

	return pnls;
}

/**
 * Calculates monthly PnL breakdown with win rates
 *
 * Groups PnL by month and calculates per-month statistics.
 *
 * @param trades - All trades
 * @param pnls - Pre-calculated PnL per position close
 * @returns Monthly PnL summaries sorted chronologically
 * @internal
 */
function calculateMonthlyPnl(trades: Trade[], pnls: number[]): MonthlyPnl[] {
	const monthly = new Map<
		string,
		{ pnl: number; wins: number; losses: number; trades: number }
	>();

	// Initialize months from trades
	for (const trade of trades) {
		const month = trade.datetime.substring(0, 7);
		if (!monthly.has(month)) {
			monthly.set(month, { pnl: 0, wins: 0, losses: 0, trades: 0 });
		}
		const monthData = monthly.get(month);
		if (monthData) {
			monthData.trades += 1;
		}
	}

	// Distribute PnLs to months (simplified - assigns to trade month)
	let pnlIndex = 0;
	let position = 0;

	for (const trade of trades) {
		const prevPosition = position;
		position += trade.side === "buy" ? trade.amount : -trade.amount;

		// Position closed
		if (
			(prevPosition > 0 && position <= 0) ||
			(prevPosition < 0 && position >= 0)
		) {
			if (pnlIndex < pnls.length) {
				const month = trade.datetime.substring(0, 7);
				const data = monthly.get(month);
				if (data) {
					const pnl = pnls[pnlIndex];
					data.pnl += pnl;
					if (pnl > 0) data.wins += 1;
					else if (pnl < 0) data.losses += 1;
				}
				pnlIndex++;
			}
		}
	}

	return Array.from(monthly.entries())
		.map(([month, data]) => ({
			month,
			pnl: data.pnl,
			trades: data.trades,
			winRate:
				data.wins + data.losses > 0
					? (data.wins / (data.wins + data.losses)) * 100
					: 0,
		}))
		.sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Groups trades into position sessions
 *
 * A session starts when opening a new position and ends when
 * fully closed. Tracks duration, max size, entry/exit prices, and PnL.
 *
 * @param trades - Array of trades to analyze
 * @returns Position sessions sorted most recent first
 *
 * @example
 * const sessions = calculatePositionSessions(trades);
 * sessions.forEach(s => {
 *   console.log(`${s.side} ${s.symbol}: ${s.realizedPnl.toFixed(4)}`);
 * });
 */
export function calculatePositionSessions(trades: Trade[]): PositionSession[] {
	const sessions: PositionSession[] = [];
	let currentSession: PositionSession | null = null;
	let position = 0;

	const sorted = [...trades].sort(
		(a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
	);

	for (const trade of sorted) {
		const qty = trade.side === "buy" ? trade.amount : -trade.amount;
		const newPosition = position + qty;

		if (position === 0 && newPosition !== 0) {
			// New position opened
			currentSession = {
				id: `session-${trade.datetime}`,
				symbol: trade.symbol,
				side: newPosition > 0 ? "long" : "short",
				openTime: trade.datetime,
				closeTime: null,
				durationMs: 0,
				maxSize: Math.abs(newPosition),
				entryPrice: trade.price,
				exitPrice: null,
				realizedPnl: 0,
				unrealizedPnl: 0,
				totalFees: trade.fee,
				tradeCount: 1,
				trades: [trade],
				status: "open",
			};
		} else if (currentSession) {
			currentSession.trades.push(trade);
			currentSession.tradeCount += 1;
			currentSession.totalFees += trade.fee;
			currentSession.maxSize = Math.max(
				currentSession.maxSize,
				Math.abs(newPosition),
			);

			if (newPosition === 0) {
				// Position closed
				currentSession.closeTime = trade.datetime;
				currentSession.status = "closed";
				currentSession.durationMs =
					new Date(trade.datetime).getTime() -
					new Date(currentSession.openTime).getTime();
				currentSession.exitPrice = trade.price;

				// Calculate realized PnL
				const entryValue = currentSession.entryPrice * currentSession.maxSize;
				const exitValue = currentSession.exitPrice * currentSession.maxSize;
				currentSession.realizedPnl =
					currentSession.side === "long"
						? exitValue - entryValue - currentSession.totalFees
						: entryValue - exitValue - currentSession.totalFees;

				sessions.push(currentSession);
				currentSession = null;
			}
		}

		position = newPosition;
	}

	// Add open session
	if (currentSession) {
		sessions.push(currentSession);
	}

	return sessions.reverse(); // Most recent first
}

/**
 * Calculates equity curve (cumulative balance over time)
 *
 * Tracks running balance changes as positions are closed,
 * aggregated by day.
 *
 * @param trades - Array of trades
 * @returns Daily equity points sorted chronologically
 *
 * @example
 * const curve = calculateEquityCurve(trades);
 * curve.forEach(p => console.log(`${new Date(p.time * 1000)}: ${p.balance}`));
 */
export function calculateEquityCurve(
	trades: Trade[],
): { time: number; balance: number }[] {
	if (trades.length === 0) return [];

	const sorted = [...trades].sort(
		(a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
	);

	let balance = 0;
	const _curve: { time: number; balance: number }[] = [];
	const daily = new Map<number, number>();

	// Calculate running balance
	let position = 0;
	let avgEntry = 0;

	for (const trade of sorted) {
		if (trade.side === "buy") {
			const newPosition = position + trade.amount;
			if (position >= 0) {
				avgEntry =
					position === 0
						? trade.price
						: (avgEntry * position + trade.price * trade.amount) / newPosition;
			} else {
				const closedAmount = Math.min(Math.abs(position), trade.amount);
				const pnl = closedAmount * (avgEntry - trade.price) - trade.fee;
				balance += pnl;
			}
			position = newPosition;
		} else {
			const newPosition = position - trade.amount;
			if (position <= 0) {
				avgEntry =
					position === 0
						? trade.price
						: (avgEntry * Math.abs(position) + trade.price * trade.amount) /
							Math.abs(newPosition);
			} else {
				const closedAmount = Math.min(position, trade.amount);
				const pnl = closedAmount * (trade.price - avgEntry) - trade.fee;
				balance += pnl;
			}
			position = newPosition;
		}

		const dayTime =
			Math.floor(new Date(trade.datetime).getTime() / 1000 / 86400) * 86400;
		daily.set(dayTime, balance);
	}

	return Array.from(daily.entries())
		.map(([time, balance]) => ({ time, balance }))
		.sort((a, b) => a.time - b.time);
}
