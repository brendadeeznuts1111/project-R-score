/**
 * Environment Variable Loader
 *
 * Loads environment variables with typed defaults and validation.
 * All values are read at startup and cached for performance.
 *
 * Usage:
 *   import { env } from '@utils/env';
 *   const port = env.PORT;
 *   if (env.ENABLE_RISK_ENGINE) { ... }
 */

import { z } from "zod";
import { createLogger } from "./logger";

const logger = createLogger("Env");

// ---------------------------------------------------------------------------
// Schema definition
// ---------------------------------------------------------------------------

const envSchema = z.object({
  // Server core
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),

  // Auth
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  HYGIENE_JWT_SECRET: z.string().optional(),
  ADMIN_API_TOKEN: z.string().optional(),
  DEV_BYPASS_JWT: z.coerce.boolean().default(false),

  // Database
  DB_PATH: z.string().default("./data/sports-terminal.db"),
  DB_WAL: z.coerce.boolean().default(true),
  DB_FOREIGN_KEYS: z.coerce.boolean().default(true),

  // Proxy bridge
  PROXY_INTERNAL_URL: z.string().url().default("http://localhost:3001"),
  PROXY_API_KEY: z.string().optional(),

  // Zone 9: Odds feed (Pinnacle API)
  PINNACLE_API_KEY: z.string().optional(),
  PINNACLE_API_SECRET: z.string().optional(),

  // Redis
  REDIS_URL: z.string().optional(),
  REDIS_MAX_RETRIES: z.coerce.number().default(3),
  REDIS_RETRY_DELAY_MS: z.coerce.number().default(1000),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  RISK_BOT_TOKEN: z.string().optional(),
  PAYMENT_BOT_TOKEN: z.string().optional(),
  AGENT_BOT_TOKEN: z.string().optional(),
  TELEGRAM_ADMIN_GROUP_ID: z.string().optional(),

  // Risk engine
  ENABLE_RISK_ENGINE: z.coerce.boolean().default(false),
  KIMI_API_KEY: z.string().optional(),

  // Feature flags
  ENABLE_ANALYTICS: z.coerce.boolean().default(false),
  ENABLE_WEBHOOKS: z.coerce.boolean().default(true),
  ENABLE_SANDBOX: z.coerce.boolean().default(true),
  ENABLE_PARTNER_PROFILE: z.coerce.boolean().default(true),
  ENABLE_TELEGRAM_HUB: z.coerce.boolean().default(false),

  // Partner Profile OS
  PROFILE_TEMPLATE_DIR: z.string().default("./profiles"),
  PROFILE_HOT_RELOAD: z.coerce.boolean().default(true),
  BUCKEYE_LIVE_MODE: z.coerce.boolean().default(false),

  // Operational
  IDLE_TIMEOUT_MS: z.coerce.number().default(300000),
  ENABLE_IDLE_SHUTDOWN: z.coerce.boolean().default(false),
  ALLOWED_ORIGINS: z.string().optional(),
  TRUST_PROXY: z.coerce.boolean().default(false),
  LOG_FORMAT: z.enum(["text", "json"]).default("text"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Webhook
  WEBHOOK_SECRET: z.string().optional(),

  // Frontend
  FRONTEND_DEV_PORT: z.coerce.number().default(5173),

  // Zone 10: Odds Drift Hygiene WebSocket
  HYGIENE_WS_BACKPRESSURE_LIMIT: z.coerce.number().optional(),
  HYGIENE_WS_RATE_LIMIT_MSGS: z.coerce.number().optional(),
  HYGIENE_WS_RING_BUFFER_SIZE: z.coerce.number().optional(),
});

// ---------------------------------------------------------------------------
// Parse and validate
// ---------------------------------------------------------------------------

let parsedEnv: z.infer<typeof envSchema> | null = null;

function parseEnv(): z.infer<typeof envSchema> {
  try {
    parsedEnv = envSchema.parse(process.env);
    return parsedEnv;
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      const issues = err.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
      logger.error("Environment validation failed", { issues });
      console.error("\n❌ Environment validation failed:\n");
      for (const issue of issues) {
        console.error(`   - ${issue}`);
      }
      console.error("\nPlease check your .env file against .env.example\n");
    } else {
      logger.error("Unexpected error parsing environment", { error: String(err) });
    }
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

/**
 * Parsed and validated environment variables.
 * Access properties directly: env.PORT, env.JWT_SECRET, etc.
 */
export const env = parseEnv();

/**
 * Re-export the schema type for type-safe usage.
 */
export type Env = typeof env;

/**
 * Check if a feature flag is enabled.
 */
export function isFeatureEnabled(flag: keyof Env): boolean {
  return Boolean(env[flag]);
}

/**
 * Get all feature flags as a record for health checks.
 */
export function getFeatureFlags(): Record<string, boolean> {
  return {
    analytics: env.ENABLE_ANALYTICS,
    riskEngine: env.ENABLE_RISK_ENGINE,
    webhooks: env.ENABLE_WEBHOOKS,
    sandbox: env.ENABLE_SANDBOX,
    partnerProfile: env.ENABLE_PARTNER_PROFILE,
    telegramHub: env.ENABLE_TELEGRAM_HUB,
  };
}
