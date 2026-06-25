/**
 * Telegram Hub API Routes
 *
 * Provides endpoints for bot health, delivery stats, topic status,
 * and administrative controls.
 *
 * Endpoints:
 *   GET  /api/health/system-status    — Overall health + per-bot status
 *   POST /api/admin/bots/refresh      — Publish topic_refresh events
 *   GET  /api/telegram/delivery-stats — Aggregate delivery metrics
 *   GET  /api/telegram/bot/:botId/stats — Per-bot stats
 *   GET  /api/telegram/bot/:botId/delivery-log — Delivery audit log
 *   GET  /api/telegram/topics-status  — Topic status overview
 *
 * Auth: Admin for refresh/mutations, viewer for stats reads.
 * All errors logged via tableLogger with [TelegramRoute] prefix.
 */

import { Database } from "bun:sqlite";
import { createLogger } from "@utils/logger";
import {
  getStreamLength,
  getPendingCount,
  publishEvent,
} from "../telegram/queue-publisher";
import type { AuthContext } from "@utils/types";

const logger = createLogger("TelegramRoute");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEALTHY_HEARTBEAT_MAX_MS = 60000; // 60s
const STREAMS = ["risk_alerts", "payment_events", "agent_events", "system_events"];

// ---------------------------------------------------------------------------
// Helper: get database instance
// ---------------------------------------------------------------------------

function getDb(): Database {
  const dbPath = process.env.DB_PATH || "./data/sports-terminal.db";
  const db = new Database(dbPath);
  db.exec("PRAGMA journal_mode = WAL");
  return db;
}

// ---------------------------------------------------------------------------
// GET /api/health/system-status
// ---------------------------------------------------------------------------

export async function handleSystemStatus(): Promise<Response> {
  try {
    const db = getDb();

    // Bot heartbeats
    const botRows = db
      .query(
        `
        SELECT bot_id, status, last_heartbeat, messages_delivered,
               messages_failed, topics_managed, uptime_seconds, error_count
        FROM bot_heartbeat
        ORDER BY bot_id
      `
      )
      .all() as Array<{
      bot_id: string;
      status: string;
      last_heartbeat: string;
      messages_delivered: number;
      messages_failed: number;
      topics_managed: number;
      uptime_seconds: number;
      error_count: number;
    }>;

    const now = Date.now();
    const telegramBots = botRows.map((row) => {
      const lastHeartbeatMs = new Date(row.last_heartbeat).getTime();
      const heartbeatAgeMs = now - lastHeartbeatMs;

      return {
        botId: row.bot_id,
        status:
          heartbeatAgeMs < HEALTHY_HEARTBEAT_MAX_MS ? "healthy" : "stale",
        lastHeartbeat: row.last_heartbeat,
        heartbeatAgeMs,
        uptimeMs: (row.uptime_seconds || 0) * 1000,
        messagesDelivered: row.messages_delivered,
        messagesFailed: row.messages_failed,
        topicsManaged: row.topics_managed,
        errorCount: row.error_count,
      };
    });

    // Queue metrics
    const queues = await Promise.all(
      STREAMS.map(async (stream) => ({
        stream,
        length: await getStreamLength(stream),
        pending: await getPendingCount(stream, "any_group"),
      }))
    );

    const isHealthy = telegramBots.every((b) => b.status === "healthy");

    return Response.json({
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      version: process.env.npm_package_version || "5.2.0",
      telegramBots,
      queues,
    });
  } catch (err: any) {
    logger.error(`System status error: ${err.message}`);
    return Response.json(
      {
        status: "error",
        error: err.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/bots/refresh
// ---------------------------------------------------------------------------

export async function handleBotsRefresh(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const targetBotId = body.botId as string | undefined;

    const db = getDb();

    // Determine which bots to refresh
    let botIds: string[];
    if (targetBotId) {
      botIds = [targetBotId];
    } else {
      const rows = db
        .query(
          `
          SELECT DISTINCT bot_id FROM agent_supergroups
          WHERE is_active = 1
        `
        )
        .all() as Array<{ bot_id: string }>;
      botIds = rows.map((r) => r.bot_id).filter(Boolean);
    }

    // Publish refresh control events
    const triggered: string[] = [];
    for (const botId of botIds) {
      await publishEvent("system_events", {
        type: "topic_refresh",
        agentLogin: "admin",
        purpose: "admin",
        payload: { botId, reason: "admin_triggered_refresh" },
        source: "AdminAPI",
      });
      triggered.push(botId);
    }

    logger.info(`Refresh published for bots: ${triggered.join(", ")}`);

    return Response.json({
      ok: true,
      botsTriggered: triggered,
      message: "Refresh events published to system_events stream",
    });
  } catch (err: any) {
    logger.error(`Bots refresh error: ${err.message}`);
    return Response.json(
      { error: err.message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/telegram/delivery-stats
// ---------------------------------------------------------------------------

export async function handleDeliveryStats(
  req: Request
): Promise<Response> {
  try {
    const url = new URL(req.url);
    const hours = parseInt(url.searchParams.get("hours") || "24", 10);
    const botId = url.searchParams.get("botId") || undefined;
    const purpose = url.searchParams.get("purpose") || undefined;

    const db = getDb();
    const from = new Date(
      Date.now() - hours * 3600 * 1000
    ).toISOString();
    const to = new Date().toISOString();

    // Build query conditions
    const conditions: string[] = [
      `created_at >= ? AND created_at <= ?`,
    ];
    const params: (string | number)[] = [from, to];

    if (botId) {
      conditions.push(`bot_id = ?`);
      params.push(botId);
    }
    if (purpose) {
      conditions.push(`purpose = ?`);
      params.push(purpose);
    }

    const where = conditions.join(" AND ");

    // Summary
    const summary = db
      .query(
        `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          AVG(CASE WHEN status = 'success' THEN latency_ms END) as avg_latency,
          MAX(CASE WHEN status = 'success' THEN latency_ms END) as max_latency
        FROM telegram_dispatch_log
        WHERE ${where}
      `
      )
      .get(...params) as {
      total: number;
      delivered: number;
      failed: number;
      avg_latency: number | null;
      max_latency: number | null;
    };

    // By bot
    const byBot = db
      .query(
        `
        SELECT
          bot_id as botId,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          AVG(latency_ms) as avgLatencyMs
        FROM telegram_dispatch_log
        WHERE ${where}
        GROUP BY bot_id
        ORDER BY delivered DESC
      `
      )
      .all(...params) as Array<{
      botId: string;
      total: number;
      delivered: number;
      failed: number;
      avgLatencyMs: number;
    }>;

    // By purpose
    const byPurpose = db
      .query(
        `
        SELECT
          purpose,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM telegram_dispatch_log
        WHERE ${where} AND purpose IS NOT NULL
        GROUP BY purpose
        ORDER BY delivered DESC
      `
      )
      .all(...params) as Array<{
      purpose: string;
      total: number;
      delivered: number;
      failed: number;
    }>;

    // By hour
    const byHour = db
      .query(
        `
        SELECT
          strftime('%H:00', created_at) as hour,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM telegram_dispatch_log
        WHERE ${where}
        GROUP BY strftime('%H', created_at)
        ORDER BY hour
      `
      )
      .all(...params) as Array<{
      hour: string;
      total: number;
      delivered: number;
      failed: number;
    }>;

    // Top failure reasons
    const topFailures = db
      .query(
        `
        SELECT
          error as errorMessage,
          COUNT(*) as count
        FROM telegram_dispatch_log
        WHERE ${where} AND status = 'failed' AND error IS NOT NULL
        GROUP BY error
        ORDER BY count DESC
        LIMIT 5
      `
      )
      .all(...params) as Array<{
      errorMessage: string;
      count: number;
    }>;

    return Response.json({
      period: { hours, from, to },
      summary: {
        totalEvents: summary.total,
        delivered: summary.delivered,
        failed: summary.failed,
        successRate:
          summary.total > 0
            ? summary.delivered / summary.total
            : 0,
        avgLatencyMs: Math.round(summary.avg_latency || 0),
        p99LatencyMs: Math.round(summary.max_latency || 0),
      },
      byBot,
      byPurpose,
      byHour,
      topFailures,
    });
  } catch (err: any) {
    logger.error(`Delivery stats error: ${err.message}`);
    return Response.json(
      { error: err.message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/telegram/bot/:botId/stats
// ---------------------------------------------------------------------------

export async function handleBotStats(
  req: Request,
  botId: string
): Promise<Response> {
  try {
    const db = getDb();

    const heartbeat = db
      .query(
        `
        SELECT
          bot_id, status, last_heartbeat, messages_delivered,
          messages_failed, topics_managed, uptime_seconds, error_count
        FROM bot_heartbeat
        WHERE bot_id = ?
      `
      )
      .get(botId) as {
      bot_id: string;
      status: string;
      last_heartbeat: string;
      messages_delivered: number;
      messages_failed: number;
      topics_managed: number;
      uptime_seconds: number;
      error_count: number;
    } | null;

    const supergroupCount = db
      .query(
        `
        SELECT COUNT(DISTINCT sg.id) as c
        FROM agent_supergroups sg
        WHERE sg.bot_id = ? AND sg.is_active = 1
      `
      )
      .get(botId) as { c: number };

    const topicCount = db
      .query(
        `
        SELECT COUNT(*) as c
        FROM agent_supergroup_topics t
        JOIN agent_supergroups sg ON t.supergroup_id = sg.id
        WHERE sg.bot_id = ?
      `
      )
      .get(botId) as { c: number };

    const running = heartbeat
      ? Date.now() - new Date(heartbeat.last_heartbeat).getTime() <
        HEALTHY_HEARTBEAT_MAX_MS
      : false;

    return Response.json({
      botId,
      running,
      status: heartbeat?.status || "unknown",
      uptimeMs: (heartbeat?.uptime_seconds || 0) * 1000,
      messagesDelivered: heartbeat?.messages_delivered || 0,
      messagesFailed: heartbeat?.messages_failed || 0,
      topicsManaged: supergroupCount.c,
      totalTopics: topicCount.c,
      errorCount: heartbeat?.error_count || 0,
    });
  } catch (err: any) {
    logger.error(`Bot stats error for ${botId}: ${err.message}`);
    return Response.json(
      { error: err.message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/telegram/bot/:botId/delivery-log
// ---------------------------------------------------------------------------

export async function handleBotDeliveryLog(
  req: Request,
  botId: string
): Promise<Response> {
  try {
    const url = new URL(req.url);
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50", 10),
      200
    );
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    const status = url.searchParams.get("status") || undefined;

    const db = getDb();

    const conditions: string[] = ["bot_id = ?"];
    const params: (string | number)[] = [botId];

    if (status) {
      conditions.push("status = ?");
      params.push(status);
    }

    const where = conditions.join(" AND ");

    const logs = db
      .query(
        `
        SELECT
          id,
          event_type as eventType,
          agent_login as agentLogin,
          chat_id as chatId,
          thread_id as threadId,
          purpose,
          status,
          latency_ms as latencyMs,
          error,
          payload_preview as payloadPreview,
          created_at as createdAt
        FROM telegram_dispatch_log
        WHERE ${where}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(...params, limit, offset) as Array<{
      id: number;
      eventType: string;
      agentLogin: string;
      chatId: number;
      threadId: number;
      purpose: string;
      status: string;
      latencyMs: number;
      error: string;
      payloadPreview: string;
      createdAt: string;
    }>;

    const total = db
      .query(
        `
        SELECT COUNT(*) as c FROM telegram_dispatch_log WHERE ${where}
      `
      )
      .get(...params) as { c: number };

    return Response.json({
      botId,
      logs,
      total: total.c,
      limit,
      offset,
    });
  } catch (err: any) {
    logger.error(`Delivery log error for ${botId}: ${err.message}`);
    return Response.json(
      { error: err.message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/telegram/topics-status
// ---------------------------------------------------------------------------

export async function handleTopicsStatus(): Promise<Response> {
  try {
    const db = getDb();

    // Overall topic counts
    const totalTopics = db
      .query(
        `
        SELECT COUNT(*) as c FROM agent_supergroup_topics
      `
      )
      .get() as { c: number };

    const totalSupergroups = db
      .query(
        `
        SELECT COUNT(*) as c FROM agent_supergroups WHERE is_active = 1
      `
      )
      .get() as { c: number };

    // Topics by bot
    const byBot = db
      .query(
        `
        SELECT
          COALESCE(sg.bot_id, 'unassigned') as botId,
          COUNT(*) as topicCount,
          COUNT(DISTINCT sg.id) as supergroupCount
        FROM agent_supergroup_topics t
        JOIN agent_supergroups sg ON t.supergroup_id = sg.id
        GROUP BY sg.bot_id
        ORDER BY topicCount DESC
      `
      )
      .all() as Array<{
      botId: string;
      topicCount: number;
      supergroupCount: number;
    }>;

    // Topics by purpose
    const byPurpose = db
      .query(
        `
        SELECT
          purpose,
          COUNT(*) as count
        FROM agent_supergroup_topics
        GROUP BY purpose
        ORDER BY count DESC
      `
      )
      .all() as Array<{ purpose: string; count: number }>;

    // Missing topics (supergroups without any topics)
    const missingTopics = db
      .query(
        `
        SELECT
          sg.id,
          sg.telegram_chat_id as chatId,
          sg.owner_agent_login as agentLogin,
          sg.bot_id as botId
        FROM agent_supergroups sg
        WHERE sg.is_active = 1
          AND NOT EXISTS (
            SELECT 1 FROM agent_supergroup_topics t
            WHERE t.supergroup_id = sg.id
          )
      `
      )
      .all() as Array<{
      id: number;
      chatId: number;
      agentLogin: string;
      botId: string;
    }>;

    return Response.json({
      totalTopics: totalTopics.c,
      totalSupergroups: totalSupergroups.c,
      byBot,
      byPurpose,
      missingTopics: {
        count: missingTopics.length,
        items: missingTopics.slice(0, 20),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error(`Topics status error: ${err.message}`);
    return Response.json(
      { error: err.message, code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
