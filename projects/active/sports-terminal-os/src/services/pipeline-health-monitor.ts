/**
 * Pipeline Health Monitor
 *
 * Queries the database for odds/wager pipeline health metrics and
 * sends Telegram alerts when thresholds are breached.
 *
 * Metrics tracked:
 *   - Wager feed freshness (last Buckeye poll timestamp)
 *   - Odds feed freshness (last Pinnacle poll timestamp)
 *   - Line movement count (last hour)
 *   - EWMA exposure (across all partners)
 *   - CF cookie health (Shadow Agent last push)
 *
 * Uses the same Bun.fetch → Telegram pattern as scripts/shadow-agent.ts.
 * No new dependencies. No Redis. No WebSocket dashboard.
 *
 * Cron: pipeline_health (every 5 minutes via cron.ts)
 * Gate: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID must be set
 */

import { getDb } from "@db/index";
import { createLogger } from "@utils/logger";
import { h2Fetch } from "@utils/h2-fetch";

const logger = createLogger("PipelineHealth");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PipelineMetrics {
  wagerFeedAgeSeconds: number | null;
  oddsFeedAgeSeconds: number | null;
  lineMovementsLastHour: number;
  steamMovesLastHour: number;
  ewmaExposureSum: number;
  activeSessions: number;
  cookieAgeSeconds: number | null;
  errors: string[];
}

interface AlertThreshold {
  metric: string;
  current: number | null;
  threshold: number;
  breached: boolean;
}

// ---------------------------------------------------------------------------
// Thresholds (env-configurable)
// ---------------------------------------------------------------------------

const THRESHOLDS = {
  wagerFeedMaxAgeMinutes: parseInt(process.env.HEALTH_WAGER_MAX_AGE_MIN ?? "15"),
  oddsFeedMaxAgeMinutes: parseInt(process.env.HEALTH_ODDS_MAX_AGE_MIN ?? "10"),
  minLineMovementsPerHour: parseInt(process.env.HEALTH_MIN_LINE_MOVEMENTS ?? "5"),
  maxCookieAgeMinutes: parseInt(process.env.HEALTH_MAX_COOKIE_AGE_MIN ?? "30"),
  minActiveSessions: parseInt(process.env.HEALTH_MIN_SESSIONS ?? "1"),
};

// ---------------------------------------------------------------------------
// Metric collection
// ---------------------------------------------------------------------------

export function collectPipelineMetrics(): PipelineMetrics {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const errors: string[] = [];
  const result: PipelineMetrics = {
    wagerFeedAgeSeconds: null,
    oddsFeedAgeSeconds: null,
    lineMovementsLastHour: 0,
    steamMovesLastHour: 0,
    ewmaExposureSum: 0,
    activeSessions: 0,
    cookieAgeSeconds: null,
    errors,
  };

  // Wager feed freshness — last raw_wagers entry
  try {
    const wagerRow = db
      .query(`SELECT MAX(ingested_at) as last_ts FROM raw_wagers`)
      .get() as { last_ts: number | null } | undefined;
    if (wagerRow?.last_ts) {
      result.wagerFeedAgeSeconds = Math.max(0, now - wagerRow.last_ts);
    }
  } catch (e) {
    errors.push(`Wager feed query: ${e instanceof Error ? e.message : "error"}`);
  }

  // Odds feed freshness — last sportsbook_odds updated_at
  try {
    const oddsRow = db
      .query(`SELECT MAX(updated_at) as last_ts FROM sportsbook_odds`)
      .get() as { last_ts: number | null } | undefined;
    if (oddsRow?.last_ts) {
      result.oddsFeedAgeSeconds = Math.max(0, Math.floor(now - oddsRow.last_ts / 1000));
    }
  } catch (e) {
    errors.push(`Odds feed query: ${e instanceof Error ? e.message : "error"}`);
  }

  // Line movements in the last hour
  try {
    const lmRow = db
      .query(
        `SELECT COUNT(*) as count FROM line_movements WHERE timestamp >= ?`
      )
      .get(now - 3600) as { count: number } | undefined;
    result.lineMovementsLastHour = lmRow?.count ?? 0;
  } catch (e) {
    errors.push(`Line movements query: ${e instanceof Error ? e.message : "error"}`);
  }

  // Steam moves in the last hour (3+ books moving same direction)
  try {
    const steamRow = db
      .query(
        `SELECT COUNT(*) as count FROM (
          SELECT event_id, market, direction, COUNT(DISTINCT book_id) as book_count
          FROM line_movements WHERE timestamp >= ?
          GROUP BY event_id, market, direction HAVING book_count >= 3
        )`
      )
      .get(now - 3600) as { count: number } | undefined;
    result.steamMovesLastHour = steamRow?.count ?? 0;
  } catch (e) {
    errors.push(`Steam query: ${e instanceof Error ? e.message : "error"}`);
  }

  // Active Buckeye sessions
  try {
    const sessionRow = db
      .query(
        `SELECT COUNT(*) as count FROM buckeye_sessions
         WHERE is_active = 1 AND expires_at > ?`
      )
      .get(now) as { count: number } | undefined;
    result.activeSessions = sessionRow?.count ?? 0;
  } catch (e) {
    errors.push(`Sessions query: ${e instanceof Error ? e.message : "error"}`);
  }

  // Cookie age — oldest cf_token that's still active
  try {
    const cookieRow = db
      .query(
        `SELECT MIN(expires_at) as oldest FROM buckeye_sessions
         WHERE is_active = 1 AND cf_token IS NOT NULL AND expires_at > ?`
      )
      .get(now) as { oldest: number | null } | undefined;
    if (cookieRow?.oldest) {
      result.cookieAgeSeconds = Math.max(0, cookieRow.oldest - now);
    }
  } catch (e) {
    errors.push(`Cookie query: ${e instanceof Error ? e.message : "error"}`);
  }

  // EWMA exposure — sum across all partner gateways (snapshot)
  try {
    // Exposure is tracked in-memory per gateway. We log it via health endpoint.
    // For now, check the risk_positions table as a proxy.
    const expRow = db
      .query(
        `SELECT COUNT(*) as count FROM risk_positions WHERE status = 'open'`
      )
      .get() as { count: number } | undefined;
    result.ewmaExposureSum = expRow?.count ?? 0;
  } catch (e) {
    errors.push(`Exposure query: ${e instanceof Error ? e.message : "error"}`);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Threshold checking
// ---------------------------------------------------------------------------

function checkThresholds(metrics: PipelineMetrics): AlertThreshold[] {
  const alerts: AlertThreshold[] = [];

  // Wager feed age
  if (metrics.wagerFeedAgeSeconds !== null) {
    const ageMin = metrics.wagerFeedAgeSeconds / 60;
    alerts.push({
      metric: "wager_feed_age",
      current: Math.round(ageMin),
      threshold: THRESHOLDS.wagerFeedMaxAgeMinutes,
      breached: ageMin > THRESHOLDS.wagerFeedMaxAgeMinutes,
    });
  }

  // Odds feed age
  if (metrics.oddsFeedAgeSeconds !== null) {
    const ageMin = metrics.oddsFeedAgeSeconds / 60;
    alerts.push({
      metric: "odds_feed_age",
      current: Math.round(ageMin),
      threshold: THRESHOLDS.oddsFeedMaxAgeMinutes,
      breached: ageMin > THRESHOLDS.oddsFeedMaxAgeMinutes,
    });
  }

  // Cookie age
  if (metrics.cookieAgeSeconds !== null) {
    const ageMin = Math.round(metrics.cookieAgeSeconds / 60);
    alerts.push({
      metric: "cookie_age",
      current: ageMin,
      threshold: THRESHOLDS.maxCookieAgeMinutes,
      breached: ageMin < THRESHOLDS.maxCookieAgeMinutes / 2, // Alert when < 50% remaining
    });
  }

  // Active sessions
  alerts.push({
    metric: "active_sessions",
    current: metrics.activeSessions,
    threshold: THRESHOLDS.minActiveSessions,
    breached: metrics.activeSessions < THRESHOLDS.minActiveSessions,
  });

  return alerts;
}

// ---------------------------------------------------------------------------
// Telegram alert
// ---------------------------------------------------------------------------

async function sendTelegramAlert(message: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return;

  try {
    await h2Fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });
  } catch {
    logger.warn("Telegram alert delivery failed");
  }
}

// ---------------------------------------------------------------------------
// Main check — call from cron
// ---------------------------------------------------------------------------

export async function runPipelineHealthCheck(): Promise<void> {
  const startNs = Bun.nanoseconds();
  logger.debug("Pipeline health check: starting");

  const metrics = collectPipelineMetrics();
  const alerts = checkThresholds(metrics);

  const breached = alerts.filter((a) => a.breached);

  if (breached.length > 0) {
    const lines = breached.map(
      (a) => `• ${a.metric}: ${a.current} (threshold: ${a.threshold})`
    );

    const message = [
      `⚠️ Pipeline Health Alert`,
      ``,
      ...lines,
      ``,
      `Wager feed: ${metrics.wagerFeedAgeSeconds !== null ? Math.round(metrics.wagerFeedAgeSeconds / 60) + "m ago" : "N/A"}`,
      `Odds feed: ${metrics.oddsFeedAgeSeconds !== null ? Math.round(metrics.oddsFeedAgeSeconds / 60) + "m ago" : "N/A"}`,
      `Line movements (1h): ${metrics.lineMovementsLastHour}`,
      `Steam moves (1h): ${metrics.steamMovesLastHour}`,
      `Active sessions: ${metrics.activeSessions}`,
      `Cookie TTL: ${metrics.cookieAgeSeconds !== null ? Math.round(metrics.cookieAgeSeconds / 60) + "m" : "N/A"}`,
      `Errors: ${metrics.errors.length}`,
    ].join("\n");

    const durationMs = Math.round((Number(Bun.nanoseconds() - startNs)) / 1_000_000 * 100) / 100;

    logger.warn(`Pipeline health: ${breached.length} threshold(s) breached in ${durationMs}ms`);
    await sendTelegramAlert(message);
  } else {
    const durationMs = Math.round((Number(Bun.nanoseconds() - startNs)) / 1_000_000 * 100) / 100;
    logger.debug(
      `Pipeline health: OK (wager=${metrics.wagerFeedAgeSeconds}s, odds=${metrics.oddsFeedAgeSeconds}s, sessions=${metrics.activeSessions}) in ${durationMs}ms`
    );
  }
}
