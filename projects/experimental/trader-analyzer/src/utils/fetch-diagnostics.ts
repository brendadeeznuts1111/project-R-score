/**
 * @fileoverview Fetch Diagnostics Utility
 * @description Helper functions to diagnose fetch failures and network issues
 * @module utils/fetch-diagnostics
 */

/**
 * Diagnose fetch error and provide actionable information
 */
export function diagnoseFetchError(
	error: unknown,
	url: string,
	method: string = "GET",
): {
	type: "network" | "timeout" | "dns" | "http" | "unknown";
	message: string;
	suggestions: string[];
	details: Record<string, unknown>;
} {
	const errorMessage = error instanceof Error ? error.message : String(error);
	const errorName = error instanceof Error ? error.name : "UnknownError";
	
	let type: "network" | "timeout" | "dns" | "http" | "unknown" = "unknown";
	const suggestions: string[] = [];
	const details: Record<string, unknown> = {
		url,
		method,
		errorMessage,
		errorName,
	};

	// Network connection errors
	if (
		errorMessage.includes("fetch failed") ||
		errorMessage.includes("ECONNREFUSED") ||
		errorMessage.includes("connection refused")
	) {
		type = "network";
		suggestions.push("Check if the service is running and accessible");
		suggestions.push("Verify the URL is correct");
		suggestions.push("Check firewall and network connectivity");
		suggestions.push("Try accessing the URL in a browser");
		details.issue = "Connection refused - service may be down or unreachable";
	}

	// DNS resolution errors
	else if (
		errorMessage.includes("ENOTFOUND") ||
		errorMessage.includes("DNS") ||
		errorMessage.includes("getaddrinfo")
	) {
		type = "dns";
		suggestions.push("Check if the hostname is correct");
		suggestions.push("Verify DNS resolution: `nslookup <hostname>`");
		suggestions.push("Check network connectivity");
		suggestions.push("Try using IP address instead of hostname");
		details.issue = "DNS resolution failed - hostname cannot be resolved";
	}

	// Timeout errors
	else if (
		errorMessage.includes("timeout") ||
		errorMessage.includes("aborted") ||
		errorMessage.includes("ETIMEDOUT") ||
		errorName === "AbortError"
	) {
		type = "timeout";
		suggestions.push("Increase timeout duration");
		suggestions.push("Check network latency");
		suggestions.push("Verify the service is responding");
		suggestions.push("Check for rate limiting");
		details.issue = "Request timeout - service may be slow or unresponsive";
	}

	// Connection reset errors
	else if (
		errorMessage.includes("ECONNRESET") ||
		errorMessage.includes("connection reset")
	) {
		type = "network";
		suggestions.push("Service may have closed the connection");
		suggestions.push("Check server logs for errors");
		suggestions.push("Retry the request");
		suggestions.push("Verify SSL/TLS configuration");
		details.issue = "Connection reset by server";
	}

	// HTTP errors (from response)
	else if (errorMessage.includes("HTTP") || errorMessage.match(/^\d{3}/)) {
		type = "http";
		const statusMatch = errorMessage.match(/(\d{3})/);
		if (statusMatch) {
			const status = parseInt(statusMatch[1], 10);
			details.statusCode = status;
			
			if (status >= 500) {
				suggestions.push("Server error - retry later");
				suggestions.push("Check server status");
			} else if (status === 404) {
				suggestions.push("Verify the endpoint path is correct");
				suggestions.push("Check API documentation");
			} else if (status === 401 || status === 403) {
				suggestions.push("Check authentication credentials");
				suggestions.push("Verify API key or token");
			} else if (status === 429) {
				suggestions.push("Rate limit exceeded - wait before retrying");
				suggestions.push("Implement exponential backoff");
			}
		}
		details.issue = "HTTP error response";
	}

	// Unknown errors
	else {
		type = "unknown";
		suggestions.push("Check error message for details");
		suggestions.push("Review network configuration");
		suggestions.push("Check proxy settings if applicable");
		suggestions.push("Verify SSL certificates");
		details.issue = "Unknown error type";
	}

	// Add URL parsing info
	try {
		const urlObj = new URL(url);
		details.urlParsed = {
			protocol: urlObj.protocol,
			hostname: urlObj.hostname,
			port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
			pathname: urlObj.pathname,
		};
	} catch {
		details.urlParsed = { error: "Invalid URL format" };
	}

	return {
		type,
		message: `Fetch ${type} error: ${errorMessage}`,
		suggestions,
		details,
	};
}

/**
 * Test network connectivity to a URL
 */
export async function testConnectivity(
	url: string,
	options?: { timeout?: number; method?: string },
): Promise<{
	success: boolean;
	latency?: number;
	error?: string;
	diagnosis?: ReturnType<typeof diagnoseFetchError>;
}> {
	const startTime = Date.now();
	const timeout = options?.timeout || 5000;
	const method = options?.method || "HEAD";

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		const response = await fetch(url, {
			method,
			signal: controller.signal,
		});

		clearTimeout(timeoutId);
		const latency = Date.now() - startTime;

		return {
			success: true,
			latency,
		};
	} catch (error) {
		const latency = Date.now() - startTime;
		const diagnosis = diagnoseFetchError(error, url, method);

		return {
			success: false,
			latency,
			error: error instanceof Error ? error.message : String(error),
			diagnosis,
		};
	}
}
