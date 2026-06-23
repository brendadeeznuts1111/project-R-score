// Cron Job Manager
//
// Registers all 10 system cron jobs using Bun.cron().
// Tracks execution history in SQLite table `cron_schedule`.
//
// Jobs:
//   1. queue_processor    */2 * * * *   Process action queue
//   2. odds_refresh        */2 * * * *   Fetch live odds from Pinnacle API
//   3. wager_refresh      */5 * * * *   Fetch wagers from Buckeye
//   4. feature_extraction */10 * * * *  Run classifyArchetype()
//   5. player_refresh     */15 * * * *  Fetch player roster
//   6. position_expiry    0 * * * *     Expire stale positions
//   7. sandbox_janitor    0 * * * *     Clean old sandbox data
//   8. alert_cleanup      0 3 * * *      Purge old alerts
//   9. ip_surveillance    */15 * * * *   Auto-flag IPs
//  10. pipeline_health    */5 * * * *    Pipeline metrics + Telegram alerts
//
// Note: wager_refresh depends on Shadow Agent Worker (scripts/shadow-agent.ts)
// to keep cf_clearance cookies fresh. Run the agent every 15 min via system
// cron:  */15 * * * *  cd /path/to/project && bun run scripts/shadow-agent.ts

import { Database } from "bun:sqlite";
import { getDb } from "@db/index";
import { createLogger } from "@utils/logger";
import { logCron, logHealth } from "@utils/tableLogger";
import { processActionQueue } from "@api/action-queue";
import { recordCronJobExecuted } from "@api/metrics";
import { env } from "@utils/env";

const logger = createLogger("CronSchedule");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS cron_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_name TEXT NOT NULL UNIQUE,
    cron_expr TEXT NOT NULL,
    last_run INTEGER,
    next_run INTEGER,
    status TEXT NOT NULL DEFAULT 'idle' CHECK(status IN ('idle', 'running', 'success', 'failed')),
    error TEXT,
    run_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    fail_count INTEGER NOT NULL DEFAULT 0,
    avg_duration_ms INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  )
`;

const CREATE_INDEX_SQL = [
  `CREATE INDEX IF NOT EXISTS idx_cron_schedule_status ON cron_schedule(status)`,
  `CREATE INDEX IF NOT EXISTS idx_cron_schedule_name ON cron_schedule(job_name)`,
];

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export function ensureCronSchema(db?: Database): void {
  const database = db || getDb();
  database.run(CREATE_TABLE_SQL);
  for (const sql of CREATE_INDEX_SQL) {
    database.run(sql);
  }
  logger.debug("Cron schedule schema ensured");
}

// ---------------------------------------------------------------------------
// Job definitions
// ---------------------------------------------------------------------------

export interface CronJobDefinition {
  name: string;
  schedule: string;
  description: string;
  handler: () => Promise<void>;
  enabled: boolean;
}

function createJobs(): CronJobDefinition[] {
  return [
    {
      name: "queue_processor",
      schedule: "*/2 * * * *",
      description: "Process pending AI summaries and action queue",
      enabled: true,
      handler: async () => {
        logger.debug("Queue processor: starting");
        const result = await processActionQueue(5);
        logger.debug(
          `Queue processor: ${result.succeeded} succeeded, ${result.failed} failed (${result.processed} total)`
        );
      },
    },
    {
      name: "odds_refresh",
      schedule: "*/2 * * * *",
      description: "Fetch live odds from Pinnacle API",
      enabled: true,
      handler: async () => {
        logger.debug("Odds refresh: starting");
        if (env.BUCKEYE_LIVE_MODE && env.PINNACLE_API_KEY) {
          try {
            const { refreshAllOdds } = await import("./sportsbook-service");
            const result = await refreshAllOdds();
            logger.debug(
              `Odds refresh: ${result} markets processed`
            );
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            logger.error(`Odds refresh failed: ${msg}`);
          }
        } else {
          logger.debug("Odds refresh: LIVE_MODE or PINNACLE_API_KEY not configured — skipping");
        }
      },
    },
    {
      name: "wager_refresh",
      schedule: "*/5 * * * *",
      description: "Fetch new wagers from Buckeye upstream",
      enabled: true,
      handler: async () => {
        logger.debug("Wager refresh: starting");

        if (env.BUCKEYE_LIVE_MODE) {
          try {
            const { pollBuckeyeWagers } = await import("./buckeye-feed");
            const result = await pollBuckeyeWagers();

            // Broadcast routed wagers via SSE for live cascade visualization
            if (result.routed.length > 0) {
              try {
                const { broadcastToSSE } = await import("../index");
                for (const r of result.routed) {
                  broadcastToSSE("wagerTick", {
                    wagerId: r.wagerId,
                    partnerId: r.partnerId,
                    allowed: r.result.allowed,
                    action: r.result.action,
                    adjustedStake: r.result.adjustedStake,
                    reason: r.result.reason,
                    metadata: r.result.metadata,
                  });
                }
              } catch {
                // SSE broadcast not available (e.g. in test env)
                logger.debug("SSE broadcast skipped — index module not available");
              }
            }

            logCron({
              jobName: "wager_refresh",
              fetched: result.fetched,
              mapped: result.mapped,
              routed: result.routed.length,
              errors: result.errors.length,
            });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            logger.error(`Wager refresh failed: ${msg}`);
            logCron({ jobName: "wager_refresh", error: msg });
          }
        } else {
          logger.debug("Wager refresh: LIVE_MODE disabled — skipping Buckeye poll");
        }

        logger.debug("Wager refresh: completed");
      },
    },
    {
      name: "feature_extraction",
      schedule: "*/10 * * * *",
      description: "Run classifyArchetype() on players",
      enabled: env.ENABLE_ANALYTICS,
      handler: async () => {
        logger.debug("Feature extraction: starting");
        try {
          const { classifyArchetypes } = await import("./player-service");
          const classified = classifyArchetypes();
          logger.debug(
            `Feature extraction: ${classified} players classified`
          );
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          logger.error(`Feature extraction failed: ${msg}`);
        }
      },
    },
    {
      name: "player_refresh",
      schedule: "*/15 * * * *",
      description: "Fetch player roster from Buckeye",
      enabled: true,
      handler: async () => {
        logger.debug("Player refresh: starting");
        if (env.BUCKEYE_LIVE_MODE) {
          try {
            const { refresh } = await import("../feeds/buckeye-players");
            const result = await refresh();
            logger.debug(
              `Player refresh: ${result.fetched} fetched, ${result.inserted} upserted`
            );
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            logger.error(`Player refresh failed: ${msg}`);
          }
        } else {
          logger.debug("Player refresh: LIVE_MODE disabled — skipping");
        }
      },
    },
    {
      name: "position_expiry",
      schedule: "0 * * * *",
      description: "Expire stale risk positions older than 24 hours",
      enabled: env.ENABLE_RISK_ENGINE,
      handler: async () => {
        logger.debug("Position expiry: starting");
        // Close risk_positions where expires_at < now
        const db = getDb();
        const result = db.run(
          `UPDATE risk_positions SET status = 'closed', closed_at = strftime('%s','now')
           WHERE status = 'open' AND expires_at < strftime('%s','now')`
        );
        logger.debug(`Position expiry: closed ${result.changes} stale positions`);
      },
    },
    {
      name: "sandbox_janitor",
      schedule: "0 * * * *",
      description: "Clean up old sandbox data and expired sessions",
      enabled: env.ENABLE_SANDBOX,
      handler: async () => {
        logger.debug("Sandbox janitor: starting");
        // Clean expired buckeye_sessions
        try {
          const { cleanupExpiredSessions } = await import("@auth/session");
          const deleted = cleanupExpiredSessions();
          logger.debug(`Sandbox janitor: removed ${deleted} expired sessions`);
        } catch {
          // Session cleanup not available
          logger.debug("Sandbox janitor: session cleanup not available");
        }
      },
    },
    {
      name: "alert_cleanup",
      schedule: "0 3 * * *",
      description: "Purge alerts older than 90 days",
      enabled: true,
      handler: async () => {
        logger.debug("Alert cleanup: starting");
        const db = getDb();
        const cutoff = Math.floor(Date.now() / 1000) - 90 * 86400;

        const alertsResult = db.run(
          `DELETE FROM alert_log WHERE created_at < ?`,
          [cutoff]
        );
        const violationsResult = db.run(
          `DELETE FROM wager_violations WHERE created_at < ?`,
          [cutoff]
        );

        logger.debug(
          `Alert cleanup: removed ${alertsResult.changes} alerts, ${violationsResult.changes} violations`
        );
      },
    },
    {
      name: "ip_surveillance",
      schedule: "*/15 * * * *",
      description: "Auto-flag shared IPs, VPN usage, and geo anomalies",
      enabled: true,
      handler: async () => {
        logger.debug("IP surveillance: starting");
        // Scan ip_tracking for shared IPs (multiple players)
        // Check for VPN/proxy indicators
        // Create ip_flags entries for anomalies
        const db = getDb();

        // Find IPs shared by multiple players
        const sharedIps = db
          .query(
            `SELECT ip_address, COUNT(DISTINCT player_id) as player_count
             FROM ip_tracking
             WHERE first_seen_at > strftime('%s','now') - 86400
             GROUP BY ip_address
             HAVING player_count > 1
             LIMIT 50`
          )
          .all() as Array<{ ip_address: string; player_count: number }>;

        let flagsCreated = 0;
        for (const row of sharedIps) {
          try {
            db.run(
              `INSERT OR IGNORE INTO ip_flags (ip_address, flag_type, reason, created_at)
               VALUES (?, 'shared_ip', 'Multiple accounts from same IP', strftime('%s','now'))`,
              [row.ip_address]
            );
            flagsCreated++;
          } catch {
            // Flag may already exist
          }
        }

        logger.debug(`IP surveillance: flagged ${flagsCreated} shared IPs`);
      },
    },
    {
      name: "pipeline_health",
      schedule: "*/5 * * * *",
      description: "Check pipeline metrics, alert via Telegram if thresholds breached",
      enabled: true,
      handler: async () => {
        try {
          const { runPipelineHealthCheck } = await import("./pipeline-health-monitor");
          await runPipelineHealthCheck();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          logger.error(`Pipeline health check failed: ${msg}`);
        }
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Job execution wrapper
// ---------------------------------------------------------------------------

/**
 * Execute a single cron job with full error handling and tracking.
 */
async function executeJob(job: CronJobDefinition): Promise<void> {
  const startedAt = Date.now();
  const startedAtIso = new Date(startedAt).toISOString();

  // Update status to running
  try {
    const db = getDb();
    db.run(
      `INSERT INTO cron_schedule (job_name, cron_expr, status, last_run, run_count)
       VALUES (?, ?, 'running', ?, 1)
       ON CONFLICT(job_name) DO UPDATE SET
         status = 'running',
         last_run = excluded.last_run,
         run_count = run_count + 1`,
      [job.name, job.schedule, Math.floor(startedAt / 1000)]
    );
  } catch (err: unknown) {
    logger.warn(`Failed to update cron status for ${job.name}: ${String(err)}`);
  }

  logCron({
    jobName: job.name,
    schedule: job.schedule,
    startedAt: startedAtIso,
  });

  try {
    await job.handler();

    const durationMs = Date.now() - startedAt;

    // Update status to success
    try {
      const db = getDb();
      db.run(
        `UPDATE cron_schedule
         SET status = 'success', error = NULL, success_count = success_count + 1,
             avg_duration_ms = ((avg_duration_ms * (run_count - 1)) + ?) / run_count
         WHERE job_name = ?`,
        [durationMs, job.name]
      );
    } catch {
      // Best effort
    }

    logCron({
      jobName: job.name,
      completedAt: new Date().toISOString(),
      durationMs,
    });

    recordCronJobExecuted(job.name, "success").catch(() => {
      // Metrics best effort
    });

    logger.debug(`Cron job ${job.name} completed in ${durationMs}ms`);
  } catch (err: unknown) {
    const durationMs = Date.now() - startedAt;
    const errorMessage = err instanceof Error ? err.message : String(err);

    // Update status to failed
    try {
      const db = getDb();
      db.run(
        `UPDATE cron_schedule
         SET status = 'failed', error = ?, fail_count = fail_count + 1
         WHERE job_name = ?`,
        [errorMessage.slice(0, 1000), job.name]
      );
    } catch {
      // Best effort
    }

    logCron({
      jobName: job.name,
      error: errorMessage,
      durationMs,
    });

    recordCronJobExecuted(job.name, "failure").catch(() => {
      // Metrics best effort
    });

    logger.error(`Cron job ${job.name} failed: ${errorMessage}`);
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register all cron jobs with Bun.cron().
 * Called once during server startup.
 */
export function registerCronJobs(): number {
  ensureCronSchema();

  if (typeof Bun.cron !== "function") {
    logger.warn("Bun.cron not available — cron jobs disabled");
    return 0;
  }

  const jobs = createJobs();
  let registered = 0;

  for (const job of jobs) {
    if (!job.enabled) {
      logger.debug(`Cron job ${job.name} disabled by feature flag`);
      continue;
    }

    try {
      Bun.cron(job.schedule, async () => {
        try {
          logger.debug(`Cron job starting: ${job.name}`);
          await executeJob(job);
        } catch (err: unknown) {
          // Last-resort catch — should never reach here due to executeJob's internal handling
          const message = err instanceof Error ? err.message : "Unknown error";
          logger.error(`Cron job ${job.name} crashed: ${message}`);
        }
      });

      logger.info(`Registered cron: ${job.name} (${job.schedule}) — ${job.description}`);
      registered++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logger.error(`Failed to register cron ${job.name}: ${message}`);
    }
  }

  logger.info(`Registered ${registered}/${jobs.length} cron jobs`);
  return registered;
}

// ---------------------------------------------------------------------------
// Status / introspection
// ---------------------------------------------------------------------------

/**
 * Get cron job status for health checks.
 */
export function getCronStatus(): Array<Record<string, unknown>> {
  try {
    const db = getDb();
    const rows = db
      .query(
        `SELECT job_name, cron_expr, last_run, next_run, status, error, run_count,
                success_count, fail_count, avg_duration_ms
         FROM cron_schedule
         ORDER BY job_name`
      )
      .all() as Array<{
        job_name: string;
        cron_expr: string;
        last_run: number;
        next_run: number;
        status: string;
        error: string;
        run_count: number;
        success_count: number;
        fail_count: number;
        avg_duration_ms: number;
      }>;

    return rows.map((row) => ({
      name: row.job_name,
      schedule: row.cron_expr,
      lastRun: row.last_run ? new Date(row.last_run * 1000).toISOString() : null,
      nextRun: row.next_run ? new Date(row.next_run * 1000).toISOString() : null,
      status: row.status,
      error: row.error,
      runCount: row.run_count,
      successCount: row.success_count,
      failCount: row.fail_count,
      avgDurationMs: row.avg_duration_ms,
    }));
  } catch (err: unknown) {
    logger.warn(`Failed to get cron status: ${String(err)}`);
    return [];
  }
}
