/**
 * Fetch Configuration & Error Handling Module
 *
 * Provides centralized fetch configuration with:
 * - Custom hostname/port resolution
 * - Keep-alive connection pooling
 * - Custom headers management
 * - Comprehensive error handling
 * - Retry logic with exponential backoff
 * - Timeout handling
 *
 * @module fetch-config
 * @r-score-target ≥ 0.95
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Fetch error types for classification
 */
export type FetchErrorType =
	| 'NETWORK_ERROR'
	| 'TIMEOUT'
	| 'DNS_ERROR'
	| 'CONNECTION_REFUSED'
	| 'CONNECTION_RESET'
	| 'HOST_UNREACHABLE'
	| 'PORT_UNREACHABLE'
	| 'TLS_ERROR'
	| 'CERT_ERROR'
	| 'HTTP_ERROR'
	| 'ABORT_ERROR'
	| 'UNKNOWN_ERROR';

/**
 * Structured fetch error with fix suggestions and documentation
 */
export interface FetchError extends Error {
	type: FetchErrorType;
	code?: string;
	status?: number;
	hostname?: string;
	port?: number;
	url: string;
	retryable: boolean;
	/** Human-readable fix suggestion */
	fix?: string;
	/** Link to relevant documentation */
	docs?: string;
	/** Environment variables that may help */
	envVars?: string[];
}

/**
 * Fetch configuration options
 */
export interface FetchConfig {
	/** Base URL for requests */
	baseUrl?: string;
	/** Custom hostname override (for DNS resolution) */
	hostname?: string;
	/** Custom port */
	port?: number;
	/** Request timeout in milliseconds */
	timeout?: number;
	/** Number of retry attempts */
	retries?: number;
	/** Initial retry delay in milliseconds */
	retryDelay?: number;
	/** Whether to use keep-alive connections */
	keepAlive?: boolean;
	/** Keep-alive idle timeout in seconds */
	keepAliveTimeout?: number;
	/** Maximum connections per host */
	maxConnections?: number;
	/** Default headers */
	headers?: Record<string, string>;
	/** Custom DNS resolver */
	dnsResolver?: (hostname: string) => Promise<string>;
	/** Proxy configuration */
	proxy?: {
		url: string;
		username?: string;
		password?: string;
	};
	/** TLS/SSL options */
	tls?: {
		rejectUnauthorized?: boolean;
		ca?: string;
		cert?: string;
		key?: string;
	};
}

/**
 * Request metrics
 */
export interface FetchMetrics {
	startTime: number;
	endTime?: number;
	durationMs?: number;
	dnsLookupMs?: number;
	connectMs?: number;
	ttfbMs?: number;
	downloadMs?: number;
	bytesRead: number;
	bytesWritten: number;
}

/**
 * Fetch result with metadata
 */
export interface FetchResult<T> {
	success: boolean;
	data?: T;
	response?: Response;
	error?: FetchError;
	metrics: FetchMetrics;
	retries: number;
}

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Classify fetch error by type
 */
export function classifyFetchError(error: unknown, url: string): FetchError {
	// If it's already a FetchError with a type, preserve it
	if (error && typeof error === 'object' && 'type' in error && (error as FetchError).type) {
		return error as FetchError;
	}

	const baseError: FetchError = {
		name: 'FetchError',
		message: error instanceof Error ? error.message : String(error),
		type: 'UNKNOWN_ERROR',
		url,
		retryable: false,
	};

	if (!(error instanceof Error)) {
		return baseError;
	}

	const message = error.message.toLowerCase();
	const code = (error as {code?: string}).code;

	// Network/DNS errors
	if (code === 'ENOTFOUND' || message.includes('dns') || message.includes('getaddrinfo')) {
		return {
			...baseError,
			type: 'DNS_ERROR',
			retryable: true,
			fix: 'Check hostname spelling, verify DNS configuration, or use a custom DNS resolver',
			docs: 'https://bun.sh/docs/api/fetch#custom-hostname-resolution',
			envVars: ['BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS'],
		};
	}

	if (code === 'ECONNREFUSED' || message.includes('connection refused')) {
		const urlObj = new URL(url);
		return {
			...baseError,
			type: 'CONNECTION_REFUSED',
			hostname: urlObj.hostname,
			port: parseInt(urlObj.port, 10) || (urlObj.protocol === 'https:' ? 443 : 80),
			retryable: true,
			fix: `Verify the service is running on port ${urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80)} and accepting connections`,
			docs: 'https://bun.sh/docs/api/fetch#connection-pooling',
			envVars: ['BUN_CONFIG_NETWORK_CONCURRENCY'],
		};
	}

	if (code === 'ECONNRESET' || message.includes('connection reset')) {
		return {
			...baseError,
			type: 'CONNECTION_RESET',
			retryable: true,
			fix: 'Server closed connection unexpectedly; check server logs or increase keep-alive timeout',
			docs: 'https://bun.sh/docs/api/fetch#keep-alive-configuration',
			envVars: ['BUN_CONFIG_KEEP_ALIVE_TIMEOUT'],
		};
	}

	if (code === 'EHOSTUNREACH' || message.includes('host unreachable')) {
		return {
			...baseError,
			type: 'HOST_UNREACHABLE',
			retryable: false,
			fix: 'Network routing issue; verify firewall rules and network connectivity',
			docs: 'https://bun.sh/docs/api/fetch#proxy-configuration',
		};
	}

	// Port unreachable (connection refused to specific port)
	if (typeof code === 'string' && code === 'ECONNREFUSED' && message.includes('port')) {
		return {
			...baseError,
			type: 'PORT_UNREACHABLE',
			retryable: false,
			fix: 'Port may be blocked by firewall or service not listening; try alternate port',
			docs: 'https://bun.sh/docs/api/fetch#custom-port-configuration',
		};
	}

	// TLS/SSL errors
	if ((typeof code === 'string' && code.startsWith('TLS_')) || message.includes('tls') || message.includes('ssl')) {
		return {
			...baseError,
			type: 'TLS_ERROR',
			retryable: false,
			fix: 'TLS handshake failed; check protocol compatibility or disable for testing',
			docs: 'https://bun.sh/docs/api/fetch#tls-options',
			envVars: ['NODE_TLS_REJECT_UNAUTHORIZED'],
		};
	}

	if (message.includes('certificate') || message.includes('cert')) {
		return {
			...baseError,
			type: 'CERT_ERROR',
			retryable: false,
			fix: 'Certificate validation failed; check system CA store or provide custom CA',
			docs: 'https://bun.sh/docs/api/fetch#custom-certificates',
			envVars: ['SSL_CERT_FILE', 'SSL_CERT_DIR'],
		};
	}

	// Timeout
	if (error.name === 'AbortError' || message.includes('abort') || message.includes('timeout')) {
		return {
			...baseError,
			type: 'TIMEOUT',
			retryable: true,
			fix: 'Request timed out; increase timeout or optimize server response time',
			docs: 'https://bun.sh/docs/api/fetch#timeout-configuration',
			envVars: ['BUN_CONFIG_FETCH_TIMEOUT'],
		};
	}

	// Network generic
	if ((typeof code === 'string' && code.startsWith('ENET')) || message.includes('network')) {
		return {
			...baseError,
			type: 'NETWORK_ERROR',
			retryable: true,
			fix: 'General network error; check connectivity and retry',
			docs: 'https://bun.sh/docs/api/fetch#error-handling',
			envVars: ['BUN_CONFIG_VERBOSE_FETCH'],
		};
	}

	return baseError;
}

// ============================================================================
// Fetch Client
// ============================================================================

/**
 * Create a configured fetch client
 */
export class FetchClient {
	private config: Required<FetchConfig>;
	private connectionPool = new Map<string, number>();

	constructor(config: FetchConfig = {}) {
		this.config = {
			baseUrl: config.baseUrl ?? '',
			hostname: config.hostname,
			port: config.port,
			timeout: config.timeout ?? 30000,
			retries: config.retries ?? 3,
			retryDelay: config.retryDelay ?? 1000,
			keepAlive: config.keepAlive ?? true,
			keepAliveTimeout: config.keepAliveTimeout ?? 30,
			maxConnections: config.maxConnections ?? 10,
			headers: config.headers ?? {},
			dnsResolver: config.dnsResolver,
			proxy: config.proxy,
			tls: config.tls,
		};
	}

	/**
	 * Build final URL with hostname/port overrides
	 */
	private buildUrl(path: string): string {
		const base = this.config.baseUrl || '';

		// If path is already a full URL, use it directly
		let url: URL;
		try {
			url = new URL(path);
		} catch {
			// Path is relative, join with base URL
			url = new URL(path, base || 'http://localhost');
		}

		if (this.config.hostname) {
			url.hostname = this.config.hostname;
		}

		if (this.config.port) {
			url.port = String(this.config.port);
		}

		return url.toString();
	}

	/**
	 * Build request headers
	 */
	private buildHeaders(customHeaders?: Record<string, string>): Headers {
		const headers = new Headers(this.config.headers);

		// Add keep-alive header
		if (this.config.keepAlive) {
			headers.set('Connection', 'keep-alive');
			headers.set('Keep-Alive', `timeout=${this.config.keepAliveTimeout}`);
		}

		// Add custom headers
		if (customHeaders) {
			for (const [key, value] of Object.entries(customHeaders)) {
				headers.set(key, value);
			}
		}

		return headers;
	}

	/**
	 * Execute fetch with retry logic
	 */
	async fetch<T = unknown>(
		path: string,
		options: RequestInit & {expectJson?: boolean} = {},
	): Promise<FetchResult<T>> {
		const url = this.buildUrl(path);
		const metrics: FetchMetrics = {
			startTime: performance.now(),
			bytesRead: 0,
			bytesWritten: 0,
		};

		let lastError: FetchError | undefined;
		let retries = 0;

		for (let attempt = 0; attempt <= this.config.retries; attempt++) {
			try {
				const result = await this.executeFetch<T>(url, options, metrics);
				return {...result, retries};
			} catch (error) {
				const fetchError = classifyFetchError(error, url);
				lastError = fetchError;

				if (!fetchError.retryable || attempt === this.config.retries) {
					break;
				}

				retries++;
				const delay = this.config.retryDelay * Math.pow(2, attempt);
				await Bun.sleep(delay);
			}
		}

		metrics.endTime = performance.now();
		metrics.durationMs = metrics.endTime - metrics.startTime;

		return {
			success: false,
			error: lastError,
			metrics,
			retries,
		};
	}

	/**
	 * Execute single fetch request
	 */
	private async executeFetch<T>(
		url: string,
		options: RequestInit & {expectJson?: boolean},
		metrics: FetchMetrics,
	): Promise<Omit<FetchResult<T>, 'retries'>> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

		const headers = this.buildHeaders(options.headers as Record<string, string>);

		try {
			const connectStart = performance.now();
			const response = await fetch(url, {
				...options,
				headers,
				signal: controller.signal,
			});
			metrics.connectMs = performance.now() - connectStart;

			clearTimeout(timeoutId);

			// Handle HTTP errors with fix suggestions
			if (!response.ok) {
				const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as FetchError;
				error.name = 'FetchError';
				error.type = 'HTTP_ERROR';
				error.url = url;
				error.status = response.status;
				error.retryable = response.status >= 500 || response.status === 429;

				// Add specific fix suggestions based on status code
				switch (response.status) {
					case 400:
						error.fix = 'Bad Request: Check request format, headers, and payload';
						error.docs = 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400';
						break;
					case 401:
						error.fix = 'Unauthorized: Check authentication credentials or token expiration';
						error.docs = 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401';
						error.envVars = ['AUTH_TOKEN', 'API_KEY'];
						break;
					case 403:
						error.fix = 'Forbidden: Insufficient permissions for this resource';
						error.docs = 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/403';
						break;
					case 404:
						error.fix = 'Not Found: Verify the endpoint URL exists and is spelled correctly';
						error.docs = 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404';
						break;
					case 408:
						error.fix = 'Request Timeout: Server took too long; increase client timeout';
						error.docs = 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/408';
						error.envVars = ['BUN_CONFIG_FETCH_TIMEOUT'];
						break;
					case 429:
						error.fix = 'Too Many Requests: Rate limit hit; implement backoff or reduce request frequency';
						error.docs = 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429';
						break;
					case 500:
						error.fix = 'Internal Server Error: Server-side issue; check server logs';
						error.docs = 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/500';
						break;
					case 502:
						error.fix = 'Bad Gateway: Proxy/gateway error; check upstream service';
						error.docs = 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/502';
						break;
					case 503:
						error.fix = 'Service Unavailable: Server overloaded or down; retry after delay';
						error.docs = 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/503';
						break;
					case 504:
						error.fix = 'Gateway Timeout: Proxy timeout; check network or increase timeout';
						error.docs = 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/504';
						break;
					default:
						if (response.status >= 500) {
							error.fix = 'Server error; check service health and retry';
						} else if (response.status >= 400) {
							error.fix = 'Client error; check request parameters';
						}
						break;
				}
				throw error;
			}

			metrics.ttfbMs = performance.now() - metrics.startTime;

			// Parse response
			const contentLength = response.headers.get('content-length');
			if (contentLength) {
				metrics.bytesRead = parseInt(contentLength, 10);
			}

			let data: T | undefined;
			if (options.expectJson !== false) {
				data = (await response.json()) as T;
			}

			metrics.endTime = performance.now();
			metrics.durationMs = metrics.endTime - metrics.startTime;
			metrics.downloadMs = metrics.durationMs - (metrics.ttfbMs || 0);

			return {
				success: true,
				data,
				response,
				metrics,
			};
		} catch (error) {
			clearTimeout(timeoutId);
			throw error;
		}
	}

	/**
	 * Quick JSON fetch
	 */
	async get<T = unknown>(path: string, headers?: Record<string, string>): Promise<FetchResult<T>> {
		return this.fetch<T>(path, {method: 'GET', headers});
	}

	/**
	 * POST with JSON body
	 */
	async post<T = unknown>(path: string, body: unknown, headers?: Record<string, string>): Promise<FetchResult<T>> {
		return this.fetch<T>(path, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...headers,
			},
			body: JSON.stringify(body),
		});
	}

	/**
	 * Update client configuration
	 */
	updateConfig(config: Partial<FetchConfig>): void {
		this.config = {...this.config, ...config};
	}

	/**
	 * Get current configuration
	 */
	getConfig(): FetchConfig {
		return {...this.config};
	}
}

// ============================================================================
// Pre-configured Clients
// ============================================================================

/**
 * Default fetch client with sensible defaults
 */
export const defaultClient = new FetchClient({
	timeout: 30000,
	retries: 3,
	keepAlive: true,
});

/**
 * High-performance client for internal services
 */
export const highPerformanceClient = new FetchClient({
	timeout: 10000,
	retries: 2,
	keepAlive: true,
	keepAliveTimeout: 60,
	maxConnections: 50,
});

/**
 * Reliable client for external APIs
 */
export const reliableClient = new FetchClient({
	timeout: 60000,
	retries: 5,
	retryDelay: 2000,
	keepAlive: false,
});

// ============================================================================
// Port & Hostname Utilities
// ============================================================================

/**
 * Check if port is reachable
 */
export async function isPortReachable(hostname: string, port: number, timeout = 5000): Promise<boolean> {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		const response = await fetch(`http://${hostname}:${port}`, {
			method: 'HEAD',
			signal: controller.signal,
		});

		clearTimeout(timeoutId);
		return response.ok || response.status < 500;
	} catch {
		return false;
	}
}

/**
 * Get default port for protocol
 */
export function getDefaultPort(protocol: string): number {
	switch (protocol) {
		case 'https:':
			return 443;
		case 'http:':
			return 80;
		case 'ftp:':
			return 21;
		case 'ssh:':
			return 22;
		default:
			return 80;
	}
}

/**
 * Parse URL with port override
 */
export function parseUrlWithPort(url: string, port?: number): URL {
	const parsed = new URL(url);
	if (port !== undefined) {
		parsed.port = String(port);
	}
	return parsed;
}

// ============================================================================
// Keep-Alive Management
// ============================================================================

/**
 * Keep-alive connection pool manager
 */
export class KeepAliveManager {
	private activeConnections = new Map<string, number>();
	private maxConnections: number;

	constructor(maxConnections = 10) {
		this.maxConnections = maxConnections;
	}

	/**
	 * Check if can create new connection
	 */
	canConnect(hostKey: string): boolean {
		const current = this.activeConnections.get(hostKey) || 0;
		return current < this.maxConnections;
	}

	/**
	 * Register new connection
	 */
	acquire(hostKey: string): boolean {
		const current = this.activeConnections.get(hostKey) || 0;
		if (current >= this.maxConnections) {
			return false;
		}
		this.activeConnections.set(hostKey, current + 1);
		return true;
	}

	/**
	 * Release connection
	 */
	release(hostKey: string): void {
		const current = this.activeConnections.get(hostKey) || 0;
		if (current > 0) {
			this.activeConnections.set(hostKey, current - 1);
		}
	}

	/**
	 * Get active connection count
	 */
	getActiveCount(hostKey: string): number {
		return this.activeConnections.get(hostKey) || 0;
	}

	/**
	 * Clear all connections
	 */
	clear(): void {
		this.activeConnections.clear();
	}
}

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Simple fetch with timeout
 */
export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 30000): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(url, {
			...options,
			signal: controller.signal,
		});
		clearTimeout(timeoutId);
		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		throw error;
	}
}

/**
 * Fetch with retry
 */
export async function fetchWithRetry(
	url: string,
	options: RequestInit = {},
	retries = 3,
	delay = 1000,
): Promise<Response> {
	let lastError: unknown;

	for (let i = 0; i <= retries; i++) {
		try {
			return await fetch(url, options);
		} catch (error) {
			lastError = error;
			if (i < retries) {
				await Bun.sleep(delay * Math.pow(2, i));
			}
		}
	}

	throw lastError;
}
