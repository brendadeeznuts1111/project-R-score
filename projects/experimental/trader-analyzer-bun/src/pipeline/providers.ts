/**
 * @fileoverview Pipeline Provider Integrations
 * @description Integration adapters for existing providers to work with the pipeline
 * @module pipeline/providers
 */

import { CCXTProvider } from "../providers/ccxt";
import { DeribitProvider } from "../providers/deribit";
import { KalshiProvider } from "../providers/kalshi";
import { PolymarketProvider } from "../providers/polymarket";
import { PipelineProviderAdapter } from "./provider-adapter";
import type { DataSource, PipelineUser } from "./types";

/**
 * CCXT Pipeline Provider
 * Adapts CCXT provider for pipeline processing
 */
export class CCXTPipelineProvider {
	private provider: CCXTProvider;
	private dataSource: DataSource;

	constructor(config: {
		exchange: string;
		apiKey: string;
		apiSecret: string;
		testnet?: boolean;
	}) {
		this.provider = new CCXTProvider(config);
		this.dataSource = {
			id: `ccxt-${config.exchange}`,
			name: `CCXT ${config.exchange.toUpperCase()}`,
			type: "exchange",
			namespace: "@nexus/providers/ccxt",
			version: "1.0.0",
			featureFlag: "ccxt-integration",
		};
	}

	/** Get the underlying provider instance */
	getProvider(): CCXTProvider {
		return this.provider;
	}

	/** Get the data source metadata */
	getDataSource(): DataSource {
		return this.dataSource;
	}

	/**
	 * Get pipeline-adaptable interface
	 */
	getPipelineAdapter() {
		return PipelineProviderAdapter.createAdaptableProvider(
			this.provider,
			"fetchTrades",
			this.dataSource,
		);
	}

	/**
	 * Fetch trades through pipeline
	 */
	async fetchTradesThroughPipeline(
		adapter: PipelineProviderAdapter,
		user: PipelineUser,
		params?: { symbol?: string; since?: number; limit?: number },
	) {
		const pipelineProvider = this.getPipelineAdapter();
		return adapter.executeProviderCall(pipelineProvider, params, user);
	}
}

/**
 * Deribit Pipeline Provider
 */
export class DeribitPipelineProvider {
	private provider: DeribitProvider;
	private dataSource: DataSource;

	constructor(config: { testnet?: boolean } = {}) {
		this.provider = new DeribitProvider(config);
		this.dataSource = {
			id: "deribit",
			name: "Deribit Options",
			type: "exchange",
			namespace: "@nexus/providers/deribit",
			version: "1.0.0",
			featureFlag: "deribit-integration",
		};
	}

	/** Get the underlying provider instance */
	getProvider(): DeribitProvider {
		return this.provider;
	}

	/** Get the data source metadata */
	getDataSource(): DataSource {
		return this.dataSource;
	}

	getPipelineAdapter() {
		return PipelineProviderAdapter.createAdaptableProvider(
			this.provider,
			"fetchOptions",
			this.dataSource,
		);
	}

	async fetchOptionsThroughPipeline(
		adapter: PipelineProviderAdapter,
		user: PipelineUser,
		params?: { currency?: string; kind?: string; expiration?: string },
	) {
		const pipelineProvider = this.getPipelineAdapter();
		return adapter.executeProviderCall(pipelineProvider, params, user);
	}
}

/**
 * Polymarket Pipeline Provider
 */
export class PolymarketPipelineProvider {
	private provider: PolymarketProvider;
	private dataSource: DataSource;

	constructor() {
		this.provider = new PolymarketProvider();
		this.dataSource = {
			id: "polymarket",
			name: "Polymarket",
			type: "market",
			namespace: "@nexus/providers/polymarket",
			version: "1.0.0",
			featureFlag: "polymarket-integration",
		};
	}

	/** Get the underlying provider instance */
	getProvider(): PolymarketProvider {
		return this.provider;
	}

	/** Get the data source metadata */
	getDataSource(): DataSource {
		return this.dataSource;
	}

	getPipelineAdapter() {
		return PipelineProviderAdapter.createAdaptableProvider(
			this.provider,
			"fetchMarkets",
			this.dataSource,
		);
	}

	async fetchMarketsThroughPipeline(
		adapter: PipelineProviderAdapter,
		user: PipelineUser,
		params?: { limit?: number },
	) {
		const pipelineProvider = this.getPipelineAdapter();
		return adapter.executeProviderCall(pipelineProvider, params, user);
	}
}

/**
 * Kalshi Pipeline Provider
 */
export class KalshiPipelineProvider {
	private provider: KalshiProvider;
	private dataSource: DataSource;

	constructor() {
		this.provider = new KalshiProvider();
		this.dataSource = {
			id: "kalshi",
			name: "Kalshi",
			type: "market",
			namespace: "@nexus/providers/kalshi",
			version: "1.0.0",
			featureFlag: "kalshi-integration",
		};
	}

	/** Get the underlying provider instance */
	getProvider(): KalshiProvider {
		return this.provider;
	}

	/** Get the data source metadata */
	getDataSource(): DataSource {
		return this.dataSource;
	}

	getPipelineAdapter() {
		return PipelineProviderAdapter.createAdaptableProvider(
			this.provider,
			"fetchMarkets",
			this.dataSource,
		);
	}

	async fetchMarketsThroughPipeline(
		adapter: PipelineProviderAdapter,
		user: PipelineUser,
		params?: { limit?: number; cursor?: string },
	) {
		const pipelineProvider = this.getPipelineAdapter();
		return adapter.executeProviderCall(pipelineProvider, params, user);
	}
}
