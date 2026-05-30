#!/usr/bin/env bun
/**
 * Standalone Bot Worker Entry Point
 *
 * Direct execution:
 *   STREAMS=risk_alerts BOT_ID=risk_bot BOT_TOKEN=xxx bun run workers/TelegramBotWorker.ts
 *
 * Reads configuration from environment variables.
 * Creates its own Redis connection and database connection.
 * Handles graceful shutdown on SIGINT, SIGTERM, SIGUSR2.
 */

import { TelegramBotWorker } from "../src/telegram/TelegramBotWorker";
import { createLogger } from "@utils/logger";

const logger = createLogger("BotWorkerMain");

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

let activeWorker: TelegramBotWorker | null = null;

function setupGracefulShutdown(): void {
  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGUSR2"];

  for (const signal of signals) {
    process.on(signal, () => {
      logger.info(`Received ${signal}, stopping worker...`);

      if (activeWorker) {
        activeWorker.stop();
      }

      // Force exit after timeout
      setTimeout(() => {
        logger.error("Force exit after graceful shutdown timeout");
        process.exit(1);
      }, 15000);
    });
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  try {
    const botId = process.env.BOT_ID || "risk_bot";
    const token = getEnvOrThrow("BOT_TOKEN");
    const streams = (process.env.STREAMS || "risk_alerts").split(",");
    const dbPath = process.env.DB_PATH || "./data/sports-terminal.db";
    const redisUrl =
      process.env.REDIS_URL || "redis://localhost:6379";
    const blockTimeoutMs = parseInt(
      process.env.BLOCK_TIMEOUT_MS || "5000",
      10
    );
    const heartbeatIntervalMs = parseInt(
      process.env.HEARTBEAT_INTERVAL_MS || "30000",
      10
    );
    const staleClaimIntervalMs = parseInt(
      process.env.STALE_CLAIM_INTERVAL_MS || "30000",
      10
    );
    const maxBatchSize = parseInt(
      process.env.MAX_BATCH_SIZE || "10",
      10
    );

    logger.info(
      `Starting standalone bot worker: ${botId}`
    );
    logger.info(`Streams: ${streams.join(", ")}`);
    logger.info(`DB: ${dbPath}`);
    logger.info(`Redis: ${redisUrl}`);

    setupGracefulShutdown();

    const worker = new TelegramBotWorker({
      botId,
      token,
      streams,
      dbPath,
      redisUrl,
      blockTimeoutMs,
      heartbeatIntervalMs,
      staleClaimIntervalMs,
      maxBatchSize,
    });

    activeWorker = worker;
    await worker.start();
  } catch (err: any) {
    logger.error(`Worker crashed: ${err.message}`);
    process.exit(1);
  }
}

main();
