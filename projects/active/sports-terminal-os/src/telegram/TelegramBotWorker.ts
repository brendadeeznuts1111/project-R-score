/**
 * TelegramBotWorker — Bot Worker Class
 *
 * Production-grade bot worker that:
 *   - Consumes events from Redis Streams via XREADGROUP
 *   - Resolves topics via TopicManager (3-tier fallback)
 *   - Formats messages as HTML with severity emojis (🔴🟠🟡🟢)
 *   - Sends via SendMessageClient with rate limiting, dedup, retries
 *   - Logs delivery success/failure to telegram_dispatch_log
 *   - Writes heartbeats to bot_heartbeat every 30s
 *   - Reclaims stale entries from dead consumers every 30s
 *   - Handles graceful shutdown on SIGINT, SIGTERM, SIGUSR2
 *
 * Acknowledges entries regardless of success (XACK always).
 * Failed events are logged to telegram_dispatch_log for audit.
 */

import Redis from "ioredis";
import { Database } from "bun:sqlite";
import { SendMessageClient, escapeHtml } from "./SendMessageClient";
import { TopicManager, type TopicResolution } from "./TopicManager";
import {
  ensureConsumerGroup,
  claimStaleEntries,
} from "./queue-publisher";
import { createLogger } from "@utils/logger";

const logger = createLogger("TelegramBotWorker");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BotWorkerConfig {
  botId: string; // 'risk_bot', 'payment_bot', 'agent_bot'
  token: string; // Telegram bot token
  streams: string[]; // Redis streams to consume
  dbPath: string; // Path to SQLite database
  redisUrl: string;
  // Optional tuning
  blockTimeoutMs?: number; // XREADGROUP BLOCK ms (default: 5000)
  heartbeatIntervalMs?: number; // (default: 30000)
  staleClaimIntervalMs?: number; // (default: 30000)
  maxBatchSize?: number; // Entries per read (default: 10)
}

export interface DeliveryResult {
  success: boolean;
  messageId?: number;
  error?: string;
  latencyMs: number;
}

// ---------------------------------------------------------------------------
// Severity emojis
// ---------------------------------------------------------------------------

const SEVERITY_EMOJI: Record<string, string> = {
  CRITICAL: "🔴",
  HIGH: "🟠",
  MEDIUM: "🟡",
  LOW: "🟢",
};

// ---------------------------------------------------------------------------
// TelegramBotWorker class
// ---------------------------------------------------------------------------

export class TelegramBotWorker {
  private db: Database;
  private redis: Redis;
  private client: SendMessageClient;
  private topicManager: TopicManager;
  private running = false;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private staleClaimTimer: ReturnType<typeof setInterval> | null = null;
  private startTime = Date.now();
  private messagesDelivered = 0;
  private messagesFailed = 0;

  constructor(private config: BotWorkerConfig) {
    this.db = new Database(config.dbPath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA foreign_keys = ON");

    this.redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (t) => Math.min(t * 1000, 10000),
    });

    this.client = new SendMessageClient(config.token, {
      perChatRateMs: 1200,
      globalRateMs: 34,
      maxRetries: 3,
    });

    this.topicManager = new TopicManager(this.db);
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async start(): Promise<void> {
    logger.info(`Starting worker ${this.config.botId}...`);
    this.running = true;

    // Ensure consumer groups exist for all streams
    for (const stream of this.config.streams) {
      await ensureConsumerGroup(stream, this.config.botId);
    }

    // Ensure topics exist for all assigned supergroups
    await this.topicManager.ensureAllTopics(this.config.botId, [
      "general",
      "approvals",
      "riskAlerts",
      "betAlerts",
      "deposits",
      "withdrawals",
      "settlement",
      "reports",
      "admin",
    ]);

    // Start heartbeat and stale claim reaper
    this.startHeartbeat();
    this.startStaleClaimReaper();

    logger.info(
      `${this.config.botId} ready, consuming from: ${this.config.streams.join(", ")}`
    );

    // Main consume loop (blocks until stop() called)
    await this.consumeLoop();
  }

  stop(): void {
    logger.info(`Stopping worker ${this.config.botId}...`);
    this.running = false;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.staleClaimTimer) {
      clearInterval(this.staleClaimTimer);
      this.staleClaimTimer = null;
    }
  }

  getStats() {
    return {
      botId: this.config.botId,
      uptimeMs: Date.now() - this.startTime,
      messagesDelivered: this.messagesDelivered,
      messagesFailed: this.messagesFailed,
      running: this.running,
    };
  }

  // ---------------------------------------------------------------------------
  // Consume loop — XREADGROUP with XACK
  // ---------------------------------------------------------------------------

  private async consumeLoop(): Promise<void> {
    const blockMs = this.config.blockTimeoutMs ?? 5000;
    const batchSize = this.config.maxBatchSize ?? 10;
    const streamKeys = this.config.streams;

    // Track last successful read time for health checks
    while (this.running) {
      try {
        const results = await this.redis.xreadgroup(
          "GROUP",
          this.config.botId,
          this.config.botId, // consumer name = botId
          "COUNT",
          batchSize,
          "BLOCK",
          blockMs,
          "STREAMS",
          ...streamKeys,
          ...streamKeys.map(() => ">") // '>' = only new entries
        );

        if (!results) continue; // Timeout, loop again

        for (const [stream, entries] of results as any) {
          for (const [id, fields] of entries) {
            // Extract payload from field pairs [key, value, key, value, ...]
            let payload: string | null = null;
            for (let i = 0; i < fields.length; i += 2) {
              if (fields[i] === "data") {
                payload = fields[i + 1];
                break;
              }
            }

            if (!payload) {
              logger.warn(`Empty payload in ${String(stream)}:${String(id)}`);
              await this.redis.xack(
                String(stream),
                this.config.botId,
                String(id)
              );
              continue;
            }

            let event: any;
            try {
              event = JSON.parse(payload);
            } catch {
              logger.error(`Invalid JSON payload in ${String(stream)}:${String(id)}`);
              await this.redis.xack(
                String(stream),
                this.config.botId,
                String(id)
              );
              continue;
            }

            try {
              await this.handleEvent(event);
              this.messagesDelivered++;
            } catch (err: any) {
              logger.error(`Event error: ${err.message}`, {
                eventType: event?.type,
                agentLogin: event?.agentLogin,
              });
              this.messagesFailed++;
              await this.logFailure(event, err.message);
            }

            // Acknowledge regardless of handle success to avoid infinite retry
            await this.redis.xack(
              String(stream),
              this.config.botId,
              String(id)
            );
          }
        }
      } catch (err: any) {
        logger.error(`Consume loop error: ${err.message}`);
        // Brief pause before retry to avoid tight error loops
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Event handler with 3-tier topic resolution
  // ---------------------------------------------------------------------------

  private async handleEvent(event: any): Promise<void> {
    // Control events (no Telegram sending)
    if (event.type === "topic_refresh") {
      logger.info("Handling topic_refresh control event");
      await this.topicManager.ensureAllTopics(
        event.payload?.botId || this.config.botId,
        event.payload?.purposes || ["general"]
      );
      return;
    }

    if (event.type === "bot_heartbeat") {
      // Just acknowledge — our own heartbeat timer handles this
      return;
    }

    // Resolve topic with 3-tier fallback
    const { agentLogin, purpose, supergroupChatId } = event;
    let topic: TopicResolution | null = null;

    // Tier 1: Agent-specific purpose topic
    if (agentLogin) {
      topic = this.topicManager.getAgentTopic(agentLogin, purpose);
    }

    // Tier 2: Fallback to general topic for the supergroup
    if (!topic && supergroupChatId) {
      topic = this.topicManager.getFallbackTopic(supergroupChatId);
    }

    // Tier 3: If we have agentLogin but no supergroupChatId, try harder
    if (!topic && agentLogin) {
      topic = this.topicManager.getAgentTopic(agentLogin, "general");
    }

    if (!topic) {
      throw new Error(
        `No topic resolved for ${agentLogin}/${purpose}`
      );
    }

    // Format and send
    const messageText = this.formatMessage(event);
    const startTime = Date.now();

    const result = await this.client.sendMessage(topic.chatId, messageText, {
      message_thread_id: topic.threadId > 0 ? topic.threadId : undefined,
      parse_mode: "HTML",
      disable_notification: event.priority !== "critical",
    });

    const latencyMs = Date.now() - startTime;

    if (result.success) {
      await this.logSuccess(
        event,
        { success: true, messageId: result.messageId, latencyMs },
        topic
      );
    } else {
      throw new Error(result.error || "Send failed");
    }
  }

  // ---------------------------------------------------------------------------
  // HTML message formatting by event type
  // ---------------------------------------------------------------------------

  private formatMessage(event: any): string {
    const { type, payload } = event;

    switch (type) {
      case "risk_alert":
        return this.formatRiskAlert(payload);
      case "risk_cleared":
        return this.formatRiskCleared(payload);
      case "deposit_request":
        return this.formatDeposit(payload);
      case "withdrawal_request":
        return this.formatWithdrawal(payload);
      case "performance_update":
        return this.formatPerformance(payload);
      case "hierarchy_change":
        return this.formatHierarchyChange(payload);
      case "payment_approved":
        return this.formatPaymentApproved(payload);
      case "agent_flagged":
        return this.formatAgentFlagged(payload);
      default:
        return `<b>${escapeHtml(type)}</b>\n<pre>${escapeHtml(
          JSON.stringify(payload, null, 2)
        )}</pre>`;
    }
  }

  private formatRiskAlert(p: any): string {
    const emoji =
      p.severity === "CRITICAL"
        ? "🔴"
        : p.severity === "HIGH"
          ? "🟠"
          : "🟡";
    return [
      `${emoji} <b>RISK ALERT — ${escapeHtml(p.severity)}</b>`,
      "",
      `Player: <code>${escapeHtml(p.playerId)}</code>`,
      p.playerLogin ? `Login: ${escapeHtml(p.playerLogin)}` : "",
      `Wager: ${escapeHtml(String(p.wagerNumber || "N/A"))}`,
      `Score: ${p.riskScore}`,
      "",
      escapeHtml(p.message),
      p.alertId ? `\n<i>ID: ${escapeHtml(p.alertId)}</i>` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  private formatRiskCleared(p: any): string {
    return [
      `🟢 <b>RISK CLEARED</b>`,
      ``,
      `Player: <code>${escapeHtml(p.playerId)}</code>`,
      `Reason: ${escapeHtml(p.reason)}`,
      `\n<i>Cleared at: ${escapeHtml(p.clearedAt)}</i>`,
    ].join("\n");
  }

  private formatDeposit(p: any): string {
    return [
      `💰 <b>DEPOSIT REQUEST</b>`,
      ``,
      `Player: <code>${escapeHtml(p.playerId)}</code>`,
      p.playerLogin ? `Login: ${escapeHtml(p.playerLogin)}` : "",
      `Amount: ${p.amount} ${escapeHtml(p.currency)}`,
      `Method: ${escapeHtml(p.method)}`,
      `TX: <code>${escapeHtml(p.transactionId)}</code>`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  private formatWithdrawal(p: any): string {
    const emoji = p.riskFlag ? "🔴" : "💸";
    return [
      `${emoji} <b>WITHDRAWAL REQUEST</b>`,
      ``,
      `Player: <code>${escapeHtml(p.playerId)}</code>`,
      `Amount: ${p.amount} ${escapeHtml(p.currency)}`,
      p.riskFlag ? `⚠️ <b>RISK FLAGGED</b>` : "",
      `TX: <code>${escapeHtml(p.transactionId)}</code>`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  private formatPerformance(p: any): string {
    return [
      `📊 <b>PERFORMANCE UPDATE</b>`,
      ``,
      `Agent: ${escapeHtml(p.agentLogin)}`,
      `Period: ${escapeHtml(p.period)}`,
      `GGR: ${p.ggr}`,
      `NGR: ${p.ngr}`,
      `Active Players: ${p.activePlayers}`,
    ].join("\n");
  }

  private formatHierarchyChange(p: any): string {
    const emoji =
      p.action === "assigned"
        ? "🔗"
        : p.action === "removed"
          ? "❌"
          : "↔️";
    return [
      `${emoji} <b>HIERARCHY CHANGE</b>`,
      ``,
      `Agent: ${escapeHtml(p.agentLogin)}`,
      `Action: ${escapeHtml(p.action)}`,
      p.parentAgent ? `Parent: ${escapeHtml(p.parentAgent)}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  private formatPaymentApproved(p: any): string {
    return [
      `✅ <b>PAYMENT APPROVED</b>`,
      ``,
      `Player: <code>${escapeHtml(p.playerId)}</code>`,
      `Amount: ${p.amount} ${escapeHtml(p.type || "")}`,
      `Approver: ${escapeHtml(p.approver)}`,
    ].join("\n");
  }

  private formatAgentFlagged(p: any): string {
    const emoji = "🔴";
    return [
      `${emoji} <b>AGENT FLAGGED</b>`,
      ``,
      `Agent: ${escapeHtml(p.agentLogin)}`,
      `Flag Type: ${escapeHtml(p.flagType)}`,
      `Reason: ${escapeHtml(p.reason)}`,
    ].join("\n");
  }

  // ---------------------------------------------------------------------------
  // Heartbeat timer — writes to bot_heartbeat every 30s
  // ---------------------------------------------------------------------------

  private startHeartbeat(): void {
    const interval = this.config.heartbeatIntervalMs ?? 30000;
    this.heartbeatTimer = setInterval(async () => {
      try {
        const uptimeSeconds = Math.floor(
          (Date.now() - this.startTime) / 1000
        );

        // Count topics managed by this bot
        const topicsResult = this.db
          .query(
            `
            SELECT COUNT(*) as c FROM agent_supergroups
            WHERE bot_id = ? AND is_active = 1
          `
          )
          .get(this.config.botId) as { c: number };

        this.db.run(
          `
          INSERT INTO bot_heartbeat
            (bot_id, status, last_heartbeat, messages_delivered, messages_failed,
             topics_managed, uptime_seconds, error_count)
          VALUES (?, 'running', datetime('now'), ?, ?, ?, ?, 0)
          ON CONFLICT(bot_id) DO UPDATE SET
            status = 'running',
            last_heartbeat = datetime('now'),
            messages_delivered = excluded.messages_delivered,
            messages_failed = excluded.messages_failed,
            topics_managed = excluded.topics_managed,
            uptime_seconds = excluded.uptime_seconds,
            updated_at = datetime('now')
        `,
          [
            this.config.botId,
            this.messagesDelivered,
            this.messagesFailed,
            topicsResult.c,
            uptimeSeconds,
          ]
        );
      } catch (err: any) {
        logger.error(`Heartbeat failed: ${err.message}`);
      }
    }, interval);
  }

  // ---------------------------------------------------------------------------
  // Stale entry reaper — claims from dead consumers every 30s
  // ---------------------------------------------------------------------------

  private startStaleClaimReaper(): void {
    const interval = this.config.staleClaimIntervalMs ?? 30000;
    this.staleClaimTimer = setInterval(async () => {
      for (const stream of this.config.streams) {
        try {
          const claimed = await claimStaleEntries(
            stream,
            this.config.botId,
            this.config.botId,
            30000
          );
          if (claimed > 0) {
            logger.info(
              `Reclaimed ${claimed} stale entries from ${stream}`
            );
          }
        } catch {
          // Silently ignore — next cycle will retry
        }
      }
    }, interval);
  }

  // ---------------------------------------------------------------------------
  // Delivery logging
  // ---------------------------------------------------------------------------

  private async logSuccess(
    event: any,
    result: DeliveryResult,
    topic: TopicResolution
  ): Promise<void> {
    try {
      this.db.run(
        `
        INSERT INTO telegram_dispatch_log
          (bot_id, event_type, agent_login, chat_id, thread_id,
           purpose, status, latency_ms, telegram_message_id,
           payload_preview, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'success', ?, ?, ?, datetime('now'))
      `,
        [
          this.config.botId,
          event.type || "unknown",
          event.agentLogin || null,
          topic.chatId,
          topic.threadId,
          event.purpose || null,
          result.latencyMs,
          result.messageId || null,
          JSON.stringify(event.payload).slice(0, 500),
        ]
      );
    } catch (err: any) {
      logger.error(`Failed to log success: ${err.message}`);
    }
  }

  private async logFailure(event: any, error: string): Promise<void> {
    try {
      this.db.run(
        `
        INSERT INTO telegram_dispatch_log
          (bot_id, event_type, agent_login,
           purpose, status, error,
           payload_preview, created_at)
          VALUES (?, ?, ?, ?, 'failed', ?, ?, datetime('now'))
        `,
        [
          this.config.botId,
          event.type || "unknown",
          event.agentLogin || null,
          event.purpose || null,
          error.slice(0, 500),
          JSON.stringify(event.payload).slice(0, 500),
        ]
      );
    } catch (err: any) {
      logger.error(`Failed to log failure: ${err.message}`);
    }
  }
}
