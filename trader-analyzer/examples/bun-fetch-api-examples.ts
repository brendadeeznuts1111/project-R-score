#!/usr/bin/env bun
/**
 * @fileoverview Comprehensive Bun Fetch API Examples
 * @description Demonstrates Bun's fetch API extensions including proxying, custom headers, performance optimizations, and security best practices.
 * @module examples/bun-fetch-api-examples
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@6.4.0.0.0.0.0;instance-id=EXAMPLE-BUN-FETCH-001;version=6.4.0.0.0.0.0}]
 * [PROPERTIES:{example={value:"Bun Fetch API Comprehensive Examples";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-DEMO"];@version:"6.4.0.0.0.0.0"}}]
 * [CLASS:BunFetchExamples][#REF:v-6.4.0.0.0.0.0.BP.EXAMPLES.DEMO.1.0.A.1.1.EXAMPLE.1.1]]
 *
 * Version: 6.4.0.0.0.0.0
 * Ripgrep Pattern: 6\.4\.0\.0\.0\.0\.0|EXAMPLE-BUN-FETCH-001|BP-EXAMPLE@6\.4\.0\.0\.0\.0\.0
 *
 * Demonstrates:
 * - Proxying requests (simple and advanced)
 * - Custom headers (object and Headers instance)
 * - Performance optimizations (header reuse, connection pooling)
 * - Security best practices (API key rotation, secure proxy)
 * - Real-world examples (fetch wrapper, market data, dashboard server)
 * - Testing utilities
 *
 * @see https://bun.com/docs/runtime/networking/fetch Bun Fetch Documentation
 * @see {@link ../docs/BUN-FETCH-CUSTOM-HEADERS.md|Bun Fetch Custom Headers Documentation}
 * @see {@link ../docs/BUN-FETCH-TIMEOUTS.md|Bun Fetch Timeouts Documentation}
 * @see {@link ../docs/BUN-FETCH-STREAMING-RESPONSES.md|Bun Fetch Streaming Responses Documentation}
 * @see config/.tmux-patterns-README.md Bun Fetch API Extensions section
 *
 * @example 6.4.0.0.0.0.0.1: Basic Fetch with Custom Headers
 * // Test Formula:
 * // 1. Create fetch request with custom headers
 * // 2. Send request to test endpoint
 * // 3. Verify headers are received correctly
 * // Expected Result: Request includes custom headers
 */

import { crypto } from "bun";

// ==================== Common Headers ====================

/**
 * Standard HyperBun headers for consistent API requests
 */
export const HYPERBUN_HEADERS = Object.freeze({
	// Identification
	"User-Agent": `HyperBun/${Bun.version} (${process.platform})`,
	"X-HyperBun-Request-ID": crypto.randomUUID(),
	"X-HyperBun-Version": Bun.version,

	// Security
	"X-Timestamp": Date.now().toString(),

	// Performance
	"Accept-Encoding": "gzip, deflate, br",
	"Accept": "application/json",
});

// ==================== Example 1: Basic Custom Headers ====================

/**
 * Example 1.1: Fetch with Object Headers
 */
export async function exampleBasicObjectHeaders() {
	console.log("\n=== Example 1.1: Fetch with Object Headers ===\n");

	const response = await fetch("https://httpbin.org/headers", {
		headers: {
			"X-Custom-Header": "value",
			"Authorization": "Bearer token123",
			"Content-Type": "application/json",
		},
	});

	const data = await response.json();
	console.log("Received headers:", JSON.stringify(data.headers, null, 2));
	return data;
}

/**
 * Example 1.2: Fetch with Headers Object
 */
export async function exampleHeadersObject() {
	console.log("\n=== Example 1.2: Fetch with Headers Object ===\n");

	const headers = new Headers();
	headers.append("X-Custom-Header", "value");
	headers.append("Authorization", "Bearer token123");
	headers.set("Content-Type", "application/json");

	const response = await fetch("https://httpbin.org/headers", {
		headers,
	});

	const data = await response.json();
	console.log("Received headers:", JSON.stringify(data.headers, null, 2));
	return data;
}

// ==================== Example 2: Proxying Requests ====================

/**
 * Example 2.1: Simple Proxy
 */
export async function exampleSimpleProxy(proxyUrl?: string) {
	console.log("\n=== Example 2.1: Simple Proxy ===\n");

	if (!proxyUrl) {
		console.log("⚠️  No proxy URL provided. Skipping proxy example.");
		console.log("Usage: Set PROXY_URL environment variable or pass as argument");
		return null;
	}

	try {
		const response = await fetch("https://httpbin.org/ip", {
			proxy: proxyUrl,
		});

		const data = await response.json();
		console.log("Response through proxy:", data);
		return data;
	} catch (error) {
		console.error("Proxy request failed:", error);
		return null;
	}
}

/**
 * Example 2.2: Advanced Proxy with Authentication
 */
export async function exampleAdvancedProxy(
	proxyUrl?: string,
	proxyUser?: string,
	proxyPass?: string,
) {
	console.log("\n=== Example 2.2: Advanced Proxy with Authentication ===\n");

	if (!proxyUrl) {
		console.log("⚠️  No proxy URL provided. Skipping proxy example.");
		return null;
	}

	try {
		const response = await fetch("https://httpbin.org/ip", {
			proxy: {
				url: proxyUrl,
				headers: {
					"Proxy-Authorization": `Basic ${btoa(
						`${proxyUser || "user"}:${proxyPass || "pass"}`,
					)}`,
					"X-Custom-Proxy-Header": "HyperBun",
				},
			},
		});

		const data = await response.json();
		console.log("Response through authenticated proxy:", data);
		return data;
	} catch (error) {
		console.error("Authenticated proxy request failed:", error);
		return null;
	}
}

// ==================== Example 3: Fetch Wrapper with Error Handling ====================

/**
 * Example 3: Fetch Wrapper with Custom Headers and Error Handling
 */
export class FetchWrapper {
	private defaultHeaders: Record<string, string>;

	constructor(defaultHeaders: Record<string, string> = {}) {
		this.defaultHeaders = {
			...HYPERBUN_HEADERS,
			...defaultHeaders,
		};
	}

	async fetchWithErrorHandling(
		url: string,
		options: RequestInit = {},
	): Promise<Response> {
		const requestId = crypto.randomUUID();

		const mergedHeaders = {
			...this.defaultHeaders,
			"X-Request-ID": requestId,
			...(options.headers as Record<string, string>),
		};

		try {
			const response = await fetch(url, {
				...options,
				headers: mergedHeaders,
				proxy: process.env.PROXY_URL
					? {
							url: process.env.PROXY_URL,
							headers: process.env.PROXY_USER
								? {
										"Proxy-Authorization": `Basic ${btoa(
											`${process.env.PROXY_USER}:${process.env.PROXY_PASS || ""}`,
										)}`,
									}
								: undefined,
						}
					: undefined,
			});

			if (!response.ok) {
				throw new Error(
					`HTTP ${response.status}: ${response.statusText}`,
				);
			}

			return response;
		} catch (error) {
			console.error(`[${requestId}] Fetch failed:`, error);
			throw error;
		}
	}
}

/**
 * Example 3.1: Using Fetch Wrapper
 */
export async function exampleFetchWrapper() {
	console.log("\n=== Example 3.1: Fetch Wrapper ===\n");

	const wrapper = new FetchWrapper({
		"X-API-Key": process.env.API_KEY || "demo-key",
	});

	try {
		const response = await wrapper.fetchWithErrorHandling(
			"https://httpbin.org/headers",
		);
		const data = await response.json();
		console.log("Wrapper response:", JSON.stringify(data.headers, null, 2));
		return data;
	} catch (error) {
		console.error("Wrapper example failed:", error);
		return null;
	}
}

// ==================== Example 4: Performance Optimizations ====================

/**
 * Example 4.1: Pre-created Headers for Reuse
 */
export class OptimizedFetch {
	private static readonly COMMON_HEADERS = Object.freeze({
		Accept: "application/json",
		"Accept-Encoding": "gzip, deflate, br",
		"User-Agent": `HyperBun/${Bun.version}`,
	});

	private sharedHeaders: Headers;

	constructor() {
		this.sharedHeaders = new Headers(OptimizedFetch.COMMON_HEADERS);
	}

	async fetch(url: string, options: RequestInit = {}): Promise<Response> {
		// Only add dynamic headers when needed
		this.sharedHeaders.set("X-Request-ID", crypto.randomUUID());

		return fetch(url, {
			...options,
			headers: {
				...Object.fromEntries(this.sharedHeaders.entries()),
				...(options.headers as Record<string, string>),
			},
		});
	}
}

/**
 * Example 4.2: Proxy Connection Pooling
 */
export function createProxiedFetch(proxyUrl: string) {
	return (url: string, options: RequestInit = {}) => {
		return fetch(url, {
			...options,
			proxy: {
				url: proxyUrl,
				headers: {
					"X-Proxy-Via": "HyperBun",
				},
			},
		});
	};
}

/**
 * Example 4.1: Using Optimized Fetch
 */
export async function exampleOptimizedFetch() {
	console.log("\n=== Example 4.1: Optimized Fetch ===\n");

	const optimized = new OptimizedFetch();

	try {
		const response = await optimized.fetch("https://httpbin.org/headers");
		const data = await response.json();
		console.log("Optimized fetch response:", JSON.stringify(data.headers, null, 2));
		return data;
	} catch (error) {
		console.error("Optimized fetch failed:", error);
		return null;
	}
}

// ==================== Example 5: Security Best Practices ====================

/**
 * Example 5.1: Secure Header Manager with Key Rotation
 */
export class SecureHeaderManager {
	private apiKeys: Map<
		string,
		{ key: string; expires: number }
	> = new Map();

	private rotateKey(service: string): { key: string; expires: number } {
		// In production, fetch from secure storage or key management service
		const newKey = crypto.randomUUID();
		const expires = Date.now() + 3600000; // 1 hour

		return { key: newKey, expires };
	}

	getHeaders(service: string): Record<string, string> {
		const keyInfo = this.apiKeys.get(service);

		if (!keyInfo || keyInfo.expires < Date.now()) {
			const newKey = this.rotateKey(service);
			this.apiKeys.set(service, newKey);
		}

		const currentKey = this.apiKeys.get(service)!;

		return {
			Authorization: `Bearer ${currentKey.key}`,
			"X-Key-Expires": currentKey.expires.toString(),
		};
	}
}

/**
 * Example 5.2: Secure Proxy Configuration
 */
export function getSecureProxyConfig() {
	const proxyUrl = process.env.PROXY_URL;

	if (!proxyUrl) return undefined;

	return {
		url: proxyUrl,
		headers: {
			"Proxy-Authorization": `Bearer ${getProxyToken()}`,
			"X-Proxy-Request-ID": crypto.randomUUID(),
		},
	};
}

function getProxyToken(): string {
	// In production, get from secure storage or key management service
	const secret = process.env.PROXY_SECRET || "default-secret";
	return Bun.password.hashSync(`${secret}:${Date.now()}`).slice(0, 32);
}

/**
 * Example 5.1: Using Secure Header Manager
 */
export async function exampleSecureHeaders() {
	console.log("\n=== Example 5.1: Secure Header Manager ===\n");

	const manager = new SecureHeaderManager();

	try {
		const headers = manager.getHeaders("api-service");
		console.log("Secure headers:", headers);

		const response = await fetch("https://httpbin.org/headers", {
			headers,
		});

		const data = await response.json();
		console.log("Response with secure headers:", JSON.stringify(data.headers, null, 2));
		return data;
	} catch (error) {
		console.error("Secure headers example failed:", error);
		return null;
	}
}

// ==================== Example 6: Real-World Examples ====================

/**
 * Example 6.1: Market Data Fetching with Retry Logic
 */
export class MarketProbeService {
	async fetchMarketData(
		bookmaker: { baseUrl: string; apiKey: string; proxy?: string },
		endpoint: string,
	) {
		const maxRetries = 3;
		let lastError: Error | null = null;

		for (let attempt = 0; attempt < maxRetries; attempt++) {
			try {
				const response = await fetch(`${bookmaker.baseUrl}${endpoint}`, {
					headers: {
						Authorization: `Bearer ${bookmaker.apiKey}`,
						"X-Bookmaker-API-Version": "v2",
						"Accept-Encoding": "gzip, deflate, br",
					},
					proxy: bookmaker.proxy
						? {
								url: bookmaker.proxy,
								headers: {
									"Proxy-Authorization": `Bearer ${bookmaker.apiKey}`,
								},
							}
						: undefined,
				});

				if (response.ok) {
					return await response.json();
				}

				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				if (attempt < maxRetries - 1) {
					await new Promise((resolve) =>
						setTimeout(resolve, 1000 * 2 ** attempt),
					); // Exponential backoff
				}
			}
		}

		throw lastError || new Error("Max retries exceeded");
	}
}

/**
 * Example 6.2: Dashboard Server Proxy
 */
export async function exampleDashboardProxy(targetUrl: string) {
	console.log("\n=== Example 6.2: Dashboard Server Proxy ===\n");

	try {
		const response = await fetch(targetUrl, {
			headers: {
				"X-Forwarded-For": "192.168.1.1",
				"X-Forwarded-Host": "dashboard.hyperbun.local",
				"X-API-Key": process.env.DASHBOARD_API_KEY || "demo-key",
			},
			proxy: process.env.DASHBOARD_PROXY
				? {
						url: process.env.DASHBOARD_PROXY,
						headers: {
							"Proxy-Authenticate": process.env.PROXY_AUTH || "",
						},
					}
				: undefined,
		});

		console.log("Proxy response status:", response.status);
		const data = await response.text();
		console.log("Proxy response preview:", data.slice(0, 200));
		return response;
	} catch (error) {
		console.error("Dashboard proxy failed:", error);
		return null;
	}
}

// ==================== Main Execution ====================

async function main() {
	const args = process.argv.slice(2);
	const command = args[0] || "all";

	console.log("🚀 Bun Fetch API Examples");
	console.log("=" .repeat(50));

	switch (command) {
		case "headers":
			await exampleBasicObjectHeaders();
			await exampleHeadersObject();
			break;

		case "proxy":
			await exampleSimpleProxy(args[1] || process.env.PROXY_URL);
			await exampleAdvancedProxy(
				args[1] || process.env.PROXY_URL,
				args[2] || process.env.PROXY_USER,
				args[3] || process.env.PROXY_PASS,
			);
			break;

		case "wrapper":
			await exampleFetchWrapper();
			break;

		case "optimized":
			await exampleOptimizedFetch();
			break;

		case "secure":
			await exampleSecureHeaders();
			break;

		case "market":
			const marketService = new MarketProbeService();
			await marketService.fetchMarketData(
				{
					baseUrl: "https://httpbin.org",
					apiKey: "demo-key",
				},
				"/headers",
			);
			break;

		case "dashboard":
			await exampleDashboardProxy(
				args[1] || "https://httpbin.org/headers",
			);
			break;

		case "all":
		default:
			console.log("\n📋 Running all examples...\n");
			await exampleBasicObjectHeaders();
			await exampleHeadersObject();
			await exampleFetchWrapper();
			await exampleOptimizedFetch();
			await exampleSecureHeaders();
			break;
	}

	console.log("\n✅ Examples completed!");
}

// Run if executed directly
if (import.meta.main) {
	main().catch(console.error);
}
