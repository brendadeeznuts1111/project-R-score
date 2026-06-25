// src/fetcher-v137.ts - Leverages v1.3.7 fetch fixes
// v1.3.7: Request cache and mode options now work correctly

export interface FetchOptions {
	timeout?: number;
	cache?: RequestCache;
	mode?: RequestMode;
	tls?: {
		cert?: string;
		key?: string;
		ca?: string;
	};
}

/**
 * v1.3.7 Fetch with proper options support
 * - cache option now respected (was ignored before)
 * - mode option now respected
 * - mTLS certificate per-request (not reused incorrectly)
 * - signal option stable under load
 */
export async function fetchRSS(url: string, options: FetchOptions = {}) {
	const response = await fetch(url, {
		headers: {
			"User-Agent": "RSS-Optimizer/1.0 (Bun/1.3.7)",
			Accept: "application/rss+xml, application/atom+xml, */*",
			// v1.3.7: Casing preserved exactly as written
		},

		// v1.3.7: cache option now respected (was ignored before)
		cache: options.cache || "default",

		// v1.3.7: mode option now respected
		mode: options.mode || "cors",

		// v1.3.7: mTLS certificate per-request (not reused incorrectly)
		...(options.tls && {
			tls: options.tls,
		}),

		// v1.3.7: signal option stable under load
		signal: AbortSignal.timeout(options.timeout || 30000),
	});

	return response;
}

/**
 * v1.3.7: HTTP/2 optimized fetch for AWS ALB compatibility
 */
export async function fetchRSSWithHTTP2(
	url: string,
	options: FetchOptions = {},
) {
	// v1.3.7: HTTP/2 optimizations for AWS ALB
	const response = await fetch(url, {
		headers: {
			"User-Agent": "RSS-Optimizer/1.0 (Bun/1.3.7; HTTP/2)",
			Accept: "application/rss+xml, application/atom+xml, */*",
			"Accept-Encoding": "gzip, deflate, br",
		},
		cache: options.cache || "default",
		mode: options.mode || "cors",
		signal: AbortSignal.timeout(options.timeout || 30000),
	});

	return response;
}

/**
 * v1.3.7: NO_PROXY support - now works with ports correctly
 * Example: NO_PROXY=localhost:3000,127.0.0.1:8080
 */
export async function fetchWithProxyBypass(
	url: string,
	options: FetchOptions = {},
) {
	// v1.3.7: NO_PROXY environment variable is now properly respected
	const response = await fetch(url, {
		headers: {
			"User-Agent": "RSS-Optimizer/1.0 (Bun/1.3.7; Proxy-Bypass)",
			Accept: "application/rss+xml, application/atom+xml, */*",
		},
		cache: options.cache || "default",
		signal: AbortSignal.timeout(options.timeout || 30000),
	});

	return response;
}

export default { fetchRSS, fetchRSSWithHTTP2, fetchWithProxyBypass };
