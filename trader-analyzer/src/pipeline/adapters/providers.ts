/**
 * @fileoverview Provider Adapters
 * @description Adapters to connect existing data providers to the enterprise pipeline
 * @module pipeline/adapters/providers
 */

import type { DataProvider } from "../../types";
import type { DataSource, PipelineUser, Result } from "../types";
import { err, ok } from "../../types";

/**
 * Adapter interface for connecting data providers to the pipeline
 */
export interface ProviderAdapter {
	/**
	 * Get data source metadata for this provider
	 */
	getDataSource(): DataSource;

	/**
	 * Fetch data from the provider and return it in pipeline-compatible format
	 * @param user - User context for RBAC checks
	 * @param options - Fetch options (symbol, since, limit, etc.)
	 */
	fetchData(
		user: PipelineUser,
		options?: Record<string, unknown>,
	): Promise<Result<unknown[]>>;
}

/**
 * Base adapter class for data providers
 */
export abstract class BaseProviderAdapter implements ProviderAdapter {
	protected provider: DataProvider;
	protected dataSource: DataSource;

	constructor(provider: DataProvider, dataSource: DataSource) {
		this.provider = provider;
		this.dataSource = dataSource;
	}

	getDataSource(): DataSource {
		return this.dataSource;
	}

	abstract fetchData(
		user: PipelineUser,
		options?: Record<string, unknown>,
	): Promise<Result<unknown[]>>;
}

/**
 * Adapter for CCXT-based exchange providers
 */
export class CCXTProviderAdapter extends BaseProviderAdapter {
	async fetchData(
		user: PipelineUser,
		options: Record<string, unknown> = {},
	): Promise<Result<unknown[]>> {
		try {
			const symbol = options.symbol as string;
			const since = options.since as number;
			const limit = options.limit as number;
			const timeframe = options.timeframe as string;

			// Handle different data types
			if (options.type === "ohlcv") {
				// Fetch OHLCV data
				const ccxtProvider = this.provider as any; // Type assertion for CCXT-specific methods
				const result = await ccxtProvider.fetchOHLCV?.(
					symbol,
					timeframe,
					since,
					limit,
				);

				if (!result?.ok) {
					return err(new Error("Failed to fetch OHLCV data"));
				}

				// Transform OHLCV to pipeline format
				const transformedData = result.data.map((candle: any) => ({
					...candle,
					source: this.dataSource.id,
					fetchedAt: Date.now(),
				}));

				return ok(transformedData);
			}

			if (options.type === "orders") {
				// Fetch orders
				const result = await this.provider.fetchOrders?.(symbol, since, limit);

				if (!result?.ok) {
					return err(new Error("Failed to fetch orders"));
				}

				// Transform orders to pipeline format
				const transformedData = result.data.map((order: any) => ({
					...order,
					source: this.dataSource.id,
					fetchedAt: Date.now(),
				}));

				return ok(transformedData);
			}

			if (options.type === "balance") {
				// Fetch balance
				const ccxtProvider = this.provider as any; // Type assertion for CCXT-specific methods
				const result = await ccxtProvider.fetchBalance?.();

				if (!result?.ok) {
					return err(new Error("Failed to fetch balance"));
				}

				// Transform balance to pipeline format
				const transformedData = [
					{
						...result.data,
						source: this.dataSource.id,
						fetchedAt: Date.now(),
					},
				];

				return ok(transformedData);
			}

			// Default: fetch trades
			const result = await this.provider.fetchTrades(symbol, since, limit);

			if (!result.ok) {
				return err(result.error);
			}

			// Transform trades to pipeline format
			const transformedData = result.data.map((trade) => ({
				...trade,
				source: this.dataSource.id,
				fetchedAt: Date.now(),
			}));

			return ok(transformedData);
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`CCXT provider fetch failed: ${String(error)}`),
			);
		}
	}
}

/**
 * Adapter for Deribit options provider
 */
export class DeribitProviderAdapter extends BaseProviderAdapter {
	async fetchData(
		user: PipelineUser,
		options: Record<string, unknown> = {},
	): Promise<Result<unknown[]>> {
		try {
			// Deribit provider has specific methods for options data
			const deribitProvider = this.provider as any; // Type assertion for Deribit-specific methods

			if (options.type === "tickers") {
				const result = await deribitProvider.fetchOptionTickers?.();
				if (!result?.ok) {
					return err(new Error("Failed to fetch Deribit option tickers"));
				}
				return ok(result.data);
			}

			if (options.type === "orderbook") {
				const instrument = options.instrument as string;
				const result = await deribitProvider.fetchOrderBook?.(instrument);
				if (!result?.ok) {
					return err(new Error("Failed to fetch Deribit orderbook"));
				}
				return ok([result.data]);
			}

			// Default to trades
			const symbol = options.symbol as string;
			const since = options.since as number;
			const limit = options.limit as number;

			const result = await this.provider.fetchTrades(symbol, since, limit);
			if (!result.ok) {
				return err(result.error);
			}

			return ok(result.data);
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`Deribit provider fetch failed: ${String(error)}`),
			);
		}
	}
}

/**
 * Adapter for Polymarket prediction market provider
 */
export class PolymarketProviderAdapter extends BaseProviderAdapter {
	async fetchData(
		user: PipelineUser,
		options: Record<string, unknown> = {},
	): Promise<Result<unknown[]>> {
		try {
			// Polymarket provider has specific methods for market data
			const polymarketProvider = this.provider as any;

			if (options.type === "markets") {
				const result = await polymarketProvider.fetchMarkets?.();
				if (!result?.ok) {
					return err(new Error("Failed to fetch Polymarket markets"));
				}
				return ok(result.data);
			}

			if (options.marketId) {
				const marketId = options.marketId as string;
				const result = await polymarketProvider.fetchMarket?.(marketId);
				if (!result?.ok) {
					return err(new Error("Failed to fetch Polymarket market"));
				}
				return ok([result.data]);
			}

			// Default to generic fetch
			const result = await this.provider.fetchTrades(
				undefined,
				options.since as number,
				options.limit as number,
			);
			if (!result.ok) {
				return err(result.error);
			}

			return ok(result.data);
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`Polymarket provider fetch failed: ${String(error)}`),
			);
		}
	}
}

/**
 * Adapter for Kalshi prediction market provider
 */
export class KalshiProviderAdapter extends BaseProviderAdapter {
	async fetchData(
		user: PipelineUser,
		options: Record<string, unknown> = {},
	): Promise<Result<unknown[]>> {
		try {
			// Kalshi provider has specific methods for market data
			const kalshiProvider = this.provider as any;

			if (options.type === "markets") {
				const result = await kalshiProvider.fetchMarkets?.();
				if (!result?.ok) {
					return err(new Error("Failed to fetch Kalshi markets"));
				}
				return ok(result.data);
			}

			if (options.marketId) {
				const marketId = options.marketId as string;
				const result = await kalshiProvider.fetchMarket?.(marketId);
				if (!result?.ok) {
					return err(new Error("Failed to fetch Kalshi market"));
				}
				return ok([result.data]);
			}

			// Default to generic fetch
			const result = await this.provider.fetchTrades(
				undefined,
				options.since as number,
				options.limit as number,
			);
			if (!result.ok) {
				return err(result.error);
			}

			return ok(result.data);
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`Kalshi provider fetch failed: ${String(error)}`),
			);
		}
	}
}

/**
 * Adapter for ORCA sportsbook provider
 */
export class ORCAProviderAdapter extends BaseProviderAdapter {
	async fetchData(
		user: PipelineUser,
		options: Record<string, unknown> = {},
	): Promise<Result<unknown[]>> {
		try {
			// ORCA provider has specific methods for sportsbook data
			const orcaProvider = this.provider as any;

			if (options.type === "odds") {
				const sport = options.sport as string;
				const result = await orcaProvider.fetchOdds?.(sport);
				if (!result?.ok) {
					return err(new Error("Failed to fetch ORCA odds"));
				}
				return ok(result.data);
			}

			if (options.eventId) {
				const eventId = options.eventId as string;
				const result = await orcaProvider.fetchEvent?.(eventId);
				if (!result?.ok) {
					return err(new Error("Failed to fetch ORCA event"));
				}
				return ok([result.data]);
			}

			// Default to generic fetch
			const result = await this.provider.fetchTrades(
				undefined,
				options.since as number,
				options.limit as number,
			);
			if (!result.ok) {
				return err(result.error);
			}

			return ok(result.data);
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`ORCA provider fetch failed: ${String(error)}`),
			);
		}
	}
}

/**
 * Factory function to create provider adapters
 */
export function createProviderAdapter(
	provider: DataProvider,
	dataSource: DataSource,
): ProviderAdapter {
	switch (dataSource.type) {
		case "exchange":
			if (provider.name.startsWith("ccxt:")) {
				return new CCXTProviderAdapter(provider, dataSource);
			}
			if (provider.name.includes("deribit")) {
				return new DeribitProviderAdapter(provider, dataSource);
			}
			break;

		case "market":
			if (provider.name.includes("polymarket")) {
				return new PolymarketProviderAdapter(provider, dataSource);
			}
			if (provider.name.includes("kalshi")) {
				return new KalshiProviderAdapter(provider, dataSource);
			}
			break;

		case "sportsbook":
			if (provider.name.includes("orca")) {
				return new ORCAProviderAdapter(provider, dataSource);
			}
			break;
	}

	// Default adapter for unknown provider types
	return new (class extends BaseProviderAdapter {
		async fetchData(
			user: PipelineUser,
			options: Record<string, unknown> = {},
		): Promise<Result<unknown[]>> {
			try {
				const result = await this.provider.fetchTrades(
					options.symbol as string,
					options.since as number,
					options.limit as number,
				);
				return result.ok ? ok(result.data) : err(result.error);
			} catch (error) {
				return err(
					error instanceof Error
						? error
						: new Error(`Provider fetch failed: ${String(error)}`),
				);
			}
		}
	})(provider, dataSource);
}
