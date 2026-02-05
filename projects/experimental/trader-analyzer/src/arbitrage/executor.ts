/**
 * @fileoverview Arbitrage Trade Executor
 * @description Executes arbitrage trades across prediction market venues
 * @module arbitrage/executor
 *
 * IMPORTANT: This module places real orders. Use with caution.
 * Always test with small amounts first.
 */

import type {
	ArbitrageOpportunity,
	PredictionVenue,
	VenueQuote,
} from "./types";

/**
 * Order placement result
 */
export interface OrderResult {
	success: boolean;
	orderId?: string;
	venue: PredictionVenue;
	side: "YES" | "NO";
	amount: number;
	price: number;
	filled?: number;
	error?: string;
	timestamp: number;
}

/**
 * Execution result for a complete arbitrage trade
 */
export interface ExecutionResult {
	opportunityId: string;
	success: boolean;
	yesOrder: OrderResult;
	noOrder: OrderResult;
	totalCapital: number;
	expectedProfit: number;
	actualProfit?: number;
	executionTimeMs: number;
	timestamp: number;
}

/**
 * Executor configuration
 */
export interface ExecutorConfig {
	/** Maximum capital per trade (USD) */
	maxCapital?: number;
	/** Minimum spread to execute (%) */
	minSpread?: number;
	/** Maximum slippage tolerance (%) */
	maxSlippage?: number;
	/** Dry run mode - simulate without placing orders */
	dryRun?: boolean;
	/** Polymarket API credentials */
	polymarket?: {
		apiKey: string;
		apiSecret: string;
		passphrase?: string;
		funderAddress: string;
	};
	/** Kalshi API credentials */
	kalshi?: {
		email?: string;
		password?: string;
		apiKey?: string;
	};
}

/**
 * Execution callbacks
 */
export interface ExecutorCallbacks {
	onOrderPlaced?: (order: OrderResult) => void;
	onOrderFilled?: (order: OrderResult) => void;
	onExecutionComplete?: (result: ExecutionResult) => void;
	onError?: (error: Error, context: string) => void;
}

/**
 * ArbitrageExecutor - Executes arbitrage trades
 *
 * Workflow:
 * 1. Validate opportunity is still profitable
 * 2. Calculate optimal position sizes
 * 3. Place YES order on cheaper venue
 * 4. Place NO order on other venue
 * 5. Monitor fills and report result
 */
export class ArbitrageExecutor {
	private config: Required<ExecutorConfig>;
	private callbacks: ExecutorCallbacks;
	private executionHistory: ExecutionResult[] = [];

	constructor(config?: ExecutorConfig, callbacks?: ExecutorCallbacks) {
		this.config = {
			maxCapital: config?.maxCapital ?? 100,
			minSpread: config?.minSpread ?? 0.02,
			maxSlippage: config?.maxSlippage ?? 0.01,
			dryRun: config?.dryRun ?? true, // Default to dry run for safety
			polymarket: config?.polymarket ?? {
				apiKey: "",
				apiSecret: "",
				funderAddress: "",
			},
			kalshi: config?.kalshi ?? {},
		};
		this.callbacks = callbacks ?? {};
	}

	/**
	 * Execute an arbitrage opportunity
	 */
	async execute(opportunity: ArbitrageOpportunity): Promise<ExecutionResult> {
		const startTime = Bun.nanoseconds();

		// Validate opportunity
		const validation = this.validateOpportunity(opportunity);
		if (!validation.valid) {
			return this.createFailedResult(
				opportunity,
				validation.reason!,
				startTime,
			);
		}

		// Calculate position sizes with slippage buffer
		const sizing = this.calculateSizing(opportunity);

		console.log(`
╔═══════════════════════════════════════════════════════════╗
║  💰 Executing Arbitrage Trade ${this.config.dryRun ? "(DRY RUN)" : ""}
║  Event: ${opportunity.event.description.slice(0, 45)}...
║  Spread: ${opportunity.spreadPercent.toFixed(2)}%
║  Capital: $${sizing.totalCapital.toFixed(2)}
║  Expected Profit: $${sizing.guaranteedProfit.toFixed(2)}
╚═══════════════════════════════════════════════════════════╝
    `);

		// Place orders
		const yesOrder = await this.placeOrder(
			opportunity.buyYesVenue,
			"YES",
			sizing.yesAmount,
			opportunity.buyYesVenue.yesAsk,
		);

		const noOrder = await this.placeOrder(
			opportunity.buyNoVenue,
			"NO",
			sizing.noAmount,
			opportunity.buyNoVenue.noAsk,
		);

		const executionTimeMs = Number(Bun.nanoseconds() - startTime) / 1_000_000;

		const result: ExecutionResult = {
			opportunityId: opportunity.id,
			success: yesOrder.success && noOrder.success,
			yesOrder,
			noOrder,
			totalCapital: sizing.totalCapital,
			expectedProfit: sizing.guaranteedProfit,
			executionTimeMs,
			timestamp: Date.now(),
		};

		this.executionHistory.push(result);
		this.callbacks.onExecutionComplete?.(result);

		return result;
	}

	/**
	 * Validate opportunity is still profitable
	 */
	private validateOpportunity(opportunity: ArbitrageOpportunity): {
		valid: boolean;
		reason?: string;
	} {
		// Check spread threshold
		if (opportunity.spreadPercent < this.config.minSpread * 100) {
			return {
				valid: false,
				reason: `Spread ${opportunity.spreadPercent.toFixed(2)}% below minimum ${this.config.minSpread * 100}%`,
			};
		}

		// Check if it's a true arbitrage
		if (!opportunity.isArbitrage) {
			return {
				valid: false,
				reason: "Not a guaranteed arbitrage (positive EV only)",
			};
		}

		// Check capital limits
		if (opportunity.sizing.totalCapital > this.config.maxCapital) {
			return {
				valid: false,
				reason: `Required capital $${opportunity.sizing.totalCapital} exceeds max $${this.config.maxCapital}`,
			};
		}

		// Check quote freshness (max 30 seconds old)
		const maxAge = 30000;
		const now = Date.now();
		if (
			now - opportunity.buyYesVenue.timestamp > maxAge ||
			now - opportunity.buyNoVenue.timestamp > maxAge
		) {
			return { valid: false, reason: "Quotes are stale (>30s old)" };
		}

		// Check credentials
		if (!this.config.dryRun) {
			if (
				opportunity.buyYesVenue.venue === "polymarket" &&
				!this.config.polymarket.apiKey
			) {
				return {
					valid: false,
					reason: "Polymarket credentials not configured",
				};
			}
			if (
				opportunity.buyYesVenue.venue === "kalshi" &&
				!this.config.kalshi.apiKey &&
				!this.config.kalshi.email
			) {
				return { valid: false, reason: "Kalshi credentials not configured" };
			}
		}

		return { valid: true };
	}

	/**
	 * Calculate position sizes with slippage buffer
	 */
	private calculateSizing(opportunity: ArbitrageOpportunity): {
		yesAmount: number;
		noAmount: number;
		totalCapital: number;
		guaranteedProfit: number;
	} {
		// Apply slippage buffer to reduce risk
		const slippageMultiplier = 1 - this.config.maxSlippage;

		// Cap at max capital
		const rawCapital = Math.min(
			opportunity.sizing.totalCapital,
			this.config.maxCapital,
		);

		// Scale down proportionally
		const scale = rawCapital / opportunity.sizing.totalCapital;

		return {
			yesAmount: opportunity.sizing.yesAmount * scale * slippageMultiplier,
			noAmount: opportunity.sizing.noAmount * scale * slippageMultiplier,
			totalCapital: rawCapital * slippageMultiplier,
			guaranteedProfit:
				opportunity.sizing.guaranteedProfit * scale * slippageMultiplier,
		};
	}

	/**
	 * Place an order on a venue
	 */
	private async placeOrder(
		quote: VenueQuote,
		side: "YES" | "NO",
		amount: number,
		price: number,
	): Promise<OrderResult> {
		const venue = quote.venue as PredictionVenue;

		if (this.config.dryRun) {
			return this.simulateOrder(venue, side, amount, price, quote.instrumentId);
		}

		try {
			switch (venue) {
				case "polymarket":
					return await this.placePolymarketOrder(quote, side, amount, price);
				case "kalshi":
					return await this.placeKalshiOrder(quote, side, amount, price);
				default:
					return {
						success: false,
						venue,
						side,
						amount,
						price,
						error: `Unsupported venue: ${venue}`,
						timestamp: Date.now(),
					};
			}
		} catch (error) {
			this.callbacks.onError?.(error as Error, `placeOrder:${venue}`);
			return {
				success: false,
				venue,
				side,
				amount,
				price,
				error: (error as Error).message,
				timestamp: Date.now(),
			};
		}
	}

	/**
	 * Simulate order placement (dry run mode)
	 */
	private simulateOrder(
		venue: PredictionVenue,
		side: "YES" | "NO",
		amount: number,
		price: number,
		instrumentId: string,
	): OrderResult {
		const result: OrderResult = {
			success: true,
			orderId: `sim-${Date.now()}-${Math.random().toString(36).slice(2)}`,
			venue,
			side,
			amount,
			price,
			filled: amount, // Assume full fill in simulation
			timestamp: Date.now(),
		};

		console.log(
			`  [DRY RUN] ${venue}: ${side} $${amount.toFixed(2)} @ ${(price * 100).toFixed(1)}¢ on ${instrumentId}`,
		);

		this.callbacks.onOrderPlaced?.(result);
		this.callbacks.onOrderFilled?.(result);

		return result;
	}

	/**
	 * Place order on Polymarket
	 */
	private async placePolymarketOrder(
		_quote: VenueQuote,
		side: "YES" | "NO",
		amount: number,
		price: number,
	): Promise<OrderResult> {
		// Polymarket uses CLOB API with EIP-712 signatures
		// This is a placeholder - full implementation requires:
		// 1. EIP-712 order signing with private key
		// 2. POST to /order endpoint
		// 3. Poll for fill status

		const _CLOB_BASE = "https://clob.polymarket.com";

		// For now, return a "not implemented" error
		// Real implementation would use @polymarket/sdk or direct API calls
		return {
			success: false,
			venue: "polymarket",
			side,
			amount,
			price,
			error:
				"Polymarket order execution requires EIP-712 signing (not implemented)",
			timestamp: Date.now(),
		};
	}

	/**
	 * Place order on Kalshi
	 */
	private async placeKalshiOrder(
		_quote: VenueQuote,
		side: "YES" | "NO",
		amount: number,
		price: number,
	): Promise<OrderResult> {
		// Kalshi uses REST API with token auth
		// This is a placeholder - full implementation requires:
		// 1. Authentication with email/password or API key
		// 2. POST to /trade-api/v2/portfolio/orders
		// 3. Poll for fill status

		const { email, password, apiKey } = this.config.kalshi;

		if (!apiKey && (!email || !password)) {
			return {
				success: false,
				venue: "kalshi",
				side,
				amount,
				price,
				error: "Kalshi credentials not configured",
				timestamp: Date.now(),
			};
		}

		// Convert price to Kalshi format (cents)
		const _kalshiPrice = Math.round(price * 100);
		const _contracts = Math.floor(amount / price);

		// Real implementation would:
		// 1. POST /trade-api/v2/portfolio/orders
		// 2. With body: { ticker, client_order_id, type: 'limit', action: 'buy', side, count, yes_price/no_price }

		return {
			success: false,
			venue: "kalshi",
			side,
			amount,
			price,
			error: "Kalshi order execution not fully implemented",
			timestamp: Date.now(),
		};
	}

	/**
	 * Create a failed execution result
	 */
	private createFailedResult(
		opportunity: ArbitrageOpportunity,
		reason: string,
		startTime: number,
	): ExecutionResult {
		const executionTimeMs = Number(Bun.nanoseconds() - startTime) / 1_000_000;

		return {
			opportunityId: opportunity.id,
			success: false,
			yesOrder: {
				success: false,
				venue: opportunity.buyYesVenue.venue as PredictionVenue,
				side: "YES",
				amount: 0,
				price: 0,
				error: reason,
				timestamp: Date.now(),
			},
			noOrder: {
				success: false,
				venue: opportunity.buyNoVenue.venue as PredictionVenue,
				side: "NO",
				amount: 0,
				price: 0,
				error: reason,
				timestamp: Date.now(),
			},
			totalCapital: 0,
			expectedProfit: 0,
			executionTimeMs,
			timestamp: Date.now(),
		};
	}

	/**
	 * Get execution history
	 */
	getHistory(): ExecutionResult[] {
		return [...this.executionHistory];
	}

	/**
	 * Get execution statistics
	 */
	getStats(): {
		totalExecutions: number;
		successfulExecutions: number;
		failedExecutions: number;
		totalCapitalDeployed: number;
		totalExpectedProfit: number;
		avgExecutionTimeMs: number;
	} {
		const successful = this.executionHistory.filter((e) => e.success);
		const failed = this.executionHistory.filter((e) => !e.success);

		return {
			totalExecutions: this.executionHistory.length,
			successfulExecutions: successful.length,
			failedExecutions: failed.length,
			totalCapitalDeployed: successful.reduce(
				(sum, e) => sum + e.totalCapital,
				0,
			),
			totalExpectedProfit: successful.reduce(
				(sum, e) => sum + e.expectedProfit,
				0,
			),
			avgExecutionTimeMs:
				this.executionHistory.length > 0
					? this.executionHistory.reduce(
							(sum, e) => sum + e.executionTimeMs,
							0,
						) / this.executionHistory.length
					: 0,
		};
	}

	/**
	 * Update configuration
	 */
	updateConfig(config: Partial<ExecutorConfig>): void {
		if (config.maxCapital !== undefined)
			this.config.maxCapital = config.maxCapital;
		if (config.minSpread !== undefined)
			this.config.minSpread = config.minSpread;
		if (config.maxSlippage !== undefined)
			this.config.maxSlippage = config.maxSlippage;
		if (config.dryRun !== undefined) this.config.dryRun = config.dryRun;
		if (config.polymarket)
			this.config.polymarket = {
				...this.config.polymarket,
				...config.polymarket,
			};
		if (config.kalshi)
			this.config.kalshi = { ...this.config.kalshi, ...config.kalshi };
	}

	/**
	 * Check if executor is in dry run mode
	 */
	isDryRun(): boolean {
		return this.config.dryRun;
	}
}

/**
 * Create an ArbitrageExecutor
 */
export function createExecutor(
	config?: ExecutorConfig,
	callbacks?: ExecutorCallbacks,
): ArbitrageExecutor {
	return new ArbitrageExecutor(config, callbacks);
}
