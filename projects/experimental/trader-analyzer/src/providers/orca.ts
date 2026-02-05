/**
 * @fileoverview ORCA Sportsbook Provider
 * @description Provider for ORCA sports betting data normalization and streaming
 * @module providers/orca
 */

import type { OrcaOddsUpdate, OrcaSport, OrcaBookmaker } from "../types";
import { err, ok, type Result, type Trade } from "../types";
import { BaseProvider } from "./base";

/**
 * Configuration for ORCA provider
 */
interface ORCAConfig {
	/** Bookmakers to fetch from */
	bookmakers?: OrcaBookmaker[];
	/** Sports to fetch */
	sports?: OrcaSport[];
	/** Poll interval in milliseconds */
	pollInterval?: number;
	/** Use streaming mode */
	streaming?: boolean;
}

/**
 * ORCA Sportsbook Provider
 *
 * Provides access to normalized sports betting odds from multiple bookmakers
 * through the ORCA normalization system.
 */
export class ORCAProvider extends BaseProvider {
	name = "orca";
	private config: ORCAConfig;
	private oddsFetcher: any = null; // Will be imported dynamically
	private streamServer: any = null; // Will be imported dynamically

	constructor(config: ORCAConfig = {}) {
		super();
		this.config = {
			bookmakers: ["pinnacle", "betfair", "ps3838"],
			sports: ["NFL", "NBA", "MLB", "NHL", "EPL"],
			pollInterval: 30000, // 30 seconds
			streaming: false,
			...config,
		};
	}

	/**
	 * Connect to ORCA data sources
	 */
	async connect(): Promise<Result<void>> {
		try {
			// Dynamic imports to avoid circular dependencies
			const { OddsFetcher } = await import("../orca/streaming/fetcher");
			const { OrcaStreamServer } = await import("../orca/streaming/server");

			// Initialize odds fetcher
			this.oddsFetcher = new OddsFetcher({
				pollInterval: this.config.pollInterval || 30000,
				bookmakers: this.config.bookmakers || ["pinnacle", "betfair", "ps3838"],
				sports: this.config.sports,
				onOddsUpdate: (updates: OrcaOddsUpdate[]) => {
					// Store updates for fetchTrades to return
					this.storeOddsUpdates(updates);
				},
				onError: (error: Error, bookmaker: OrcaBookmaker) => {
					console.error(`ORCA Provider: Error from ${bookmaker}:`, error.message);
				},
			});

			// Start the fetcher
			await this.oddsFetcher.start();

			// Initialize streaming server if requested
			if (this.config.streaming) {
				this.streamServer = new OrcaStreamServer({
					port: 8081, // Use a different port than the main API
					bookmakers: this.config.bookmakers || ["pinnacle", "betfair", "ps3838"],
					sports: this.config.sports,
				});
				await this.streamServer.start();
			}

			this.connected = true;
			return ok(undefined);
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`Failed to connect ORCA provider: ${String(error)}`),
			);
		}
	}

	/**
	 * Disconnect from ORCA data sources
	 */
	async disconnect(): Promise<void> {
		if (this.oddsFetcher) {
			await this.oddsFetcher.stop();
			this.oddsFetcher = null;
		}

		if (this.streamServer) {
			await this.streamServer.stop();
			this.streamServer = null;
		}

		this.connected = false;
	}

	/**
	 * Fetch normalized odds data as trades
	 *
	 * Converts ORCA odds updates to trade-like format for compatibility
	 */
	async fetchTrades(
		symbol?: string,
		since?: number,
		limit = 100,
	): Promise<Result<Trade[]>> {
		try {
			if (!this.oddsFetcher) {
				return err(new Error("ORCA provider not connected"));
			}

			// Get recent odds updates from the fetcher
			const updates = this.oddsFetcher.getRecentUpdates(limit);

			// Convert odds updates to trade format
			const trades: Trade[] = updates
				.filter((update: OrcaOddsUpdate) => {
					// Filter by symbol (market ID) if provided
					if (symbol && update.marketId !== symbol) {
						return false;
					}
					// Filter by timestamp if provided
					if (since && update.timestamp < since) {
						return false;
					}
					return true;
				})
				.map((update: OrcaOddsUpdate) => this.oddsUpdateToTrade(update));

			return ok(trades);
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`Failed to fetch ORCA trades: ${String(error)}`),
			);
		}
	}

	/**
	 * Fetch all historical odds data
	 */
	async fetchAllTrades(
		symbol?: string,
		onProgress?: (count: number) => void,
	): Promise<Result<Trade[]>> {
		// For ORCA, we don't have historical data beyond what's cached
		// Just return current available data
		return this.fetchTrades(symbol, undefined, 1000);
	}

	/**
	 * Convert ORCA odds update to trade format
	 */
	private oddsUpdateToTrade(update: OrcaOddsUpdate): Trade {
		return {
			id: `${update.marketId}-${update.bookmaker}-${update.timestamp}`,
			datetime: new Date(update.timestamp).toISOString(),
			symbol: update.marketId,
			side: "buy", // Odds are always "buy" the bet
			price: update.odds,
			amount: 1, // Standard bet amount
			cost: update.odds, // Cost = price * amount
			fee: 0, // No fee for odds data
			orderID: undefined,
			info: {
				bookmaker: update.bookmaker,
				sport: update.sport,
				homeTeam: update.homeTeam,
				awayTeam: update.awayTeam,
				line: update.line,
				marketType: update.marketType,
				eventId: update.eventId,
			},
		};
	}

	/**
	 * Store odds updates for later retrieval
	 */
	private oddsUpdates: OrcaOddsUpdate[] = [];

	private storeOddsUpdates(updates: OrcaOddsUpdate[]): void {
		this.oddsUpdates.push(...updates);

		// Keep only recent updates (last 1000)
		if (this.oddsUpdates.length > 1000) {
			this.oddsUpdates = this.oddsUpdates.slice(-1000);
		}
	}

	/**
	 * Get bookmaker odds for a specific market
	 */
	async fetchBookmakerOdds(marketId: string): Promise<Result<OrcaOddsUpdate[]>> {
		try {
			if (!this.oddsFetcher) {
				return err(new Error("ORCA provider not connected"));
			}

			const updates = this.oddsUpdates.filter(
				(update) => update.marketId === marketId,
			);

			return ok(updates);
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`Failed to fetch bookmaker odds: ${String(error)}`),
			);
		}
	}

	/**
	 * Get available sports
	 */
	async getSports(): Promise<Result<OrcaSport[]>> {
		try {
			const { listSports } = await import("../orca/taxonomy/sport");
			return ok(listSports());
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`Failed to get sports: ${String(error)}`),
			);
		}
	}

	/**
	 * Get available bookmakers
	 */
	async getBookmakers(): Promise<Result<OrcaBookmaker[]>> {
		try {
			const { listBookmakers } = await import("../orca/taxonomy/bookmaker");
			return ok(listBookmakers());
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error(`Failed to get bookmakers: ${String(error)}`),
			);
		}
	}
}

/**
 * Create ORCA provider with default configuration
 */
export function createORCAProvider(config?: ORCAConfig): ORCAProvider {
	return new ORCAProvider(config);
}