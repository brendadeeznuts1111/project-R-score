#!/usr/bin/env bun
/**
 * @fileoverview HTTP 408 Request Timeout Example
 * @description Demonstrates HTTP 408 Request Timeout handling and usage
 * @module examples/http-408-request-timeout-example
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@1.3.4.3.0.0.0;instance-id=EXAMPLE-HTTP-408-001;version=1.3.4.3.0.0.0}]
 * [PROPERTIES:{example={value:"HTTP 408 Request Timeout";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-HTTP"];@version:"1.3.4.3.0.0.0"}}]
 * [CLASS:HTTP408Examples][#REF:v-1.3.4.3.0.0.0.BP.EXAMPLES.HTTP.1.0.A.1.1.EXAMPLE.1.1]]
 * 
 * Version: 1.3.4.3.0.0.0
 * Ripgrep Pattern: 1\.3\.4\.3\.0\.0\.0|EXAMPLE-HTTP-408-001|BP-EXAMPLE@1\.3\.4\.3\.0\.0\.0|http-408
 * 
 * Demonstrates:
 * - HTTP 408 Request Timeout error handling
 * - Request reading timeout detection
 * - Client retry strategies
 * - Error response formatting
 * - Comparison with 504 Gateway Timeout
 * 
 * @example 1.3.4.3.0.0.0.1: Server-Side Request Timeout
 * // Test Formula:
 * // 1. Start server with request timeout handler
 * // 2. Send incomplete request (slow upload)
 * // 3. Verify 408 response returned
 * // Expected Result: Server returns 408 Request Timeout
 * //
 * // Snippet:
 * ```typescript
 * app.post('/api/upload', async (c) => {
 *   const timeout = 30000; // 30 seconds
 *   const controller = new AbortController();
 *   setTimeout(() => controller.abort(), timeout);
 *   
 *   try {
 *     const body = await c.req.json({ signal: controller.signal });
 *     return c.json({ success: true });
 *   } catch (error) {
 *     if (error.name === 'AbortError') {
 *       return c.json({ error: 'NX-006', message: 'Request Timeout' }, 408);
 *     }
 *   }
 * });
 * ```
 * 
 * @example 1.3.4.3.0.0.0.2: Client Retry Strategy
 * // Test Formula:
 * // 1. Make request that times out
 * // 2. Receive 408 response
 * // 3. Retry with exponential backoff
 * // Expected Result: Request succeeds on retry
 * //
 * // Snippet:
 * ```typescript
 * async function fetchWithRetry(url: string, maxRetries = 3) {
 *   for (let attempt = 0; attempt < maxRetries; attempt++) {
 *     const response = await fetch(url);
 *     if (response.status === 408 && attempt < maxRetries - 1) {
 *       await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
 *       continue;
 *     }
 *     return response;
 *   }
 * }
 * ```
 * 
 * @see {@link ../docs/HTTP-408-REQUEST-TIMEOUT.md HTTP 408 Request Timeout Documentation}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/408 MDN HTTP 408 Documentation}
 * @see {@link ../src/errors/index.ts NEXUS Error Registry}
 * 
 * // Ripgrep: 1.3.4.3.0.0.0
 * // Ripgrep: EXAMPLE-HTTP-408-001
 * // Ripgrep: BP-EXAMPLE@1.3.4.3.0.0.0
 * 
 * Run: bun run examples/http-408-request-timeout-example.ts
 * 
 * @author NEXUS Team
 * @since Bun 1.3.4+
 */

import { Hono } from "hono";

const app = new Hono();

// ============ Example 1: Server-Side Request Timeout ============

console.log("=== Example 1: Server-Side Request Timeout ===\n");

/**
 * Handle request with timeout for reading request body
 */
app.post("/api/upload", async (c) => {
	const timeout = 30000; // 30 seconds
	
	try {
		// Set timeout for reading request body
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);
		
		const body = await c.req.json({ signal: controller.signal });
		clearTimeout(timeoutId);
		
		// Process body...
		return c.json({ success: true, received: body });
	} catch (error: any) {
		if (error.name === "AbortError") {
			// Request reading timed out - return 408
			return c.json(
				{
					error: "NX-006",
					message: "Request Timeout",
					details: "Server did not receive complete request within 30 seconds",
					timeoutMs: timeout,
					retryable: true,
				},
				408,
			);
		}
		throw error;
	}
});

// ============ Example 2: Client Retry Strategy ============

console.log("=== Example 2: Client Retry Strategy ===\n");

/**
 * Fetch with automatic retry on 408 Request Timeout
 */
async function fetchWithRetry(
	url: string,
	options: RequestInit = {},
	maxRetries = 3,
): Promise<Response> {
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			const response = await fetch(url, options);
			
			if (response.status === 408) {
				// Request Timeout - retry with exponential backoff
				if (attempt < maxRetries - 1) {
					const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
					console.log(
						`Request timeout (408), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
					);
					await new Promise((resolve) => setTimeout(resolve, delay));
					continue;
				}
			}
			
			return response;
		} catch (error) {
			if (attempt === maxRetries - 1) throw error;
			const delay = 1000 * (attempt + 1);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}
	throw new Error("Max retries exceeded");
}

// ============ Example 3: Request Timeout Detection ============

console.log("=== Example 3: Request Timeout Detection ===\n");

/**
 * Create request timeout handler
 */
function createRequestTimeoutHandler(timeoutMs: number) {
	return async (req: Request): Promise<Response | null> => {
		const startTime = Date.now();
		
		// Monitor request reading
		const reader = req.body?.getReader();
		if (!reader) return null;
		
		const chunks: Uint8Array[] = [];
		
		try {
			while (true) {
				const { done, value } = await Promise.race([
					reader.read(),
					new Promise<{ done: boolean; value?: Uint8Array }>((_, reject) =>
						setTimeout(
							() => reject(new Error("Request timeout")),
							timeoutMs,
						),
					),
				]);
				
				if (done) break;
				if (value) {
					chunks.push(value);
				}
				
				// Check if request is taking too long
				if (Date.now() - startTime > timeoutMs) {
					throw new Error("Request timeout");
				}
			}
			
			return null; // Request completed successfully
		} catch (error: any) {
			if (error.message === "Request timeout") {
				return new Response(
					JSON.stringify({
						error: "NX-006",
						message: "Request Timeout",
						status: 408,
						details: `Request did not complete within ${timeoutMs}ms`,
					}),
					{ status: 408 },
				);
			}
			throw error;
		}
	};
}

// ============ Example 4: Comparison with 504 Gateway Timeout ============

console.log("=== Example 4: 408 vs 504 Comparison ===\n");

/**
 * Example showing difference between 408 and 504
 */
app.get("/api/comparison", async (c) => {
	const scenario = c.req.query("scenario");
	
	if (scenario === "408") {
		// 408: Server didn't receive complete request from client
		return c.json(
			{
				status: 408,
				message: "Request Timeout",
				scenario: "Client did not send complete request",
				example: "Large file upload interrupted mid-transfer",
			},
			408,
		);
	}
	
	if (scenario === "504") {
		// 504: Server didn't receive response from upstream
		return c.json(
			{
				status: 504,
				message: "Gateway Timeout",
				scenario: "Upstream server did not respond",
				example: "External API call timed out",
			},
			504,
		);
	}
	
	return c.json({
		comparison: {
			"408 Request Timeout": {
				when: "Server didn't receive complete request from client",
				example: "Client upload interrupted",
			},
			"504 Gateway Timeout": {
				when: "Server didn't receive response from upstream server",
				example: "External API call timed out",
			},
		},
	});
});

// ============ Example 5: Error Response Format ============

console.log("=== Example 5: Error Response Format ===\n");

/**
 * Standardized 408 error response format
 */
function create408Response(details?: {
	timeoutMs?: number;
	retryAfter?: number;
	requestId?: string;
}): Response {
	return new Response(
		JSON.stringify({
			error: "NX-006",
			message: "Request Timeout",
			status: 408,
			details: details?.timeoutMs
				? `Request did not complete within ${details.timeoutMs}ms`
				: "Server did not receive complete request",
			retryable: true,
			retryAfter: details?.retryAfter || 5,
			requestId: details?.requestId,
		}),
		{
			status: 408,
			headers: {
				"Content-Type": "application/json",
				...(details?.retryAfter && {
					"Retry-After": details.retryAfter.toString(),
				}),
			},
		},
	);
}

console.log("Example 408 Response:");
console.log(JSON.stringify(JSON.parse(await create408Response({ timeoutMs: 30000, retryAfter: 5 }).text()), null, 2));

console.log("\n=== All Examples Complete ===\n");

// Export for use in other modules
export { app, fetchWithRetry, createRequestTimeoutHandler, create408Response };
