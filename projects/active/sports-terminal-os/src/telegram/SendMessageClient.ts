/**
 * SendMessageClient — Telegram Hub
 *
 * Provides:
 *   - sendMessage(): Send Telegram message with rate limiting, dedup, retries
 *   - sendToTopic(): Send to a specific forum topic thread
 *   - Rate limiting: max 30 messages/second global
 *   - Deduplication: message hash check (5 min window)
 *   - Retries: 3 attempts with exponential backoff
 *   - HTML parsing mode support
 */

import { createLogger } from "@utils/logger";
import { h2Fetch } from "@utils/h2-fetch";

const logger = createLogger("SendMessageClient");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SendOptions {
  message_thread_id?: number;
  parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
  disable_notification?: boolean;
  reply_to_message_id?: number;
}

export interface SendResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MAX_MSG_PER_SEC = 30;
const MSG_WINDOW_MS = 1000;
const DEDUP_WINDOW_MS = 300000; // 5 minutes
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;

// ---------------------------------------------------------------------------
// HTML escaping utility
// ---------------------------------------------------------------------------

/**
 * Escape HTML special characters for Telegram HTML parse mode.
 * All user-generated content must pass through this before inclusion
 * in message HTML.
 */
export function escapeHtml(text: string | number | undefined): string {
  if (text === undefined || text === null) return "";
  const str = String(text);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Simple hash for deduplication
// ---------------------------------------------------------------------------

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return `h${Math.abs(h).toString(36)}`;
}

// ---------------------------------------------------------------------------
// SendMessageClient class
// ---------------------------------------------------------------------------

export class SendMessageClient {
  /** Ring buffer of recent send timestamps for rate limiting */
  private sendTimestamps: number[] = [];
  /** Map of message hash -> expiration time for deduplication */
  private dedupMap = new Map<string, number>();
  private apiUrl: string;

  constructor(
    private botToken: string,
    private options: {
      perChatRateMs?: number;
      globalRateMs?: number;
      maxRetries?: number;
    } = {}
  ) {
    this.apiUrl = `https://api.telegram.org/bot${botToken}`;
  }

  /**
   * Send a message to a chat with rate limiting, dedup, and retries.
   */
  async sendMessage(
    chatId: number,
    text: string,
    options: SendOptions = {}
  ): Promise<SendResult> {
    // Rate limiting
    await this.enforceRateLimit();

    // Deduplication check
    const dedupKey = `${chatId}:${simpleHash(text)}`;
    if (this.isDuplicate(dedupKey)) {
      logger.debug(`Deduplicated message to ${chatId}`);
      return { success: true };
    }
    this.recordDedup(dedupKey);

    // Build request body
    const body: Record<string, any> = {
      chat_id: chatId,
      text,
      parse_mode: options.parse_mode || "HTML",
    };
    if (options.message_thread_id && options.message_thread_id > 0) {
      body.message_thread_id = options.message_thread_id;
    }
    if (options.disable_notification !== undefined) {
      body.disable_notification = options.disable_notification;
    }
    if (options.reply_to_message_id) {
      body.reply_to_message_id = options.reply_to_message_id;
    }

    // Retry loop with exponential backoff
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await h2Fetch(`${this.apiUrl}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await response.json();

        if (data.ok) {
          this.recordSend();
          return { success: true, messageId: data.result?.message_id };
        }

        // Handle rate limit from Telegram
        if (data.error_code === 429) {
          const retryAfter = data.parameters?.retry_after || 1;
          logger.warn(`Telegram rate limit, retry after ${retryAfter}s`);
          await Bun.sleep(retryAfter * 1000);
          continue;
        }

        // Non-retryable error
        const errMsg = data.description || `Telegram error ${data.error_code}`;
        if (attempt >= MAX_RETRIES) {
          return { success: false, error: errMsg };
        }
      } catch (err: any) {
        const isLastAttempt = attempt >= MAX_RETRIES;
        if (isLastAttempt) {
          return {
            success: false,
            error: `Network error after ${MAX_RETRIES} retries: ${err.message}`,
          };
        }

        // Exponential backoff before retry
        const backoffMs = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
        logger.warn(
          `Send attempt ${attempt} failed: ${err.message}, retrying in ${backoffMs}ms`
        );
        await Bun.sleep(backoffMs);
      }
    }

    return { success: false, error: "Max retries exceeded" };
  }

  /**
   * Send a message to a specific forum topic.
   * Validates threadId > 0 (threadId 0 = main chat, not a topic).
   */
  async sendToTopic(
    chatId: number,
    threadId: number,
    text: string,
    options: Omit<SendOptions, "message_thread_id"> = {}
  ): Promise<SendResult> {
    if (threadId <= 0) {
      logger.warn(
        `Invalid threadId ${threadId} for topic send, using main chat`
      );
      return this.sendMessage(chatId, text, options);
    }
    return this.sendMessage(chatId, text, {
      ...options,
      message_thread_id: threadId,
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Enforce max 30 messages/second rate limit */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const windowStart = now - MSG_WINDOW_MS;

    // Remove timestamps outside the window
    this.sendTimestamps = this.sendTimestamps.filter((t) => t > windowStart);

    if (this.sendTimestamps.length >= MAX_MSG_PER_SEC) {
      const oldest = this.sendTimestamps[0];
      const waitMs = MSG_WINDOW_MS - (now - oldest);
      if (waitMs > 0) {
        logger.debug(`Rate limit: waiting ${waitMs}ms`);
        await Bun.sleep(waitMs);
      }
    }
  }

  private recordSend(): void {
    this.sendTimestamps.push(Date.now());
  }

  /** Check if a message is a duplicate (within 5-min window) */
  private isDuplicate(key: string): boolean {
    const expires = this.dedupMap.get(key);
    if (expires && Date.now() < expires) {
      return true;
    }
    return false;
  }

  private recordDedup(key: string): void {
    // Clean expired entries periodically
    if (this.dedupMap.size > 10000) {
      const now = Date.now();
      for (const [k, v] of this.dedupMap) {
        if (now > v) this.dedupMap.delete(k);
      }
    }
    this.dedupMap.set(key, Date.now() + DEDUP_WINDOW_MS);
  }
}


