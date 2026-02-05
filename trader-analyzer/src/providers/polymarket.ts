/**
 * @fileoverview Polymarket prediction market provider
 * @description Integrates with Polymarket's CLOB (Central Limit Order Book) and Gamma APIs
 * @module providers/polymarket
 *
 * @example
 * const provider = new PolymarketProvider({ funderAddress: '0x...' });
 * await provider.connect();
 * const markets = await provider.fetchMarkets(50);
 * if (markets.ok) {
 *   console.log(`Found ${markets.data.length} active markets`);
 * }
 */

import type {
	DataProvider,
	Order,
	PredictionMarket,
	PredictionPosition,
	PredictionTrade,
	Result,
	Trade,
} from "../types";
import { err, ok } from "../types";

/** Polymarket CLOB API base URL for order book and trading operations */
const CLOB_BASE = "https://clob.polymarket.com";

/** Polymarket Gamma API base URL for market metadata */
const GAMMA_BASE = "https://gamma-api.polymarket.com";

/**
 * Configuration options for Polymarket provider
 */
interface PolymarketConfig {
	/** API key for authenticated requests (optional) */
	apiKey?: string;
	/** API secret for signing requests (optional) */
	apiSecret?: string;
	/** Passphrase for additional security (optional) */
	passphrase?: string;
	/** Wallet address for filtering trades - required for fetching user trades */
	funderAddress?: string;
}

/**
 * Raw trade data from Polymarket CLOB API
 * @internal
 */
interface CLOBTrade {
	id: string;
	taker_order_id: string;
	maker_order_id: string;
	market: string;
	asset_id: string;
	side: "BUY" | "SELL";
	size: string;
	price: string;
	timestamp: string;
	outcome: string;
	fee_rate_bps: string;
	owner: string;
	transaction_hash: string;
	bucket_index: number;
	type: "TRADE";
}

/**
 * Raw order data from Polymarket CLOB API
 * @internal
 */
interface CLOBOrder {
	id: string;
	market: string;
	asset_id: string;
	side: "BUY" | "SELL";
	original_size: string;
	size_matched: string;
	price: string;
	status: "LIVE" | "MATCHED" | "CANCELLED";
	created_at: string;
	expiration: string;
	outcome: string;
	owner: string;
	order_type: "GTC" | "FOK" | "GTD";
}

/**
 * Raw market data from Polymarket Gamma API
 * @internal
 */
interface GammaMarket {
	id: string;
	question: string;
	description: string;
	outcomes: string;
	outcomePrices: string;
	volume: string;
	liquidity: string;
	endDate: string;
	active: boolean;
	closed: boolean;
	category: string;
	tags: { label: string }[];
	clobTokenIds: string;
	conditionId: string;
}

/**
 * Polymarket prediction market data provider
 *
 * Provides access to Polymarket's CLOB (Central Limit Order Book) for trading
 * and the Gamma API for market metadata. Supports fetching markets, trades,
 * orders, and positions.
 *
 * @implements {DataProvider}
 *
 * @example
 * // Public market data (no auth required)
 * const provider = new PolymarketProvider();
 * await provider.connect();
 * const markets = await provider.fetchMarkets(100);
 *
 * @example
 * // User-specific data (requires wallet address)
 * const provider = new PolymarketProvider({
 *   funderAddress: '0x1234567890abcdef...'
 * });
 * await provider.connect();
 * const trades = await provider.fetchTrades();
 */
export class PolymarketProvider implements DataProvider {
	name = "polymarket";
	private config: PolymarketConfig;
	private connected = false;

	/**
	 * Creates a new Polymarket provider instance
	 * @param config - Configuration options including optional wallet address
	 */
	constructor(config: PolymarketConfig = {}) {
		this.config = config;
	}

	/**
	 * Establishes connection to Polymarket APIs
	 * @returns Success result (Polymarket APIs are mostly public)
	 */
	async connect(): Promise<Result<void>> {
		// Polymarket CLOB is mostly public read, but trades need auth
		this.connected = true;
		return ok(undefined);
	}

	/**
	 * Disconnects from Polymarket APIs
	 */
	async disconnect(): Promise<void> {
		this.connected = false;
	}

	/**
	 * Checks if the provider is connected
	 * @returns true if connected
	 */
	isConnected(): boolean {
		return this.connected;
	}

	// ============ Markets ============

	/**
	 * Fetches active prediction markets from Polymarket
	 *
	 * @param limit - Maximum number of markets to return (default: 100)
	 * @returns Array of prediction markets with current prices and metadata
	 *
	 * @example
	 * const result = await provider.fetchMarkets(50);
	 * if (result.ok) {
	 *   result.data.forEach(m => console.log(`${m.question}: ${m.outcomes[0].price}`));
	 * }
	 */
	async fetchMarkets(limit = 100): Promise<Result<PredictionMarket[]>> {
		try {
			const response = await fetch(
				`${GAMMA_BASE}/markets?limit=${limit}&active=true&closed=false`,
			);

			if (!response.ok) {
				return err(new Error(`Gamma API error: ${response.status}`));
			}

			const data: GammaMarket[] = await response.json();

			const markets: PredictionMarket[] = data.map((m) => {
				const outcomes = JSON.parse(m.outcomes || '["Yes", "No"]');
				const prices = JSON.parse(m.outcomePrices || "[0.5, 0.5]");

				return {
					id: m.id,
					question: m.question,
					description: m.description,
					outcomes: outcomes.map((name: string, i: number) => ({
						id: `${m.id}-${i}`,
						name,
						price: parseFloat(prices[i]) || 0.5,
						volume: 0,
					})),
					status: m.closed ? "closed" : "open",
					endDate: m.endDate,
					volume: parseFloat(m.volume) || 0,
					liquidity: parseFloat(m.liquidity) || 0,
					category: m.category,
					tags: m.tags?.map((t) => t.label) || [],
				};
			});

			return ok(markets);
		} catch (error) {
			return err(
				error instanceof Error ? error : new Error("Failed to fetch markets"),
			);
		}
	}

	/**
	 * Fetches a single market by ID
	 *
	 * @param marketId - The market's unique identifier
	 * @returns The market details or error if not found
	 */
	async fetchMarket(marketId: string): Promise<Result<PredictionMarket>> {
		try {
			const response = await fetch(`${GAMMA_BASE}/markets/${marketId}`);

			if (!response.ok) {
				return err(new Error(`Market not found: ${marketId}`));
			}

			const m: GammaMarket = await response.json();
			const outcomes = JSON.parse(m.outcomes || '["Yes", "No"]');
			const prices = JSON.parse(m.outcomePrices || "[0.5, 0.5]");

			return ok({
				id: m.id,
				question: m.question,
				description: m.description,
				outcomes: outcomes.map((name: string, i: number) => ({
					id: `${m.id}-${i}`,
					name,
					price: parseFloat(prices[i]) || 0.5,
					volume: 0,
				})),
				status: m.closed ? "closed" : "open",
				endDate: m.endDate,
				volume: parseFloat(m.volume) || 0,
				liquidity: parseFloat(m.liquidity) || 0,
				category: m.category,
				tags: m.tags?.map((t) => t.label) || [],
			});
		} catch (error) {
			return err(
				error instanceof Error ? error : new Error("Failed to fetch market"),
			);
		}
	}

	// ============ Trades ============

	/**
	 * Fetches recent trades for the configured wallet address
	 *
	 * @param _symbol - Symbol filter (currently unused in Polymarket)
	 * @param since - Timestamp to fetch trades after
	 * @param limit - Maximum number of trades to return (default: 100)
	 * @returns Array of trades or error if funderAddress not configured
	 *
	 * @throws Requires funderAddress in config
	 */
	async fetchTrades(
		_symbol?: string,
		since?: number,
		limit = 100,
	): Promise<Result<Trade[]>> {
		if (!this.config.funderAddress) {
			return err(new Error("funderAddress required to fetch trades"));
		}

		try {
			let url = `${CLOB_BASE}/trades?maker=${this.config.funderAddress}&limit=${limit}`;
			if (since) {
				url += `&after=${since}`;
			}

			const response = await fetch(url);
			if (!response.ok) {
				return err(new Error(`CLOB API error: ${response.status}`));
			}

			const data: CLOBTrade[] = await response.json();
			const trades = data.map((t) => this.mapTrade(t));

			return ok(trades);
		} catch (error) {
			return err(
				error instanceof Error ? error : new Error("Failed to fetch trades"),
			);
		}
	}

	/**
	 * Fetches all historical trades with pagination
	 *
	 * @param _symbol - Symbol filter (currently unused)
	 * @param onProgress - Callback invoked with current trade count
	 * @returns All trades for the wallet address
	 *
	 * @example
	 * const result = await provider.fetchAllTrades(undefined, count => {
	 *   console.log(`Fetched ${count} trades...`);
	 * });
	 */
	async fetchAllTrades(
		_symbol?: string,
		onProgress?: (count: number) => void,
	): Promise<Result<Trade[]>> {
		if (!this.config.funderAddress) {
			return err(new Error("funderAddress required to fetch trades"));
		}

		const allTrades: Trade[] = [];
		let cursor: string | undefined;
		const limit = 500;

		try {
			while (true) {
				let url = `${CLOB_BASE}/trades?maker=${this.config.funderAddress}&limit=${limit}`;
				if (cursor) {
					url += `&cursor=${cursor}`;
				}

				const response = await fetch(url);
				if (!response.ok) break;

				const data = await response.json();
				const trades: CLOBTrade[] = data.data || data;

				if (trades.length === 0) break;

				allTrades.push(...trades.map((t) => this.mapTrade(t)));
				onProgress?.(allTrades.length);

				cursor = data.next_cursor;
				if (!cursor || trades.length < limit) break;
			}

			return ok(allTrades);
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error("Failed to fetch all trades"),
			);
		}
	}

	// ============ Orders ============

	/**
	 * Fetches open orders for the configured wallet address
	 *
	 * @param _symbol - Symbol filter (currently unused)
	 * @returns Array of orders
	 */
	async fetchOrders(_symbol?: string): Promise<Result<Order[]>> {
		if (!this.config.funderAddress) {
			return err(new Error("funderAddress required to fetch orders"));
		}

		try {
			const response = await fetch(
				`${CLOB_BASE}/orders?owner=${this.config.funderAddress}`,
			);

			if (!response.ok) {
				return err(new Error(`CLOB API error: ${response.status}`));
			}

			const data: CLOBOrder[] = await response.json();
			const orders = data.map((o) => this.mapOrder(o));

			return ok(orders);
		} catch (error) {
			return err(
				error instanceof Error ? error : new Error("Failed to fetch orders"),
			);
		}
	}

	// ============ Positions ============

	/**
	 * Fetches current positions aggregated from trade history
	 *
	 * Since Polymarket positions are on-chain, this method aggregates
	 * trades to calculate current position state.
	 *
	 * @returns Array of open positions with unrealized PnL
	 */
	async fetchPositions(): Promise<Result<PredictionPosition[]>> {
		if (!this.config.funderAddress) {
			return err(new Error("funderAddress required to fetch positions"));
		}

		try {
			// Polymarket positions are on-chain, need to aggregate from trades
			const tradesResult = await this.fetchAllTrades();
			if (!tradesResult.ok) return err(tradesResult.error);

			const positions = this.aggregatePositions(
				tradesResult.data as PredictionTrade[],
			);
			return ok(positions);
		} catch (error) {
			return err(
				error instanceof Error ? error : new Error("Failed to fetch positions"),
			);
		}
	}

	// ============ Helpers ============

	/**
	 * Maps raw CLOB trade to normalized PredictionTrade
	 * @internal
	 */
	private mapTrade(t: CLOBTrade): PredictionTrade {
		const price = parseFloat(t.price);
		const size = parseFloat(t.size);
		const feeRate = parseFloat(t.fee_rate_bps) / 10000;

		return {
			id: t.id,
			datetime: t.timestamp,
			symbol: t.market,
			side: t.side.toLowerCase() as "buy" | "sell",
			price,
			amount: size,
			cost: price * size,
			fee: price * size * feeRate,
			orderID: t.taker_order_id,
			marketId: t.market,
			outcomeId: t.asset_id,
			outcome: t.outcome,
			marketType: "binary",
		};
	}

	/**
	 * Maps raw CLOB order to normalized Order
	 * @internal
	 */
	private mapOrder(o: CLOBOrder): Order {
		const statusMap: Record<string, Order["status"]> = {
			LIVE: "open",
			MATCHED: "filled",
			CANCELLED: "canceled",
		};

		return {
			orderID: o.id,
			symbol: o.market,
			side: o.side.toLowerCase() as "buy" | "sell",
			ordType: "limit",
			orderQty: parseFloat(o.original_size),
			price: parseFloat(o.price),
			avgPx: parseFloat(o.price),
			cumQty: parseFloat(o.size_matched),
			status: statusMap[o.status] || "open",
			timestamp: o.created_at,
		};
	}

	/**
	 * Aggregates trades into current position state
	 * @internal
	 */
	private aggregatePositions(trades: PredictionTrade[]): PredictionPosition[] {
		const positionMap = new Map<string, PredictionPosition>();

		for (const trade of trades) {
			const key = `${trade.marketId}-${trade.outcomeId}`;
			let pos = positionMap.get(key);

			if (!pos) {
				pos = {
					marketId: trade.marketId,
					market: trade.symbol,
					outcomeId: trade.outcomeId,
					outcome: trade.outcome,
					side: trade.side === "buy" ? "yes" : "no",
					contracts: 0,
					avgPrice: 0,
					currentPrice: trade.price,
					unrealizedPnl: 0,
					realizedPnl: 0,
				};
				positionMap.set(key, pos);
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
				// Reducing position
				const closedQty = Math.min(Math.abs(pos.contracts), Math.abs(qty));
				const pnl =
					closedQty *
					(trade.price - pos.avgPrice) *
					(pos.contracts > 0 ? 1 : -1);
				pos.realizedPnl += pnl - trade.fee;
				pos.contracts += qty;
			}

			pos.currentPrice = trade.price;
			pos.unrealizedPnl = pos.contracts * (pos.currentPrice - pos.avgPrice);
		}

		return Array.from(positionMap.values()).filter(
			(p) => Math.abs(p.contracts) > 0.001,
		);
	}
}

/**
 * Factory function to create a Polymarket provider
 *
 * @param config - Provider configuration
 * @returns New PolymarketProvider instance
 *
 * @example
 * const provider = createPolymarketProvider({
 *   funderAddress: '0x1234...'
 * });
 */
export function createPolymarketProvider(
	config: PolymarketConfig,
): PolymarketProvider {
	return new PolymarketProvider(config);
}
