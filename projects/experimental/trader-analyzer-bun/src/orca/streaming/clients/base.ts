/**
 * @fileoverview Base bookmaker client interface
 * @module orca/streaming/clients/base
 */

import type {
	OrcaBookmaker,
	OrcaBookmakerConfig,
	OrcaOddsUpdate,
	OrcaSport,
	Result,
} from "../../../types";

/**
 * Raw odds data from a bookmaker API
 */
export interface RawOddsData {
	sport: string;
	league: string;
	homeTeam: string;
	awayTeam: string;
	startTime: string;
	marketType: string;
	period?: string;
	line?: number;
	selection: string;
	odds: number;
	isOpen: boolean;
	maxStake?: number;
}

/**
 * Base interface for bookmaker API clients
 */
export interface BookmakerClient {
	/** Bookmaker identifier */
	readonly bookmaker: OrcaBookmaker;

	/** Connect/authenticate with the API */
	connect(): Promise<Result<void>>;

	/** Disconnect from the API */
	disconnect(): Promise<void>;

	/** Fetch current odds for configured sports */
	fetchOdds(sports?: OrcaSport[]): Promise<Result<RawOddsData[]>>;

	/** Check if client is connected */
	isConnected(): boolean;

	/** Get client configuration */
	getConfig(): OrcaBookmakerConfig;
}

/**
 * Abstract base class for bookmaker clients
 */
export abstract class BaseBookmakerClient implements BookmakerClient {
	abstract readonly bookmaker: OrcaBookmaker;
	protected config: OrcaBookmakerConfig;
	protected connected = false;
	protected lastFetch = 0;
	protected httpAgent?: any; // http.Agent for connection reuse

	constructor(config: OrcaBookmakerConfig) {
		this.config = config;
	}

	abstract connect(): Promise<Result<void>>;
	abstract fetchOdds(sports?: OrcaSport[]): Promise<Result<RawOddsData[]>>;

	async disconnect(): Promise<void> {
		this.connected = false;
	}

	isConnected(): boolean {
		return this.connected;
	}

	getConfig(): OrcaBookmakerConfig {
		return this.config;
	}

	/**
	 * Rate limiting helper
	 */
	protected async rateLimitWait(): Promise<void> {
		if (!this.config.rateLimit) return;

		const minInterval = 1000 / this.config.rateLimit;
		const elapsed = Date.now() - this.lastFetch;

		if (elapsed < minInterval) {
			await new Promise((resolve) =>
				setTimeout(resolve, minInterval - elapsed),
			);
		}

		this.lastFetch = Date.now();
	}

	/**
	 * Build authorization header based on auth type
	 */
	protected buildAuthHeader(): Record<string, string> {
		const { auth } = this.config;

		switch (auth.type) {
			case "basic": {
				const credentials = btoa(`${auth.username}:${auth.password}`);
				return { Authorization: `Basic ${credentials}` };
			}

			case "bearer":
				return { Authorization: `Bearer ${auth.sessionToken}` };

			case "apikey":
				return { "X-API-Key": auth.apiKey || "" };

			case "session":
				return { "X-Session-Token": auth.sessionToken || "" };

			default:
				return {};
		}
	}

	/**
	 * 13.1.1.0.0.0.0 Enhanced: Fetch with proxy authentication
	 * Fetches market data through authenticated proxy with custom headers
	 */
	protected async fetchWithProxyAuth(
		url: string,
		options: RequestInit = {},
		bookmaker: string
	): Promise<Response> {
		// Retrieve rotated token from secrets manager
		// Note: This assumes Bun.secrets is available
		let proxyToken: string | undefined;
		try {
			proxyToken = (Bun.secrets as any)[`proxy-token-${bookmaker}`];
		} catch {
			// Secrets not available, use environment variable fallback
			proxyToken = process.env[`PROXY_TOKEN_${bookmaker.toUpperCase()}`];
		}

		const proxyUrl = process.env.BOOKMAKER_PROXY_URL;
		if (!proxyUrl) {
			// No proxy configured, use direct fetch
			return fetch(url, {
				...options,
				agent: this.httpAgent
			});
		}

		// Bun v1.3.3+ supports proxy option in fetch()
		return fetch(url, {
			...options,
			proxy: {
				url: proxyUrl,
				headers: {
					// Bookmaker-specific authentication
					'Proxy-Authorization': proxyToken ? `Bearer ${proxyToken}` : '',
					
					// Custom routing for geo-targeted endpoints
					'X-Target-Region': process.env.PROXY_TARGET_REGION || 'us-east-1',
					'X-Bookmaker-ID': bookmaker,
					
					// Traffic shaping headers
					'X-Rate-Limit-Tier': 'premium',
					'X-Connection-Pool': 'keep-alive'
				}
			},
			// Enable keep-alive for connection reuse
			agent: this.httpAgent
		});
	}
}
