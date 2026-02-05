/**
 * @fileoverview ORCA Odds Fetcher
 * @description Polls multiple bookmakers and normalizes odds to ORCA format
 * @module orca/streaming/fetcher
 */

import type {
	OrcaBookmaker,
	OrcaMarketType,
	OrcaOddsUpdate,
	OrcaSport,
} from "../../types";
import { createOrcaNormalizer } from "../normalizer";
import type { OrcaStorage } from "../storage/sqlite";
import type { BookmakerClient, RawOddsData } from "./clients/base";
import { BetfairClient } from "./clients/betfair";
import { PS3838Client } from "./clients/ps3838";

/**
 * Odds fetcher configuration
 */
export interface OddsFetcherConfig {
	/** Poll interval in milliseconds */
	pollInterval: number;
	/** Bookmakers to fetch from */
	bookmakers: OrcaBookmaker[];
	/** Sports to fetch */
	sports?: OrcaSport[];
	/** Callback when new odds arrive */
	onOddsUpdate?: (updates: OrcaOddsUpdate[]) => void;
	/** Callback on error */
	onError?: (error: Error, bookmaker: OrcaBookmaker) => void;
	/** Optional SQLite storage for odds history */
	storage?: OrcaStorage;
}

/**
 * OddsFetcher - Polls bookmaker APIs and normalizes odds
 */
export class OddsFetcher {
	private config: OddsFetcherConfig;
	private clients: Map<OrcaBookmaker, BookmakerClient> = new Map();
	private normalizer = createOrcaNormalizer();
	private pollTimer: ReturnType<typeof setInterval> | null = null;
	private isRunning = false;
	private lastOdds: Map<string, OrcaOddsUpdate> = new Map();
	private storage: OrcaStorage | null = null;
	private totalStored = 0;

	constructor(config: OddsFetcherConfig) {
		this.config = {
			...config,
			pollInterval: config.pollInterval ?? 5000,
			bookmakers: config.bookmakers ?? ["ps3838"],
		};

		this.storage = config.storage || null;
		this.initializeClients();
	}

	/**
	 * Initialize bookmaker clients based on configuration
	 */
	private initializeClients(): void {
		for (const bookmaker of this.config.bookmakers) {
			const client = this.createClient(bookmaker);
			if (client) {
				this.clients.set(bookmaker, client);
			}
		}
	}

	/**
	 * Create a bookmaker client
	 */
	private createClient(bookmaker: OrcaBookmaker): BookmakerClient | null {
		switch (bookmaker) {
			case "ps3838":
			case "pinnacle":
				return new PS3838Client({ sports: this.config.sports });

			case "betfair":
				return new BetfairClient({ sports: this.config.sports });

			// Add more clients as needed
			default:
				console.warn(`ORCA Fetcher: No client available for ${bookmaker}`);
				return null;
		}
	}

	/**
	 * Start the polling loop
	 */
	async start(): Promise<void> {
		if (this.isRunning) return;

		// Connect all clients
		for (const [bookmaker, client] of this.clients) {
			try {
				const result = await client.connect();
				if (!result.ok) {
					console.error(
						`ORCA Fetcher: Failed to connect to ${bookmaker}:`,
						result.error,
					);
				}
			} catch (error) {
				console.error(`ORCA Fetcher: Error connecting to ${bookmaker}:`, error);
			}
		}

		this.isRunning = true;

		// Initial fetch
		await this.fetchAll();

		// Start polling
		this.pollTimer = setInterval(() => {
			this.fetchAll().catch((error) => {
				console.error("ORCA Fetcher: Poll error:", error);
			});
		}, this.config.pollInterval);

		console.log(
			`ORCA Fetcher: Started polling ${this.clients.size} bookmakers every ${this.config.pollInterval}ms`,
		);
	}

	/**
	 * Stop the polling loop
	 */
	async stop(): Promise<void> {
		if (!this.isRunning) return;

		if (this.pollTimer) {
			clearInterval(this.pollTimer);
			this.pollTimer = null;
		}

		// Disconnect all clients
		for (const [bookmaker, client] of this.clients) {
			try {
				await client.disconnect();
			} catch (error) {
				console.error(
					`ORCA Fetcher: Error disconnecting from ${bookmaker}:`,
					error,
				);
			}
		}

		this.isRunning = false;
		console.log("ORCA Fetcher: Stopped");
	}

	/**
	 * Fetch odds from all bookmakers
	 */
	private async fetchAll(): Promise<void> {
		const allUpdates: OrcaOddsUpdate[] = [];

		// Fetch in parallel
		const fetchPromises = Array.from(this.clients.entries()).map(
			async ([bookmaker, client]) => {
				try {
					const result = await client.fetchOdds(this.config.sports);
					if (result.ok) {
						return { bookmaker, data: result.data };
					} else {
						this.config.onError?.(result.error as Error, bookmaker);
						return { bookmaker, data: [] };
					}
				} catch (error) {
					this.config.onError?.(error as Error, bookmaker);
					return { bookmaker, data: [] };
				}
			},
		);

		const results = await Promise.all(fetchPromises);

		// Process results
		for (const { bookmaker, data } of results) {
			const updates = this.normalizeOdds(bookmaker, data);
			allUpdates.push(...updates);
		}

		// Find changed odds
		const changedUpdates = allUpdates.filter((update) => {
			const key = `${update.marketId}:${update.selectionId}:${update.bookmaker}`;
			const existing = this.lastOdds.get(key);

			if (
				!existing ||
				existing.odds !== update.odds ||
				existing.line !== update.line
			) {
				this.lastOdds.set(key, update);
				return true;
			}

			return false;
		});

		// Store to SQLite if enabled
		if (changedUpdates.length > 0 && this.storage) {
			this.storage.storeOddsBatch(changedUpdates);
			this.totalStored += changedUpdates.length;
		}

		// Broadcast updates
		if (changedUpdates.length > 0 && this.config.onOddsUpdate) {
			this.config.onOddsUpdate(changedUpdates);
		}
	}

	/**
	 * Normalize raw odds data to ORCA format
	 */
	private normalizeOdds(
		bookmaker: OrcaBookmaker,
		rawData: RawOddsData[],
	): OrcaOddsUpdate[] {
		const updates: OrcaOddsUpdate[] = [];

		for (const raw of rawData) {
			try {
				const result = this.normalizer.normalize({
					bookmaker,
					sport: raw.sport,
					league: raw.league,
					homeTeam: raw.homeTeam,
					awayTeam: raw.awayTeam,
					startTime: raw.startTime,
					marketType: raw.marketType,
					period: raw.period,
					line: raw.line,
					selection: raw.selection,
				});

				if (result.ok) {
					updates.push({
						marketId: result.data.market.id,
						selectionId: result.data.selection.id,
						eventId: result.data.event.id,
						bookmaker,
						odds: raw.odds,
						americanOdds: this.decimalToAmerican(raw.odds),
						line: raw.line,
						marketType: result.data.market.type,
						timestamp: Date.now(),
						isOpen: raw.isOpen,
						maxStake: raw.maxStake,
					});
				}
			} catch (error) {
				// Skip invalid data silently
			}
		}

		return updates;
	}

	/**
	 * Convert decimal odds to American odds
	 */
	private decimalToAmerican(decimal: number): number {
		if (decimal >= 2) {
			return Math.round((decimal - 1) * 100);
		} else {
			return Math.round(-100 / (decimal - 1));
		}
	}

	/**
	 * Get current cached odds
	 */
	getCurrentOdds(): OrcaOddsUpdate[] {
		return Array.from(this.lastOdds.values());
	}

	/**
	 * Get odds for a specific event
	 */
	getOddsForEvent(eventId: string): OrcaOddsUpdate[] {
		return Array.from(this.lastOdds.values()).filter(
			(update) => update.eventId === eventId,
		);
	}

	/**
	 * Get status
	 */
	getStatus(): {
		running: boolean;
		clients: number;
		cachedOdds: number;
		storedOdds: number;
		storageEnabled: boolean;
	} {
		return {
			running: this.isRunning,
			clients: this.clients.size,
			cachedOdds: this.lastOdds.size,
			storedOdds: this.totalStored,
			storageEnabled: this.storage !== null,
		};
	}

	/**
	 * Get odds history from storage
	 */
	getOddsHistory(
		marketId: string,
		options?: { bookmaker?: OrcaBookmaker; since?: number; limit?: number },
	): OrcaOddsUpdate[] {
		if (!this.storage) return [];
		return this.storage.getOddsHistory(marketId, options);
	}

	/**
	 * Get storage statistics
	 */
	getStorageStats(): {
		teamAliases: number;
		sportAliases: number;
		oddsRecords: number;
		events: number;
		dbSize: string;
	} | null {
		if (!this.storage) return null;
		return this.storage.getStats();
	}
}
