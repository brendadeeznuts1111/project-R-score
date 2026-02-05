import { Database } from "bun:sqlite";

/**
 * Rate Limiter for API calls
 * Uses Bun's native timing for precise rate limiting
 */
class RateLimiter {
	private tokens: Map<string, number> = new Map();
	private lastRefill: Map<string, number> = new Map();

	constructor(
		private maxTokens: number = 10,
		private refillRate: number = 1, // tokens per second
		private refillInterval: number = 1000, // ms
	) {}

	async waitForSlot(bookmaker: string): Promise<void> {
		const now = Date.now();
		const key = bookmaker;

		// Initialize if not exists
		if (!this.tokens.has(key)) {
			this.tokens.set(key, this.maxTokens);
			this.lastRefill.set(key, now);
		}

		let tokens = this.tokens.get(key)!;
		let lastRefill = this.lastRefill.get(key)!;

		// Refill tokens based on time passed
		const timePassed = now - lastRefill;
		const tokensToAdd =
			Math.floor(timePassed / this.refillInterval) * this.refillRate;

		if (tokensToAdd > 0) {
			tokens = Math.min(this.maxTokens, tokens + tokensToAdd);
			this.tokens.set(key, tokens);
			this.lastRefill.set(key, now);
		}

		// Wait if no tokens available
		if (tokens <= 0) {
			const waitTime = this.refillInterval - (timePassed % this.refillInterval);
			await Bun.sleep(waitTime);
			return this.waitForSlot(bookmaker); // Recursive call after waiting
		}

		// Consume token
		this.tokens.set(key, tokens - 1);
	}

	getRemainingTokens(bookmaker: string): number {
		return this.tokens.get(bookmaker) || this.maxTokens;
	}
}

/**
 * Market Probe Service
 *
 * Handles HTTP-based market probing with rate limiting and domain-specific response processing.
 * Uses Bun-native fetch with optimized connection pooling and timeouts.
 */
export class MarketProbeService {
	private rateLimiter: RateLimiter;
	private authService: AuthService;

	constructor(authService: AuthService, rateLimiter?: RateLimiter) {
		this.rateLimiter = rateLimiter || new RateLimiter();
		this.authService = authService;
	}

	/**
	 * Probe a dark pool market with rate limiting and timeout handling
	 * Bun-native HTTP call wrapped in domain-specific context
	 */
	async probeDarkPoolMarket(
		bookmaker: string,
		marketId: string,
	): Promise<ProbeResult> {
		// Custom rate limiting before HTTP call
		await this.rateLimiter.waitForSlot(bookmaker);

		const startTime = performance.now();

		try {
			// Bun-native HTTP call with timeout
			const response = await fetch(
				`https://api.${bookmaker}.com/dark-pool/${marketId}`,
				{
					method: "GET",
					headers: await this.authService.getHeaders(bookmaker),
					signal: AbortSignal.timeout(5000), // Bun-native timeout
				},
			);

			const responseTime = performance.now() - startTime;

			if (!response.ok) {
				return {
					success: false,
					error: `HTTP ${response.status}: ${response.statusText}`,
					responseTime,
					bookmaker,
					marketId,
				};
			}

			const data = await response.json();

			// Domain-specific response processing
			const parsedResult = this.parseDarkPoolResponse(data);

			return {
				success: true,
				data: parsedResult,
				responseTime,
				bookmaker,
				marketId,
				rateLimitRemaining: this.rateLimiter.getRemainingTokens(bookmaker),
			};
		} catch (error) {
			const responseTime = performance.now() - startTime;

			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
				responseTime,
				bookmaker,
				marketId,
			};
		}
	}

	/**
	 * Simulate a micro bet attempt to test market accessibility
	 * Domain-specific logic for minimal bet testing
	 */
	async simulateMicroBetAttempt(
		marketNode: MarketNode,
	): Promise<MicroBetResult> {
		const bookmaker = marketNode.bookmaker;
		const marketId = marketNode.id;

		// Rate limit check
		await this.rateLimiter.waitForSlot(bookmaker);

		try {
			const response = await fetch(
				`https://api.${bookmaker}.com/simulate-bet`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(await this.authService.getHeaders(bookmaker)),
					},
					body: JSON.stringify({
						marketId,
						stake: 0.01, // Micro bet amount
						simulate: true, // Don't actually place bet
					}),
					signal: AbortSignal.timeout(3000),
				},
			);

			const data = await response.json();

			return {
				marketId,
				bookmaker,
				rejectionReason: data.rejection_reason || null,
				accessible: !data.rejection_reason,
				responseTime: data.response_time || 0,
				limits: data.betting_limits || {},
			};
		} catch (error) {
			return {
				marketId,
				bookmaker,
				rejectionReason:
					error instanceof Error ? error.message : "Network error",
				accessible: false,
				responseTime: 0,
				limits: {},
			};
		}
	}

	/**
	 * Execute comprehensive bookmaker API probe
	 * Tests multiple endpoints and capabilities
	 */
	async executeBookmakerApiProbe(
		bookmaker: string,
	): Promise<BookmakerProbeResult> {
		const endpoints = ["markets", "balances", "orders", "dark-pool"];

		const results: ProbeResult[] = [];

		for (const endpoint of endpoints) {
			try {
				await this.rateLimiter.waitForSlot(bookmaker);

				const response = await fetch(
					`https://api.${bookmaker}.com/${endpoint}`,
					{
						headers: await this.authService.getHeaders(bookmaker),
						signal: AbortSignal.timeout(2000),
					},
				);

				results.push({
					success: response.ok,
					endpoint,
					responseTime: 0, // Would need performance.now() tracking
					bookmaker,
				});
			} catch (error) {
				results.push({
					success: false,
					endpoint,
					error: error instanceof Error ? error.message : "Unknown error",
					bookmaker,
				});
			}
		}

		const successfulProbes = results.filter((r) => r.success).length;
		const overallHealth = successfulProbes / endpoints.length;

		return {
			bookmaker,
			overallHealth,
			endpoints: results,
			timestamp: Date.now(),
			rateLimitStatus: this.rateLimiter.getRemainingTokens(bookmaker),
		};
	}

	/**
	 * Parse dark pool response data into domain-specific format
	 * Hyper-Bun specific response processing logic
	 */
	private parseDarkPoolResponse(data: any): DarkPoolData {
		return {
			marketId: data.market_id,
			liquidity: data.liquidity || 0,
			spread: data.spread || 0,
			lastUpdate: data.timestamp || Date.now(),
			hiddenOrders: data.hidden_orders || [],
			volumeProfile: data.volume_profile || {},
			manipulationIndicators: this.detectManipulationIndicators(data),
		};
	}

	/**
	 * Detect potential market manipulation indicators
	 * Advanced Hyper-Bun pattern detection
	 */
	private detectManipulationIndicators(data: any): ManipulationIndicators {
		const indicators: string[] = [];

		// Check for unusual volume patterns
		if (data.volume_profile) {
			const volumes = Object.values(data.volume_profile) as number[];
			const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
			const maxVolume = Math.max(...volumes);

			if (maxVolume > avgVolume * 3) {
				indicators.push("unusual_volume_spike");
			}
		}

		// Check for suspicious spread patterns
		if (data.spread > 0.1) {
			indicators.push("wide_spread");
		}

		// Check for hidden order patterns
		if (data.hidden_orders && data.hidden_orders.length > 10) {
			indicators.push("excessive_hidden_orders");
		}

		return {
			flags: indicators,
			severity:
				indicators.length > 2
					? "high"
					: indicators.length > 0
						? "medium"
						: "low",
			confidence: Math.min(indicators.length * 0.3, 1.0),
		};
	}
}

// Type definitions
export interface AuthService {
	getHeaders(bookmaker: string): Promise<Record<string, string>>;
}

export interface MarketNode {
	id: string;
	bookmaker: string;
	marketType: string;
	metadata?: any;
}

export interface ProbeResult {
	success: boolean;
	error?: string;
	data?: any;
	responseTime?: number;
	bookmaker: string;
	marketId?: string;
	endpoint?: string;
	rateLimitRemaining?: number;
}

export interface MicroBetResult {
	marketId: string;
	bookmaker: string;
	rejectionReason: string | null;
	accessible: boolean;
	responseTime: number;
	limits: Record<string, any>;
}

export interface BookmakerProbeResult {
	bookmaker: string;
	overallHealth: number;
	endpoints: ProbeResult[];
	timestamp: number;
	rateLimitStatus: number;
}

export interface DarkPoolData {
	marketId: string;
	liquidity: number;
	spread: number;
	lastUpdate: number;
	hiddenOrders: any[];
	volumeProfile: Record<string, number>;
	manipulationIndicators: ManipulationIndicators;
}

export interface ManipulationIndicators {
	flags: string[];
	severity: "low" | "medium" | "high";
	confidence: number;
}
