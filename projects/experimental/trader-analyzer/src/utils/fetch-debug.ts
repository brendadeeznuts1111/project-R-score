/**
 * @fileoverview Fetch Debugging Utilities
 * @description Bun-native fetch debugging with verbose curl output
 * @module utils/fetch-debug
 *
 * [hyper-bun][utils][feat][META:priority=high,status=production][fetch-debug][#REF:Bun.debugger]
 *
 * Features:
 * - Verbose fetch logging with curl command output
 * - Syntax-highlighted source code preview (Bun debugger)
 * - Environment-aware debugging configuration
 * - Zero dependencies - pure Bun APIs
 *
 * @see {@link https://bun.com/docs/runtime/debugger#syntax-highlighted-source-code-preview Bun Debugger Documentation}
 *
 * @example
 * ```typescript
 * import { enableVerboseFetch, debugFetch } from './utils/fetch-debug';
 *
 * // Enable verbose fetch globally
 * enableVerboseFetch();
 *
 * // Or use wrapper with automatic curl output
 * await debugFetch('https://api.example.com', { method: 'POST' });
 * ```
 */

/**
 * Enable Bun's verbose fetch logging
 *
 * When enabled, Bun will output curl commands for all fetch requests,
 * making it easy to debug and reproduce API calls.
 *
 * @param enabled - Whether to enable verbose fetch (default: true)
 *
 * @example
 * ```typescript
 * enableVerboseFetch(); // Enable globally
 * await fetch('https://api.example.com'); // Will output curl command
 * ```
 */
export function enableVerboseFetch(enabled = true): void {
	if (enabled) {
		Bun.env.BUN_CONFIG_VERBOSE_FETCH = "curl";
	} else {
		delete Bun.env.BUN_CONFIG_VERBOSE_FETCH;
	}
}

/**
 * Disable Bun's verbose fetch logging
 */
export function disableVerboseFetch(): void {
	enableVerboseFetch(false);
}

/**
 * Check if verbose fetch is currently enabled
 */
export function isVerboseFetchEnabled(): boolean {
	return Bun.env.BUN_CONFIG_VERBOSE_FETCH === "curl";
}

/**
 * Fetch wrapper with automatic verbose logging
 *
 * Automatically enables verbose fetch for this request and outputs
 * the curl command. Useful for debugging specific requests.
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @returns Promise resolving to Response
 *
 * @example
 * ```typescript
 * const response = await debugFetch('https://api.example.com', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ foo: 'bar' })
 * });
 * // Outputs: curl -X POST https://api.example.com ...
 * ```
 */
export async function debugFetch(
	url: string | URL,
	options?: RequestInit,
): Promise<Response> {
	const wasEnabled = isVerboseFetchEnabled();

	// Enable verbose fetch for this request
	if (!wasEnabled) {
		enableVerboseFetch();
	}

	try {
		const response = await fetch(url, options);
		return response;
	} finally {
		// Restore previous state
		if (!wasEnabled) {
			disableVerboseFetch();
		}
	}
}

/**
 * Fetch wrapper with verbose logging and response inspection
 *
 * Combines verbose fetch with response logging and error handling.
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param logResponse - Whether to log response details (default: true)
 * @returns Promise resolving to Response with metadata
 *
 * @example
 * ```typescript
 * const { response, metadata } = await debugFetchWithInspection(
 *   'https://api.example.com',
 *   { method: 'POST', body: JSON.stringify({ data: 'test' }) }
 * );
 * console.log('Status:', metadata.status);
 * console.log('Duration:', metadata.durationMs, 'ms');
 * ```
 */
export async function debugFetchWithInspection(
	url: string | URL,
	options?: RequestInit,
	logResponse = true,
): Promise<{
	response: Response;
	metadata: {
		url: string;
		method: string;
		status: number;
		statusText: string;
		durationMs: number;
		headers: Record<string, string>;
	};
}> {
	const startTime = Bun.nanoseconds();
	const wasEnabled = isVerboseFetchEnabled();

	// Enable verbose fetch
	if (!wasEnabled) {
		enableVerboseFetch();
	}

	try {
		const response = await fetch(url, options);
		const durationMs = (Bun.nanoseconds() - startTime) / 1_000_000;

		// Extract headers
		const headers: Record<string, string> = {};
		response.headers.forEach((value, key) => {
			headers[key] = value;
		});

		const metadata = {
			url: typeof url === "string" ? url : url.toString(),
			method: options?.method || "GET",
			status: response.status,
			statusText: response.statusText,
			durationMs,
			headers,
		};

		if (logResponse) {
			console.log("\n📡 Fetch Debug Info:");
			console.log(`  URL: ${metadata.url}`);
			console.log(`  Method: ${metadata.method}`);
			console.log(`  Status: ${metadata.status} ${metadata.statusText}`);
			console.log(`  Duration: ${metadata.durationMs.toFixed(2)}ms`);
			console.log(
				`  Headers:`,
				Bun.inspect(headers, { colors: true, compact: true }),
			);
		}

		return { response, metadata };
	} finally {
		// Restore previous state
		if (!wasEnabled) {
			disableVerboseFetch();
		}
	}
}

/**
 * Environment-aware verbose fetch configuration
 *
 * Automatically enables verbose fetch based on environment:
 * - Development: Enabled by default
 * - Production: Disabled unless DEBUG_FETCH=1
 * - Test: Disabled unless DEBUG_FETCH=1
 *
 * @example
 * ```typescript
 * configureVerboseFetch(); // Auto-configures based on NODE_ENV
 * ```
 */
export function configureVerboseFetch(): void {
	const nodeEnv = Bun.env.NODE_ENV || "development";
	const debugFetch =
		Bun.env.DEBUG_FETCH === "1" || Bun.env.DEBUG_FETCH === "true";

	if (nodeEnv === "development" || debugFetch) {
		enableVerboseFetch();
		console.log("🔍 Verbose fetch logging enabled");
	} else {
		disableVerboseFetch();
	}
}

/**
 * Create a fetch wrapper with persistent verbose logging
 *
 * Returns a fetch function that always uses verbose logging.
 * Useful for debugging specific API clients.
 *
 * @returns Fetch function with verbose logging enabled
 *
 * @example
 * ```typescript
 * const verboseFetch = createVerboseFetch();
 * await verboseFetch('https://api.example.com'); // Always verbose
 * ```
 */
export function createVerboseFetch(): (
	input: RequestInfo | URL,
	init?: RequestInit,
) => Promise<Response> {
	enableVerboseFetch();

	return async (
		input: RequestInfo | URL,
		init?: RequestInit,
	): Promise<Response> => {
		return fetch(input, init);
	};
}

/**
 * Format fetch options as curl command (for documentation/debugging)
 *
 * Generates a curl command string from fetch options.
 * Useful for documentation or manual testing.
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @returns Curl command string
 *
 * @example
 * ```typescript
 * const curl = formatAsCurl('https://api.example.com', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ foo: 'bar' })
 * });
 * console.log(curl);
 * // curl -X POST https://api.example.com \
 * //   -H "Content-Type: application/json" \
 * //   -d '{"foo":"bar"}'
 * ```
 */
export function formatAsCurl(url: string | URL, options?: RequestInit): string {
	const urlStr = typeof url === "string" ? url : url.toString();
	const method = options?.method || "GET";
	const parts: string[] = [`curl -X ${method} "${urlStr}"`];

	// Add headers
	if (options?.headers) {
		const headers = options.headers as Record<string, string>;
		for (const [key, value] of Object.entries(headers)) {
			parts.push(`  -H "${key}: ${value}"`);
		}
	}

	// Add body
	if (options?.body) {
		if (typeof options.body === "string") {
			parts.push(`  -d '${options.body.replace(/'/g, "\\'")}'`);
		} else if (options.body instanceof FormData) {
			parts.push(`  -F "..."`); // FormData is complex, simplified
		} else {
			parts.push(`  --data-binary '${String(options.body)}'`);
		}
	}

	return parts.join(" \\\n");
}
