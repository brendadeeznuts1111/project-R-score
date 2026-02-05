/**
 * @fileoverview Resilience Patterns for Multi-Layer Correlation Graph
 * @description Circuit breakers, error handling, and retry logic
 * @module arbitrage/shadow-graph/multi-layer-resilience
 */

import { EventEmitter } from "events";

/**
 * Circuit breaker state
 */
export type CircuitState = "closed" | "open" | "half-open";

/**
 * Circuit breaker options
 */
export interface CircuitBreakerOptions {
	timeout: number;
	errorThresholdPercentage: number;
	resetTimeout: number;
	monitoringPeriod?: number;
}

/**
 * Simple circuit breaker implementation
 */
export class CircuitBreaker extends EventEmitter {
	private state: CircuitState = "closed";
	private failures = 0;
	private successes = 0;
	private lastFailureTime = 0;
	private readonly options: Required<CircuitBreakerOptions>;
	// Time source function - can be overridden for testing with fake timers
	private getCurrentTime: () => number = () => Date.now();

	constructor(
		private readonly fn: (...args: any[]) => Promise<any>,
		options: CircuitBreakerOptions,
	) {
		super();
		this.options = {
			monitoringPeriod: 60000,
			...options,
		};
	}

	/**
	 * Set custom time source for testing (e.g., with fake timers)
	 */
	setTimeSource(timeSource: () => number): void {
		this.getCurrentTime = timeSource;
	}

	async fire(...args: any[]): Promise<any> {
		if (this.state === "open") {
			const now = this.getCurrentTime();
			if (now - this.lastFailureTime > this.options.resetTimeout) {
				this.state = "half-open";
				this.emit("half-open");
			} else {
				throw new Error("Circuit breaker is open");
			}
		}

		try {
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(
					() => reject(new Error("Operation timeout")),
					this.options.timeout,
				);
			});

			const result = await Promise.race([this.fn(...args), timeoutPromise]);

			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure();
			throw error;
		}
	}

	private onSuccess(): void {
		this.successes++;
		if (this.state === "half-open") {
			this.state = "closed";
			this.failures = 0;
			this.successes = 0; // Reset successes too when closing
			this.emit("closed");
		}
	}

	private onFailure(): void {
		this.failures++;
		this.lastFailureTime = this.getCurrentTime();

		// Only check failure rate if not already in half-open state
		// In half-open, a failure should transition back to open
		if (this.state === "half-open") {
			this.state = "open";
			this.emit("open");
			return;
		}

		const total = this.failures + this.successes;
		const failureRate = total > 0 ? (this.failures / total) * 100 : 0;

		if (failureRate >= this.options.errorThresholdPercentage && total > 0) {
			this.state = "open";
			this.emit("open");
		}
	}

	getState(): CircuitState {
		return this.state;
	}

	reset(): void {
		this.state = "closed";
		this.failures = 0;
		this.successes = 0;
		this.lastFailureTime = 0;
	}
}

/**
 * Safe layer builder wrapper
 */
export async function safeBuildLayer<T>(
	fn: () => Promise<T>,
	fallback: T,
	layerName: string,
	logger?: { warn: (msg: string, error: any) => void },
): Promise<T> {
	try {
		return await fn();
	} catch (error) {
		if (logger) {
			// Handle both logger.warn() and logger.log() methods
			if (typeof logger.warn === "function") {
				logger.warn(`Layer ${layerName} build failed, using fallback`, error);
			} else if (typeof logger.log === "function") {
				logger.log(`Layer ${layerName} build failed, using fallback`, error);
			} else if (typeof logger === "function") {
				logger(`Layer ${layerName} build failed, using fallback`, error);
			}
		}
		return fallback;
	}
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	maxRetries: number = 3,
	initialDelay: number = 1000,
): Promise<T> {
	let lastError: Error | undefined;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error as Error;
			if (attempt < maxRetries - 1) {
				const delay = initialDelay * Math.pow(2, attempt);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	throw lastError || new Error("Retry failed");
}
