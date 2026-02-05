/**
 * @fileoverview Deribit Crypto Options Provider
 * @description Specialized provider for Deribit options with Greeks, IV, and orderbook
 * @module providers/deribit
 *
 * @example
 * const provider = new DeribitProvider({
 *   apiKey: 'your-key',
 *   apiSecret: 'your-secret',
 *   testnet: true,
 * });
 * await provider.connect();
 * const options = await provider.fetchOptions('BTC');
 */

import type { Result, Trade } from "../types";
import { err, ok } from "../types";
import { BaseProvider, safeAsync } from "./base";

/**
 * Deribit configuration
 */
export interface DeribitConfig {
	apiKey?: string;
	apiSecret?: string;
	testnet?: boolean;
}

/**
 * Option instrument details
 */
export interface DeribitOption {
	instrumentName: string;
	underlying: string;
	strike: number;
	expiration: Date;
	expirationTimestamp: number;
	optionType: "call" | "put";
	settlementPeriod: "day" | "week" | "month" | "quarter";
	contractSize: number;
	minTradeAmount: number;
	tickSize: number;
	isActive: boolean;
	creationTimestamp: number;
}

/**
 * Option market data with Greeks
 */
export interface DeribitOptionTicker {
	instrumentName: string;
	underlying: string;
	underlyingPrice: number;
	markPrice: number;
	markIv: number; // Mark implied volatility
	bidIv?: number; // Bid implied volatility
	askIv?: number; // Ask implied volatility
	bestBidPrice?: number;
	bestBidAmount?: number;
	bestAskPrice?: number;
	bestAskAmount?: number;
	lastPrice?: number;
	openInterest: number;
	volume24h: number;
	stats: {
		high: number;
		low: number;
		priceChange: number;
		volume: number;
	};
	greeks: {
		delta: number;
		gamma: number;
		theta: number;
		vega: number;
		rho: number;
	};
	timestamp: number;
}

/**
 * Orderbook level
 */
export interface OrderbookLevel {
	price: number;
	amount: number;
}

/**
 * Option orderbook
 */
export interface DeribitOrderbook {
	instrumentName: string;
	bids: OrderbookLevel[];
	asks: OrderbookLevel[];
	timestamp: number;
	changeId: number;
	underlyingPrice: number;
	markPrice: number;
	markIv: number;
}

/**
 * Volatility surface data point
 */
export interface VolatilityPoint {
	strike: number;
	expiration: Date;
	iv: number;
	optionType: "call" | "put";
	delta: number;
}

/**
 * Index data
 */
export interface DeribitIndex {
	indexName: string;
	price: number;
	timestamp: number;
}

const DERIBIT_API_URL = "https://www.deribit.com/api/v2";
const DERIBIT_TESTNET_URL = "https://test.deribit.com/api/v2";

/**
 * Deribit Provider - Specialized for crypto options
 *
 * Features:
 * - Options chain with Greeks
 * - Implied volatility surface
 * - Real-time orderbooks
 * - Settlement & expiration data
 * - Index prices (BTC, ETH)
 */
export class DeribitProvider extends BaseProvider {
	name = "deribit";
	private config: DeribitConfig;
	private baseUrl: string;
	private accessToken: string | null = null;
	private tokenExpiry: number = 0;

	constructor(config: DeribitConfig = {}) {
		super();
		this.config = config;
		this.baseUrl = config.testnet ? DERIBIT_TESTNET_URL : DERIBIT_API_URL;
	}

	/**
	 * Connect to Deribit (authenticate if credentials provided)
	 */
	async connect(): Promise<Result<void>> {
		return safeAsync(async () => {
			if (this.config.apiKey && this.config.apiSecret) {
				await this.authenticate();
			}
			// Test connection with public endpoint
			await this.getIndex("btc_usd");
			this.connected = true;
		}, "Failed to connect to Deribit");
	}

	/**
	 * Authenticate with Deribit API
	 */
	private async authenticate(): Promise<void> {
		const response = await fetch(`${this.baseUrl}/public/auth`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "public/auth",
				params: {
					grant_type: "client_credentials",
					client_id: this.config.apiKey,
					client_secret: this.config.apiSecret,
				},
			}),
		});

		const data = await response.json();
		if (data.error) {
			throw new Error(`Auth failed: ${data.error.message}`);
		}

		this.accessToken = data.result.access_token;
		this.tokenExpiry = Date.now() + (data.result.expires_in - 60) * 1000;
	}

	/**
	 * Make API request
	 */
	private async request<T>(
		method: string,
		params: Record<string, unknown> = {},
	): Promise<T> {
		const isPrivate = method.startsWith("private/");

		if (isPrivate && this.accessToken && Date.now() > this.tokenExpiry) {
			await this.authenticate();
		}

		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};

		if (isPrivate && this.accessToken) {
			headers["Authorization"] = `Bearer ${this.accessToken}`;
		}

		const response = await fetch(`${this.baseUrl}/${method}`, {
			method: "GET",
			headers,
		});

		// Handle GET with params
		const url = new URL(`${this.baseUrl}/${method}`);
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined) {
				url.searchParams.append(key, String(value));
			}
		});

		const getResponse = await fetch(url.toString(), { headers });
		const data = await getResponse.json();

		if (data.error) {
			throw new Error(`API error: ${data.error.message}`);
		}

		return data.result as T;
	}

	/**
	 * Get index price (BTC, ETH)
	 */
	async getIndex(options: { indexName: string } | string): Promise<Result<DeribitIndex>> {
		// Handle both old string format and new options format for backward compatibility
		const indexName = typeof options === 'string' ? options : options.indexName;
		return safeAsync(async () => {
			const result = await this.request<{ index_price: number }>(
				"public/get_index_price",
				{
					index_name: indexName,
				},
			);

			return {
				indexName,
				price: result.index_price,
				timestamp: Date.now(),
			};
		}, `Failed to get index ${indexName}`);
	}

	/**
	 * Fetch all options instruments for a currency
	 */
	async fetchOptions(
		currency: "BTC" | "ETH" = "BTC",
	): Promise<Result<DeribitOption[]>> {
		return safeAsync(async () => {
			const instruments = await this.request<any[]>("public/get_instruments", {
				currency,
				kind: "option",
				expired: false,
			});

			return instruments.map((inst) => this.parseOption(inst));
		}, `Failed to fetch ${currency} options`);
	}

	/**
	 * Parse option instrument
	 */
	private parseOption(inst: any): DeribitOption {
		return {
			instrumentName: inst.instrument_name,
			underlying: inst.base_currency,
			strike: inst.strike,
			expiration: new Date(inst.expiration_timestamp),
			expirationTimestamp: inst.expiration_timestamp,
			optionType: inst.option_type as "call" | "put",
			settlementPeriod: inst.settlement_period,
			contractSize: inst.contract_size,
			minTradeAmount: inst.min_trade_amount,
			tickSize: inst.tick_size,
			isActive: inst.is_active,
			creationTimestamp: inst.creation_timestamp,
		};
	}

	/**
	 * Get option ticker with Greeks
	 */
	async getOptionTicker(
		options: { instrumentName: string } | string,
	): Promise<Result<DeribitOptionTicker>> {
		// Handle both old string format and new options format for backward compatibility
		const instrumentName = typeof options === 'string' ? options : options.instrumentName;
		return safeAsync(async () => {
			const ticker = await this.request<any>("public/ticker", {
				instrument_name: instrumentName,
			});

			return this.parseOptionTicker(ticker);
		}, `Failed to get ticker for ${instrumentName}`);
	}

	/**
	 * Parse option ticker
	 */
	private parseOptionTicker(t: any): DeribitOptionTicker {
		return {
			instrumentName: t.instrument_name,
			underlying: t.underlying_index?.split("_")[0] || "BTC",
			underlyingPrice: t.underlying_price,
			markPrice: t.mark_price,
			markIv: t.mark_iv,
			bidIv: t.bid_iv,
			askIv: t.ask_iv,
			bestBidPrice: t.best_bid_price,
			bestBidAmount: t.best_bid_amount,
			bestAskPrice: t.best_ask_price,
			bestAskAmount: t.best_ask_amount,
			lastPrice: t.last_price,
			openInterest: t.open_interest,
			volume24h: t.stats?.volume || 0,
			stats: {
				high: t.stats?.high || 0,
				low: t.stats?.low || 0,
				priceChange: t.stats?.price_change || 0,
				volume: t.stats?.volume || 0,
			},
			greeks: {
				delta: t.greeks?.delta || 0,
				gamma: t.greeks?.gamma || 0,
				theta: t.greeks?.theta || 0,
				vega: t.greeks?.vega || 0,
				rho: t.greeks?.rho || 0,
			},
			timestamp: t.timestamp,
		};
	}

	/**
	 * Get option orderbook
	 */
	async getOrderbook(
		instrumentName: string,
		depth: number = 10,
	): Promise<Result<DeribitOrderbook>> {
		return safeAsync(async () => {
			const book = await this.request<any>("public/get_order_book", {
				instrument_name: instrumentName,
				depth,
			});

			return {
				instrumentName,
				bids: book.bids.map(([price, amount]: [number, number]) => ({
					price,
					amount,
				})),
				asks: book.asks.map(([price, amount]: [number, number]) => ({
					price,
					amount,
				})),
				timestamp: book.timestamp,
				changeId: book.change_id,
				underlyingPrice: book.underlying_price,
				markPrice: book.mark_price,
				markIv: book.mark_iv,
			};
		}, `Failed to get orderbook for ${instrumentName}`);
	}

	/**
	 * Build implied volatility surface
	 */
	async getVolatilitySurface(
		currency: "BTC" | "ETH" = "BTC",
	): Promise<Result<VolatilityPoint[]>> {
		return safeAsync(async () => {
			// Get all active options
			const optionsResult = await this.fetchOptions(currency);
			if (!optionsResult.ok) throw new Error(optionsResult.error.message);

			const options = optionsResult.data;
			const points: VolatilityPoint[] = [];

			// Get tickers for each option (batched)
			const batchSize = 20;
			for (let i = 0; i < options.length; i += batchSize) {
				const batch = options.slice(i, i + batchSize);
				const tickerPromises = batch.map((opt) =>
					this.getOptionTicker(opt.instrumentName),
				);
				const results = await Promise.all(tickerPromises);

				for (let j = 0; j < results.length; j++) {
					const result = results[j];
					if (result.ok && result.data.markIv > 0) {
						const opt = batch[j];
						points.push({
							strike: opt.strike,
							expiration: opt.expiration,
							iv: result.data.markIv,
							optionType: opt.optionType,
							delta: result.data.greeks.delta,
						});
					}
				}

				// Rate limiting
				if (i + batchSize < options.length) {
					await Bun.sleep(100);
				}
			}

			return points;
		}, `Failed to build volatility surface for ${currency}`);
	}

	/**
	 * Get options by expiration
	 */
	async getOptionsByExpiration(
		currency: "BTC" | "ETH" = "BTC",
		expirationTimestamp?: number,
	): Promise<Result<DeribitOption[]>> {
		return safeAsync(async () => {
			const optionsResult = await this.fetchOptions(currency);
			if (!optionsResult.ok) throw new Error(optionsResult.error.message);

			let options = optionsResult.data;

			if (expirationTimestamp) {
				// Filter to specific expiration (within 1 day tolerance)
				const tolerance = 24 * 60 * 60 * 1000;
				options = options.filter(
					(opt) =>
						Math.abs(opt.expirationTimestamp - expirationTimestamp) < tolerance,
				);
			}

			// Sort by strike
			return options.sort((a, b) => a.strike - b.strike);
		}, "Failed to get options by expiration");
	}

	/**
	 * Get ATM option for given expiration
	 */
	async getATMOption(
		currency: "BTC" | "ETH" = "BTC",
		optionType: "call" | "put" = "call",
		expirationTimestamp?: number,
	): Promise<Result<DeribitOption | null>> {
		return safeAsync(async () => {
			// Get index price
			const indexResult = await this.getIndex(`${currency.toLowerCase()}_usd`);
			if (!indexResult.ok) throw new Error(indexResult.error.message);
			const spotPrice = indexResult.data.price;

			// Get options
			const optionsResult = await this.getOptionsByExpiration(
				currency,
				expirationTimestamp,
			);
			if (!optionsResult.ok) throw new Error(optionsResult.error.message);

			// Filter by type and find closest to ATM
			const filtered = optionsResult.data.filter(
				(opt) => opt.optionType === optionType,
			);
			if (filtered.length === 0) return null;

			// Find strike closest to spot
			let closest = filtered[0];
			let minDiff = Math.abs(closest.strike - spotPrice);

			for (const opt of filtered) {
				const diff = Math.abs(opt.strike - spotPrice);
				if (diff < minDiff) {
					minDiff = diff;
					closest = opt;
				}
			}

			return closest;
		}, "Failed to get ATM option");
	}

	/**
	 * Calculate implied probability from option prices
	 * Uses risk-neutral probability: P = (S - K*e^(-rT)) / S for calls
	 */
	async getImpliedProbability(instrumentName: string): Promise<Result<number>> {
		return safeAsync(async () => {
			const tickerResult = await this.getOptionTicker(instrumentName);
			if (!tickerResult.ok) throw new Error(tickerResult.error.message);

			const { markPrice, underlyingPrice, greeks } = tickerResult.data;

			// Simple approximation: delta ≈ probability for deep ITM options
			// For a more accurate measure, use delta for ATM options
			const impliedProb = Math.abs(greeks.delta);

			return impliedProb;
		}, `Failed to calculate implied probability for ${instrumentName}`);
	}

	/**
	 * Get expirations with time to expiry
	 */
	async getExpirations(
		currency: "BTC" | "ETH" = "BTC",
	): Promise<Result<{ date: Date; daysToExpiry: number }[]>> {
		return safeAsync(async () => {
			const optionsResult = await this.fetchOptions(currency);
			if (!optionsResult.ok) throw new Error(optionsResult.error.message);

			// Get unique expirations
			const expirationSet = new Set<number>();
			optionsResult.data.forEach((opt) =>
				expirationSet.add(opt.expirationTimestamp),
			);

			const now = Date.now();
			const expirations = Array.from(expirationSet)
				.sort((a, b) => a - b)
				.map((ts) => ({
					date: new Date(ts),
					daysToExpiry: (ts - now) / (24 * 60 * 60 * 1000),
				}));

			return expirations;
		}, `Failed to get expirations for ${currency}`);
	}

	// Required abstract methods from BaseProvider
	async fetchTrades(
		symbol?: string,
		since?: number,
		limit?: number,
	): Promise<Result<Trade[]>> {
		return safeAsync(async () => {
			if (!this.accessToken) {
				return [];
			}

			const trades = await this.request<any[]>(
				"private/get_user_trades_by_currency",
				{
					currency: symbol || "BTC",
					kind: "option",
					count: limit || 100,
					start_timestamp: since,
				},
			);

			return trades.map((t) => ({
				id: t.trade_id,
				datetime: new Date(t.timestamp).toISOString(),
				symbol: t.instrument_name,
				side: t.direction as "buy" | "sell",
				price: t.price,
				amount: t.amount,
				cost: t.price * t.amount,
				fee: t.fee || 0,
				orderID: t.order_id,
			}));
		}, "Failed to fetch trades");
	}

	async fetchAllTrades(
		symbol?: string,
		onProgress?: (count: number) => void,
	): Promise<Result<Trade[]>> {
		// Options trades are typically fewer, single fetch is usually sufficient
		return this.fetchTrades(symbol, undefined, 1000);
	}
}

/**
 * Create a Deribit provider instance
 */
export function createDeribitProvider(config?: DeribitConfig): DeribitProvider {
	return new DeribitProvider(config);
}
