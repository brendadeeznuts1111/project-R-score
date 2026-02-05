/**
 * @fileoverview Kalshi prediction market provider
 * @description Integrates with Kalshi's REST API for regulated event contracts
 * @module providers/kalshi
 *
 * @example
 * // Email/password authentication
 * const provider = new KalshiProvider({
 *   email: 'user@example.com',
 *   password: 'secret',
 * });
 * await provider.connect();
 *
 * @example
 * // Demo mode for paper trading
 * const provider = new KalshiProvider({ demo: true });
 */

import type {
	Candle,
	DataProvider,
	Order,
	PredictionMarket,
	PredictionPosition,
	PredictionTrade,
	Result,
	Timeframe,
	Trade,
} from "../types";
import { err, ok } from "../types";

/** Kalshi production API base URL */
const API_BASE = "https://trading-api.kalshi.com/trade-api/v2";

/** Kalshi demo/paper trading API base URL */
const DEMO_BASE = "https://demo-api.kalshi.co/trade-api/v2";

/**
 * Configuration options for Kalshi provider
 */
interface KalshiConfig {
	/** Email for login authentication */
	email?: string;
	/** Password for login authentication */
	password?: string;
	/** API key for programmatic access (preferred) */
	apiKey?: string;
	/** Private key for signing API requests */
	privateKey?: string;
	/** Use demo environment for paper trading */
	demo?: boolean;
}

/**
 * Raw market data from Kalshi API
 * @internal
 */
interface KalshiMarket {
	ticker: string;
	event_ticker: string;
	market_type: string;
	title: string;
	subtitle: string;
	yes_bid: number;
	yes_ask: number;
	no_bid: number;
	no_ask: number;
	last_price: number;
	volume: number;
	volume_24h: number;
	open_interest: number;
	status: string;
	result: string;
	expiration_time: string;
	close_time: string;
	category: string;
	series_ticker: string;
}

/**
 * Raw fill (trade execution) data from Kalshi API
 * @internal
 */
interface KalshiFill {
	trade_id: string;
	ticker: string;
	side: "yes" | "no";
	action: "buy" | "sell";
	count: number;
	yes_price: number;
	no_price: number;
	created_time: string;
	is_taker: boolean;
	order_id: string;
}

/**
 * Raw order data from Kalshi API
 * @internal
 */
interface KalshiOrder {
	order_id: string;
	ticker: string;
	side: "yes" | "no";
	action: "buy" | "sell";
	type: "limit" | "market";
	yes_price: number;
	no_price: number;
	created_time: string;
	expiration_time: string;
	status: "resting" | "canceled" | "executed" | "pending";
	remaining_count: number;
	initial_count: number;
	taker_fill_count: number;
	taker_fees: number;
	maker_fill_count: number;
}

/**
 * Raw position data from Kalshi API
 * @internal
 */
interface KalshiPosition {
	ticker: string;
	market_exposure: number;
	position: number;
	resting_orders_count: number;
	total_traded: number;
	realized_pnl: number;
}

/**
 * Kalshi prediction market data provider
 *
 * Provides access to Kalshi's regulated event contracts API. Supports both
 * production and demo environments, with email/password or API key authentication.
 *
 * @implements {DataProvider}
 *
 * @example
 * // Production with API key
 * const provider = new KalshiProvider({
 *   apiKey: 'your-api-key',
 *   privateKey: 'your-private-key',
 * });
 * await provider.connect();
 *
 * @example
 * // Demo mode for testing
 * const provider = new KalshiProvider({ demo: true });
 * await provider.connect();
 * const markets = await provider.fetchMarkets('open', 50);
 */
export class KalshiProvider implements DataProvider {
	name = "kalshi";
	private config: KalshiConfig;
	private connected = false;
	private token: string | null = null;
	private memberId: string | null = null;

	/**
	 * Creates a new Kalshi provider instance
	 * @param config - Configuration with authentication and environment options
	 */
	constructor(config: KalshiConfig = {}) {
		this.config = config;
	}

	/**
	 * Returns the appropriate API base URL based on demo mode
	 * @internal
	 */
	private get baseUrl(): string {
		return this.config.demo ? DEMO_BASE : API_BASE;
	}

	/**
	 * Establishes connection and authenticates with Kalshi API
	 *
	 * Supports three authentication modes:
	 * 1. API key + private key (preferred)
	 * 2. Email + password
	 * 3. Read-only (no auth)
	 *
	 * @returns Success or error result
	 */
	async connect(): Promise<Result<void>> {
		try {
			if (this.config.apiKey && this.config.privateKey) {
				// API key authentication (preferred)
				this.token = this.config.apiKey;
				this.connected = true;
				return ok(undefined);
			}

			if (this.config.email && this.config.password) {
				// Email/password authentication
				const response = await fetch(`${this.baseUrl}/login`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						email: this.config.email,
						password: this.config.password,
					}),
				});

				if (!response.ok) {
					const error = await response.json();
					return err(new Error(error.message || "Login failed"));
				}

				const data = await response.json();
				this.token = data.token;
				this.memberId = data.member_id;
				this.connected = true;
				return ok(undefined);
			}

			// Read-only mode (no auth)
			this.connected = true;
			return ok(undefined);
		} catch (error) {
			return err(
				error instanceof Error ? error : new Error("Connection failed"),
			);
		}
	}

	/**
	 * Disconnects from Kalshi API and clears authentication tokens
	 */
	async disconnect(): Promise<void> {
		if (this.token && this.config.email) {
			try {
				await fetch(`${this.baseUrl}/logout`, {
					method: "POST",
					headers: this.getHeaders(),
				});
			} catch {
				// Ignore logout errors
			}
		}
		this.token = null;
		this.memberId = null;
		this.connected = false;
	}

	/**
	 * Checks if the provider is connected and authenticated
	 * @returns true if connected
	 */
	isConnected(): boolean {
		return this.connected;
	}

	/**
	 * Builds request headers with authentication token
	 * @internal
	 */
	private getHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};

		if (this.token) {
			headers["Authorization"] = `Bearer ${this.token}`;
		}

		return headers;
	}

	// ============ Markets ============

	/**
	 * Fetches prediction markets from Kalshi
	 *
	 * @param status - Market status filter: 'open', 'closed', or 'settled'
	 * @param limit - Maximum number of markets to return (default: 100)
	 * @returns Array of prediction markets with current prices
	 *
	 * @example
	 * const result = await provider.fetchMarkets('open', 50);
	 * if (result.ok) {
	 *   result.data.forEach(m => console.log(`${m.question}: Yes@${m.outcomes[0].price}`));
	 * }
	 */
	async fetchMarkets(
		status: "open" | "closed" | "settled" = "open",
		limit = 100,
	): Promise<Result<PredictionMarket[]>> {
		try {
			const response = await fetch(
				`${this.baseUrl}/markets?status=${status}&limit=${limit}`,
				{ headers: this.getHeaders() },
			);

			if (!response.ok) {
				return err(new Error(`API error: ${response.status}`));
			}

			const data = await response.json();
			const markets: PredictionMarket[] = data.markets.map(
				(m: KalshiMarket) => ({
					id: m.ticker,
					question: m.title,
					description: m.subtitle,
					outcomes: [
						{
							id: `${m.ticker}-yes`,
							name: "Yes",
							price: m.yes_bid / 100,
							volume: m.volume,
						},
						{
							id: `${m.ticker}-no`,
							name: "No",
							price: m.no_bid / 100,
							volume: m.volume,
						},
					],
					status:
						m.status === "active" ? "open" : m.result ? "resolved" : "closed",
					resolution: m.result || undefined,
					endDate: m.expiration_time,
					volume: m.volume,
					liquidity: m.open_interest,
					category: m.category,
				}),
			);

			return ok(markets);
		} catch (error) {
			return err(
				error instanceof Error ? error : new Error("Failed to fetch markets"),
			);
		}
	}

	/**
	 * Fetches a single market by ticker symbol
	 *
	 * @param ticker - The market ticker (e.g., 'PRES-2024')
	 * @returns Market details or error if not found
	 */
	async fetchMarket(ticker: string): Promise<Result<PredictionMarket>> {
		try {
			const response = await fetch(`${this.baseUrl}/markets/${ticker}`, {
				headers: this.getHeaders(),
			});

			if (!response.ok) {
				return err(new Error(`Market not found: ${ticker}`));
			}

			const data = await response.json();
			const m: KalshiMarket = data.market;

			return ok({
				id: m.ticker,
				question: m.title,
				description: m.subtitle,
				outcomes: [
					{
						id: `${m.ticker}-yes`,
						name: "Yes",
						price: m.yes_bid / 100,
						volume: m.volume,
					},
					{
						id: `${m.ticker}-no`,
						name: "No",
						price: m.no_bid / 100,
						volume: m.volume,
					},
				],
				status:
					m.status === "active" ? "open" : m.result ? "resolved" : "closed",
				resolution: m.result || undefined,
				endDate: m.expiration_time,
				volume: m.volume,
				liquidity: m.open_interest,
				category: m.category,
			});
		} catch (error) {
			return err(
				error instanceof Error ? error : new Error("Failed to fetch market"),
			);
		}
	}

	// ============ Trades ============

	/**
	 * Fetches recent trade fills for the authenticated user
	 *
	 * @param symbol - Optional ticker to filter trades
	 * @param _since - Timestamp filter (currently unused)
	 * @param limit - Maximum number of trades (default: 100)
	 * @returns Array of trades
	 *
	 * @throws Requires authentication
	 */
	async fetchTrades(
		symbol?: string,
		_since?: number,
		limit = 100,
	): Promise<Result<Trade[]>> {
		if (!this.token) {
			return err(new Error("Authentication required to fetch trades"));
		}

		try {
			let url = `${this.baseUrl}/portfolio/fills?limit=${limit}`;
			if (symbol) {
				url += `&ticker=${symbol}`;
			}

			const response = await fetch(url, { headers: this.getHeaders() });

			if (!response.ok) {
				return err(new Error(`API error: ${response.status}`));
			}

			const data = await response.json();
			const trades = data.fills.map((f: KalshiFill) => this.mapTrade(f));

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
	 * @param symbol - Optional ticker to filter trades
	 * @param onProgress - Callback invoked with current trade count
	 * @returns All trades for the account
	 */
	async fetchAllTrades(
		symbol?: string,
		onProgress?: (count: number) => void,
	): Promise<Result<Trade[]>> {
		if (!this.token) {
			return err(new Error("Authentication required to fetch trades"));
		}

		const allTrades: Trade[] = [];
		let cursor: string | undefined;
		const limit = 1000;

		try {
			while (true) {
				let url = `${this.baseUrl}/portfolio/fills?limit=${limit}`;
				if (symbol) url += `&ticker=${symbol}`;
				if (cursor) url += `&cursor=${cursor}`;

				const response = await fetch(url, { headers: this.getHeaders() });
				if (!response.ok) break;

				const data = await response.json();
				const fills: KalshiFill[] = data.fills || [];

				if (fills.length === 0) break;

				allTrades.push(...fills.map((f) => this.mapTrade(f)));
				onProgress?.(allTrades.length);

				cursor = data.cursor;
				if (!cursor || fills.length < limit) break;
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
	 * Fetches orders for the authenticated user
	 *
	 * @param symbol - Optional ticker to filter orders
	 * @returns Array of orders (open and historical)
	 */
	async fetchOrders(symbol?: string): Promise<Result<Order[]>> {
		if (!this.token) {
			return err(new Error("Authentication required to fetch orders"));
		}

		try {
			let url = `${this.baseUrl}/portfolio/orders`;
			if (symbol) {
				url += `?ticker=${symbol}`;
			}

			const response = await fetch(url, { headers: this.getHeaders() });

			if (!response.ok) {
				return err(new Error(`API error: ${response.status}`));
			}

			const data = await response.json();
			const orders = data.orders.map((o: KalshiOrder) => this.mapOrder(o));

			return ok(orders);
		} catch (error) {
			return err(
				error instanceof Error ? error : new Error("Failed to fetch orders"),
			);
		}
	}

	// ============ Positions ============

	/**
	 * Fetches current open positions
	 *
	 * @returns Array of positions with realized/unrealized PnL
	 */
	async fetchPositions(): Promise<Result<PredictionPosition[]>> {
		if (!this.token) {
			return err(new Error("Authentication required to fetch positions"));
		}

		try {
			const response = await fetch(`${this.baseUrl}/portfolio/positions`, {
				headers: this.getHeaders(),
			});

			if (!response.ok) {
				return err(new Error(`API error: ${response.status}`));
			}

			const data = await response.json();
			const positions: PredictionPosition[] = data.market_positions
				.filter((p: KalshiPosition) => p.position !== 0)
				.map((p: KalshiPosition) => ({
					marketId: p.ticker,
					market: p.ticker,
					outcomeId: p.position > 0 ? `${p.ticker}-yes` : `${p.ticker}-no`,
					outcome: p.position > 0 ? "Yes" : "No",
					side: p.position > 0 ? "yes" : "no",
					contracts: Math.abs(p.position),
					avgPrice: 0, // Would need to calculate from fills
					currentPrice: 0,
					unrealizedPnl: p.market_exposure,
					realizedPnl: p.realized_pnl / 100,
				}));

			return ok(positions);
		} catch (error) {
			return err(
				error instanceof Error ? error : new Error("Failed to fetch positions"),
			);
		}
	}

	// ============ Balance ============

	/**
	 * Fetches account balance in USD
	 *
	 * @returns Total and available balance in dollars
	 *
	 * @example
	 * const result = await provider.fetchBalance();
	 * if (result.ok) {
	 *   console.log(`Available: $${result.data.available.toFixed(2)}`);
	 * }
	 */
	async fetchBalance(): Promise<
		Result<{ total: number; available: number; currency: string }>
	> {
		if (!this.token) {
			return err(new Error("Authentication required to fetch balance"));
		}

		try {
			const response = await fetch(`${this.baseUrl}/portfolio/balance`, {
				headers: this.getHeaders(),
			});

			if (!response.ok) {
				return err(new Error(`API error: ${response.status}`));
			}

			const data = await response.json();

			return ok({
				total: data.balance / 100, // Kalshi uses cents
				available: data.available_balance / 100,
				currency: "USD",
			});
		} catch (error) {
			return err(
				error instanceof Error ? error : new Error("Failed to fetch balance"),
			);
		}
	}

	// ============ OHLCV (Candlesticks) ============

	/**
	 * Fetches candlestick price data for a market
	 *
	 * @param symbol - Market ticker
	 * @param timeframe - Candle interval ('1m', '5m', '1h', '1d', etc.)
	 * @param _since - Start timestamp (currently unused)
	 * @param limit - Maximum number of candles (default: 100)
	 * @returns Array of OHLCV candles
	 *
	 * @example
	 * const candles = await provider.fetchOHLCV('PRES-2024', '1h', undefined, 24);
	 */
	async fetchOHLCV(
		symbol: string,
		timeframe: Timeframe,
		_since?: number,
		limit = 100,
	): Promise<Result<Candle[]>> {
		try {
			const periodMap: Record<Timeframe, number> = {
				"1m": 1,
				"5m": 5,
				"15m": 15,
				"30m": 30,
				"1h": 60,
				"4h": 240,
				"1d": 1440,
				"1w": 10080,
			};

			const response = await fetch(
				`${this.baseUrl}/markets/${symbol}/candlesticks?period_interval=${periodMap[timeframe]}&limit=${limit}`,
				{ headers: this.getHeaders() },
			);

			if (!response.ok) {
				return err(new Error(`API error: ${response.status}`));
			}

			const data = await response.json();
			const candles: Candle[] = data.candlesticks.map((c: any) => ({
				time: new Date(c.end_period_ts).getTime() / 1000,
				open: c.open / 100,
				high: c.high / 100,
				low: c.low / 100,
				close: c.close / 100,
				volume: c.volume,
			}));

			return ok(candles);
		} catch (error) {
			return err(
				error instanceof Error ? error : new Error("Failed to fetch OHLCV"),
			);
		}
	}

	// ============ Helpers ============

	/**
	 * Maps raw Kalshi fill to normalized PredictionTrade
	 * @internal
	 */
	private mapTrade(f: KalshiFill): PredictionTrade {
		const price = f.side === "yes" ? f.yes_price / 100 : f.no_price / 100;

		return {
			id: f.trade_id,
			datetime: f.created_time,
			symbol: f.ticker,
			side: f.action,
			price,
			amount: f.count,
			cost: price * f.count,
			fee: 0, // Fees are separate in Kalshi
			orderID: f.order_id,
			marketId: f.ticker,
			outcomeId: `${f.ticker}-${f.side}`,
			outcome: f.side === "yes" ? "Yes" : "No",
			marketType: "binary",
		};
	}

	/**
	 * Maps raw Kalshi order to normalized Order
	 * @internal
	 */
	private mapOrder(o: KalshiOrder): Order {
		const statusMap: Record<string, Order["status"]> = {
			resting: "open",
			canceled: "canceled",
			executed: "filled",
			pending: "open",
		};

		return {
			orderID: o.order_id,
			symbol: o.ticker,
			side: o.action,
			ordType: o.type,
			orderQty: o.initial_count,
			price: (o.side === "yes" ? o.yes_price : o.no_price) / 100,
			avgPx: null,
			cumQty: o.initial_count - o.remaining_count,
			status: statusMap[o.status] || "open",
			timestamp: o.created_time,
		};
	}
}

/**
 * Factory function to create a Kalshi provider
 *
 * @param config - Provider configuration
 * @returns New KalshiProvider instance
 *
 * @example
 * const provider = createKalshiProvider({
 *   email: 'user@example.com',
 *   password: 'secret',
 *   demo: true,
 * });
 */
export function createKalshiProvider(config: KalshiConfig): KalshiProvider {
	return new KalshiProvider(config);
}
