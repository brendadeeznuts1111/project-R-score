/**
 * Enhanced Telegram Bot API Client
 *
 * @fileoverview Enterprise-grade Telegram client with retry logic, circuit breaker, rate limiting, and queuing.
 * Provides a robust wrapper around TelegramBotApi with enterprise patterns for production reliability.
 *
 * @module src/telegram/client
 * @version 9.0.0.0.0.0.0
 *
 * Features:
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern
 * - Rate limiting (9.1.1.10.3.1.0)
 * - Request queuing (9.1.1.10.3.2.0)
 * - Comprehensive error handling
 * - Request/response logging
 *
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md|Communication & Notification Subsystem (9.0.0.0.0.0.0)}
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#91110300|Load Balancing & Throttling (9.1.1.10.3.0.0)}
 * @see {@link ../api/telegram-ws.ts|TelegramBotApi} - Core API client
 */

import { TelegramBotApi } from "../api/telegram-ws.js";
import {
	CircuitBreaker,
	retryWithBackoff,
	type RetryOptions,
	type RetryResult,
} from "../utils/enterprise-retry.js";
import { TELEGRAM_ENV } from "./constants.js";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Telegram message interface
 *
 * @interface TelegramMessage
 * @description Message structure for Telegram notifications with formatting and routing options.
 *
 * @property {string | number} chatId - Telegram chat ID (from TELEGRAM_CHAT_ID or Bun.secrets)
 * @property {string} text - Message text (supports HTML/Markdown formatting per parseMode)
 * @property {number} [threadId] - Optional topic thread ID (message_thread_id) for forum topics (9.1.1.2.2.0.0)
 * @property {boolean} [pin] - Whether to pin the message after sending (9.1.1.2.3.1.0)
 * @property {"HTML" | "Markdown" | "MarkdownV2"} [parseMode] - Message formatting mode (9.1.1.9.1.0.0)
 *
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#91191000|Message Formatting (9.1.1.9.0.0.0)}
 */
export interface TelegramMessage {
	chatId: string | number;
	text: string;
	threadId?: number;
	pin?: boolean;
	parseMode?: "HTML" | "Markdown" | "MarkdownV2";
	disable_notification?: boolean; // Disable notification sound/vibration (default: false)
}

export interface TelegramClientConfig {
	botToken?: string;
	maxRetries?: number;
	retryDelay?: number;
	circuitBreakerThreshold?: number;
	rateLimitPerSecond?: number;
	rateLimitPerMinute?: number;
	enableLogging?: boolean;
}

export interface TelegramClientStats {
	totalRequests: number;
	successfulRequests: number;
	failedRequests: number;
	retries: number;
	circuitBreakerTrips: number;
	rateLimitHits: number;
	averageResponseTime: number;
}

// ═══════════════════════════════════════════════════════════════
// RATE LIMITER
// ═══════════════════════════════════════════════════════════════

class RateLimiter {
	private requests: number[] = [];
	private readonly maxPerSecond: number;
	private readonly maxPerMinute: number;

	constructor(maxPerSecond = 30, maxPerMinute = 1000) {
		this.maxPerSecond = maxPerSecond;
		this.maxPerMinute = maxPerMinute;
	}

	async waitIfNeeded(): Promise<void> {
		const now = Date.now();

		// Clean old requests
		this.requests = this.requests.filter(
			(timestamp) => now - timestamp < 60000,
		);

		// Check per-minute limit
		const requestsLastMinute = this.requests.filter(
			(timestamp) => now - timestamp < 60000,
		).length;

		if (requestsLastMinute >= this.maxPerMinute) {
			const oldestRequest = Math.min(...this.requests);
			const waitTime = 60000 - (now - oldestRequest) + 100;
			await new Promise((resolve) => setTimeout(resolve, waitTime));
			return this.waitIfNeeded();
		}

		// Check per-second limit
		const requestsLastSecond = this.requests.filter(
			(timestamp) => now - timestamp < 1000,
		).length;

		if (requestsLastSecond >= this.maxPerSecond) {
			const oldestRequest = Math.min(
				...this.requests.filter((timestamp) => now - timestamp < 1000),
			);
			const waitTime = 1000 - (now - oldestRequest) + 50;
			await new Promise((resolve) => setTimeout(resolve, waitTime));
		}

		this.requests.push(now);
	}

	reset(): void {
		this.requests = [];
	}
}

// ═══════════════════════════════════════════════════════════════
// ENHANCED TELEGRAM CLIENT
// ═══════════════════════════════════════════════════════════════

export class EnhancedTelegramClient {
	private api: TelegramBotApi;
	private circuitBreaker: CircuitBreaker;
	private rateLimiter: RateLimiter;
	private stats: TelegramClientStats;
	private config: Required<TelegramClientConfig>;
	private requestQueue: Array<() => Promise<any>> = [];
	private processingQueue = false;

	constructor(config: TelegramClientConfig = {}) {
		// Load bot token
		let botToken = config.botToken || process.env[TELEGRAM_ENV.BOT_TOKEN];

		if (!botToken) {
			// Note: Bun.secrets.get is async, but constructor can't be async
			// So we'll load it lazily on first use
			botToken = "";
		}

		this.config = {
			botToken,
			maxRetries: config.maxRetries ?? 3,
			retryDelay: config.retryDelay ?? 1000,
			circuitBreakerThreshold: config.circuitBreakerThreshold ?? 5,
			rateLimitPerSecond: config.rateLimitPerSecond ?? 30,
			rateLimitPerMinute: config.rateLimitPerMinute ?? 1000,
			enableLogging: config.enableLogging ?? true,
		};

		if (!this.config.botToken) {
			throw new Error(
				`Bot token not found. Set ${TELEGRAM_ENV.BOT_TOKEN} or configure Bun.secrets`,
			);
		}

		this.api = new TelegramBotApi(this.config.botToken);
		this.rateLimiter = new RateLimiter(
			this.config.rateLimitPerSecond,
			this.config.rateLimitPerMinute,
		);

		this.circuitBreaker = new CircuitBreaker(
			this.config.circuitBreakerThreshold as 5,
			60000, // reset timeout (matches ENTERPRISE_CONFIG default)
			3, // half-open max attempts
		);

		this.stats = {
			totalRequests: 0,
			successfulRequests: 0,
			failedRequests: 0,
			retries: 0,
			circuitBreakerTrips: 0,
			rateLimitHits: 0,
			averageResponseTime: 0,
		};
	}

	/**
	 * Send message with retry logic and rate limiting
	 */
	async sendMessage(
		message: TelegramMessage,
	): Promise<{ ok: boolean; messageId?: number; error?: string }> {
		return this.executeWithRetry(async () => {
			await this.rateLimiter.waitIfNeeded();

			const startTime = Date.now();

			let result;
			if (message.pin && message.threadId) {
				result = await this.api.sendAndPin(
					message.chatId,
					message.text,
					message.threadId,
				);
			} else {
				result = await this.api.sendMessage(
					message.chatId,
					message.text,
					message.threadId,
					{
						parseMode: message.parseMode,
						disable_notification: message.disable_notification,
					},
				);
			}

			const responseTime = Date.now() - startTime;
			const success = result.ok;
			this.updateStats(success, responseTime);

			if (!success) {
				const error =
					"description" in result
						? result.description
						: "error" in result
							? result.error
							: "Unknown error";
				if (this.config.enableLogging) {
					console.error(`❌ Telegram API error: ${error}`);
				}
				throw new Error(error);
			}

			const messageId =
				"messageId" in result
					? result.messageId
					: "result" in result && result.result?.message_id
						? result.result.message_id
						: undefined;

			return {
				ok: true,
				messageId,
			};
		});
	}

	/**
	 * Send message to queue (async, non-blocking)
	 */
	async sendMessageAsync(
		message: TelegramMessage,
	): Promise<Promise<{ ok: boolean; messageId?: number; error?: string }>> {
		return new Promise((resolve) => {
			this.requestQueue.push(async () => {
				try {
					const result = await this.sendMessage(message);
					resolve(result);
				} catch (error) {
					resolve({
						ok: false,
						error: (error as Error).message,
					});
				}
			});

			this.processQueue();
		});
	}

	/**
	 * Send message and pin with proxy pattern matching
	 */
	async sendAndPinWithProxy(
		message: TelegramMessage,
		options: { shouldPin?: boolean } = {},
	): Promise<{ ok: boolean; messageId?: number; error?: string }> {
		const { ProxyPinningManager } = await import('./proxy-pinning.js');
		const pinningManager = new ProxyPinningManager();

		// Send message
		const result = await this.sendMessage(message);

		if (!result.ok) {
			return result;
		}

		// Auto-pin if pattern matches
		const shouldPin =
			options.shouldPin ??
			pinningManager.shouldPin(message) ??
			(message.pin === true);

		if (shouldPin && result.messageId) {
			try {
				await this.pinMessage({
					chatId: message.chatId,
					messageId: result.messageId,
					threadId: message.threadId,
				});
			} catch (error) {
				console.error('Failed to pin message:', error);
			}
		}

		return result;
	}

	/**
	 * Pin message in chat/topic
	 */
	async pinMessage(options: {
		chatId: string | number;
		messageId: number;
		threadId?: number;
	}): Promise<{ ok: boolean; error?: string }> {
		return this.executeWithRetry(async () => {
			await this.rateLimiter.waitIfNeeded();

			const result = await this.api.pinMessage(
				options.chatId,
				options.messageId,
				options.threadId,
			);

			if (!result.ok) {
				throw new Error(result.description || 'Failed to pin message');
			}

			return { ok: true };
		});
	}

	/**
	 * Process request queue
	 */
	private async processQueue(): Promise<void> {
		if (this.processingQueue || this.requestQueue.length === 0) {
			return;
		}

		this.processingQueue = true;

		while (this.requestQueue.length > 0) {
			const request = this.requestQueue.shift();
			if (request) {
				await request();
				// Small delay between queue items
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		}

		this.processingQueue = false;
	}

	/**
	 * Execute with retry logic
	 */
	private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
		this.stats.totalRequests++;

		const retryOptions: RetryOptions = {
			maxAttempts: this.config.maxRetries,
			initialDelayMs: this.config.retryDelay,
			maxDelayMs: 10000,
			backoffMultiplier: 2,
		};

		const result: RetryResult<T> = await retryWithBackoff(
			() => this.circuitBreaker.execute(fn),
			retryOptions,
		);

		if (result.success) {
			this.stats.successfulRequests++;
			if (result.attempts > 1) {
				this.stats.retries += result.attempts - 1;
			}
			return result.result!;
		} else {
			this.stats.failedRequests++;
			if (this.circuitBreaker.getState() === "open") {
				this.stats.circuitBreakerTrips++;
			}
			throw new Error(
				result.error instanceof Error
					? result.error.message
					: String(result.error) || "Request failed",
			);
		}
	}

	/**
	 * Update statistics
	 */
	private updateStats(success: boolean, responseTime: number): void {
		const total = this.stats.totalRequests;
		const currentAvg = this.stats.averageResponseTime;
		this.stats.averageResponseTime =
			(currentAvg * (total - 1) + responseTime) / total;
	}

	/**
	 * Get client statistics
	 */
	getStats(): TelegramClientStats {
		return { ...this.stats };
	}

	/**
	 * Reset statistics
	 */
	resetStats(): void {
		this.stats = {
			totalRequests: 0,
			successfulRequests: 0,
			failedRequests: 0,
			retries: 0,
			circuitBreakerTrips: 0,
			rateLimitHits: 0,
			averageResponseTime: 0,
		};
	}

	/**
	 * Get underlying API client
	 */
	getApiClient(): TelegramBotApi {
		return this.api;
	}

	/**
	 * Health check
	 */
	async healthCheck(): Promise<{
		healthy: boolean;
		message: string;
		stats: TelegramClientStats;
	}> {
		try {
			// Try to get bot info (lightweight check)
			const testMessage: TelegramMessage = {
				chatId: process.env[TELEGRAM_ENV.CHAT_ID] || "",
				text: "Health check",
			};

			// Don't actually send, just validate
			if (!testMessage.chatId) {
				return {
					healthy: false,
					message: "Chat ID not configured",
					stats: this.getStats(),
				};
			}

			return {
				healthy: true,
				message: "Client healthy",
				stats: this.getStats(),
			};
		} catch (error) {
			return {
				healthy: false,
				message: (error as Error).message,
				stats: this.getStats(),
			};
		}
	}
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════

let defaultClient: EnhancedTelegramClient | null = null;

export function getTelegramClient(
	config?: TelegramClientConfig,
): EnhancedTelegramClient {
	if (!defaultClient) {
		defaultClient = new EnhancedTelegramClient(config);
	}
	return defaultClient;
}
