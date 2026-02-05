/**
 * @fileoverview Fetch Wrapper with Error Handling
 * @description Standardized fetch wrapper with circuit breaker integration and error handling
 * @module utils/fetch-wrapper
 *
 * [hyper-bun][utils][feat][META:priority=high,status=production][fetch-wrapper][#REF:Bun.debugger]
 *
 * Features:
 * - Standardized error handling with HttpError and MarketDataAcquisitionError
 * - Circuit breaker integration for failure tracking
 * - Optional verbose fetch logging (BUN_CONFIG_VERBOSE_FETCH=curl)
 * - Zero dependencies - pure Bun APIs
 *
 * @see {@link https://bun.com/docs/runtime/debugger#syntax-highlighted-source-code-preview Bun Debugger Documentation}
 */

import { HttpError, MarketDataAcquisitionError } from "../errors/index.js";
import type { CircuitBreaker } from "./enterprise-retry.js";

/**
 * Fetch with standardized error handling and circuit breaker integration
 *
 * Automatically enables verbose fetch logging if DEBUG_FETCH=1 or in development mode.
 * Verbose fetch outputs curl commands for easy debugging and API call reproduction.
 *
 * @param api_url - The URL to fetch from
 * @param options - Optional fetch options (RequestInit)
 * @param circuitBreaker - Optional circuit breaker instance for failure tracking
 * @returns Promise resolving to parsed JSON response
 * @throws HttpError for HTTP errors (non-2xx responses)
 * @throws MarketDataAcquisitionError for network errors or other fetch failures
 *
 * @example
 * ```typescript
 * // Enable verbose fetch globally
 * Bun.env.BUN_CONFIG_VERBOSE_FETCH = 'curl';
 *
 * // Or set DEBUG_FETCH=1 for automatic verbose logging
 * const data = await fetchWithErrorHandling<ApiResponse>('https://api.example.com', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ foo: 'bar' })
 * });
 * // Will output: curl -X POST https://api.example.com ...
 * ```
 *
 * @see {@link https://bun.com/docs/runtime/debugger#syntax-highlighted-source-code-preview Bun Debugger Documentation}
 */
export async function fetchWithErrorHandling<T>(
	api_url: string,
	options?: RequestInit,
	circuitBreaker?: CircuitBreaker,
): Promise<T> {
	// Enable verbose fetch in development or when DEBUG_FETCH is set
	const isDevelopment = Bun.env.NODE_ENV !== "production";
	const debugFetch =
		Bun.env.DEBUG_FETCH === "1" || Bun.env.DEBUG_FETCH === "true";
	const wasVerboseEnabled = Bun.env.BUN_CONFIG_VERBOSE_FETCH === "curl";

	if ((isDevelopment || debugFetch) && !wasVerboseEnabled) {
		Bun.env.BUN_CONFIG_VERBOSE_FETCH = "curl";
	}

	try {
		const response = await fetch(api_url, options);

		if (!response.ok) {
			const body = await response.text().catch(() => undefined);
			throw new HttpError(response.status, response.statusText, body);
		}

		return await response.json();
	} catch (error) {
		// Re-throw HttpError as-is
		if (error instanceof HttpError) {
			throw error;
		}

		// Network errors (TypeError typically indicates network issues)
		if (error instanceof TypeError) {
			circuitBreaker?.recordFailure();
		}

		// Wrap all other errors in MarketDataAcquisitionError
		throw new MarketDataAcquisitionError("Fetch failed", { cause: error });
	} finally {
		// Restore verbose fetch state if we changed it
		if ((isDevelopment || debugFetch) && !wasVerboseEnabled) {
			delete Bun.env.BUN_CONFIG_VERBOSE_FETCH;
		}
	}
}
