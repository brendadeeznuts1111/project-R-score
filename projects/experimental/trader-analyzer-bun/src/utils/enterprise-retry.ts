/**
 * @fileoverview Enterprise Retry Logic
 * @description Retry mechanism with exponential backoff and circuit breaker
 * @module utils/enterprise-retry
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-ENTERPRISE-RETRY@0.1.0;instance-id=ENTERPRISE-RETRY-001;version=0.1.0}]
 * [PROPERTIES:{retry={value:"enterprise-retry";@root:"ROOT-UTILS";@chain:["BP-RETRY","BP-ENTERPRISE"];@version:"0.1.0"}}]
 * [CLASS:EnterpriseRetry][#REF:v-0.1.0.BP.ENTERPRISE.RETRY.1.0.A.1.1.UTILS.1.1]]
 */

import { ENTERPRISE_CONFIG } from "./enterprise-config";

/**
 * Retry options
 */
export interface RetryOptions {
	maxAttempts?: number;
	initialDelayMs?: number;
	maxDelayMs?: number;
	backoffMultiplier?: number;
	retryableErrors?: Array<number | string>;
	onRetry?: (attempt: number, error: unknown) => void;
}

/**
 * Retry result
 */
export interface RetryResult<T> {
	success: boolean;
	result?: T;
	error?: unknown;
	attempts: number;
	duration: number;
}

/**
 * Enterprise retry with exponential backoff
 */
export async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	options: RetryOptions = {},
): Promise<RetryResult<T>> {
	const {
		maxAttempts = ENTERPRISE_CONFIG.retry.maxAttempts,
		initialDelayMs = ENTERPRISE_CONFIG.retry.initialDelayMs,
		maxDelayMs = ENTERPRISE_CONFIG.retry.maxDelayMs,
		backoffMultiplier = ENTERPRISE_CONFIG.retry.backoffMultiplier,
		retryableErrors = ENTERPRISE_CONFIG.retry.retryableStatusCodes,
		onRetry,
	} = options;

	const startTime = Bun.nanoseconds();
	let lastError: unknown;
	let delay = initialDelayMs;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			const result = await fn();
			const duration = (Bun.nanoseconds() - startTime) / 1_000_000;

			return {
				success: true,
				result,
				attempts: attempt,
				duration,
			};
		} catch (error: any) {
			lastError = error;

			// Check if error is retryable
			const isRetryable =
				retryableErrors.includes(error?.status) ||
				retryableErrors.includes(error?.code) ||
				retryableErrors.includes(error?.message);

			// Don't retry if not retryable or last attempt
			if (!isRetryable || attempt === maxAttempts) {
				const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
				return {
					success: false,
					error: lastError,
					attempts: attempt,
					duration,
				};
			}

			// Call retry callback
			if (onRetry) {
				onRetry(attempt, error);
			}

			// Exponential backoff
			await Bun.sleep(Math.min(delay, maxDelayMs));
			delay *= backoffMultiplier;
		}
	}

	const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
	return {
		success: false,
		error: lastError,
		attempts: maxAttempts,
		duration,
	};
}

/**
 * Circuit breaker state
 */
type CircuitState = "closed" | "open" | "half-open";

/**
 * Circuit breaker for preventing cascading failures
 */
export class CircuitBreaker {
	private state: CircuitState = "closed";
	private failures = 0;
	private lastFailureTime = 0;
	private halfOpenAttempts = 0;

	constructor(
		private readonly failureThreshold = ENTERPRISE_CONFIG.circuitBreaker
			.failureThreshold,
		private readonly resetTimeoutMs = ENTERPRISE_CONFIG.circuitBreaker
			.resetTimeoutMs,
		private readonly halfOpenMaxAttempts = ENTERPRISE_CONFIG.circuitBreaker
			.halfOpenMaxAttempts,
	) {}

	/**
	 * Execute function with circuit breaker protection
	 */
	async execute<T>(fn: () => Promise<T>): Promise<T> {
		// Check if circuit should be reset
		if (this.state === "open") {
			const timeSinceLastFailure = Date.now() - this.lastFailureTime;
			if (timeSinceLastFailure >= this.resetTimeoutMs) {
				this.state = "half-open";
				this.halfOpenAttempts = 0;
			} else {
				throw new Error("Circuit breaker is OPEN");
			}
		}

		try {
			const result = await fn();

			// Success - reset circuit if half-open
			if (this.state === "half-open") {
				this.state = "closed";
				this.failures = 0;
				this.halfOpenAttempts = 0;
			} else if (this.state === "closed") {
				this.failures = 0;
			}

			return result;
		} catch (error) {
			this.failures++;
			this.lastFailureTime = Date.now();

			// Open circuit if threshold reached
			if (this.failures >= this.failureThreshold) {
				this.state = "open";
			}

			// If half-open and max attempts reached, open circuit
			if (this.state === "half-open") {
				this.halfOpenAttempts++;
				if (this.halfOpenAttempts >= this.halfOpenMaxAttempts) {
					this.state = "open";
				}
			}

			throw error;
		}
	}

	/**
	 * Get current state
	 */
	getState(): CircuitState {
		return this.state;
	}

	/**
	 * Reset circuit breaker
	 */
	reset(): void {
		this.state = "closed";
		this.failures = 0;
		this.halfOpenAttempts = 0;
		this.lastFailureTime = 0;
	}
}
