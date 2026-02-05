/**
 * @fileoverview 1.1.1.1.2.6.0: Limit Order Book Reconstructor
 * @description Reconstructs hidden order book from micro-movements and trade patterns
 * @module arbitrage/shadow-graph/limit-order-book-reconstructor
 */

import { Database } from "bun:sqlite";

/**
 * Order book level
 */
export interface OrderBookLevel {
	price: number;
	size: number;
	isIceberg: boolean; // 1.1.1.1.2.6.4: Iceberg Order Detection
}

/**
 * Reconstructed order book
 */
export interface ReconstructedOrderBook {
	bids: OrderBookLevel[];
	asks: OrderBookLevel[];
	fairPrice: number; // 1.1.1.1.2.6.7: Depth-Weighted Fair Price
	imbalance: number; // >0 = more bids
	spread: number; // Bid-ask spread
}

/**
 * 1.1.1.1.2.6.1: Limit-Order-Book Reconstructor
 *
 * Reconstructs hidden order book from micro-movements and trade patterns.
 * Detects iceberg orders and estimates depth at each price level.
 */
export class LimitOrderBookReconstructor {
	private readonly MIN_TRADE_SIZE = 5000; // USD threshold for significant trade
	private readonly ICEBERG_THRESHOLD = 3; // Repeated trades at same level

	constructor(private db: Database) {}

	/**
	 * Reconstruct order book for a node
	 *
	 * @param nodeId - Shadow node identifier
	 * @param windowMs - Time window to analyze (default: 5 minutes)
	 */
	async reconstructLOB(
		nodeId: string,
		windowMs: number = 300000,
	): Promise<ReconstructedOrderBook> {
		// 1.1.1.1.2.6.2: Micro-Movement Sequence
		const microMoves = await this.getMicroMovements(nodeId, windowMs);

		// Build order book snapshots
		const book = {
			bids: new Map<number, number>(),
			asks: new Map<number, number>(),
		};

		for (const move of microMoves) {
			if (Math.abs(move.size || 0) > this.MIN_TRADE_SIZE) {
				// Large trade = likely hitting book
				this.processTrade(book, move);
			}
		}

		// 1.1.1.1.2.6.4: Iceberg Order Detection
		const icebergs = this.detectIcebergOrders(book.bids, microMoves);

		// Convert to arrays and sort
		const bids: OrderBookLevel[] = Array.from(book.bids.entries())
			.map(([price, size]) => ({
				price,
				size,
				isIceberg: icebergs.has(price),
			}))
			.sort((a, b) => b.price - a.price); // Highest bid first

		const asks: OrderBookLevel[] = Array.from(book.asks.entries())
			.map(([price, size]) => ({
				price,
				size,
				isIceberg: icebergs.has(price),
			}))
			.sort((a, b) => a.price - b.price); // Lowest ask first

		// 1.1.1.1.2.6.3: Bid-Ask Spread Analyzer
		const spread = this.calculateSpread(bids, asks);

		// 1.1.1.1.2.6.7: Depth-Weighted Fair Price
		const fairPrice = this.calculateDepthWeightedFairPrice(bids, asks);

		// Calculate imbalance
		const totalBidSize = bids.reduce((sum, b) => sum + b.size, 0);
		const totalAskSize = asks.reduce((sum, a) => sum + a.size, 0);
		const imbalance =
			totalBidSize + totalAskSize > 0
				? (totalBidSize - totalAskSize) / (totalBidSize + totalAskSize)
				: 0;

		return {
			bids,
			asks,
			fairPrice,
			imbalance,
			spread,
		};
	}

	/**
	 * 1.1.1.1.2.6.5: Bookmaker Order-Fill Pattern
	 *
	 * Analyzes patterns in how bookmaker fills orders
	 */
	async analyzeFillPatterns(
		nodeId: string,
		windowMs: number = 3600000,
	): Promise<{
		avgFillTime: number;
		partialFillRate: number;
		rejectionRate: number;
	}> {
		const fills = await this.getOrderFills(nodeId, windowMs);

		if (fills.length === 0) {
			return { avgFillTime: 0, partialFillRate: 0, rejectionRate: 0 };
		}

		const avgFillTime =
			fills.reduce((sum, f) => sum + (f.fillTime || 0), 0) / fills.length;

		const partialFills = fills.filter((f) => f.partialFill).length;
		const partialFillRate = partialFills / fills.length;

		const rejections = fills.filter((f) => f.rejected).length;
		const rejectionRate = rejections / fills.length;

		return { avgFillTime, partialFillRate, rejectionRate };
	}

	/**
	 * 1.1.1.1.2.6.6: Synthetic Order-Book Generation
	 *
	 * Generates synthetic order book when direct data unavailable
	 */
	generateSyntheticLOB(
		currentPrice: number,
		historicalVolatility: number,
	): ReconstructedOrderBook {
		// Generate synthetic levels around current price
		const levels = 10;
		const tickSize = 0.5;
		const baseSize = 10000;

		const bids: OrderBookLevel[] = [];
		const asks: OrderBookLevel[] = [];

		for (let i = 1; i <= levels; i++) {
			// Bids below current price
			const bidPrice = currentPrice - i * tickSize;
			const bidSize = baseSize * Math.exp(-i * 0.1); // Exponential decay
			bids.push({ price: bidPrice, size: bidSize, isIceberg: false });

			// Asks above current price
			const askPrice = currentPrice + i * tickSize;
			const askSize = baseSize * Math.exp(-i * 0.1);
			asks.push({ price: askPrice, size: askSize, isIceberg: false });
		}

		const spread = asks[0].price - bids[0].price;
		const fairPrice = (bids[0].price + asks[0].price) / 2;

		return {
			bids: bids.sort((a, b) => b.price - a.price),
			asks: asks.sort((a, b) => a.price - b.price),
			fairPrice,
			imbalance: 0,
			spread,
		};
	}

	/**
	 * Get micro-movements for a node
	 */
	private async getMicroMovements(
		nodeId: string,
		windowMs: number,
	): Promise<
		Array<{
			line: number;
			odds: number;
			timestamp: number;
			size?: number;
		}>
	> {
		const cutoffTime = Date.now() - windowMs;

		return this.db
			.query<
				{
					line: number;
					odds: number;
					timestamp: number;
					bet_size: number | null;
				},
				[string, number]
			>(
				`SELECT line, odds, timestamp, bet_size as size
				 FROM line_movements 
				 WHERE node_id = ?1 
				   AND timestamp > ?2
				 ORDER BY timestamp ASC`,
			)
			.all(nodeId, cutoffTime)
			.map((row) => ({
				line: row.line,
				odds: row.odds,
				timestamp: row.timestamp,
				size: row.bet_size || undefined,
			}));
	}

	/**
	 * Process a trade and update order book
	 */
	private processTrade(
		book: { bids: Map<number, number>; asks: Map<number, number> },
		move: { line: number; odds: number; size?: number },
	): void {
		// Infer bid/ask from odds
		// Simplified: if odds decrease, someone hit the ask (sold)
		// If odds increase, someone hit the bid (bought)

		const price = move.line;
		const size = Math.abs(move.size || 0);

		// Estimate if this was a bid or ask hit
		// In production, use more sophisticated logic
		if (move.odds < 2.0) {
			// Low odds = likely ask hit (selling pressure)
			const currentAsk = book.asks.get(price) || 0;
			book.asks.set(price, currentAsk + size);
		} else {
			// High odds = likely bid hit (buying pressure)
			const currentBid = book.bids.get(price) || 0;
			book.bids.set(price, currentBid + size);
		}
	}

	/**
	 * Detect iceberg orders
	 *
	 * Icebergs show as repeated trades at the same price level
	 */
	private detectIcebergOrders(
		levels: Map<number, number>,
		microMoves: Array<{ line: number; timestamp: number }>,
	): Set<number> {
		const icebergs = new Set<number>();

		// Group moves by price level
		const priceGroups = new Map<number, number[]>();

		for (const move of microMoves) {
			const price = Math.round(move.line * 2) / 2; // Round to 0.5
			if (!priceGroups.has(price)) {
				priceGroups.set(price, []);
			}
			priceGroups.get(price)!.push(move.timestamp);
		}

		// Check for repeated trades at same level
		for (const [price, timestamps] of priceGroups) {
			if (timestamps.length >= this.ICEBERG_THRESHOLD) {
				// Check if trades are clustered in time (iceberg pattern)
				const sorted = timestamps.sort((a, b) => a - b);
				let clusters = 0;

				for (let i = 1; i < sorted.length; i++) {
					if (sorted[i] - sorted[i - 1] < 60000) {
						// Within 1 minute
						clusters++;
					}
				}

				if (clusters >= this.ICEBERG_THRESHOLD - 1) {
					icebergs.add(price);
				}
			}
		}

		return icebergs;
	}

	/**
	 * Calculate bid-ask spread
	 */
	private calculateSpread(
		bids: OrderBookLevel[],
		asks: OrderBookLevel[],
	): number {
		if (bids.length === 0 || asks.length === 0) {
			return 0;
		}

		const bestBid = bids[0].price;
		const bestAsk = asks[0].price;

		return bestAsk - bestBid;
	}

	/**
	 * Calculate depth-weighted fair price
	 */
	private calculateDepthWeightedFairPrice(
		bids: OrderBookLevel[],
		asks: OrderBookLevel[],
	): number {
		if (bids.length === 0 || asks.length === 0) {
			return 0;
		}

		// Weight by size at each level
		let weightedBidSum = 0;
		let weightedAskSum = 0;
		let totalBidSize = 0;
		let totalAskSize = 0;

		for (const bid of bids.slice(0, 5)) {
			// Top 5 levels
			weightedBidSum += bid.price * bid.size;
			totalBidSize += bid.size;
		}

		for (const ask of asks.slice(0, 5)) {
			weightedAskSum += ask.price * ask.size;
			totalAskSize += ask.size;
		}

		const avgBid =
			totalBidSize > 0 ? weightedBidSum / totalBidSize : bids[0].price;
		const avgAsk =
			totalAskSize > 0 ? weightedAskSum / totalAskSize : asks[0].price;

		return (avgBid + avgAsk) / 2;
	}

	/**
	 * Get order fills (placeholder - would query actual fill data)
	 */
	private async getOrderFills(
		nodeId: string,
		windowMs: number,
	): Promise<
		Array<{
			fillTime?: number;
			partialFill: boolean;
			rejected: boolean;
		}>
	> {
		// Placeholder: in production, query actual fill data
		return [];
	}
}
