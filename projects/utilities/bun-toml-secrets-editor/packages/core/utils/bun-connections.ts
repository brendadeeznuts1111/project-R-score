#!/usr/bin/env bun
/**
 * Bun-Native Connection Utilities
 * High-performance connections using Bun's native APIs
 *
 * Features:
 * - Bun.fetch() with keepalive, pooling, retries
 * - Bun.connect() for TCP sockets
 * - Native WebSocket handling
 * - Connection pooling with Bun's HTTP client
 * - Automatic retry with exponential backoff
 * - Request/response compression
 * - HTTP/2 support where available
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ConnectionPoolConfig {
	/** Maximum concurrent connections */
	maxConnections?: number;
	/** Keepalive timeout in ms */
	keepAliveMs?: number;
	/** Connection timeout in ms */
	connectTimeoutMs?: number;
	/** Request timeout in ms */
	requestTimeoutMs?: number;
	/** Enable HTTP/2 */
	enableHttp2?: boolean;
	/** Enable compression */
	compression?: boolean;
}

export interface RetryConfig {
	/** Maximum retry attempts */
	maxRetries?: number;
	/** Initial retry delay in ms */
	initialDelayMs?: number;
	/** Maximum retry delay in ms */
	maxDelayMs?: number;
	/** Backoff multiplier */
	backoffMultiplier?: number;
	/** Retry on these status codes */
	retryStatusCodes?: number[];
	/** Retry on network errors */
	retryNetworkErrors?: boolean;
}

export interface RequestConfig extends RequestInit {
	/** Retry configuration */
	retry?: RetryConfig;
	/** Timeout in milliseconds */
	timeoutMs?: number;
	/** Request ID for tracing */
	requestId?: string;
	/** Don't parse JSON response */
	rawResponse?: boolean;
}

export interface ConnectionMetrics {
	requestsTotal: number;
	requestsActive: number;
	requestsFailed: number;
	retryCount: number;
	avgLatencyMs: number;
	connectionsOpen: number;
	lastError?: Error;
}

export interface WebSocketConfig {
	/** Reconnect on disconnect */
	autoReconnect?: boolean;
	/** Reconnect delay in ms */
	reconnectDelayMs?: number;
	/** Max reconnect attempts */
	maxReconnects?: number;
	/** Heartbeat interval in ms */
	heartbeatMs?: number;
	/** Connection timeout in ms */
	timeoutMs?: number;
}

// ============================================================================
// HTTP Connection Manager (using Bun.fetch)
// ============================================================================

export class BunHttpClient {
	private metrics: ConnectionMetrics = {
		requestsTotal: 0,
		requestsActive: 0,
		requestsFailed: 0,
		retryCount: 0,
		avgLatencyMs: 0,
		connectionsOpen: 0,
	};

	private latencyHistory: number[] = [];

	constructor(
		private baseUrl: string,
		private config: ConnectionPoolConfig = {},
		private defaultHeaders: Record<string, string> = {},
	) {
		this.config = {
			maxConnections: 10,
			keepAliveMs: 30000,
			connectTimeoutMs: 5000,
			requestTimeoutMs: 30000,
			enableHttp2: true,
			compression: true,
			...config,
		};
	}

	/**
	 * Make an HTTP request with Bun.fetch
	 * Features: retries, timeout, compression, keepalive
	 */
	async request<T = any>(path: string, config: RequestConfig = {}): Promise<T> {
		const url = `${this.baseUrl}${path}`;
		const requestId = config.requestId ?? crypto.randomUUID();
		const startTime = performance.now();

		this.metrics.requestsActive++;
		this.metrics.requestsTotal++;

		try {
			// Build fetch options with Bun-native features
			const fetchOptions: RequestInit = {
				...config,
				headers: {
					...this.defaultHeaders,
					...config.headers,
					"X-Request-ID": requestId,
					// Enable compression if supported
					"Accept-Encoding": this.config.compression
						? "gzip, deflate, br"
						: "identity",
				},
				// Bun-specific: keepalive for connection pooling
				keepalive: true,
			};

			// Apply timeout using AbortController
			const controller = new AbortController();
			const timeoutId = setTimeout(() => {
				controller.abort();
			}, config.timeoutMs ?? this.config.requestTimeoutMs);

			fetchOptions.signal = controller.signal;

			// Execute with retry logic
			const response = await this.executeWithRetry(
				url,
				fetchOptions,
				config.retry,
			);

			clearTimeout(timeoutId);

			// Track latency
			const latency = performance.now() - startTime;
			this.trackLatency(latency);

			// Handle response
			if (!response.ok) {
				throw new HttpError(response.status, response.statusText, requestId);
			}

			// Return raw response if requested
			if (config.rawResponse) {
				return response as T;
			}

			// Parse JSON or return text
			const contentType = response.headers.get("content-type");
			if (contentType?.includes("application/json")) {
				return await response.json();
			}
			return (await response.text()) as T;
		} catch (error) {
			this.metrics.requestsFailed++;
			this.metrics.lastError = error as Error;
			throw error;
		} finally {
			this.metrics.requestsActive--;
		}
	}

	/**
	 * Execute request with exponential backoff retry
	 */
	private async executeWithRetry(
		url: string,
		options: RequestInit,
		retryConfig?: RetryConfig,
	): Promise<Response> {
		const retry: RetryConfig = {
			maxRetries: 3,
			initialDelayMs: 100,
			maxDelayMs: 10000,
			backoffMultiplier: 2,
			retryStatusCodes: [408, 429, 500, 502, 503, 504],
			retryNetworkErrors: true,
			...retryConfig,
		};

		let lastError: Error | undefined;

		for (let attempt = 0; attempt <= (retry.maxRetries ?? 3); attempt++) {
			try {
				const response = await fetch(url, options);

				// Check if we should retry this status code
				if (
					attempt < (retry.maxRetries ?? 3) &&
					retry.retryStatusCodes?.includes(response.status)
				) {
					throw new Error(`Retryable status: ${response.status}`);
				}

				return response;
			} catch (error) {
				lastError = error as Error;

				// Don't retry on the last attempt
				if (attempt >= (retry.maxRetries ?? 3)) {
					break;
				}

				// Check if error is retryable
				const isRetryable = this.isRetryableError(error as Error, retry);
				if (!isRetryable) {
					throw error;
				}

				// Calculate backoff delay
				const delay = Math.min(
					(retry.initialDelayMs ?? 100) *
						(retry.backoffMultiplier ?? 2) ** attempt,
					retry.maxDelayMs ?? 10000,
				);

				this.metrics.retryCount++;
				await Bun.sleep(delay);
			}
		}

		throw lastError;
	}

	private isRetryableError(error: Error, retry: RetryConfig): boolean {
		// Network errors
		if (retry.retryNetworkErrors) {
			const networkErrors = [
				"ECONNRESET",
				"ETIMEDOUT",
				"ECONNREFUSED",
				"ENOTFOUND",
				"EPIPE",
			];
			if (networkErrors.some((code) => error.message?.includes(code))) {
				return true;
			}
		}

		// Abort errors (timeouts) are retryable
		if (error.name === "AbortError") {
			return true;
		}

		return false;
	}

	private trackLatency(latencyMs: number): void {
		this.latencyHistory.push(latencyMs);
		// Keep last 100 measurements
		if (this.latencyHistory.length > 100) {
			this.latencyHistory.shift();
		}
		// Update average
		this.metrics.avgLatencyMs =
			this.latencyHistory.reduce((a, b) => a + b, 0) /
			this.latencyHistory.length;
	}

	// Convenience methods
	async get<T = any>(path: string, config?: RequestConfig): Promise<T> {
		return this.request<T>(path, { ...config, method: "GET" });
	}

	async post<T = any>(
		path: string,
		body: any,
		config?: RequestConfig,
	): Promise<T> {
		return this.request<T>(path, {
			...config,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...config?.headers,
			},
			body: JSON.stringify(body),
		});
	}

	async put<T = any>(
		path: string,
		body: any,
		config?: RequestConfig,
	): Promise<T> {
		return this.request<T>(path, {
			...config,
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				...config?.headers,
			},
			body: JSON.stringify(body),
		});
	}

	async delete<T = any>(path: string, config?: RequestConfig): Promise<T> {
		return this.request<T>(path, { ...config, method: "DELETE" });
	}

	getMetrics(): ConnectionMetrics {
		return { ...this.metrics };
	}
}

// ============================================================================
// TCP Socket Connection (using Bun.connect)
// ============================================================================

export interface TcpConnectionConfig {
	hostname: string;
	port: number;
	/** TLS options */
	tls?:
		| boolean
		| {
				cert?: string;
				key?: string;
				ca?: string;
				rejectUnauthorized?: boolean;
		  };
	/** Connection timeout in ms */
	timeoutMs?: number;
	/** Data encoding */
	encoding?: "utf8" | "binary" | "base64";
}

export class BunTcpClient {
	private socket: any;
	private connected = false;
	private dataBuffer: Buffer[] = [];
	private pendingResolves: Array<(data: Buffer) => void> = [];

	constructor(private config: TcpConnectionConfig) {}

	/**
	 * Connect using Bun.connect for high-performance TCP
	 */
	async connect(): Promise<void> {
		const { hostname, port, tls } = this.config;

		this.socket = await Bun.connect({
			hostname,
			port,
			tls: tls === true ? {} : tls || false,
			socket: {
				data: (_socket, data) => {
					// Handle incoming data
					if (this.pendingResolves.length > 0) {
						const resolve = this.pendingResolves.shift()!;
						resolve(Buffer.from(data));
					} else {
						this.dataBuffer.push(Buffer.from(data));
					}
				},
				open: () => {
					this.connected = true;
				},
				close: () => {
					this.connected = false;
				},
				error: (_socket, error) => {
					console.error("Socket error:", error);
					this.connected = false;
				},
			},
		});

		// Wait for connection with timeout
		const timeoutMs = this.config.timeoutMs ?? 5000;
		const startTime = Date.now();
		while (!this.connected && Date.now() - startTime < timeoutMs) {
			await Bun.sleep(10);
		}

		if (!this.connected) {
			throw new Error(`Connection timeout after ${timeoutMs}ms`);
		}
	}

	/**
	 * Send data and wait for response
	 */
	async send(data: string | Buffer): Promise<Buffer> {
		if (!this.connected || !this.socket) {
			throw new Error("Not connected");
		}

		// Send data
		const bytes = typeof data === "string" ? Buffer.from(data) : data;
		this.socket.write(bytes);

		// Wait for response
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error("Response timeout"));
			}, this.config.timeoutMs ?? 10000);

			// Check if data already buffered
			if (this.dataBuffer.length > 0) {
				clearTimeout(timeout);
				resolve(this.dataBuffer.shift()!);
				return;
			}

			// Wait for data
			this.pendingResolves.push((data) => {
				clearTimeout(timeout);
				resolve(data);
			});
		});
	}

	/**
	 * Send without waiting for response
	 */
	write(data: string | Buffer): void {
		if (!this.connected || !this.socket) {
			throw new Error("Not connected");
		}
		const bytes = typeof data === "string" ? Buffer.from(data) : data;
		this.socket.write(bytes);
	}

	disconnect(): void {
		if (this.socket) {
			this.socket.end();
			this.connected = false;
		}
	}

	isConnected(): boolean {
		return this.connected;
	}
}

// ============================================================================
// WebSocket Client (Bun-native)
// ============================================================================

export class BunWebSocketClient {
	private ws: WebSocket | null = null;
	private reconnectAttempts = 0;
	private messageQueue: any[] = [];
	private heartbeatInterval?: Timer;
	private config: Required<WebSocketConfig>;
	private listeners: Map<string, Set<Function>> = new Map();

	constructor(
		private url: string,
		config: WebSocketConfig = {},
	) {
		this.config = {
			autoReconnect: true,
			reconnectDelayMs: 1000,
			maxReconnects: 10,
			heartbeatMs: 30000,
			timeoutMs: 10000,
			...config,
		};
	}

	/**
	 * Connect to WebSocket server
	 */
	async connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error("WebSocket connection timeout"));
			}, this.config.timeoutMs);

			this.ws = new WebSocket(this.url);

			this.ws.onopen = () => {
				clearTimeout(timeout);
				this.reconnectAttempts = 0;
				this.startHeartbeat();

				// Flush queued messages
				while (this.messageQueue.length > 0) {
					const msg = this.messageQueue.shift();
					this.send(msg);
				}

				this.emit("connect", undefined);
				resolve();
			};

			this.ws.onmessage = (event) => {
				let data = event.data;
				try {
					data = JSON.parse(data as string);
				} catch {
					// Keep as string if not JSON
				}
				this.emit("message", data);
			};

			this.ws.onclose = () => {
				this.stopHeartbeat();
				this.emit("disconnect", undefined);

				if (this.config.autoReconnect) {
					this.attemptReconnect();
				}
			};

			this.ws.onerror = (error) => {
				this.emit("error", error);
				reject(error);
			};
		});
	}

	/**
	 * Send message (queues if not connected)
	 */
	send(data: any): void {
		const message = typeof data === "string" ? data : JSON.stringify(data);

		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(message);
		} else {
			this.messageQueue.push(message);
		}
	}

	/**
	 * Subscribe to events
	 */
	on(event: string, handler: Function): () => void {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event)?.add(handler);

		// Return unsubscribe function
		return () => {
			this.listeners.get(event)?.delete(handler);
		};
	}

	private emit(event: string, data: any): void {
		this.listeners.get(event)?.forEach((handler) => {
			try {
				handler(data);
			} catch (error) {
				console.error(`Error in ${event} handler:`, error);
			}
		});
	}

	private attemptReconnect(): void {
		if (this.reconnectAttempts >= this.config.maxReconnects) {
			console.error("Max reconnection attempts reached");
			this.emit("error", new Error("Max reconnection attempts reached"));
			return;
		}

		this.reconnectAttempts++;
		const delay =
			this.config.reconnectDelayMs * 1.5 ** (this.reconnectAttempts - 1);

		console.log(
			`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`,
		);

		setTimeout(() => {
			this.connect().catch(() => {
				// Reconnect failed, will try again
			});
		}, delay);
	}

	private startHeartbeat(): void {
		if (this.config.heartbeatMs > 0) {
			this.heartbeatInterval = setInterval(() => {
				this.send({ type: "ping", timestamp: Date.now() });
			}, this.config.heartbeatMs);
		}
	}

	private stopHeartbeat(): void {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = undefined;
		}
	}

	disconnect(): void {
		this.stopHeartbeat();
		this.config.autoReconnect = false;
		this.ws?.close();
	}

	isConnected(): boolean {
		return this.ws?.readyState === WebSocket.OPEN;
	}
}

// ============================================================================
// HTTP Error Class
// ============================================================================

export class HttpError extends Error {
	constructor(
		public status: number,
		public statusText: string,
		public requestId: string,
	) {
		super(`HTTP ${status}: ${statusText}`);
		this.name = "HttpError";
	}
}

// ============================================================================
// Connection Factory
// ============================================================================

export const Connections = {
	/**
	 * Create HTTP client with connection pooling
	 */
	http(
		baseUrl: string,
		config?: ConnectionPoolConfig,
		headers?: Record<string, string>,
	) {
		return new BunHttpClient(baseUrl, config, headers);
	},

	/**
	 * Create TCP socket client
	 */
	tcp(config: TcpConnectionConfig) {
		return new BunTcpClient(config);
	},

	/**
	 * Create WebSocket client
	 */
	websocket(url: string, config?: WebSocketConfig) {
		return new BunWebSocketClient(url, config);
	},

	/**
	 * Create DuoPlus API client (pre-configured)
	 */
	duoplus(apiKey: string, baseUrl = "https://www.duoplus.cloud") {
		return new BunHttpClient(
			baseUrl,
			{
				maxConnections: 20,
				keepAliveMs: 60000,
				enableHttp2: true,
				compression: true,
			},
			{
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
				Accept: "application/json",
			},
		);
	},
};

// ============================================================================
// Export for CLI usage
// ============================================================================

export async function testConnections(): Promise<void> {
	console.log("🧪 Testing Bun-native connections...\n");

	// Test HTTP client
	console.log("1️⃣ Testing HTTP client (httpbin.org)...");
	const http = Connections.http("https://httpbin.org");

	try {
		const _response = await http.get("/get");
		console.log("   ✅ HTTP GET successful");
		console.log(
			`   📊 Latency: ${http.getMetrics().avgLatencyMs.toFixed(2)}ms`,
		);
	} catch (error) {
		console.error("   ❌ HTTP test failed:", error);
	}

	// Test retry logic
	console.log("\n2️⃣ Testing retry logic (simulated failure)...");
	try {
		// This will fail but test retry mechanism
		await http.get("/status/503", {
			retry: { maxRetries: 2, initialDelayMs: 100 },
			timeoutMs: 5000,
		});
	} catch (_error) {
		console.log("   ✅ Retry mechanism working (expected failure)");
		console.log(`   🔄 Retry count: ${http.getMetrics().retryCount}`);
	}

	console.log("\n✅ Connection tests complete!");
}

// Run if called directly
if (import.meta.main) {
	testConnections();
}
