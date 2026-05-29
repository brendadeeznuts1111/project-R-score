import { z } from "zod";

const booleanFromEnv = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value) => {
    if (typeof value === "boolean") return value;
    if (typeof value !== "string") return undefined;
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
    return undefined;
  });

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PEER_DATA_DIR: z.string().optional(),
  PEER_DB_PATH: z.string().optional(),
  PEER_DEPOSIT_DB_PATH: z.string().optional(),
  PEER_LEGACY_DATA_FILE: z.string().optional(),
  PEER_SESSION_SECRET: z.string().optional(),
  PEER_SESSION_COOKIE_NAME: z.string().min(1).default("peer_session"),
  PEER_SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),
  PEER_INVITE_TTL_HOURS: z.coerce.number().int().positive().default(24 * 7),
  PEER_SIGNIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  PEER_SIGNIN_WINDOW_MS: z.coerce.number().int().positive().default(1000 * 60 * 15),
  PEER_SIGNIN_LOCKOUT_MS: z.coerce.number().int().positive().default(1000 * 60 * 15),
  PEER_CHAIN_ID: z.coerce.number().int().default(8453),
  PEER_CATALOG_ENV: z.enum(["production", "preproduction", "staging"]).default("production"),
  PEER_ENABLE_ROLE_OVERRIDE: booleanFromEnv,
  PEER_BUILD_ON_START: booleanFromEnv,
  PEER_COOKIE_SECURE: booleanFromEnv,
  PEER_ENABLE_ALERTS: booleanFromEnv,
  ODDS_API_KEY: z.string().optional(),
  ODDS_SNAPSHOT_PATH: z.string().optional(),
});

export type ServerConfig = {
  port: number;
  nodeEnv: "development" | "test" | "production";
  dataDir: string;
  databasePath: string;
  depositDbPath: string;
  legacyDataFile: string;
  sessionSecret: string;
  sessionCookieName: string;
  sessionTtlMs: number;
  inviteTtlMs: number;
  signinMaxAttempts: number;
  signinWindowMs: number;
  signinLockoutMs: number;
  chainId: number;
  catalogEnv: "production" | "preproduction" | "staging";
  enableRoleOverride: boolean;
  shouldBuildOnStart: boolean;
  secureCookies: boolean;
  enableAlerts: boolean;
  oddsApiKey: string | null;
  oddsSnapshotPath: string;
  isProduction: boolean;
};

/** Validates and normalizes server environment settings. */
export function getServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const parsed = envSchema.parse(env);
  const dataDir = parsed.PEER_DATA_DIR ?? `${process.cwd()}/.data`;
  const databasePath = parsed.PEER_DB_PATH ?? `${dataDir}/peer-ops.sqlite`;
  const depositDbPath = parsed.PEER_DEPOSIT_DB_PATH ?? `${dataDir}/peer-deposits.sqlite`;
  const legacyDataFile = parsed.PEER_LEGACY_DATA_FILE ?? `${dataDir}/team-payouts.json`;
  const sessionSecret = parsed.PEER_SESSION_SECRET ?? "peer-demo-session-secret-change-me";

  if (parsed.NODE_ENV === "production" && sessionSecret === "peer-demo-session-secret-change-me") {
    throw new Error("PEER_SESSION_SECRET must be set in production.");
  }

  return {
    port: parsed.PORT,
    nodeEnv: parsed.NODE_ENV,
    dataDir,
    databasePath,
    depositDbPath,
    legacyDataFile,
    sessionSecret,
    sessionCookieName: parsed.PEER_SESSION_COOKIE_NAME,
    sessionTtlMs: parsed.PEER_SESSION_TTL_HOURS * 60 * 60 * 1000,
    inviteTtlMs: parsed.PEER_INVITE_TTL_HOURS * 60 * 60 * 1000,
    signinMaxAttempts: parsed.PEER_SIGNIN_MAX_ATTEMPTS,
    signinWindowMs: parsed.PEER_SIGNIN_WINDOW_MS,
    signinLockoutMs: parsed.PEER_SIGNIN_LOCKOUT_MS,
    chainId: parsed.PEER_CHAIN_ID,
    catalogEnv: parsed.PEER_CATALOG_ENV,
    enableRoleOverride: parsed.PEER_ENABLE_ROLE_OVERRIDE ?? false,
    shouldBuildOnStart:
      parsed.PEER_BUILD_ON_START ?? parsed.NODE_ENV !== "production",
    secureCookies: parsed.PEER_COOKIE_SECURE ?? parsed.NODE_ENV === "production",
    enableAlerts: parsed.PEER_ENABLE_ALERTS ?? false,
    oddsApiKey: parsed.ODDS_API_KEY?.trim() || null,
    oddsSnapshotPath: parsed.ODDS_SNAPSHOT_PATH ?? `${dataDir}/odds-snapshots.jsonl`,
    isProduction: parsed.NODE_ENV === "production",
  };
}

export const serverConfig = getServerConfig();
