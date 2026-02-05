/**
 * Telegram Mini App WebSocket Server
 * Real-time bi-directional WebSocket for Telegram Mini App
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-TELEGRAM-WS@0.1.0;instance-id=ORCA-TELEGRAM-WS-001;version=0.1.0}][PROPERTIES:{ws={value:"telegram-ws";@root:"ROOT-API";@chain:["BP-WEBSOCKET","BP-TELEGRAM-BOT"];@version:"0.1.0"}}][CLASS:TelegramWebSocketServer][#REF:v-0.1.0.BP.TELEGRAM.WS.1.0.A.1.1.ORCA.1.1]]
 */

import type { ServerWebSocket } from "bun";
// URLPattern is a global Web API in Bun, no import needed
import {
	botState,
	type LiveOut
} from "./telegram-bot";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface WebSocketData {
	userId: number;
	username?: string;
	connectedAt: number;
	lastPing: number;
}

interface WebSocketMessage {
	type:
		| "status"
		| "toast"
		| "live_out"
		| "broadcast"
		| "ping"
		| "pong"
		| "error";
	action?: "broadcast" | "pin" | "unpin";
	text?: string;
	thread_id?: number;
	data?: any;
	title?: string;
	message?: string;
}

interface TelegramBotApiResponse {
	ok: boolean;
	result?: any;
	description?: string;
	error_code?: number;
}

// ═══════════════════════════════════════════════════════════════
// TELEGRAM BOT API CLIENT
// ═══════════════════════════════════════════════════════════════

/**
 * Telegram Bot API client for sending messages and pinning
 *
 * @class TelegramBotApi
 * @description Core Telegram Bot API client for Hyper-Bun's notification system.
 * Provides methods for sending messages, pinning/unpinning, topic management, and forum operations.
 *
 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md|Communication & Notification Subsystem (9.0.0.0.0.0.0)}
 * @see {@link ../docs/TELEGRAM-DEV-SETUP.md|Telegram Dev Setup Guide (9.1.1.0.0.0.0)}
 * @see {@link ../docs/TELEGRAM-INTEGRATION.md|Telegram Integration Guide}
 *
 * @example
 * ```typescript
 * // Basic usage (9.1.1.1.0.0.0)
 * const bot = new TelegramBotApi(Bun.secrets.TELEGRAM_BOT_TOKEN);
 * await bot.sendMessage(chatId, "Hello from Hyper-Bun!");
 *
 * // Send to topic (9.1.1.2.2.0.0)
 * await bot.sendMessage(chatId, "Topic message", threadId);
 *
 * // Pin message (9.1.1.2.3.1.0)
 * await bot.pinMessage(chatId, messageId, threadId);
 * ```
 */
export class TelegramBotApi {
	private readonly botToken: string;
	private readonly apiBase = "https://api.telegram.org/bot";
	private readonly proxyPattern: URLPattern;
	private connectionStats: {
		sockets: number;
		free: number;
		requests: number;
	} = { sockets: 0, free: 0, requests: 0 };

	constructor(botToken?: string) {
		this.botToken = botToken || process.env.TELEGRAM_BOT_TOKEN || "";
		if (!this.botToken) {
			console.warn(
				"⚠️  TELEGRAM_BOT_TOKEN not set. Telegram API features disabled.",
			);
		}

		// Proxy URL pattern for routing
		this.proxyPattern = new URLPattern({
			protocol: 'http{s}',
			hostname: '{api,api2}.telegram.org',
		});
	}

	/**
	 * Send message to Telegram chat/topic
	 *
	 * @method sendMessage
	 * @description Sends a message to a Telegram chat or forum topic.
	 * Uses HTML parse mode by default for rich formatting (9.1.1.9.1.0.0).
	 *
	 * @param {string | number} chatId - Telegram chat ID (from TELEGRAM_CHAT_ID or Bun.secrets)
	 * @param {string} text - Message text (supports HTML formatting)
	 * @param {number} [threadId] - Optional topic thread ID (message_thread_id) for forum topics (9.1.1.2.2.0.0)
	 *
	 * @returns {Promise<TelegramBotApiResponse>} Telegram API response with ok status and result
	 *
	 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#91110000|Telegram Dev Setup (9.1.1.0.0.0.0)}
	 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#91191000|Message Formatting (9.1.1.9.0.0.0)}
	 *
	 * @example
	 * ```typescript
	 * // Simple message (9.1.1.3.4.0.0)
	 * await bot.sendMessage(chatId, "Alert: Market anomaly detected");
	 *
	 * // Message to topic (9.1.1.2.2.2.0)
	 * await bot.sendMessage(chatId, "Topic alert", threadId);
	 *
	 * // Formatted message (9.1.1.9.1.1.0)
	 * await bot.sendMessage(chatId, "<b>CRITICAL</b>: <code>event_123</code>");
	 * ```
	 */
	async sendMessage(
		chatId: string | number,
		text: string,
		threadId?: number,
		options?: {
			parseMode?: "HTML" | "Markdown" | "MarkdownV2";
			disable_notification?: boolean;
		},
	): Promise<TelegramBotApiResponse> {
		if (!this.botToken) {
			return { ok: false, description: "Bot token not configured" };
		}

		try {
			// Use POST with form data to properly send HTML content
			const formData = new FormData();
			formData.append("chat_id", String(chatId));
			formData.append("text", text);
			formData.append("parse_mode", options?.parseMode || "HTML");

			if (threadId) {
				formData.append("message_thread_id", String(threadId));
			}

			if (options?.disable_notification !== undefined) {
				formData.append("disable_notification", String(options.disable_notification));
			}

			const url = `${this.apiBase}${this.botToken}/sendMessage`;
			const proxyConfig = this.selectProxy(url);
			
			const fetchOptions: RequestInit = {
				method: "POST",
				body: formData,
				headers: {
					'Connection': 'keep-alive',
				},
				signal: AbortSignal.timeout(30000),
			};

			// Bun supports proxy via fetch options (type assertion needed)
			if (proxyConfig) {
				(fetchOptions as any).proxy = proxyConfig;
			}

			const response = await fetch(url, fetchOptions);

			this.updateConnectionStats();

			return await response.json();
		} catch (error) {
			return {
				ok: false,
				description: (error as Error).message,
			};
		}
	}

	/**
	 * Pin message in chat/topic
	 *
	 * @method pinMessage
	 * @description Pins a message in a Telegram chat or forum topic for immediate visibility.
	 * Used for critical alerts that require operator attention (9.1.1.2.3.1.0).
	 *
	 * @param {string | number} chatId - Telegram chat ID
	 * @param {number} messageId - Message ID to pin (from sendMessage result)
	 * @param {number} [threadId] - Optional topic thread ID for forum topics (9.1.1.2.3.1.0)
	 *
	 * @returns {Promise<TelegramBotApiResponse>} Telegram API response
	 *
	 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#9112310|Message Pinning (9.1.1.2.3.1.0)}
	 *
	 * @example
	 * ```typescript
	 * // Pin critical alert (9.1.1.2.3.1.0)
	 * const result = await bot.sendMessage(chatId, "CRITICAL ALERT", threadId);
	 * if (result.ok && result.result?.message_id) {
	 *   await bot.pinMessage(chatId, result.result.message_id, threadId);
	 * }
	 * ```
	 */
	async pinMessage(
		chatId: string | number,
		messageId: number,
		threadId?: number,
	): Promise<TelegramBotApiResponse> {
		if (!this.botToken) {
			return { ok: false, description: "Bot token not configured" };
		}

		try {
			const params = new URLSearchParams({
				chat_id: String(chatId),
				message_id: String(messageId),
			});

			if (threadId) {
				params.set("message_thread_id", String(threadId));
			}

			const url = `${this.apiBase}${this.botToken}/pinChatMessage?${params}`;
			const proxyConfig = this.selectProxy(url);

			const fetchOptions: RequestInit = {
				headers: {
					'Connection': 'keep-alive',
				},
				signal: AbortSignal.timeout(30000),
			};

			// Bun supports proxy via fetch options (type assertion needed)
			if (proxyConfig) {
				(fetchOptions as any).proxy = proxyConfig;
			}

			const response = await fetch(url, fetchOptions);

			this.updateConnectionStats();
			return await response.json();
		} catch (error) {
			return {
				ok: false,
				description: (error as Error).message,
			};
		}
	}

	/**
	 * Unpin message in chat/topic
	 *
	 * @method unpinMessage
	 * @description Unpins a previously pinned message in a Telegram chat or forum topic.
	 * Used to remove pinned alerts after they've been acknowledged (9.1.1.2.3.2.0).
	 *
	 * @param {string | number} chatId - Telegram chat ID
	 * @param {number} messageId - Message ID to unpin
	 * @param {number} [threadId] - Optional topic thread ID for forum topics (9.1.1.2.3.2.0)
	 *
	 * @returns {Promise<TelegramBotApiResponse>} Telegram API response
	 *
	 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#9112320|Message Unpinning (9.1.1.2.3.2.0)}
	 */
	async unpinMessage(
		chatId: string | number,
		messageId: number,
		threadId?: number,
	): Promise<TelegramBotApiResponse> {
		if (!this.botToken) {
			return { ok: false, description: "Bot token not configured" };
		}

		try {
			const params = new URLSearchParams({
				chat_id: String(chatId),
				message_id: String(messageId),
			});

			if (threadId) {
				params.set("message_thread_id", String(threadId));
			}

			const response = await fetch(
				`${this.apiBase}${this.botToken}/unpinChatMessage?${params}`,
			);

			return await response.json();
		} catch (error) {
			return {
				ok: false,
				description: (error as Error).message,
			};
		}
	}

	/**
	 * Send message and pin it in topic
	 *
	 * @method sendAndPin
	 * @description Convenience method to send a message and immediately pin it in a forum topic.
	 * Used for critical alerts that require immediate operator attention (9.1.1.2.3.1.0).
	 *
	 * @param {string | number} chatId - Telegram chat ID
	 * @param {string} text - Message text to send
	 * @param {number} threadId - Topic thread ID (required for pinning in topics)
	 *
	 * @returns {Promise<{ok: boolean; messageId?: number; error?: string}>} Result with messageId if successful
	 *
	 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#9112310|Message Pinning (9.1.1.2.3.1.0)}
	 *
	 * @example
	 * ```typescript
	 * // Send and pin critical alert (9.1.1.2.3.1.0)
	 * const result = await bot.sendAndPin(chatId, "🚨 CRITICAL ALERT", threadId);
	 * if (result.ok) {
	 *   console.log(`Message sent and pinned: ${result.messageId}`);
	 * }
	 * ```
	 */
	async sendAndPin(
		chatId: string | number,
		text: string,
		threadId: number,
	): Promise<{ ok: boolean; messageId?: number; error?: string }> {
		// Send message first
		const sendResult = await this.sendMessage(chatId, text, threadId);

		if (!sendResult.ok || !sendResult.result?.message_id) {
			return {
				ok: false,
				error: sendResult.description || "Failed to send message",
			};
		}

		const messageId = sendResult.result.message_id;

		// Pin the message
		const pinResult = await this.pinMessage(chatId, messageId, threadId);

		if (!pinResult.ok) {
			console.warn(
				`⚠️  Message sent but failed to pin: ${pinResult.description}`,
			);
		}

		return {
			ok: true,
			messageId,
		};
	}

	/**
	 * Get forum topics (for supergroups with topics enabled)
	 */
	/**
	 * Get forum topics in a supergroup
	 *
	 * @method getForumTopics
	 * @description Retrieves all forum topics (threads) in a Telegram supergroup.
	 * Used for discovering existing topics and their message_thread_id values (9.1.1.2.2.3.0).
	 *
	 * @param {string | number} chatId - Telegram supergroup chat ID
	 *
	 * @returns {Promise<{ok: boolean; result?: {topics: Array<{message_thread_id: number; name: string; ...}>}; description?: string}>}
	 *          Telegram API response with topics array
	 *
	 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#9112230|Dynamic Topic ID Retrieval (9.1.1.2.2.3.0)}
	 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#9113100|Discovering Topics (9.1.1.3.1.0.0)}
	 *
	 * @example
	 * ```typescript
	 * // Discover topics (9.1.1.3.1.0.0)
	 * const topics = await bot.getForumTopics(chatId);
	 * if (topics.ok && topics.result) {
	 *   for (const topic of topics.result.topics) {
	 *     console.log(`Topic: ${topic.name}, ID: ${topic.message_thread_id}`);
	 *   }
	 * }
	 * ```
	 */
	async getForumTopics(chatId: string | number): Promise<{
		ok: boolean;
		result?: {
			topics: Array<{
				message_thread_id: number;
				name: string;
				icon_color: number;
				icon_custom_emoji_id?: string;
			}>;
		};
		description?: string;
	}> {
		if (!this.botToken) {
			return { ok: false, description: "Bot token not configured" };
		}

		try {
			const params = new URLSearchParams({
				chat_id: String(chatId),
			});

			const response = await fetch(
				`${this.apiBase}${this.botToken}/getForumTopics?${params}`,
			);

			return await response.json();
		} catch (error) {
			return {
				ok: false,
				description: (error as Error).message,
			};
		}
	}

	/**
	 * Create forum topic
	 */
	/**
	 * Create forum topic in supergroup
	 *
	 * @method createForumTopic
	 * @description Creates a new forum topic (thread) in a Telegram supergroup.
	 * Returns the message_thread_id for routing messages to this topic (9.1.1.2.2.2.0).
	 *
	 * @param {string | number} chatId - Telegram supergroup chat ID
	 * @param {string} name - Topic name
	 * @param {number} [iconColor] - Optional icon color (0-5)
	 * @param {string} [iconCustomEmojiId] - Optional custom emoji icon ID
	 *
	 * @returns {Promise<{ok: boolean; result?: {message_thread_id: number}; description?: string}>}
	 *          Telegram API response with message_thread_id
	 *
	 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#9112220|CLI-Driven Topic Creation (9.1.1.2.2.2.0)}
	 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#9112241|Dynamic Topic Creation (9.1.1.10.2.4.1)}
	 *
	 * @example
	 * ```typescript
	 * // Create topic (9.1.1.2.2.2.0)
	 * const result = await bot.createForumTopic(chatId, "Live Alerts", 1);
	 * if (result.ok && result.result) {
	 *   const threadId = result.result.message_thread_id;
	 *   console.log(`Topic created with ID: ${threadId}`);
	 * }
	 * ```
	 */
	async createForumTopic(
		chatId: string | number,
		name: string,
		iconColor?: number,
		iconCustomEmojiId?: string,
	): Promise<{
		ok: boolean;
		result?: { message_thread_id: number };
		description?: string;
	}> {
		if (!this.botToken) {
			return { ok: false, description: "Bot token not configured" };
		}

		try {
			const params = new URLSearchParams({
				chat_id: String(chatId),
				name,
			});

			if (iconColor !== undefined) params.set("icon_color", String(iconColor));
			if (iconCustomEmojiId)
				params.set("icon_custom_emoji_id", iconCustomEmojiId);

			const response = await fetch(
				`${this.apiBase}${this.botToken}/createForumTopic?${params}`,
			);

			return await response.json();
		} catch (error) {
			return {
				ok: false,
				description: (error as Error).message,
			};
		}
	}

	/**
	 * Edit forum topic
	 */
	/**
	 * Edit forum topic
	 *
	 * @method editForumTopic
	 * @description Renames a forum topic or changes its icon.
	 * Used for evolving operational categories (9.1.1.2.4.2.0).
	 *
	 * @param {string | number} chatId - Telegram supergroup chat ID
	 * @param {number} messageThreadId - Topic thread ID to edit
	 * @param {string} [name] - New topic name
	 * @param {string} [iconCustomEmojiId] - New custom emoji icon ID
	 *
	 * @returns {Promise<TelegramBotApiResponse>} Telegram API response
	 *
	 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#9112420|Renaming Topics (9.1.1.2.4.2.0)}
	 */
	async editForumTopic(
		chatId: string | number,
		messageThreadId: number,
		name?: string,
		iconCustomEmojiId?: string,
	): Promise<TelegramBotApiResponse> {
		if (!this.botToken) {
			return { ok: false, description: "Bot token not configured" };
		}

		try {
			const params = new URLSearchParams({
				chat_id: String(chatId),
				message_thread_id: String(messageThreadId),
			});

			if (name) params.set("name", name);
			if (iconCustomEmojiId)
				params.set("icon_custom_emoji_id", iconCustomEmojiId);

			const response = await fetch(
				`${this.apiBase}${this.botToken}/editForumTopic?${params}`,
			);

			return await response.json();
		} catch (error) {
			return {
				ok: false,
				description: (error as Error).message,
			};
		}
	}

	/**
	 * Close forum topic
	 */
	/**
	 * Close forum topic
	 *
	 * @method closeForumTopic
	 * @description Closes a forum topic, preventing new messages.
	 * Used for resolved alerts or ephemeral discussions (9.1.1.2.4.1.0).
	 *
	 * @param {string | number} chatId - Telegram supergroup chat ID
	 * @param {number} messageThreadId - Topic thread ID to close
	 *
	 * @returns {Promise<TelegramBotApiResponse>} Telegram API response
	 *
	 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#9112410|Closing Topics (9.1.1.2.4.1.0)}
	 */
	async closeForumTopic(
		chatId: string | number,
		messageThreadId: number,
	): Promise<TelegramBotApiResponse> {
		if (!this.botToken) {
			return { ok: false, description: "Bot token not configured" };
		}

		try {
			const params = new URLSearchParams({
				chat_id: String(chatId),
				message_thread_id: String(messageThreadId),
			});

			const response = await fetch(
				`${this.apiBase}${this.botToken}/closeForumTopic?${params}`,
			);

			return await response.json();
		} catch (error) {
			return {
				ok: false,
				description: (error as Error).message,
			};
		}
	}

	/**
	 * Reopen forum topic
	 */
	/**
	 * Reopen forum topic
	 *
	 * @method reopenForumTopic
	 * @description Reopens a previously closed forum topic.
	 * Used when a resolved alert needs further investigation (9.1.1.2.4.1.0).
	 *
	 * @param {string | number} chatId - Telegram supergroup chat ID
	 * @param {number} messageThreadId - Topic thread ID to reopen
	 *
	 * @returns {Promise<TelegramBotApiResponse>} Telegram API response
	 *
	 * @see {@link ../docs/9.0.0.0.0.0.0-COMMUNICATION-NOTIFICATION.md#9112410|Reopening Topics (9.1.1.2.4.1.0)}
	 */
	async reopenForumTopic(
		chatId: string | number,
		messageThreadId: number,
	): Promise<TelegramBotApiResponse> {
		if (!this.botToken) {
			return { ok: false, description: "Bot token not configured" };
		}

		try {
			const params = new URLSearchParams({
				chat_id: String(chatId),
				message_thread_id: String(messageThreadId),
			});

			const response = await fetch(
				`${this.apiBase}${this.botToken}/reopenForumTopic?${params}`,
			);

			return await response.json();
		} catch (error) {
			return {
				ok: false,
				description: (error as Error).message,
			};
		}
	}

	/**
	 * Delete forum topic
	 */
	async deleteForumTopic(
		chatId: string | number,
		messageThreadId: number,
	): Promise<TelegramBotApiResponse> {
		if (!this.botToken) {
			return { ok: false, description: "Bot token not configured" };
		}

		try {
			const params = new URLSearchParams({
				chat_id: String(chatId),
				message_thread_id: String(messageThreadId),
			});

			const response = await fetch(
				`${this.apiBase}${this.botToken}/deleteForumTopic?${params}`,
			);

			return await response.json();
		} catch (error) {
			return {
				ok: false,
				description: (error as Error).message,
			};
		}
	}

	/**
	 * Select proxy based on URL pattern and priority
	 * Returns proxy configuration for Bun's fetch API
	 */
	private selectProxy(url: string): any {
		try {
			const match = this.proxyPattern.exec(url);
			if (!match || !match.hostname) return undefined;

			// Extract hostname string from URLPattern result
			const hostname = typeof match.hostname === 'string' 
				? match.hostname 
				: (match.hostname as any).input || '';

			// High priority -> direct connection for backup API
			if (hostname.includes('api2')) {
				return undefined; // No proxy for backup API
			}

			// Standard routing through proxy if configured
			const proxyUrl = process.env.TELEGRAM_PROXY_URL;
			if (!proxyUrl) return undefined;

			return {
				url: proxyUrl,
				headers: {
					'Proxy-Authorization': `Bearer ${process.env.TELEGRAM_PROXY_TOKEN || ''}`,
					'X-Telegram-API-Host': hostname,
				},
			};
		} catch {
			return undefined;
		}
	}

	/**
	 * Update connection statistics for monitoring
	 */
	private updateConnectionStats(): void {
		this.connectionStats.requests++;
		// Bun manages connection pooling internally, so we track request count
		// Actual socket counts would require Bun internals access
	}

	/**
	 * Get connection pool stats for debugging
	 */
	getConnectionStats(): { sockets: number; free: number; requests: number } {
		return { ...this.connectionStats };
	}
}

// Singleton Telegram Bot API client
export const telegramApi = new TelegramBotApi();

// ═══════════════════════════════════════════════════════════════
// WEBSOCKET SERVER
// ═══════════════════════════════════════════════════════════════

/**
 * WebSocket server for Telegram Mini App
 */
class TelegramWebSocketServer {
	private clients = new Map<number, ServerWebSocket<WebSocketData>>();
	private statusInterval: Timer | null = null;
	private readonly CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
	private readonly LIVE_TOPIC_THREAD_ID = parseInt(
		process.env.TELEGRAM_LIVE_TOPIC_ID || "47",
		10,
	);

	/**
	 * Handle WebSocket upgrade
	 */
	handleUpgrade(
		req: Request,
		server: Bun.Server<WebSocketData>,
	): Response | undefined {
		const url = new URL(req.url);
		const userId = parseInt(url.searchParams.get("user_id") || "0", 10);
		const username = url.searchParams.get("username") || undefined;

		if (!userId) {
			return new Response("Missing user_id parameter", { status: 400 });
		}

		// Verify Telegram Mini App init data (simplified - use proper validation in production)
		const initData = url.searchParams.get("init_data");
		if (initData && !this.validateTelegramInitData(initData, userId)) {
			return new Response("Invalid Telegram init data", { status: 401 });
		}

		// Upgrade to WebSocket using server.upgrade
		const success = server.upgrade(req, {
			data: {
				userId,
				username,
				connectedAt: Date.now(),
				lastPing: Date.now(),
			},
		});

		if (!success) {
			return new Response("WebSocket upgrade failed", { status: 500 });
		}

		return undefined; // Bun handles the upgrade
	}

	/**
	 * Handle WebSocket open
	 */
	handleOpen(ws: ServerWebSocket<WebSocketData>): void {
		const { userId, username } = ws.data;
		this.clients.set(userId, ws);

		console.log(`✅ WebSocket connected: User ${userId} (@${username})`);

		// Send initial status
		this.sendStatus(ws);

		// Start status broadcasting if first client
		if (this.clients.size === 1) {
			this.startStatusBroadcast();
		}

		// Send welcome message
		ws.send(
			JSON.stringify({
				type: "toast",
				title: "Connected to Sharp Bot",
			}),
		);
	}

	/**
	 * Handle WebSocket message
	 */
	async handleMessage(
		ws: ServerWebSocket<WebSocketData>,
		message: string | Buffer,
	): Promise<void> {
		const { userId } = ws.data;

		try {
			const data: WebSocketMessage = JSON.parse(
				typeof message === "string" ? message : message.toString(),
			);

			// Handle ping
			if (data.type === "ping") {
				ws.data.lastPing = Date.now();
				ws.send(JSON.stringify({ type: "pong" }));
				return;
			}

			// Handle broadcast action
			if (data.action === "broadcast" && data.text) {
				await this.handleBroadcast(ws, data.text, data.thread_id);
				return;
			}

			// Handle pin action
			if (data.action === "pin" && data.data?.messageId) {
				await this.handlePin(data.data.messageId, data.thread_id);
				return;
			}

			// Unknown message type
			ws.send(
				JSON.stringify({
					type: "error",
					message: `Unknown message type: ${data.type}`,
				}),
			);
		} catch (error) {
			console.error(`❌ WebSocket message error (User ${userId}):`, error);
			ws.send(
				JSON.stringify({
					type: "error",
					message: (error as Error).message,
				}),
			);
		}
	}

	/**
	 * Handle WebSocket close
	 */
	handleClose(ws: ServerWebSocket<WebSocketData>): void {
		const { userId } = ws.data;

		// Debug logging using native ws.subscriptions getter (Bun 1.3.2+)
		if (process.env.NODE_ENV === "development") {
			const nativeSubscriptions = ws.subscriptions;
			console.log(
				`[Telegram WS] User ${userId} closing. Active subscriptions:`,
				Array.from(nativeSubscriptions || []),
			);
		}

		this.clients.delete(userId);

		console.log(`❌ WebSocket disconnected: User ${userId}`);

		// Stop status broadcasting if no clients
		if (this.clients.size === 0) {
			this.stopStatusBroadcast();
		}
	}

	/**
	 * Handle broadcast message
	 */
	private async handleBroadcast(
		ws: ServerWebSocket<WebSocketData>,
		text: string,
		threadId?: number,
	): Promise<void> {
		const { userId } = ws.data;
		const targetThreadId = threadId || this.LIVE_TOPIC_THREAD_ID;

		// Verify user has permission (simplified - check user role in production)
		const user = botState.getUser(userId);
		if (!user || (!user.permissions.includes("all") && user.role !== "Admin")) {
			ws.send(
				JSON.stringify({
					type: "error",
					message: "Permission denied",
				}),
			);
			return;
		}

		// Send message to Telegram topic
		const result = await telegramApi.sendAndPin(
			this.CHAT_ID,
			text,
			targetThreadId,
		);

		if (result.ok) {
			// Update bot state
			botState.incrementMessages(botState.getStatus().activeUsers);
			botState.incrementAlerts();

			// Broadcast to all connected clients
			this.broadcast({
				type: "broadcast",
				data: {
					text,
					threadId: targetThreadId,
					sentBy: userId,
					sentAt: Date.now(),
				},
			});

			// Send success toast
			ws.send(
				JSON.stringify({
					type: "toast",
					title: "Message sent and pinned!",
				}),
			);
		} else {
			ws.send(
				JSON.stringify({
					type: "error",
					message: result.error || "Failed to send message",
				}),
			);
		}
	}

	/**
	 * Handle pin message
	 */
	private async handlePin(messageId: number, threadId?: number): Promise<void> {
		const targetThreadId = threadId || this.LIVE_TOPIC_THREAD_ID;

		await telegramApi.pinMessage(this.CHAT_ID, messageId, targetThreadId);
	}

	/**
	 * Send status to specific client
	 */
	private sendStatus(ws: ServerWebSocket<WebSocketData>): void {
		const status = botState.getStatus();
		ws.send(
			JSON.stringify({
				type: "status",
				data: status,
			}),
		);
	}

	/**
	 * Broadcast message to all clients
	 */
	private broadcast(message: WebSocketMessage): void {
		const messageStr = JSON.stringify(message);
		for (const ws of this.clients.values()) {
			try {
				ws.send(messageStr);
			} catch (error) {
				console.error("Failed to send to client:", error);
			}
		}
	}

	/**
	 * Start status broadcast interval
	 */
	private startStatusBroadcast(): void {
		if (this.statusInterval) return;

		this.statusInterval = setInterval(() => {
			const status = botState.getStatus();
			this.broadcast({
				type: "status",
				data: status,
			});
		}, 1000); // Broadcast every second

		console.log("📡 Started status broadcast");
	}

	/**
	 * Stop status broadcast interval
	 */
	private stopStatusBroadcast(): void {
		if (this.statusInterval) {
			clearInterval(this.statusInterval);
			this.statusInterval = null;
			console.log("📡 Stopped status broadcast");
		}
	}

	/**
	 * Validate Telegram Mini App init data (simplified)
	 * In production, use proper HMAC-SHA-256 validation
	 */
	private validateTelegramInitData(initData: string, userId: number): boolean {
		// Simplified validation - in production, verify HMAC signature
		// See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
		try {
			const params = new URLSearchParams(initData);
			const hash = params.get("hash");
			const dataUserId = params.get("user");

			if (!hash || !dataUserId) return false;

			// Parse user ID from JSON
			const userData = JSON.parse(decodeURIComponent(dataUserId));
			return userData.id === userId;
		} catch {
			return false;
		}
	}

	/**
	 * Get connected clients count
	 */
	getConnectedCount(): number {
		return this.clients.size;
	}

	/**
	 * Broadcast live out to all clients
	 */
	broadcastLiveOut(liveOut: LiveOut): void {
		this.broadcast({
			type: "live_out",
			data: liveOut,
		});
	}
}

// Singleton WebSocket server instance
export const telegramWsServer = new TelegramWebSocketServer();

// ═══════════════════════════════════════════════════════════════
// WEBSOCKET HANDLER FOR BUN.SERVE
// ═══════════════════════════════════════════════════════════════

/**
 * WebSocket handler function for Bun.serve
 */
export function handleTelegramWebSocket(
	req: Request,
	server: Bun.Server<WebSocketData>,
): Response | undefined {
	return telegramWsServer.handleUpgrade(req, server);
}

/**
 * WebSocket message handler
 */
export function handleTelegramWebSocketMessage(
	ws: ServerWebSocket<WebSocketData>,
	message: string | Buffer,
): void {
	telegramWsServer.handleMessage(ws, message);
}

/**
 * WebSocket open handler
 */
export function handleTelegramWebSocketOpen(
	ws: ServerWebSocket<WebSocketData>,
): void {
	telegramWsServer.handleOpen(ws);
}

/**
 * WebSocket close handler
 */
export function handleTelegramWebSocketClose(
	ws: ServerWebSocket<WebSocketData>,
): void {
	telegramWsServer.handleClose(ws);
}
