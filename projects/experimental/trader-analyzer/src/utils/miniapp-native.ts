/**
 * @fileoverview Native Bun Miniapp Integration
 * @description Miniapp monitoring and status using Bun Shell and native APIs
 * @module utils/miniapp-native
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-MINIAPP-NATIVE@0.1.0;instance-id=MINIAPP-NATIVE-001;version=0.1.0}]
 * [PROPERTIES:{miniapp={value:"native-miniapp";@root:"ROOT-INTEGRATION";@chain:["BP-MINIAPP","BP-BUN"];@version:"0.1.0"}}]
 * [CLASS:NativeMiniappMonitor][#REF:v-0.1.0.BP.MINIAPP.NATIVE.1.0.A.1.1.INTEGRATION.1.1]]
 */

import { $ } from "bun";
import { EnterpriseCache } from "./enterprise-cache";
import { ENTERPRISE_CONFIG } from "./enterprise-config";
import { CircuitBreaker, retryWithBackoff } from "./enterprise-retry";
import { MINIAPP_CONSTANTS } from "../security/constants";
import { TELEGRAM_MINIAPP_URLS } from "./rss-constants";

/**
 * Miniapp status
 */
export interface MiniappStatus {
	url: string;
	status: "online" | "offline" | "degraded";
	responseTime: number;
	statusCode: number;
	timestamp: number;
	error?: string;
}

/**
 * Miniapp health check response
 */
export interface MiniappHealth {
	status: string;
	version?: string;
	uptime?: number;
	timestamp?: string;
}

/**
 * Native miniapp monitor using Bun Shell
 */
export class NativeMiniappMonitor {
	private readonly stagingUrl = TELEGRAM_MINIAPP_URLS.STAGING;
	private readonly circuitBreaker = new CircuitBreaker();
	// Status cache: 10s TTL for fast-changing status
	private readonly statusCache = new EnterpriseCache<string, MiniappStatus>(
		MINIAPP_CONSTANTS.CACHE_MAX_SIZE,
		MINIAPP_CONSTANTS.STATUS_CACHE_TTL_MS,
	);
	// Health cache: 30s TTL for slower-changing health data
	private readonly healthCache = new EnterpriseCache<string, MiniappHealth>(
		MINIAPP_CONSTANTS.CACHE_MAX_SIZE,
		MINIAPP_CONSTANTS.HEALTH_CACHE_TTL_MS,
	);

	/**
	 * Get browser-like headers for requests (matches Safari/Chrome)
	 * Consistent headers across all requests
	 */
	private getBrowserHeaders(
		includeETag = false,
		etag?: string,
		path = "/",
	): HeadersInit {
		// Normalize path - ensure it starts with /
		const normalizedPath = path.startsWith("/") ? path : `/${path}`;
		const fullUrl = `${this.stagingUrl}${normalizedPath}`;

		const headers: HeadersInit = {
			Accept: "*/*",
			"Accept-Language": "en-US,en;q=0.9",
			"User-Agent":
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15",
			Referer: fullUrl,
			"Referrer-Policy": "strict-origin-when-cross-origin",
			"Cache-Control": "no-cache",
			Pragma: "no-cache",
			Priority: "u=1, i",
		};

		// Add conditional headers for config.js and similar resources
		if (includeETag && etag) {
			headers["If-None-Match"] = etag;
		}

		// Add CORS headers
		headers["Origin"] = this.stagingUrl;
		headers["Sec-Fetch-Dest"] = "empty";
		headers["Sec-Fetch-Mode"] = "cors";
		headers["Sec-Fetch-Site"] = "same-origin";

		return headers;
	}

	/**
	 * Get curl headers as array for Bun Shell
	 * Bun Shell automatically escapes values, so we can pass them directly
	 */
	private getCurlHeaders(
		includeETag = false,
		etag?: string,
		path = "/",
	): string[] {
		const headers = this.getBrowserHeaders(includeETag, etag, path);
		// Return as flat array: ["-H", "Header: Value", "-H", "Header2: Value2", ...]
		const headerArgs: string[] = [];
		for (const [key, value] of Object.entries(headers)) {
			headerArgs.push("-H");
			headerArgs.push(`${key}: ${value}`);
		}
		return headerArgs;
	}

	/**
	 * Normalize URL path - ensure proper formatting
	 */
	private normalizePath(path: string): string {
		// Remove leading/trailing slashes except root
		if (path === "" || path === "/") return "/";
		return path.startsWith("/") ? path : `/${path}`;
	}

	/**
	 * Build full URL from path
	 */
	private buildUrl(path: string): string {
		const normalizedPath = this.normalizePath(path);
		return `${this.stagingUrl}${normalizedPath}`;
	}

	/**
	 * Check miniapp status using Bun Shell curl with retry and circuit breaker
	 */
	async checkStatus(url?: string, useCache = true): Promise<MiniappStatus> {
		// If full URL provided, use it; otherwise use staging URL
		// The path will be added in the actual request
		const targetUrl = url || this.stagingUrl;

		// Check cache first (use base URL as cache key)
		const cacheKey = url || this.stagingUrl;
		if (useCache) {
			const cached = this.statusCache.get(cacheKey);
			if (cached) {
				return cached;
			}
		}

		// Use circuit breaker and retry logic
		const result = await retryWithBackoff(
			() =>
				this.circuitBreaker.execute(async () => {
					const startTime = Bun.nanoseconds();

					try {
						// Use native fetch with proper headers (more reliable than curl)
						const healthPath = "/health";
						const fullUrl = this.buildUrl(healthPath);
						const response = await fetch(fullUrl, {
							signal: AbortSignal.timeout(
								ENTERPRISE_CONFIG.timeout.healthCheck,
							),
							headers: this.getBrowserHeaders(false, undefined, healthPath),
							mode: "cors",
							credentials: "omit",
							cache: "no-cache",
							redirect: "follow",
						});

						const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000; // Convert to ms

						if (response.ok) {
							try {
								const health: MiniappHealth = await response.json();
								const status: MiniappStatus = {
									url: this.stagingUrl, // Always use base URL for display
									status: health.status === "ok" ? "online" : "degraded",
									responseTime,
									statusCode: response.status,
									timestamp: Date.now(),
								};

								// Cache successful result (use base URL as cache key)
								if (useCache) {
									this.statusCache.set(cacheKey, status);
								}

								return status;
							} catch {
								// If JSON parse fails, still consider it online if response is OK
								const status: MiniappStatus = {
									url: this.stagingUrl, // Always use base URL for display
									status: "online",
									responseTime,
									statusCode: response.status,
									timestamp: Date.now(),
								};

								if (useCache) {
									this.statusCache.set(cacheKey, status);
								}

								return status;
							}
						}

						throw new Error(`HTTP ${response.status}: ${response.statusText}`);
					} catch (_error: any) {
						const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;
						throw {
							url: this.stagingUrl, // Always use base URL for display
							status: "offline" as const,
							responseTime,
							statusCode: 0,
							timestamp: Date.now(),
							error: error.message || "Unknown error",
						};
					}
				}),
			{
				maxAttempts: ENTERPRISE_CONFIG.retry.maxAttempts,
				onRetry: (attempt, error) => {
					console.warn(
						`[Miniapp] Retry attempt ${attempt} for ${targetUrl}:`,
						error,
					);
				},
			},
		);

		if (result.success && result.result) {
			return result.result;
		}

		// Return error status
		return (
			(result.error as MiniappStatus) || {
				url: this.stagingUrl, // Always use base URL for display
				status: "offline",
				responseTime: result.duration,
				statusCode: 0,
				timestamp: Date.now(),
				error: "All retry attempts failed",
			}
		);
	}

	/**
	 * Get miniapp health using Bun Shell with Response as stdin and caching
	 */
	async getHealth(
		url?: string,
		useCache = true,
	): Promise<MiniappHealth | null> {
		// If full URL provided, use it; otherwise use staging URL
		// The path will be added in the actual request
		const targetUrl = url || this.stagingUrl;

		// Check cache first (use base URL as cache key)
		const cacheKey = url || this.stagingUrl;
		if (useCache) {
			const cached = this.healthCache.get(cacheKey);
			if (cached) {
				return cached;
			}
		}

		const result = await retryWithBackoff(
			async () => {
				try {
					// Fetch using native fetch with timeout and browser headers
					const healthPath = "/health";
					const fullUrl = this.buildUrl(healthPath);
					const response = await fetch(fullUrl, {
						signal: AbortSignal.timeout(ENTERPRISE_CONFIG.timeout.healthCheck),
						headers: this.getBrowserHeaders(false, undefined, healthPath),
						mode: "cors",
						credentials: "omit",
						cache: "no-cache",
						redirect: "follow",
					});

					if (!response.ok) {
						throw new Error(`HTTP ${response.status}`);
					}

					const health = await response.json();

					// Cache successful result (use base URL as cache key)
					if (useCache) {
						this.healthCache.set(cacheKey, health);
					}

					return health;
				} catch {
					// Fallback: try direct fetch without retry wrapper
					const healthPath = "/health";
					const fullUrl = this.buildUrl(healthPath);
					const response = await fetch(fullUrl, {
						signal: AbortSignal.timeout(ENTERPRISE_CONFIG.timeout.healthCheck),
						headers: this.getBrowserHeaders(false, undefined, healthPath),
						mode: "cors",
						credentials: "omit",
						cache: "no-cache",
					});

					if (response.ok) {
						const health = await response.json();

						if (useCache) {
							this.healthCache.set(cacheKey, health);
						}

						return health;
					}
					throw new Error(`Health check failed: HTTP ${response.status}`);
				}
			},
			{
				maxAttempts: 2, // Fewer retries for health checks
			},
		);

		return result.success ? result.result : null;
	}

	/**
	 * Check multiple endpoints using Bun Shell with command substitution
	 */
	async checkEndpoints(
		endpoints: string[],
	): Promise<Array<{ endpoint: string; status: MiniappStatus }>> {
		const results = await Promise.all(
			endpoints.map(async (endpoint) => {
				// Normalize endpoint path
				const normalizedEndpoint = this.normalizePath(endpoint);
				const status = await this.checkStatus(
					this.buildUrl(normalizedEndpoint),
				);
				return { endpoint: normalizedEndpoint, status };
			}),
		);

		return results;
	}

	/**
	 * Get miniapp version using Bun Shell
	 */
	async getVersion(url?: string): Promise<string | null> {
		// If full URL provided, use it; otherwise use staging URL
		const targetUrl = url || this.stagingUrl;

		try {
			const health = await this.getHealth(targetUrl);
			return health?.version || null;
		} catch {
			return null;
		}
	}

	/**
	 * Monitor miniapp continuously (using Bun Shell tail-like pattern)
	 */
	async *monitor(intervalMs = 5000): AsyncGenerator<MiniappStatus> {
		while (true) {
			const status = await this.checkStatus();
			yield status;
			await Bun.sleep(intervalMs);
		}
	}

	/**
	 * Check config.js endpoint (common miniapp config file)
	 */
	async checkConfig(etag?: string): Promise<{
		status: number;
		config: unknown;
		responseTime: number;
		etag?: string;
	} | null> {
		const startTime = Bun.nanoseconds();

		try {
			const configPath = "/config.js";
			const fullUrl = this.buildUrl(configPath);
			const response = await fetch(fullUrl, {
				signal: AbortSignal.timeout(ENTERPRISE_CONFIG.timeout.healthCheck),
				headers: this.getBrowserHeaders(true, etag, configPath),
				mode: "cors",
				credentials: "omit",
				cache: "no-cache",
				redirect: "follow",
			});

			const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;

			if (!response.ok) {
				return {
					status: response.status,
					config: null,
					responseTime,
				};
			}

			// Get ETag from response if available
			const responseETag = response.headers.get("ETag") || undefined;

			// Handle 304 Not Modified
			if (response.status === 304) {
				return {
					status: 304,
					config: null,
					responseTime,
					etag: responseETag || etag,
				};
			}

			const text = await response.text();
			// Try to parse as JSON if possible, otherwise return text
			let config: unknown;
			try {
				config = JSON.parse(text);
			} catch {
				// If it's JavaScript, try to extract config object
				const configMatch = text.match(
					/export\s+(?:const|default)\s+config\s*=\s*({[\s\S]*?});/,
				);
				if (configMatch) {
					try {
						config = JSON.parse(configMatch[1]);
					} catch {
						config = text;
					}
				} else {
					config = text;
				}
			}

			return {
				status: response.status,
				config,
				responseTime,
				etag: responseETag,
			};
		} catch (_error: any) {
			const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;
			return {
				status: 0,
				config: null,
				responseTime,
			};
		}
	}

	/**
	 * Get deployment info using Bun Shell (if available via API)
	 */
	async getDeploymentInfo(): Promise<{
		url: string;
		environment: string;
		deployedAt?: string;
		commit?: string;
	} | null> {
		try {
			// Try to get deployment info from common endpoints
			const endpoints = [
				"/api/deployment",
				"/deployment",
				"/version",
				"/config.js",
			];

			for (const endpoint of endpoints) {
				try {
					const normalizedPath = this.normalizePath(endpoint);
					const fullUrl = this.buildUrl(normalizedPath);
					const response = await fetch(fullUrl, {
						signal: AbortSignal.timeout(3000),
						headers: this.getBrowserHeaders(false, undefined, normalizedPath),
						mode: "cors",
						credentials: "omit",
						cache: "no-cache",
						redirect: "follow",
					});

					if (response.ok) {
						const data = await response.json();
						return {
							url: this.stagingUrl,
							environment: "staging",
							deployedAt: data.deployedAt || data.deployed_at,
							commit: data.commit || data.commitHash,
						};
					}
				} catch {}
			}

			// Fallback: extract info from URL
			return {
				url: this.stagingUrl,
				environment: "staging",
			};
		} catch {
			return null;
		}
	}

	/**
	 * Test miniapp API endpoint using Bun Shell with environment variables
	 */
	async testEndpoint(
		endpoint: string,
		method = "GET",
		body?: Record<string, unknown>,
	): Promise<{ status: number; data: unknown; responseTime: number } | null> {
		const startTime = Bun.nanoseconds();

		try {
			const normalizedPath = this.normalizePath(endpoint);
			const fullUrl = this.buildUrl(normalizedPath);
			const headers = this.getBrowserHeaders(false, undefined, normalizedPath);
			const options: RequestInit = {
				method,
				signal: AbortSignal.timeout(5000),
				headers: body
					? { ...headers, "Content-Type": "application/json" }
					: headers,
				mode: "cors",
				credentials: "omit",
				cache: "no-cache",
				redirect: "follow",
			};

			if (body) {
				options.body = JSON.stringify(body);
			}

			const response = await fetch(fullUrl, options);
			const data = await response.json().catch(() => null);
			const responseTime = (Bun.nanoseconds() - startTime) / 1_000_000;

			return {
				status: response.status,
				data,
				responseTime,
			};
		} catch (_error: any) {
			return null;
		}
	}
}

/**
 * Singleton instance
 */
export const nativeMiniapp = new NativeMiniappMonitor();
