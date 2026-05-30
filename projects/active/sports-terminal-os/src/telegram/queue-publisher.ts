/**
 * Redis Streams Publisher — Telegram Hub
 *
 * Provides:
 *   - publishEvent(): Fire-and-forget non-blocking event publishing
 *   - publishEvents(): Batch pipeline for multiple events
 *   - Event validation schema using Zod
 *   - Consumer group management: ensureConsumerGroup(), XGROUP CREATE
 *   - Stream length and pending count queries for monitoring
 *
 * Streams: risk_alerts, payment_events, agent_events, system_events
 *
 * Design: All publish functions are non-blocking. Errors are caught and
 * logged internally — they NEVER throw back to the caller.
 */

import Redis from "ioredis";
import { z } from "zod";
import { createLogger } from "@utils/logger";

const logger = createLogger("QueuePublisher");

// ---------------------------------------------------------------------------
// Redis connection factory (per-worker isolation)
// ---------------------------------------------------------------------------

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(
      process.env.REDIS_URL || "redis://localhost:6379",
      {
        maxRetriesPerRequest: parseInt(
          process.env.REDIS_MAX_RETRIES || "3",
          10
        ),
        retryStrategy: (times) =>
          Math.min(
            times *
              parseInt(process.env.REDIS_RETRY_DELAY_MS || "1000", 10),
            10000
          ),
        enableReadyCheck: true,
        showFriendlyErrorStack:
          process.env.NODE_ENV === "development",
      }
    );

    redisInstance.on("error", (err) => {
      logger.error(`Redis connection error: ${err.message}`);
    });

    redisInstance.on("connect", () => {
      logger.info("Redis connected");
    });

    redisInstance.on("reconnecting", () => {
      logger.warn("Redis reconnecting...");
    });
  }
  return redisInstance;
}

export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
}

// ---------------------------------------------------------------------------
// Event validation schema (Zod)
// ---------------------------------------------------------------------------

const VALID_STREAMS = [
  "risk_alerts",
  "payment_events",
  "agent_events",
  "system_events",
] as const;

const VALID_PURPOSES = [
  "general",
  "approvals",
  "riskAlerts",
  "betAlerts",
  "deposits",
  "withdrawals",
  "settlement",
  "reports",
  "admin",
] as const;

export const telegramEventSchema = z.object({
  type: z.string().min(1),
  agentLogin: z.string(),
  purpose: z.enum(VALID_PURPOSES),
  supergroupChatId: z.number().optional(),
  priority: z.enum(["low", "normal", "critical"]).optional(),
  payload: z.record(z.any()),
  timestamp: z.string().optional(),
  source: z.string().optional(),
});

export type TelegramEvent = z.infer<typeof telegramEventSchema>;

export function validateEvent(
  event: Partial<TelegramEvent>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!event.type) errors.push("Missing event.type");
  if (!event.agentLogin && !event.supergroupChatId) {
    errors.push("Need agentLogin or supergroupChatId for routing");
  }
  if (!event.purpose) errors.push("Missing event.purpose");
  if (
    event.purpose &&
    !VALID_PURPOSES.includes(event.purpose as (typeof VALID_PURPOSES)[number])
  ) {
    errors.push(`Invalid purpose: ${event.purpose}`);
  }
  if (!event.payload || typeof event.payload !== "object") {
    errors.push("Missing or invalid event.payload");
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Publisher functions (fire-and-forget, non-blocking)
// ---------------------------------------------------------------------------

/**
 * Publish a single event to a Redis Stream.
 * Non-blocking: fire-and-forget with best-effort delivery.
 * Never throws — errors are caught and logged internally.
 */
export async function publishEvent(
  stream: string,
  event: Omit<TelegramEvent, "timestamp"> & { timestamp?: string }
): Promise<string | null> {
  try {
    const redis = getRedis();
    const enriched: TelegramEvent = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    };

    // Validate before sending
    const validation = validateEvent(enriched);
    if (!validation.valid) {
      logger.warn(
        `Event validation failed for ${stream}: ${validation.errors.join(", ")}`
      );
      return null;
    }

    // Use MAXLEN ~ 10000 to auto-truncate old entries
    const messageId = await redis.xadd(
      stream,
      "MAXLEN",
      "~",
      "10000",
      "*",
      "data",
      JSON.stringify(enriched)
    );

    logger.debug(`Published to ${stream}: ${messageId}`);
    return messageId;
  } catch (err) {
    // Log but don't throw — don't block the calling service
    logger.error(
      `Failed to publish to ${stream}: ${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  }
}

/**
 * Publish multiple events in a pipeline (batch).
 * Non-blocking — errors caught and logged, nulls returned for failed items.
 */
export async function publishEvents(
  stream: string,
  events: Omit<TelegramEvent, "timestamp">[]
): Promise<(string | null)[]> {
  try {
    const redis = getRedis();
    const pipeline = redis.pipeline();

    for (const event of events) {
      const enriched = {
        ...event,
        timestamp: (event as { timestamp?: string }).timestamp || new Date().toISOString(),
      };

      // Skip invalid events in batch
      const validation = validateEvent(enriched);
      if (!validation.valid) {
        logger.warn(
          `Skipping invalid event in batch: ${validation.errors.join(", ")}`
        );
        continue;
      }

      pipeline.xadd(
        stream,
        "MAXLEN",
        "~",
        "10000",
        "*",
        "data",
        JSON.stringify(enriched)
      );
    }

    const results = await pipeline.exec();
    return (
      results?.map((r) => (r[1] as string) || null) ??
      events.map(() => null)
    );
  } catch (err) {
    logger.error(
      `Batch publish failed for ${stream}: ${err instanceof Error ? err.message : String(err)}`
    );
    return events.map(() => null);
  }
}

// ---------------------------------------------------------------------------
// Consumer group management
// ---------------------------------------------------------------------------

/**
 * Ensure a consumer group exists for a stream.
 * Idempotent: creates only if not exists (MKSTREAM handles missing stream).
 */
export async function ensureConsumerGroup(
  stream: string,
  group: string
): Promise<void> {
  const redis = getRedis();
  try {
    await redis.xgroup("CREATE", stream, group, "$", "MKSTREAM");
    logger.info(`Created consumer group ${group} for stream ${stream}`);
  } catch (err: any) {
    if (err.message?.includes("BUSYGROUP")) {
      // Group already exists — expected, not an error
      return;
    }
    logger.error(
      `Failed to create consumer group ${group} for ${stream}: ${err.message}`
    );
    throw err;
  }
}

/**
 * Claim stale pending entries from dead consumers.
 * Call periodically (every 30s) to handle crashed workers.
 */
export async function claimStaleEntries(
  stream: string,
  group: string,
  consumer: string,
  minIdleMs: number = 30000
): Promise<number> {
  const redis = getRedis();

  try {
    // Get pending entries idle longer than minIdleMs
    const pending = await redis.xpending(
      stream,
      group,
      "IDLE",
      minIdleMs,
      "-",
      "+",
      100
    );
    if (!pending || pending.length === 0) return 0;

    const ids = pending.map((p: any) => p[0]); // entry IDs

    // Claim them for this consumer
    const claimed = await redis.xclaim(
      stream,
      group,
      consumer,
      minIdleMs,
      ...ids
    );

    const count = claimed?.length || 0;
    if (count > 0) {
      logger.info(`Reclaimed ${count} stale entries from ${stream}`);
    }
    return count;
  } catch (err: any) {
    logger.error(
      `Stale claim failed for ${stream}: ${err.message}`
    );
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Monitoring queries
// ---------------------------------------------------------------------------

/**
 * Get queue depth (stream length) for monitoring.
 */
export async function getStreamLength(
  stream: string
): Promise<number> {
  try {
    const redis = getRedis();
    return await redis.xlen(stream);
  } catch {
    return -1;
  }
}

/**
 * Get pending entry count for a consumer group.
 */
export async function getPendingCount(
  stream: string,
  group: string
): Promise<number> {
  try {
    const redis = getRedis();
    const info = await redis.xpending(stream, group);
    return info ? (info as any)[0] : 0; // [total, ...]
  } catch {
    return -1;
  }
}
