/**
 * @fileoverview Cloudflare Workers API Client
 * @description Client for interacting with Trader Analyzer Workers API
 * @module api/workers-client
 */

import { StructuredLogger } from '../logging/structured-logger';

/**
 * API Configuration
 */
export interface WorkersAPIConfig {
	baseURL: string;
	timeout?: number;
	enableETag?: boolean;
}

/**
 * Standard API Response
 */
export interface APIResponse<T> {
	data: T;
	timestamp: number;
	cached: boolean;
	version: string;
}

/**
 * Markets API Response
 */
export interface MarketsResponse {
	markets: Market[];
	total: number;
}

export interface Market {
	id: string;
	displayName: string;
	category: string;
	status: string;
	description?: string;
	tags?: string[];
	sources?: MarketSource[];
}

export interface MarketSource {
	exchange: string;
	symbol: string;
	marketId: string;
	status: string;
	lastUpdate: string;
}

/**
 * OHLCV Response
 */
export interface OHLCVResponse {
	candles: Candle[];
	marketId: string;
	timeframe: string;
	count: number;
	totalAvailable: number;
	limited: boolean;
	range: {
		start: string;
		end: string;
	};
}

export interface Candle {
	time: number;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
}

/**
 * Trading Stats Response
 */
export interface TradingStatsResponse {
	stats: {
		totalTrades: number;
		winRate: number;
		sharpeRatio: number;
		totalRealizedPnl: number;
		winningTrades: number;
		losingTrades: number;
		avgWin: number;
		avgLoss: number;
		profitFactor: number;
		maxDrawdown: number;
		fundingPaid: number;
		fundingReceived: number;
		tradingDays: number;
		avgTradesPerDay: number;
		avgHoldTime: number;
		monthlyPnl: MonthlyPnl[];
	};
	account: {
		walletBalance: number;
		marginBalance: number;
		availableMargin: number;
		unrealisedPnl: number;
		realisedPnl: number;
	};
}

export interface MonthlyPnl {
	month: string;
	pnl: number;
	funding: number;
	trades: number;
}

/**
 * Equity Curve Response
 */
export interface EquityCurveResponse {
	equityCurve: EquityPoint[];
}

export interface EquityPoint {
	date: string;
	balance: number;
	pnl: number;
}

/**
 * Sessions Response
 */
export interface SessionsResponse {
	sessions: Session[];
	total: number;
	page: number;
	limit: number;
}

export interface Session {
	id: string;
	symbol: string;
	displaySymbol: string;
	side: "long" | "short";
	openTime: string;
	closeTime: string | null;
	durationMs: number;
	maxSize: number;
	totalBought: number;
	totalSold: number;
	avgEntryPrice: number;
	avgExitPrice: number | null;
	realizedPnl: number;
	totalFees: number;
	netPnl: number;
	tradeCount: number;
	trades?: Trade[];
	status: "open" | "closed";
}

export interface Trade {
	id: string;
	datetime: string;
	side: "buy" | "sell";
	price: number;
	amount: number;
	cost: number;
	fee: {
		cost: number;
		currency: string;
	};
}

/**
 * Cloudflare Workers API Client
 */
export class WorkersAPIClient {
	protected baseURL: string;
	private timeout: number;
	private enableETag: boolean;
	protected etagCache: Map<string, string> = new Map();

	constructor(config: WorkersAPIConfig) {
		this.baseURL = config.baseURL.replace(/\/$/, "");
		this.timeout = config.timeout || 30000;
		this.enableETag = config.enableETag ?? true;
	}

	/**
	 * Make HTTP request with ETag support
	 */
	private async request<T>(
		endpoint: string,
		options: RequestInit = {},
	): Promise<APIResponse<T>> {
		const url = `${this.baseURL}${endpoint}`;
		const headers = new Headers(options.headers);

		// Add ETag if available
		if (this.enableETag && this.etagCache.has(endpoint)) {
			headers.set("If-None-Match", `"${this.etagCache.get(endpoint)}"`);
		}

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.timeout);

		try {
			const response = await fetch(url, {
				...options,
				headers,
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			// Handle 304 Not Modified
			if (response.status === 304) {
				return {
					data: null as T,
					timestamp: Date.now(),
					cached: true,
					version: response.headers.get("x-api-version") || "2.0.0",
				};
			}

			if (!response.ok) {
				const logger = new StructuredLogger();
				const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
				logger.log("WORKERS_API_HTTP_ERROR", {
					url: url.toString(),
					status: response.status,
					statusText: response.statusText,
					method: options?.method || "GET"
				});
				throw error;
			}

			// Store ETag for next request
			const etag = response.headers.get("ETag");
			if (etag && this.enableETag) {
				this.etagCache.set(endpoint, etag.replace(/"/g, ""));
			}

			const data = await response.json();
			return {
				data,
				timestamp: Date.now(),
				cached: false,
				version: response.headers.get("x-api-version") || "2.0.0",
			};
		} catch (error) {
			clearTimeout(timeoutId);
			const logger = new StructuredLogger();
			
			if (error instanceof Error && error.name === "AbortError") {
				const timeoutError = new Error(`Request timeout after ${this.timeout}ms`);
				logger.log("WORKERS_API_TIMEOUT", {
					url: url.toString(),
					timeout: this.timeout,
					method: options?.method || "GET",
					error: timeoutError.message
				});
				throw timeoutError;
			}
			
			// Log structured error
			logger.log("WORKERS_API_ERROR", {
				url: url.toString(),
				method: options?.method || "GET",
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined
			});
			
			throw error;
		}
	}

	/**
	 * Get all markets
	 */
	async getMarkets(): Promise<APIResponse<MarketsResponse>> {
		return this.request<MarketsResponse>("/api/markets");
	}

	/**
	 * Get single market
	 */
	async getMarket(marketId: string): Promise<APIResponse<Market>> {
		return this.request<Market>(`/api/markets/${marketId}`);
	}

	/**
	 * Get OHLCV data
	 */
	async getOHLCV(
		marketId: string,
		options: {
			timeframe?: string;
			limit?: number;
			since?: number;
		} = {},
	): Promise<APIResponse<OHLCVResponse>> {
		const params = new URLSearchParams();
		if (options.timeframe) params.set("timeframe", options.timeframe);
		if (options.limit) params.set("limit", options.limit.toString());
		if (options.since) params.set("since", options.since.toString());

		const query = params.toString();
		return this.request<OHLCVResponse>(
			`/api/markets/${marketId}/ohlcv${query ? `?${query}` : ""}`,
		);
	}

	/**
	 * Get trading statistics
	 */
	async getTradingStats(): Promise<APIResponse<TradingStatsResponse>> {
		return this.request<TradingStatsResponse>("/api/trades?type=stats");
	}

	/**
	 * Get equity curve
	 */
	async getEquityCurve(
		days: number = 365,
	): Promise<APIResponse<EquityCurveResponse>> {
		return this.request<EquityCurveResponse>(
			`/api/trades?type=equity&days=${days}`,
		);
	}

	/**
	 * Get position sessions
	 */
	async getSessions(
		page: number = 1,
		limit: number = 20,
	): Promise<APIResponse<SessionsResponse>> {
		return this.request<SessionsResponse>(
			`/api/trades?type=sessions&page=${page}&limit=${limit}`,
		);
	}

	/**
	 * Get session details
	 */
	async getSession(
		sessionId: string,
	): Promise<APIResponse<{ session: Session }>> {
		return this.request<{ session: Session }>(
			`/api/trades?sessionId=${sessionId}`,
		);
	}

	/**
	 * Clear ETag cache
	 */
	clearCache(): void {
		this.etagCache.clear();
	}

	/**
	 * Get cached ETag for endpoint
	 */
	getCachedETag(endpoint: string): string | undefined {
		return this.etagCache.get(endpoint);
	}
}

/**
 * Create client instances for different environments
 */
export function createWorkersClient(
	environment: "production" | "staging" | "local" = "production",
): WorkersAPIClient {
	const baseURLs = {
		production: "https://trader-analyzer-markets.utahj4754.workers.dev",
		staging: "https://trader-analyzer-markets-staging.utahj4754.workers.dev",
		local: "http://localhost:3004",
	};

	return new WorkersAPIClient({
		baseURL: baseURLs[environment],
		timeout: 30000,
		enableETag: true,
	});
}

/**
 * Default client instance (production)
 */
export const workersClient = createWorkersClient("production");
