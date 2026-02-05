/**
 * @fileoverview CCXT-based cryptocurrency exchange provider
 * @description Universal provider for 100+ crypto exchanges via CCXT library
 * @module providers/ccxt
 *
 * @example
 * const provider = new CCXTProvider({
 *   exchange: 'binance',
 *   apiKey: 'your-key',
 *   apiSecret: 'your-secret',
 * });
 * await provider.connect();
 * const trades = await provider.fetchTrades('BTC/USDT');
 */

import ccxt from "ccxt";
import type { Candle, Order, Result, Timeframe, Trade } from "../types";
import { err, ok } from "../types";
import { BaseProvider, safeAsync } from "./base";

// Type definitions for ccxt (since @types/ccxt may not be available)
// Using any for now since ccxt namespace types aren't available
type CcxtExchange = any;
type CcxtTrade = any;
type CcxtOrder = any;
type CcxtOHLCV = [number, number, number, number, number, number];

/**
 * Configuration options for CCXT provider
 */
interface CCXTConfig {
	/** Exchange ID (e.g., 'binance', 'bybit', 'okx', 'bitmex') */
	exchange: string;
	/** API key from the exchange */
	apiKey: string;
	/** API secret from the exchange */
	apiSecret: string;
	/** Use exchange's testnet environment */
	testnet?: boolean;
}

/**
 * CCXT-based provider for cryptocurrency exchanges
 *
 * Provides unified access to 100+ cryptocurrency exchanges through the CCXT library.
 * Supports fetching trades, orders, OHLCV data, and account balances.
 *
 * @extends BaseProvider
 *
 * @example
 * // Connect to Binance
 * const provider = new CCXTProvider({
 *   exchange: 'binance',
 *   apiKey: 'xxx',
 *   apiSecret: 'yyy',
 * });
 * await provider.connect();
 *
 * @example
 * // Fetch all trades for a symbol
 * const result = await provider.fetchAllTrades('BTC/USDT', count => {
 *   console.log(`Fetched ${count} trades...`);
 * });
 */
export class CCXTProvider extends BaseProvider {
	/** Provider name in format 'ccxt:{exchange}' */
	name: string;
	private client: CcxtExchange | null = null;
	private config: CCXTConfig;

	/**
	 * Creates a new CCXT provider instance
	 * @param config - Exchange configuration with API credentials
	 */
	constructor(config: CCXTConfig) {
		super();
		this.config = config;
		this.name = `ccxt:${config.exchange}`;
	}

	/**
	 * Establishes connection to the exchange
	 *
	 * Initializes the CCXT client and tests connectivity by fetching balance.
	 *
	 * @returns Success or error result
	 * @throws If exchange is not supported by CCXT
	 */
	async connect(): Promise<Result<void>> {
		return safeAsync(async () => {
			const ExchangeClass = (ccxt as any)[this.config.exchange];
			if (!ExchangeClass) {
				throw new Error(
					`Exchange "${this.config.exchange}" not supported by CCXT`,
				);
			}

			this.client = new ExchangeClass({
				apiKey: this.config.apiKey,
				secret: this.config.apiSecret,
				enableRateLimit: true,
				options: {
					defaultType: "swap",
					testnet: this.config.testnet,
				},
			});

			// Test connection by fetching balance
			await this.client.fetchBalance();
			this.connected = true;
		}, "Failed to connect");
	}

	/**
	 * Disconnects from the exchange
	 */
	async disconnect(): Promise<void> {
		this.client = null;
		this.connected = false;
	}

	/**
	 * Returns the CCXT client instance
	 * @internal
	 * @throws If not connected
	 */
	private getClient(): CcxtExchange {
		if (!this.client) {
			throw new Error("Not connected. Call connect() first.");
		}
		return this.client;
	}

	/**
	 * Fetches recent trades for the authenticated user
	 *
	 * @param symbol - Trading pair (e.g., 'BTC/USDT')
	 * @param since - Fetch trades after this timestamp (ms)
	 * @param limit - Maximum number of trades (default: 500)
	 * @returns Array of normalized trades
	 */
	async fetchTrades(
		symbol?: string,
		since?: number,
		limit = 500,
	): Promise<Result<Trade[]>> {
		return safeAsync(async () => {
			const client = this.getClient();
			const trades: CcxtTrade[] = await client.fetchMyTrades(
				symbol,
				since,
				limit,
			);

			return trades.map((t: CcxtTrade) => ({
				id: t.id,
				datetime: t.datetime || new Date(t.timestamp).toISOString(),
				symbol: this.normalizeSymbol(t.symbol),
				side: this.normalizeSide(t.side),
				price: t.price,
				amount: t.amount,
				cost: t.cost,
				fee: t.fee?.cost || 0,
				orderID: t.order || undefined,
			}));
		}, "Failed to fetch trades");
	}

	/**
	 * Fetches all historical trades with automatic pagination
	 *
	 * Handles rate limiting and pagination automatically.
	 *
	 * @param symbol - Trading pair to fetch trades for
	 * @param onProgress - Callback invoked with current trade count
	 * @returns All trades for the symbol
	 *
	 * @example
	 * const result = await provider.fetchAllTrades('ETH/USDT', count => {
	 *   console.log(`Progress: ${count} trades`);
	 * });
	 */
	async fetchAllTrades(
		symbol?: string,
		onProgress?: (count: number) => void,
	): Promise<Result<Trade[]>> {
		return safeAsync(async () => {
			const client = this.getClient();
			const allTrades: Trade[] = [];
			let since: number | undefined;

			while (true) {
				const trades: CcxtTrade[] = await client.fetchMyTrades(
					symbol,
					since,
					500,
				);
				if (trades.length === 0) break;

				const mapped = trades.map((t: CcxtTrade) => ({
					id: t.id,
					datetime: t.datetime || new Date(t.timestamp).toISOString(),
					symbol: this.normalizeSymbol(t.symbol),
					side: this.normalizeSide(t.side),
					price: t.price,
					amount: t.amount,
					cost: t.cost,
					fee: t.fee?.cost || 0,
					orderID: t.order || undefined,
				}));

				allTrades.push(...mapped);
				onProgress?.(allTrades.length);

				// Pagination: use last trade timestamp
				const lastTrade: CcxtTrade = trades[trades.length - 1];
				since = lastTrade.timestamp + 1;

				// Rate limiting
				await Bun.sleep(client.rateLimit || 1000);
			}

			return allTrades;
		}, "Failed to fetch all trades");
	}

	/**
	 * Fetches orders for the authenticated user
	 *
	 * @param symbol - Trading pair to filter orders
	 * @param since - Fetch orders after this timestamp
	 * @param limit - Maximum number of orders (default: 500)
	 * @returns Array of normalized orders
	 */
	async fetchOrders(
		symbol?: string,
		since?: number,
		limit = 500,
	): Promise<Result<Order[]>> {
		return safeAsync(async () => {
			const client = this.getClient();
			const orders: CcxtOrder[] = await client.fetchOrders(
				symbol,
				since,
				limit,
			);

			return orders.map((o: CcxtOrder) => ({
				orderID: o.id,
				symbol: this.normalizeSymbol(o.symbol),
				side: this.normalizeSide(o.side),
				ordType: this.mapOrderType(o.type),
				orderQty: o.amount,
				price: o.price,
				avgPx: o.average,
				cumQty: o.filled,
				status: this.mapOrderStatus(o.status),
				timestamp: o.datetime || new Date(o.timestamp).toISOString(),
			}));
		}, "Failed to fetch orders");
	}

	/**
	 * Fetches OHLCV candlestick data
	 *
	 * @param symbol - Trading pair (e.g., 'BTC/USDT')
	 * @param timeframe - Candle interval ('1m', '5m', '1h', '1d', etc.)
	 * @param since - Start timestamp in milliseconds
	 * @param limit - Maximum number of candles (default: 500)
	 * @returns Array of OHLCV candles
	 *
	 * @example
	 * const candles = await provider.fetchOHLCV('BTC/USDT', '1h', Date.now() - 86400000);
	 */
	async fetchOHLCV(
		symbol: string,
		timeframe: Timeframe,
		since?: number,
		limit = 500,
	): Promise<Result<Candle[]>> {
		return safeAsync(async () => {
			const client = this.getClient();
			const ohlcv: CcxtOHLCV[] = await client.fetchOHLCV(
				symbol,
				timeframe,
				since,
				limit,
			);

			return ohlcv.map(([time, open, high, low, close, volume]: CcxtOHLCV) => ({
				time: Math.floor(time / 1000),
				open: open,
				high: high,
				low: low,
				close: close,
				volume: volume,
			}));
		}, "Failed to fetch OHLCV");
	}

	/**
	 * Fetches account balance
	 *
	 * Automatically detects the primary currency (BTC, XBT, USDT, USD).
	 *
	 * @returns Total and available balance with currency
	 */
	async fetchBalance(): Promise<
		Result<{ total: number; available: number; currency: string }>
	> {
		return safeAsync(async () => {
			const client = this.getClient();
			const balance = await client.fetchBalance();

			// Try common currencies
			const currencies = ["BTC", "XBT", "USDT", "USD"];
			for (const curr of currencies) {
				if (balance.total?.[curr]) {
					return {
						total: balance.total[curr] as number,
						available: (balance.free?.[curr] || 0) as number,
						currency: curr === "XBT" ? "BTC" : curr,
					};
				}
			}

			return { total: 0, available: 0, currency: "BTC" };
		}, "Failed to fetch balance");
	}

	/**
	 * Maps CCXT order type to normalized type
	 * @internal
	 */
	private mapOrderType(type?: string): Order["ordType"] {
		switch (type?.toLowerCase()) {
			case "limit":
				return "limit";
			case "market":
				return "market";
			case "stop":
				return "stop";
			case "stop_limit":
			case "stoplimit":
				return "stop_limit";
			default:
				return "limit";
		}
	}

	/**
	 * Maps CCXT order status to normalized status
	 * @internal
	 */
	private mapOrderStatus(status?: string): Order["status"] {
		switch (status?.toLowerCase()) {
			case "closed":
			case "filled":
				return "filled";
			case "canceled":
			case "cancelled":
				return "canceled";
			case "rejected":
				return "rejected";
			case "open":
			case "new":
				return "open";
			case "partially_filled":
				return "partial";
			default:
				return "open";
		}
	}
}
