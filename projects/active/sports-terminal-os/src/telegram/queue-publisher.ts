// @see https://bun.com/docs/runtime/redis — RedisClient
// @see https://bun.com/docs/runtime/environment-variables#setting-environment-variables — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
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
 *
 * Streams use RedisClient.send() (Bun has no dedicated X* helpers).
 */

import { RedisClient } from "bun";
import { z } from "zod";
import { createLogger } from "@utils/logger";

const logger = createLogger("QueuePublisher");

// ---------------------------------------------------------------------------
// Redis connection factory (per-worker isolation)
// ---------------------------------------------------------------------------

let redisInstance: RedisClient | null = null;

const COMMAND_TIMEOUT_MS = parseInt(Bun.env.REDIS_COMMAND_TIMEOUT_MS || "5000", 10);

export function getRedis(): RedisClient {
  if (!redisInstance) {
    redisInstance = new RedisClient(Bun.env.REDIS_URL || "redis://localhost:6379", {
      connectionTimeout: COMMAND_TIMEOUT_MS,
      autoReconnect: true,
      maxRetries: parseInt(Bun.env.REDIS_MAX_RETRIES || "3", 10),
    });

    redisInstance.onclose = (err) => {
      if (err) logger.error(`Redis connection closed: ${err.message}`);
    };

    redisInstance.onconnect = () => {
      logger.info("Redis connected");
    };
  }
  return redisInstance;
}

/** send with wall-clock timeout so publishers never hang callers forever */
async function sendWithTimeout(
  redis: RedisClient,
  command: string,
  args: string[],
  timeoutMs = COMMAND_TIMEOUT_MS
): Promise<unknown> {
  return await Promise.race([
    redis.send(command, args),
    Bun.sleep(timeoutMs).then(() => {
      throw new Error(`Redis ${command} timed out after ${timeoutMs}ms`);
    }),
  ]);
}

export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    redisInstance.close();
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

    // MAXLEN ~ 10000 auto-truncates old entries
    const messageId = (await sendWithTimeout(redis, "XADD", [
      stream,
      "MAXLEN",
      "~",
      "10000",
      "*",
      "data",
      JSON.stringify(enriched),
    ])) as string;

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
 * Publish multiple events (sequential XADD).
 * Non-blocking — errors caught and logged, nulls returned for failed items.
 */
export async function publishEvents(
  stream: string,
  events: Omit<TelegramEvent, "timestamp">[]
): Promise<(string | null)[]> {
  try {
    const redis = getRedis();
    const results: (string | null)[] = [];

    for (const event of events) {
      const enriched = {
        ...event,
        timestamp:
          (event as { timestamp?: string }).timestamp ||
          new Date().toISOString(),
      };

      const validation = validateEvent(enriched);
      if (!validation.valid) {
        logger.warn(
          `Skipping invalid event in batch: ${validation.errors.join(", ")}`
        );
        results.push(null);
        continue;
      }

      try {
        const messageId = (await sendWithTimeout(redis, "XADD", [
          stream,
          "MAXLEN",
          "~",
          "10000",
          "*",
          "data",
          JSON.stringify(enriched),
        ])) as string;
        results.push(messageId);
      } catch {
        results.push(null);
      }
    }

    return results;
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
    await sendWithTimeout(redis, "XGROUP", [
      "CREATE",
      stream,
      group,
      "$",
      "MKSTREAM",
    ]);
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
    // XPENDING stream group IDLE minIdle start end count
    const pending = (await sendWithTimeout(redis, "XPENDING", [
      stream,
      group,
      "IDLE",
      String(minIdleMs),
      "-",
      "+",
      "100",
    ])) as Array<[string, string, number, number]> | null;

    if (!pending || pending.length === 0) return 0;

    const ids = pending.map((p) => String(p[0]));

    const claimed = (await sendWithTimeout(redis, "XCLAIM", [
      stream,
      group,
      consumer,
      String(minIdleMs),
      ...ids,
    ])) as unknown[] | null;

    const count = claimed?.length || 0;
    if (count > 0) {
      logger.info(`Reclaimed ${count} stale entries from ${stream}`);
    }
    return count;
  } catch (err: any) {
    logger.error(`Stale claim failed for ${stream}: ${err.message}`);
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Monitoring queries
// ---------------------------------------------------------------------------

/**
 * Get queue depth (stream length) for monitoring.
 */
export async function getStreamLength(stream: string): Promise<number> {
  try {
    const redis = getRedis();
    return Number(await sendWithTimeout(redis, "XLEN", [stream]));
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
    const info = (await sendWithTimeout(redis, "XPENDING", [stream, group])) as
      | [number, string, string, [string, string][]]
      | null;
    return info?.[0] ?? 0;
  } catch {
    return -1;
  }
}
