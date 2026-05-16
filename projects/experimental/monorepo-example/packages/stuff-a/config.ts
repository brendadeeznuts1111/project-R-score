// monorepo/packages/stuff-a/config.ts
import { z } from 'zod';

export const CONFIG_PATH = Bun.file(new URL("./config.ts", import.meta.url)).name;

// ── Network ──
export const DEFAULT_PORT = parseInt(Bun.env.STUFF_PORT ?? '3456', 10);
export const DEFAULT_HOSTNAME = Bun.env.STUFF_HOSTNAME ?? 'localhost';
export const DEFAULT_TEST_PORT = 3457;

export function serverUrl(port = DEFAULT_PORT, hostname = DEFAULT_HOSTNAME): string {
  return `http://${hostname}:${port}`;
}

export function wsUrl(port = DEFAULT_PORT, hostname = DEFAULT_HOSTNAME): string {
  return `ws://${hostname}:${port}`;
}

// ── Routes ──
export const ROUTES = {
  USERS: '/users',
  USER_BY_ID: (id: string | number) => `/users/${id}`,
  WS: '/ws',
  HEALTH: '/health',
  METRICS: '/metrics',
} as const;

// ── Headers ──
export const HEADERS = {
  JSON: { 'Content-Type': 'application/json' },
  CORS: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  },
  RESPONSE_TIME: 'X-Response-Time',
  AUTH: 'Authorization',
} as const;

// ── Database ──
export const DB = {
  DEFAULT_PATH: Bun.env.STUFF_DB_PATH ?? './stuff.db',
  PRAGMA: {
    JOURNAL_MODE: 'WAL',
    FOREIGN_KEYS: 'ON',
    SYNCHRONOUS: 'NORMAL',
  },
} as const;

// ── Auth ──
export const AUTH = {
  API_TOKEN_ENV: 'STUFF_API_TOKEN',
  get API_TOKEN(): string | undefined {
    return Bun.env[this.API_TOKEN_ENV];
  },
  BCRYPT_COST: 10,
  BEARER_PREFIX: 'Bearer ',
} as const;

// ── Limits ──
export const LIMITS = {
  MAX_REQUEST_LOGS: 1000,
  DEFAULT_LOG_LIMIT: 50,
  DEFAULT_LIST_LIMIT: 100,
  MAX_SEED_COUNT: 10000,
  LOAD_TEST_DEFAULT_DURATION: 30,
  LOAD_TEST_DEFAULT_CONCURRENCY: 10,
  RATE_LIMIT_WINDOW_MS: 60_000,
  RATE_LIMIT_MAX_REQUESTS: 100,
} as const;

// ── Feature Flags ──
export const FEATURES = {
  ENABLE_METRICS: Bun.env.FEATURE_METRICS !== 'false',
  ENABLE_WS_COMPRESSION: Bun.env.FEATURE_WS_COMPRESSION === 'true',
  STRICT_AUTH: Bun.env.NODE_ENV === 'production',
  RATE_LIMITING: Bun.env.FEATURE_RATE_LIMIT !== 'false',
  NEW_DASHBOARD_ROLLOUT: parseInt(Bun.env.ROLLOUT_DASHBOARD ?? '0', 10),

  isEnabled(feature: string, context?: { userId?: string }): boolean {
    const value = (this as any)[feature];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number' && context?.userId) {
      // Deterministic percentage rollout using Bun.hash
      const hash = Number(Bun.hash(context.userId)) % 100;
      return hash < value;
    }
    return false;
  },
} as const;

// ── Runtime Validation ──
const ConfigSchema = z.object({
  port: z.number().int().min(1024).max(65535),
  testPort: z.number().int().min(1024).max(65535),
  hostname: z.string().min(1),
  dbPath: z.string().min(1),
});

function validateConfig() {
  // Schema validation
  const result = ConfigSchema.safeParse({
    port: DEFAULT_PORT,
    testPort: DEFAULT_TEST_PORT,
    hostname: DEFAULT_HOSTNAME,
    dbPath: DB.DEFAULT_PATH,
  });

  if (!result.success) {
    throw new Error(`Config validation failed: ${result.error.message}`);
  }

  // Port collision check
  if (DEFAULT_PORT === DEFAULT_TEST_PORT) {
    throw new Error(
      `Port collision: STUFF_PORT (${DEFAULT_PORT}) cannot equal DEFAULT_TEST_PORT (${DEFAULT_TEST_PORT})`
    );
  }

  // Production warnings
  if (Bun.env.NODE_ENV === 'production') {
    if (!AUTH.API_TOKEN) {
      console.warn(`⚠️  Security: ${AUTH.API_TOKEN_ENV} not set in production`);
    }
    if (DEFAULT_HOSTNAME === 'localhost') {
      console.warn(`⚠️  Config: Using localhost in production`);
    }
  }
}

// Validate on module load
validateConfig();

// ── Type-Safe Config Access ──
export type ConfigSection = 'ROUTES' | 'HEADERS' | 'DB' | 'AUTH' | 'LIMITS' | 'FEATURES';

export function getConfig<T extends Record<string, any>>(section: ConfigSection): T {
  const configs = { ROUTES, HEADERS, DB, AUTH, LIMITS, FEATURES };
  return configs[section] as T;
}

// ── User Route Helper ──
export function userByIdRoute(id: string | number): string {
  return ROUTES.USER_BY_ID(id);
}
