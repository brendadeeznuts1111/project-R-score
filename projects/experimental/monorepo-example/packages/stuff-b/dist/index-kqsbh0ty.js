// @bun
import {
  exports_external
} from "./index-7ed6y08k.js";

// ../stuff-a/config.ts
var DEFAULT_PORT = parseInt(process.env.STUFF_PORT ?? "3456", 10);
var DEFAULT_HOSTNAME = process.env.STUFF_HOSTNAME ?? "localhost";
var DEFAULT_TEST_PORT = 3457;
var HEADERS = {
  JSON: { "Content-Type": "application/json" },
  CORS: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  },
  RESPONSE_TIME: "X-Response-Time",
  AUTH: "Authorization"
};
var DB = {
  DEFAULT_PATH: process.env.STUFF_DB_PATH ?? "./stuff.db",
  PRAGMA: {
    JOURNAL_MODE: "WAL",
    FOREIGN_KEYS: "ON",
    SYNCHRONOUS: "NORMAL"
  }
};
var AUTH = {
  API_TOKEN_ENV: "STUFF_API_TOKEN",
  get API_TOKEN() {
    return process.env[this.API_TOKEN_ENV];
  },
  BCRYPT_COST: 10,
  BEARER_PREFIX: "Bearer "
};
var LIMITS = {
  MAX_REQUEST_LOGS: 1000,
  DEFAULT_LOG_LIMIT: 50,
  DEFAULT_LIST_LIMIT: 100,
  MAX_SEED_COUNT: 1e4,
  LOAD_TEST_DEFAULT_DURATION: 30,
  LOAD_TEST_DEFAULT_CONCURRENCY: 10
};
var FEATURES = {
  ENABLE_METRICS: process.env.FEATURE_METRICS !== "false",
  ENABLE_WS_COMPRESSION: process.env.FEATURE_WS_COMPRESSION === "true",
  STRICT_AUTH: false,
  RATE_LIMITING: process.env.FEATURE_RATE_LIMIT !== "false",
  NEW_DASHBOARD_ROLLOUT: parseInt(process.env.ROLLOUT_DASHBOARD ?? "0", 10),
  isEnabled(feature, context) {
    const value = this[feature];
    if (typeof value === "boolean")
      return value;
    if (typeof value === "number" && context?.userId) {
      const hash = Number(Bun.hash(context.userId)) % 100;
      return hash < value;
    }
    return false;
  }
};
var ConfigSchema = exports_external.object({
  port: exports_external.number().int().min(1024).max(65535),
  testPort: exports_external.number().int().min(1024).max(65535),
  hostname: exports_external.string().min(1),
  dbPath: exports_external.string().min(1)
});
function validateConfig() {
  const result = ConfigSchema.safeParse({
    port: DEFAULT_PORT,
    testPort: DEFAULT_TEST_PORT,
    hostname: DEFAULT_HOSTNAME,
    dbPath: DB.DEFAULT_PATH
  });
  if (!result.success) {
    throw new Error(`Config validation failed: ${result.error.message}`);
  }
  if (DEFAULT_PORT === DEFAULT_TEST_PORT) {
    throw new Error(`Port collision: STUFF_PORT (${DEFAULT_PORT}) cannot equal DEFAULT_TEST_PORT (${DEFAULT_TEST_PORT})`);
  }
  if (false) {}
}
validateConfig();

export { HEADERS, DB, AUTH, LIMITS };
