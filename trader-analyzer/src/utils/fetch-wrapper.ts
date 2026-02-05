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
 * Default timeout for fetch requests (10 seconds)
 * Can be overridden via FETCH_TIMEOUT_MS environment variable
 */
const DEFAULT_FETCH_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Fetch with standardized error handling, timeout protection, and circuit breaker integration
 *
 * Automatically enables verbose fetch logging if DEBUG_FETCH=1 or in development mode.
 * Verbose fetch outputs curl commands for easy debugging and API call reproduction.
 * 
 * **Timeout Protection**: All requests automatically include a timeout (default 10s, configurable via FETCH_TIMEOUT_MS).
 * Uses Bun's native `AbortSignal.timeout()` for efficient timeout handling.
 *
 * @param api_url - The URL to fetch from
 * @param options - Optional fetch options (RequestInit). If signal is provided, timeout will be combined with it.
 * @param circuitBreaker - Optional circuit breaker instance for failure tracking
 * @param timeoutMs - Optional custom timeout in milliseconds (defaults to FETCH_TIMEOUT_MS env var or 10000ms)
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
 * 
 * // Custom timeout
 * const data = await fetchWithErrorHandling<ApiResponse>('https://api.example.com', {}, undefined, 5000);
 * ```
 *
 * @see {@link https://bun.com/docs/runtime/debugger#syntax-highlighted-source-code-preview Bun Debugger Documentation}
 * @see {@link ../docs/BUN-FETCH-TIMEOUTS.md Bun Fetch Timeouts Documentation}
 * @see {@link ../utils/rss-constants.ts BUN_DOCS_URLS} - Bun documentation URL constants
 */
export async function fetchWithErrorHandling<T>(
	api_url: string,
	options?: RequestInit,
	circuitBreaker?: CircuitBreaker,
	timeoutMs?: number,
): Promise<T> {
	// Enable verbose fetch in development or when DEBUG_FETCH is set
	const isDevelopment = Bun.env.NODE_ENV !== "production";
	const debugFetch =
		Bun.env.DEBUG_FETCH === "1" || Bun.env.DEBUG_FETCH === "true";
	const wasVerboseEnabled = Bun.env.BUN_CONFIG_VERBOSE_FETCH === "curl";

	if ((isDevelopment || debugFetch) && !wasVerboseEnabled) {
		Bun.env.BUN_CONFIG_VERBOSE_FETCH = "curl";
	}

	// Determine timeout value (custom > env var > default)
	const effectiveTimeout =
		timeoutMs ??
		(Bun.env.FETCH_TIMEOUT_MS
			? parseInt(Bun.env.FETCH_TIMEOUT_MS, 10)
			: DEFAULT_FETCH_TIMEOUT_MS);

	// Always set up timeout signal for protection
	const timeoutSignal = AbortSignal.timeout(effectiveTimeout);

	// Combine timeout signal with any existing signal from options
	let finalSignal: AbortSignal = timeoutSignal;
	if (options?.signal) {
		// Create a combined signal that aborts when either signal aborts
		const combinedController = new AbortController();
		const abortOnTimeout = () => combinedController.abort();
		const abortOnCustom = () => combinedController.abort();

		timeoutSignal.addEventListener("abort", abortOnTimeout);
		options.signal.addEventListener("abort", abortOnCustom);

		finalSignal = combinedController.signal;
	}

	try {
		const response = await fetch(api_url, {
			...options,
			signal: finalSignal,
		});

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

		// Check for timeout/abort errors first
		const errorName = error instanceof Error ? error.name : "";
		const errorMessage = error instanceof Error ? error.message : String(error);
		const urlInfo = typeof api_url === "string" ? api_url : api_url.toString();
		const method = options?.method || "GET";

		// Timeout/Abort errors (AbortError from AbortSignal.timeout or AbortController)
		if (
			errorName === "AbortError" ||
			errorMessage.includes("aborted") ||
			errorMessage.includes("timeout") ||
			errorMessage.includes("ETIMEDOUT")
		) {
			circuitBreaker?.recordFailure();

			const timeoutMessage = `Request timeout after ${effectiveTimeout}ms for ${method} ${urlInfo}`;
			const enhancedError = new MarketDataAcquisitionError(timeoutMessage, {
				cause: error,
				url: urlInfo,
				method,
				timeout: effectiveTimeout,
			});

			(enhancedError as any).isTimeout = true;
			throw enhancedError;
		}

		// Network errors (TypeError typically indicates network issues)
		if (error instanceof TypeError) {
			circuitBreaker?.recordFailure();

			// Detect specific error types
			let diagnosticMessage = `Fetch failed: ${errorMessage}`;
			if (errorMessage.includes("fetch failed")) {
				diagnosticMessage = `Network connection failed to ${urlInfo}`;
			} else if (
				errorMessage.includes("ECONNREFUSED") ||
				errorMessage.includes("connection refused")
			) {
				diagnosticMessage = `Connection refused to ${urlInfo} - service may be down`;
			} else if (
				errorMessage.includes("ENOTFOUND") ||
				errorMessage.includes("DNS")
			) {
				diagnosticMessage = `DNS resolution failed for ${urlInfo} - check hostname`;
			} else if (errorMessage.includes("ECONNRESET")) {
				diagnosticMessage = `Connection reset by server at ${urlInfo}`;
			}

			// Create enhanced error with context
			const enhancedError = new MarketDataAcquisitionError(diagnosticMessage, {
				cause: error,
				url: urlInfo,
				method,
				timeout: effectiveTimeout,
			});

			// Add error details if available
			if (error instanceof Error && error.cause) {
				(enhancedError as any).originalCause = error.cause;
			}

			throw enhancedError;
		}

		// Wrap all other errors in MarketDataAcquisitionError with context
		const urlInfo = typeof api_url === "string" ? api_url : api_url.toString();
		const method = options?.method || "GET";
		const errorMessage = error instanceof Error ? error.message : String(error);

		throw new MarketDataAcquisitionError(
			`Fetch failed for ${method} ${urlInfo}: ${errorMessage}`,
			{
				cause: error,
				url: urlInfo,
				method,
				timeout: effectiveTimeout,
			},
		);
	} finally {
		// Restore verbose fetch state if we changed it
		if ((isDevelopment || debugFetch) && !wasVerboseEnabled) {
			delete Bun.env.BUN_CONFIG_VERBOSE_FETCH;
		}
	}
}
