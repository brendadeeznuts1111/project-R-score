/**
 * Multi-Bot Launcher — Telegram Hub
 *
 * Launch multiple bot workers from one entry point.
 * One process per bot: risk_bot, payment_bot, agent_bot.
 * Environment-driven configuration.
 * Graceful shutdown coordination (SIGINT, SIGTERM).
 *
 * Usage:
 *   bun run src/telegram/run-bots.ts
 *
 * Or run individual bots:
 *   STREAMS=risk_alerts BOT_ID=risk_bot BOT_TOKEN=xxx bun run workers/TelegramBotWorker.ts
 */

import { spawn } from "bun";
import { createLogger } from "@utils/logger";

const logger = createLogger("BotLauncher");

// ---------------------------------------------------------------------------
// Bot definitions
// ---------------------------------------------------------------------------

interface BotProcess {
  name: string;
  env: Record<string, string>;
  proc?: ReturnType<typeof spawn>;
}

const BOTS: BotProcess[] = [
  {
    name: "risk_bot",
    env: {
      BOT_ID: "risk_bot",
      STREAMS: "risk_alerts",
    },
  },
  {
    name: "payment_bot",
    env: {
      BOT_ID: "payment_bot",
      STREAMS: "payment_events",
    },
  },
  {
    name: "agent_bot",
    env: {
      BOT_ID: "agent_bot",
      STREAMS: "agent_events",
    },
  },
];

// ---------------------------------------------------------------------------
// Resolve bot tokens from environment
// ---------------------------------------------------------------------------

function resolveBotToken(botName: string): string | undefined {
  const envMap: Record<string, string> = {
    risk_bot: "RISK_BOT_TOKEN",
    payment_bot: "PAYMENT_BOT_TOKEN",
    agent_bot: "AGENT_BOT_TOKEN",
  };
  const envKey = envMap[botName];
  return envKey ? process.env[envKey] : undefined;
}

// ---------------------------------------------------------------------------
// Launch a single bot process
// ---------------------------------------------------------------------------

function startBot(bot: BotProcess): void {
  const token = resolveBotToken(bot.name);
  if (!token) {
    logger.warn(
      `Skipping ${bot.name}: no token found (set ${bot.name.toUpperCase().replace("_", "_")}_BOT_TOKEN)`
    );
    return;
  }

  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    ...bot.env,
    BOT_TOKEN: token,
  };

  bot.proc = spawn({
    cmd: ["bun", "workers/TelegramBotWorker.ts"],
    env,
    stdout: "inherit",
    stderr: "inherit",
  });

  logger.info(`Started ${bot.name} (PID ${bot.proc.pid})`);

  // Auto-restart on exit
  bot.proc.exited.then((code) => {
    logger.warn(
      `${bot.name} exited with code ${code}, restarting in 5s...`
    );
    setTimeout(() => startBot(bot), 5000);
  });
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function shutdown(signal: string): void {
  logger.info(`Received ${signal}, shutting down all bots...`);
  for (const bot of BOTS) {
    if (bot.proc) {
      try {
        bot.proc.kill(signal === "SIGKILL" ? 9 : 15);
      } catch {
        // Ignore
      }
    }
  }
  setTimeout(() => {
    logger.info("Force exit after timeout");
    process.exit(0);
  }, 10000);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ---------------------------------------------------------------------------
// Start all bots
// ---------------------------------------------------------------------------

logger.info("Bot launcher starting...");

for (const bot of BOTS) {
  startBot(bot);
}

logger.info(`Launched ${BOTS.length} bot processes`);
