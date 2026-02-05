/**
 * Network Optimization Module
 * Implements preconnect, connection pooling, and performance optimizations
 * for external API calls in the fraud detection system
 */

import { fetch } from "bun";

// ============================================================================
// CONFIGURATION
// ============================================================================

interface NetworkConfig {
	preconnectHosts: string[];
	maxSimultaneousConnections: number;
	connectionTimeout: number;
	keepAlive: boolean;
	retryAttempts: number;
	retryDelay: number;
}

const DEFAULT_CONFIG: NetworkConfig = {
	preconnectHosts: [
		"https://api.stripe.com",
		"https://api.paypal.com",
		"https://api.square.com",
		"https://veriff.com",
		"https://api.jumio.com",
		"https://api.onfido.com",
		"https://deviceatlas.com",
		"https://api.fingerprintjs.com",
		"https://maxmind.com",
		"https://ipinfo.io",
		"https://api.crowdstrike.com",
		"https://api.mandiant.com",
	],
	// QUICK WIN: Increased for 4k+ sessions/sec throughput
	maxSimultaneousConnections: 512, // BUN_CONFIG_MAX_HTTP_REQUESTS default is 256
	connectionTimeout: 30000,
	keepAlive: true,
	retryAttempts: 3,
	retryDelay: 1000,
};

// ============================================================================
// NETWORK OPTIMIZER CLASS
// ============================================================================

export class NetworkOptimizer {
	private config: NetworkConfig;
	private connectionPool: Map<string, ConnectionInfo>;
	private activeRequests: Set<string>;
	private metrics: NetworkMetrics;

	constructor(config: Partial<NetworkConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.connectionPool = new Map();
		this.activeRequests = new Set();
		this.metrics = new NetworkMetrics();
	}

	/**
	 * Initialize network optimizations
	 * Preconnects to all configured hosts for optimal performance
	 */
	async initialize(): Promise<void> {
		console.log("🚀 Initializing network optimizer...");

		// QUICK WIN: Set Bun's max HTTP requests config for 4k+ sessions/sec
		// This prevents queuing when processing high throughput
		process.env.BUN_CONFIG_MAX_HTTP_REQUESTS =
			this.config.maxSimultaneousConnections.toString();
		console.log(
			`⚙️  BUN_CONFIG_MAX_HTTP_REQUESTS=${this.config.maxSimultaneousConnections}`,
		);

		// Preconnect to all configured hosts
		await this.preconnectToHosts();

		console.log(
			`✅ Network optimizer initialized with ${this.config.preconnectHosts.length} preconnected hosts`,
		);
	}

	/**
	 * Preconnect to all configured hosts
	 */
	private async preconnectToHosts(): Promise<void> {
		const preconnectPromises = this.config.preconnectHosts.map((host) =>
			this.preconnectToHost(host),
		);

		await Promise.allSettled(preconnectPromises);
	}

	/**
	 * Preconnect to a specific host
	 */
	private async preconnectToHost(host: string): Promise<void> {
		try {
			fetch.preconnect(host);
			this.metrics.recordPreconnect(host);
			console.log(`🔗 Preconnected to: ${host}`);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.warn(`⚠️ Failed to preconnect to ${host}:`, error);
			this.metrics.recordPreconnectFailure(host, new Error(errorMessage));
		}
	}

	/**
	 * Optimized fetch with connection pooling and retry logic
	 */
	async optimizedFetch(
		url: string,
		options: RequestInit = {},
	): Promise<Response> {
		const requestId = this.generateRequestId();
		const startTime = Date.now();

		try {
			// Check if we're at the connection limit
			if (this.activeRequests.size >= this.config.maxSimultaneousConnections) {
				await this.waitForConnectionSlot();
			}

			this.activeRequests.add(requestId);

			// Extract host for connection tracking
			const host = new URL(url).origin;

			// Ensure connection exists
			await this.ensureConnection(host);

			// Make the request with retry logic
			const response = await this.fetchWithRetry(url, options);

			// Record metrics
			const duration = Date.now() - startTime;
			this.metrics.recordRequest(host, duration, response.status);

			return response;
		} catch (error) {
			const duration = Date.now() - startTime;
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			this.metrics.recordRequestFailure(url, duration, new Error(errorMessage));
			throw error;
		} finally {
			this.activeRequests.delete(requestId);
		}
	}

	/**
	 * Fetch with retry logic
	 */
	private async fetchWithRetry(
		url: string,
		options: RequestInit,
		attempt = 1,
	): Promise<Response> {
		try {
			const response = await fetch(url, {
				...options,
				signal: AbortSignal.timeout(this.config.connectionTimeout),
			});

			if (!response.ok && attempt < this.config.retryAttempts) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			return response;
		} catch (error) {
			if (attempt < this.config.retryAttempts) {
				console.warn(`🔄 Retry attempt ${attempt + 1} for ${url}:`, error);
				await this.delay(this.config.retryDelay * attempt);
				return this.fetchWithRetry(url, options, attempt + 1);
			}
			throw error;
		}
	}

	/**
	 * Ensure connection to host exists
	 */
	private async ensureConnection(host: string): Promise<void> {
		if (!this.connectionPool.has(host)) {
			fetch.preconnect(host);
			this.connectionPool.set(host, {
				host,
				connectedAt: Date.now(),
				lastUsed: Date.now(),
				requestCount: 0,
			});
		}

		// Update connection usage
		const connection = this.connectionPool.get(host)!;
		connection.lastUsed = Date.now();
		connection.requestCount++;
	}

	/**
	 * Wait for available connection slot
	 */
	private async waitForConnectionSlot(): Promise<void> {
		while (this.activeRequests.size >= this.config.maxSimultaneousConnections) {
			await this.delay(10);
		}
	}

	/**
	 * Batch fetch multiple URLs concurrently
	 */
	async batchFetch(
		urls: string[],
		options: RequestInit = {},
	): Promise<Response[]> {
		const batchSize = Math.min(
			urls.length,
			this.config.maxSimultaneousConnections,
		);
		const results: Response[] = [];

		for (let i = 0; i < urls.length; i += batchSize) {
			const batch = urls.slice(i, i + batchSize);
			const batchPromises = batch.map((url) =>
				this.optimizedFetch(url, options),
			);
			const batchResults = await Promise.allSettled(batchPromises);

			// Extract successful responses
			batchResults.forEach((result) => {
				if (result.status === "fulfilled") {
					results.push(result.value);
				} else {
					console.error("Batch fetch failed:", result.reason);
				}
			});
		}

		return results;
	}

	/**
	 * Get network performance metrics
	 */
	getMetrics(): NetworkMetricsReport {
		return this.metrics.generateReport();
	}

	/**
	 * Cleanup old connections
	 */
	cleanup(): void {
		const now = Date.now();
		const maxAge = 5 * 60 * 1000; // 5 minutes

		for (const [host, connection] of this.connectionPool.entries()) {
			if (now - connection.lastUsed > maxAge) {
				this.connectionPool.delete(host);
				console.log(`🧹 Cleaned up connection to: ${host}`);
			}
		}
	}

	// ============================================================================
	// UTILITY METHODS
	// ============================================================================

	private generateRequestId(): string {
		return Math.random().toString(36).substr(2, 9);
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface ConnectionInfo {
	host: string;
	connectedAt: number;
	lastUsed: number;
	requestCount: number;
}

class NetworkMetrics {
	private preconnectedHosts: string[] = [];
	private preconnectFailures: Map<string, Error> = new Map();
	private requests: RequestMetric[] = [];
	private failures: FailureMetric[] = [];

	recordPreconnect(host: string): void {
		this.preconnectedHosts.push(host);
	}

	recordPreconnectFailure(host: string, error: Error): void {
		this.preconnectFailures.set(host, error);
	}

	recordRequest(host: string, duration: number, status: number): void {
		this.requests.push({
			host,
			duration,
			status,
			timestamp: Date.now(),
		});
	}

	recordRequestFailure(url: string, duration: number, error: Error): void {
		this.failures.push({
			url,
			duration,
			error: error.message,
			timestamp: Date.now(),
		});
	}

	generateReport(): NetworkMetricsReport {
		const recentRequests = this.requests.filter(
			(r) => Date.now() - r.timestamp < 60000,
		); // Last minute

		return {
			preconnectedHosts: this.preconnectedHosts.length,
			preconnectFailures: this.preconnectFailures.size,
			totalRequests: this.requests.length,
			totalFailures: this.failures.length,
			averageResponseTime: this.calculateAverageResponseTime(recentRequests),
			requestsPerMinute: recentRequests.length,
			successRate: this.calculateSuccessRate(),
			topHosts: this.getTopHosts(),
			recentErrors: this.getRecentErrors(),
		};
	}

	private calculateAverageResponseTime(requests: RequestMetric[]): number {
		if (requests.length === 0) return 0;
		const total = requests.reduce((sum, r) => sum + r.duration, 0);
		return Math.round(total / requests.length);
	}

	private calculateSuccessRate(): number {
		const total = this.requests.length + this.failures.length;
		if (total === 0) return 100;
		return Math.round((this.requests.length / total) * 100);
	}

	private getTopHosts(): HostMetric[] {
		const hostCounts = new Map<string, number>();

		this.requests.forEach((request) => {
			const count = hostCounts.get(request.host) || 0;
			hostCounts.set(request.host, count + 1);
		});

		return Array.from(hostCounts.entries())
			.map(([host, count]) => ({ host, requestCount: count }))
			.sort((a, b) => b.requestCount - a.requestCount)
			.slice(0, 10);
	}

	private getRecentErrors(): FailureMetric[] {
		const oneHourAgo = Date.now() - 60 * 60 * 1000;
		return this.failures.filter((f) => f.timestamp > oneHourAgo).slice(0, 10);
	}
}

interface RequestMetric {
	host: string;
	duration: number;
	status: number;
	timestamp: number;
}

interface FailureMetric {
	url: string;
	duration: number;
	error: string;
	timestamp: number;
}

interface HostMetric {
	host: string;
	requestCount: number;
}

interface NetworkMetricsReport {
	preconnectedHosts: number;
	preconnectFailures: number;
	totalRequests: number;
	totalFailures: number;
	averageResponseTime: number;
	requestsPerMinute: number;
	successRate: number;
	topHosts: HostMetric[];
	recentErrors: FailureMetric[];
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const networkOptimizer = new NetworkOptimizer();

// ============================================================================
// INITIALIZATION
// ============================================================================

// Auto-initialize when module is imported
if (typeof process !== "undefined" && process.env.NODE_ENV !== "test") {
	networkOptimizer.initialize().catch(console.error);
}

// Cleanup on process exit
if (typeof process !== "undefined") {
	process.on("SIGINT", () => {
		console.log("🧹 Cleaning up network connections...");
		networkOptimizer.cleanup();
		process.exit(0);
	});
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Optimized fetch for external API calls
 */
export async function optimizedFetch(
	url: string,
	options?: RequestInit,
): Promise<Response> {
	return networkOptimizer.optimizedFetch(url, options);
}

/**
 * Batch fetch multiple URLs
 */
export async function batchFetch(
	urls: string[],
	options?: RequestInit,
): Promise<Response[]> {
	return networkOptimizer.batchFetch(urls, options);
}

/**
 * Preconnect to additional hosts
 */
export function preconnectToHosts(hosts: string[]): void {
	hosts.forEach((host) => {
		try {
			fetch.preconnect(host);
			console.log(`🔗 Preconnected to: ${host}`);
		} catch (error) {
			console.warn(`⚠️ Failed to preconnect to ${host}:`, error);
		}
	});
}

/**
 * Get network performance metrics
 */
export function getNetworkMetrics(): NetworkMetricsReport {
	return networkOptimizer.getMetrics();
}
