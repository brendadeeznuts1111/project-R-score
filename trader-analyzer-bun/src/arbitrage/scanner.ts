/**
 * @fileoverview Arbitrage Scanner Service with Bun-native optimizations
 * @description Continuous scanning service for cross-market arbitrage detection
 * @module arbitrage/scanner
 *
 * Uses Bun.peek() for non-blocking promise inspection
 * Uses Bun.nanoseconds() for high-precision timing
 */

import { KalshiProvider } from "../providers/kalshi";
import { PolymarketProvider } from "../providers/polymarket";
import type { PredictionMarket } from "../types";
import { type ArbitrageDetector, createArbitrageDetector } from "./detector";
import type {
	ArbitrageOpportunity,
	ArbitrageScannerConfig,
	MarketCategory,
	ScanResult,
} from "./types";

/**
 * Scanner event callbacks
 */
export interface ScannerCallbacks {
	onOpportunity?: (opportunity: ArbitrageOpportunity) => void;
	onScanComplete?: (result: ScanResult) => void;
	onError?: (error: Error, context: string) => void;
	onFetchProgress?: (
		venue: string,
		status: "pending" | "resolved" | "rejected",
	) => void;
}

/**
 * Fetch status for monitoring with Bun.peek()
 */
interface FetchStatus<T> {
	promise: Promise<T>;
	venue: string;
	startTime: number;
	endTime?: number;
	status: "pending" | "resolved" | "rejected";
	result?: T;
	error?: Error;
}

/**
 * ArbitrageScanner - Continuous scanning service with Bun-native optimizations
 *
 * Features:
 * - Polls Polymarket and Kalshi at configurable intervals
 * - Detects arbitrage and +EV opportunities
 * - Emits events for real-time notifications
 * - Manages stale opportunity cleanup
 * - Uses Bun.peek() for non-blocking promise inspection
 * - High-precision timing with Bun.nanoseconds()
 */
export class ArbitrageScanner {
	private config: Required<ArbitrageScannerConfig>;
	private detector: ArbitrageDetector;
	private polymarket: PolymarketProvider;
	private kalshi: KalshiProvider;
	private callbacks: ScannerCallbacks;

	private pollTimer: ReturnType<typeof setInterval> | null = null;
	private pruneTimer: ReturnType<typeof setInterval> | null = null;
	private isRunning = false;
	private scanCount = 0;
	private lastScanResult: ScanResult | null = null;

	// Bun.peek() based monitoring
	private pendingFetches: Map<string, FetchStatus<PredictionMarket[]>> =
		new Map();
	private fetchMetrics = {
		totalFetches: 0,
		avgPolymarketTimeNs: 0,
		avgKalshiTimeNs: 0,
		failedFetches: 0,
	};

	constructor(
		config?: Partial<ArbitrageScannerConfig>,
		callbacks?: ScannerCallbacks,
	) {
		this.config = {
			minSpread: config?.minSpread ?? 0.02,
			minLiquidity: config?.minLiquidity ?? 1000,
			categories: config?.categories ?? [
				"crypto",
				"politics",
				"economics",
				"sports",
				"other",
			],
			venues: config?.venues ?? ["polymarket", "kalshi"],
			pollInterval: config?.pollInterval ?? 30000,
			maxQuoteAge: config?.maxQuoteAge ?? 60000,
		};

		this.callbacks = callbacks ?? {};
		this.detector = createArbitrageDetector(this.config);
		this.polymarket = new PolymarketProvider();
		this.kalshi = new KalshiProvider();
	}

	/**
	 * Start the scanner
	 */
	async start(): Promise<void> {
		if (this.isRunning) return;

		this.isRunning = true;

		// Initial scan
		await this.runScan();

		// Start polling
		this.pollTimer = setInterval(() => {
			this.runScan().catch((error) => {
				this.callbacks.onError?.(error as Error, "polling");
			});
		}, this.config.pollInterval);

		// Start stale opportunity cleanup (every 5 minutes)
		this.pruneTimer = setInterval(() => {
			const pruned = this.detector.pruneStale(this.config.maxQuoteAge * 5);
			if (pruned > 0) {
				console.log(`Arbitrage Scanner: Pruned ${pruned} stale opportunities`);
			}
		}, 300000);

		console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🎯 NEXUS Arbitrage Scanner (Bun-optimized)               ║
║  Poll Interval: ${(this.config.pollInterval / 1000).toFixed(0).padEnd(5)}seconds                           ║
║  Min Spread: ${(this.config.minSpread * 100).toFixed(1).padEnd(5)}%                                   ║
║  Min Liquidity: $${this.config.minLiquidity.toString().padEnd(10)}                        ║
║  Venues: ${this.config.venues.join(", ").padEnd(45)}║
║  Features: Bun.peek(), Bun.nanoseconds()                  ║
╚═══════════════════════════════════════════════════════════╝
    `);
	}

	/**
	 * Stop the scanner
	 */
	async stop(): Promise<void> {
		if (!this.isRunning) return;

		if (this.pollTimer) {
			clearInterval(this.pollTimer);
			this.pollTimer = null;
		}

		if (this.pruneTimer) {
			clearInterval(this.pruneTimer);
			this.pruneTimer = null;
		}

		this.isRunning = false;
		console.log("Arbitrage Scanner: Stopped");
	}

	/**
	 * Run a single scan with Bun.peek() optimization
	 * Uses non-blocking promise inspection to track fetch progress
	 */
	async runScan(): Promise<ScanResult> {
		const startTime = Bun.nanoseconds();

		try {
			// Start fetches with tracking
			const polymarketFetch = this.createTrackedFetch("polymarket", () =>
				this.fetchPolymarketMarkets(),
			);
			const kalshiFetch = this.createTrackedFetch("kalshi", () =>
				this.fetchKalshiMarkets(),
			);

			// Use Bun.peek() to monitor progress without blocking
			const monitorInterval = setInterval(() => {
				this.checkFetchProgress(polymarketFetch);
				this.checkFetchProgress(kalshiFetch);
			}, 100);

			// Wait for both to complete
			const [polymarketResult, kalshiResult] = await Promise.all([
				polymarketFetch.promise,
				kalshiFetch.promise,
			]);

			clearInterval(monitorInterval);

			// Update metrics
			this.updateFetchMetrics(polymarketFetch);
			this.updateFetchMetrics(kalshiFetch);

			// Run detection
			const result = await this.detector.scan(polymarketResult, kalshiResult);

			this.scanCount++;
			this.lastScanResult = result;

			// Emit callbacks for new opportunities
			if (result.opportunities.length > 0) {
				for (const opp of result.opportunities) {
					this.callbacks.onOpportunity?.(opp);
				}

				const scanTimeMs = Number(Bun.nanoseconds() - startTime) / 1_000_000;
				console.log(
					`Arbitrage Scanner: Found ${result.opportunities.length} opportunities ` +
						`(${result.opportunities.filter((o) => o.isArbitrage).length} arbitrage) ` +
						`in ${scanTimeMs.toFixed(2)}ms`,
				);
			}

			this.callbacks.onScanComplete?.(result);

			return result;
		} catch (error) {
			this.callbacks.onError?.(error as Error, "scan");
			throw error;
		}
	}

	/**
	 * Create a tracked fetch with Bun.nanoseconds() timing
	 */
	private createTrackedFetch<T>(
		venue: string,
		fetcher: () => Promise<T>,
	): FetchStatus<T> {
		const startTime = Bun.nanoseconds();

		const promise = fetcher().then(
			(result) => {
				const status = this.pendingFetches.get(venue) as FetchStatus<T>;
				if (status) {
					status.endTime = Bun.nanoseconds();
					status.status = "resolved";
					status.result = result;
				}
				return result;
			},
			(error) => {
				const status = this.pendingFetches.get(venue) as FetchStatus<T>;
				if (status) {
					status.endTime = Bun.nanoseconds();
					status.status = "rejected";
					status.error = error;
				}
				throw error;
			},
		);

		const status: FetchStatus<T> = {
			promise,
			venue,
			startTime,
			status: "pending",
		};

		this.pendingFetches.set(venue, status as FetchStatus<PredictionMarket[]>);
		return status;
	}

	/**
	 * Check fetch progress using Bun.peek()
	 * Non-blocking inspection of promise state
	 */
	private checkFetchProgress<T>(fetchStatus: FetchStatus<T>): void {
		const peeked = Bun.peek(fetchStatus.promise);

		// Bun.peek() returns the promise itself if pending, or the resolved value
		if (peeked !== fetchStatus.promise) {
			// Promise has resolved or rejected
			if (fetchStatus.status === "pending") {
				fetchStatus.status = "resolved";
				this.callbacks.onFetchProgress?.(fetchStatus.venue, "resolved");
			}
		}
	}

	/**
	 * Update fetch metrics for performance monitoring
	 */
	private updateFetchMetrics<T>(fetchStatus: FetchStatus<T>): void {
		if (!fetchStatus.endTime) return;

		const durationNs = fetchStatus.endTime - fetchStatus.startTime;
		this.fetchMetrics.totalFetches++;

		if (fetchStatus.status === "rejected") {
			this.fetchMetrics.failedFetches++;
		}

		// Update running average using number arithmetic
		const prevCount = this.fetchMetrics.totalFetches - 1;
		if (fetchStatus.venue === "polymarket") {
			this.fetchMetrics.avgPolymarketTimeNs =
				(this.fetchMetrics.avgPolymarketTimeNs * prevCount + durationNs) /
				this.fetchMetrics.totalFetches;
		} else if (fetchStatus.venue === "kalshi") {
			this.fetchMetrics.avgKalshiTimeNs =
				(this.fetchMetrics.avgKalshiTimeNs * prevCount + durationNs) /
				this.fetchMetrics.totalFetches;
		}
	}

	/**
	 * Fetch markets from Polymarket
	 */
	private async fetchPolymarketMarkets(): Promise<PredictionMarket[]> {
		try {
			const result = await this.polymarket.fetchMarkets(500);
			if (result.ok) {
				return result.data;
			}
			this.callbacks.onError?.(result.error as Error, "polymarket");
			return [];
		} catch (error) {
			this.callbacks.onError?.(error as Error, "polymarket");
			return [];
		}
	}

	/**
	 * Fetch markets from Kalshi
	 */
	private async fetchKalshiMarkets(): Promise<PredictionMarket[]> {
		try {
			const result = await this.kalshi.fetchMarkets("open", 500);
			if (result.ok) {
				return result.data;
			}
			this.callbacks.onError?.(result.error as Error, "kalshi");
			return [];
		} catch (error) {
			this.callbacks.onError?.(error as Error, "kalshi");
			return [];
		}
	}

	/**
	 * Get all current opportunities
	 */
	getOpportunities(): ArbitrageOpportunity[] {
		return this.detector.getOpportunities();
	}

	/**
	 * Get opportunities filtered by criteria
	 */
	getFilteredOpportunities(filter: {
		minSpread?: number;
		minExpectedValue?: number;
		category?: MarketCategory;
		isArbitrage?: boolean;
	}): ArbitrageOpportunity[] {
		return this.detector.getFilteredOpportunities(filter);
	}

	/**
	 * Get last scan result
	 */
	getLastScanResult(): ScanResult | null {
		return this.lastScanResult;
	}

	/**
	 * Get scanner status with Bun-native metrics
	 */
	getStatus(): {
		running: boolean;
		scanCount: number;
		opportunities: number;
		arbitrageOpportunities: number;
		lastScanTime: number | null;
		config: ArbitrageScannerConfig;
		fetchMetrics: {
			totalFetches: number;
			avgPolymarketTimeMs: number;
			avgKalshiTimeMs: number;
			failedFetches: number;
		};
	} {
		const stats = this.detector.getStats();
		return {
			running: this.isRunning,
			scanCount: this.scanCount,
			opportunities: stats.totalOpportunities,
			arbitrageOpportunities: stats.arbitrageOpportunities,
			lastScanTime: this.lastScanResult?.meta.scanTime ?? null,
			config: this.config,
			fetchMetrics: {
				totalFetches: this.fetchMetrics.totalFetches,
				avgPolymarketTimeMs: this.fetchMetrics.avgPolymarketTimeNs / 1_000_000,
				avgKalshiTimeMs: this.fetchMetrics.avgKalshiTimeNs / 1_000_000,
				failedFetches: this.fetchMetrics.failedFetches,
			},
		};
	}

	/**
	 * Get detailed statistics
	 */
	getStats(): {
		detector: ReturnType<ArbitrageDetector["getStats"]>;
		matcher: ReturnType<
			ReturnType<ArbitrageDetector["getMatcher"]>["getStats"]
		>;
		scanner: {
			running: boolean;
			scanCount: number;
			lastScanResult: ScanResult | null;
		};
	} {
		return {
			detector: this.detector.getStats(),
			matcher: this.detector.getMatcher().getStats(),
			scanner: {
				running: this.isRunning,
				scanCount: this.scanCount,
				lastScanResult: this.lastScanResult,
			},
		};
	}

	/**
	 * Force an immediate scan
	 */
	async forceScan(): Promise<ScanResult> {
		return this.runScan();
	}

	/**
	 * Update scanner configuration
	 */
	updateConfig(config: Partial<ArbitrageScannerConfig>): void {
		// Update config
		if (config.minSpread !== undefined) {
			this.config.minSpread = config.minSpread;
		}
		if (config.minLiquidity !== undefined) {
			this.config.minLiquidity = config.minLiquidity;
		}
		if (config.categories !== undefined) {
			this.config.categories = config.categories;
		}
		if (config.pollInterval !== undefined) {
			this.config.pollInterval = config.pollInterval;

			// Restart polling with new interval if running
			if (this.isRunning && this.pollTimer) {
				clearInterval(this.pollTimer);
				this.pollTimer = setInterval(() => {
					this.runScan().catch((error) => {
						this.callbacks.onError?.(error as Error, "polling");
					});
				}, this.config.pollInterval);
			}
		}
	}

	/**
	 * Check if any fetches are currently pending using Bun.peek()
	 * Useful for UI status indicators
	 */
	hasPendingFetches(): boolean {
		for (const [, status] of this.pendingFetches) {
			const peeked = Bun.peek(status.promise);
			if (peeked === status.promise) {
				return true; // Still pending
			}
		}
		return false;
	}

	/**
	 * Get current fetch status for all venues
	 */
	getFetchStatus(): Record<string, "pending" | "resolved" | "rejected"> {
		const result: Record<string, "pending" | "resolved" | "rejected"> = {};

		for (const [venue, status] of this.pendingFetches) {
			const peeked = Bun.peek(status.promise);
			if (peeked === status.promise) {
				result[venue] = "pending";
			} else {
				result[venue] = status.status === "rejected" ? "rejected" : "resolved";
			}
		}

		return result;
	}
}

/**
 * Create and optionally start an ArbitrageScanner
 */
export async function createArbitrageScanner(
	config?: Partial<ArbitrageScannerConfig>,
	callbacks?: ScannerCallbacks,
	autoStart = false,
): Promise<ArbitrageScanner> {
	const scanner = new ArbitrageScanner(config, callbacks);

	if (autoStart) {
		await scanner.start();
	}

	return scanner;
}

/**
 * Global scanner instance (created but not started)
 */
export const globalScanner = new ArbitrageScanner();
