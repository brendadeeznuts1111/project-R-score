// Server configuration - all configurable via environment variables
// Sensitive credentials use Bun.secrets (falls back to env vars)

import type { TLSConfig } from "./tls-config";
import { getSecret, getS3Credentials, getProxyCredentials } from "./secrets";

/**
 * Parse and validate a numeric environment variable
 */
function parseEnvInt(key: string, defaultValue: number, options?: { min?: number; max?: number }): number {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) {
    console.error(`Invalid ${key}: "${raw}" - must be a number, using default ${defaultValue}`);
    return defaultValue;
  }
  if (options?.min !== undefined && parsed < options.min) {
    console.error(`Invalid ${key}: ${parsed} - must be >= ${options.min}, using default ${defaultValue}`);
    return defaultValue;
  }
  if (options?.max !== undefined && parsed > options.max) {
    console.error(`Invalid ${key}: ${parsed} - must be <= ${options.max}, using default ${defaultValue}`);
    return defaultValue;
  }
  return parsed;
}

export const config = {
  // Server
  PORT: parseEnvInt("PORT", 8080, { min: 1, max: 65535 }),
  HOST: process.env.HOST || "example.com",
  HOSTNAME: process.env.HOSTNAME || "example.com",
  MAX_REQUEST_BODY_SIZE: parseEnvInt("MAX_BODY_SIZE", 10 * 1024 * 1024, { min: 0 }),
  DEVELOPMENT: process.env.NODE_ENV !== "production",

  // Git scanning
  PROJECTS_DIR: process.env.PROJECTS_DIR || `${process.env.HOME}/Projects`,
  SCAN_DEPTH: parseEnvInt("SCAN_DEPTH", 3, { min: 1 }),

  // Intervals (in milliseconds)
  TIMELINE_UPDATE_INTERVAL: parseEnvInt("TIMELINE_INTERVAL", 5000, { min: 100 }),
  RESCAN_INTERVAL: parseEnvInt("RESCAN_INTERVAL", 30000, { min: 1000 }),

  // Limits
  MAX_TIMELINE_POINTS: parseEnvInt("MAX_TIMELINE", 120, { min: 1 }),
  MAX_ALERTS: parseEnvInt("MAX_ALERTS", 50, { min: 1 }),
  TIMELINE_DISPLAY_LIMIT: 60,
  ALERTS_DISPLAY_LIMIT: 10,

  // Health thresholds
  HEALTH_WARNING_THRESHOLD: 60,

  // Rate limiting configuration
  RATE_LIMIT: {
    // Standard endpoints (req/min)
    IP_LIMIT: parseEnvInt("RATE_LIMIT_IP", 100, { min: 1 }),
    USER_LIMIT: parseEnvInt("RATE_LIMIT_USER", 200, { min: 1 }),
    FINGERPRINT_LIMIT: parseEnvInt("RATE_LIMIT_FP", 150, { min: 1 }),
    COMBINED_LIMIT: parseEnvInt("RATE_LIMIT_COMBINED", 50, { min: 1 }),
    // Sensitive endpoints (funding, auth, admin) - stricter limits
    SENSITIVE_IP_LIMIT: parseEnvInt("RATE_LIMIT_SENSITIVE_IP", 10, { min: 1 }),
    SENSITIVE_USER_LIMIT: parseEnvInt("RATE_LIMIT_SENSITIVE_USER", 20, { min: 1 }),
    SENSITIVE_FP_LIMIT: parseEnvInt("RATE_LIMIT_SENSITIVE_FP", 15, { min: 1 }),
    SENSITIVE_COMBINED_LIMIT: parseEnvInt("RATE_LIMIT_SENSITIVE_COMBINED", 5, { min: 1 }),
    // Window size in milliseconds
    WINDOW_MS: parseEnvInt("RATE_LIMIT_WINDOW_MS", 60000, { min: 1000 }),
    // IPs to skip (comma-separated)
    SKIP_IPS: (process.env.RATE_LIMIT_SKIP_IPS || "127.0.0.1,::1").split(","),
  },

  // S3 Export configuration
  S3: {
    BUCKET: process.env.S3_BUCKET || "",
    REGION: process.env.S3_REGION || "us-east-1",
    REQUESTER_PAYS: process.env.S3_REQUESTER_PAYS === "true",
    ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || "",
    SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || "",
    ENDPOINT: process.env.S3_ENDPOINT || undefined, // For S3-compatible services
  },

  // Proxy configuration (for WebSocket/fetch)
  PROXY: {
    URL: process.env.PROXY_URL || "",
    USERNAME: process.env.PROXY_USERNAME || "",
    PASSWORD: process.env.PROXY_PASSWORD || "",
  },

  // Enterprise API hosts (for startup preconnect optimization)
  API: {
    PRIMARY: process.env.API_PRIMARY_HOST || "",
    ANALYTICS: process.env.API_ANALYTICS_HOST || "",
    AUTH: process.env.API_AUTH_HOST || "",
    CDN: process.env.API_CDN_HOST || "",
    // Readonly host matrix with status colors
    HOSTS: [
      { id: "primary", label: "Primary API", env: "API_PRIMARY_HOST", color: { hex: "#3b82f6", hsl: "hsl(217, 91%, 60%)" } },
      { id: "analytics", label: "Analytics", env: "API_ANALYTICS_HOST", color: { hex: "#8b5cf6", hsl: "hsl(258, 90%, 66%)" } },
      { id: "auth", label: "Auth Service", env: "API_AUTH_HOST", color: { hex: "#10b981", hsl: "hsl(160, 84%, 39%)" } },
      { id: "cdn", label: "CDN", env: "API_CDN_HOST", color: { hex: "#f59e0b", hsl: "hsl(38, 92%, 50%)" } },
      { id: "proxy", label: "Proxy", env: "PROXY_URL", color: { hex: "#ec4899", hsl: "hsl(330, 81%, 60%)" } },
      { id: "s3", label: "S3 Storage", env: "S3_ENDPOINT", color: { hex: "#06b6d4", hsl: "hsl(188, 94%, 43%)" } },
    ] as const,
  },

  // TLS/HTTPS configuration (BoringSSL-powered with native SNI)
  TLS: {
    ENABLED: process.env.TLS_ENABLED === "true",
    // Native SNI array - each domain gets its own cert/key/CA
    DOMAINS: parseTLSDomains(),
  } satisfies TLSConfig,
} as const;

/**
 * Parse TLS domains from environment or use defaults
 * Supports JSON config via TLS_DOMAINS_JSON env var
 */
function parseTLSDomains(): TLSConfig["DOMAINS"] {
  // Option 1: JSON config (production)
  if (process.env.TLS_DOMAINS_JSON) {
    try {
      return JSON.parse(process.env.TLS_DOMAINS_JSON);
    } catch {
      console.error("Failed to parse TLS_DOMAINS_JSON");
    }
  }

  // Option 2: Single domain from individual env vars (simple setup)
  if (process.env.TLS_KEY_PATH && process.env.TLS_CERT_PATH) {
    return [
      {
        serverName: process.env.TLS_SERVER_NAME || process.env.HOST || "localhost",
        keyPath: process.env.TLS_KEY_PATH,
        certPath: process.env.TLS_CERT_PATH,
        caPath: process.env.TLS_CA_PATH || undefined,
        dhParamsFile: process.env.TLS_DH_PARAMS || undefined,
        passphrase: process.env.TLS_PASSPHRASE || undefined,
      },
    ];
  }

  // Option 3: Default dev certs (fallback)
  return [
    {
      serverName: "localhost",
      keyPath: "./certs/private-key.pem",
      certPath: "./certs/fullchain.pem",
    },
  ];
}

export type Config = typeof config;

// Mutable credentials (loaded from secrets at runtime)
let _s3Credentials = {
  accessKeyId: config.S3.ACCESS_KEY_ID,
  secretAccessKey: config.S3.SECRET_ACCESS_KEY,
};

let _proxyCredentials = {
  password: config.PROXY.PASSWORD,
  auth: "",
};

// Track secrets loading status
let _secretsLoaded = false;
let _secretsLoadedAt: Date | null = null;
let _secretsCount = 0;

/**
 * Load sensitive credentials from Bun.secrets (async)
 * Falls back to environment variables if secrets unavailable
 * Call this at startup before using S3/proxy features
 */
export async function loadSecrets(): Promise<void> {
  const [s3Creds, proxyCreds] = await Promise.all([
    getS3Credentials(),
    getProxyCredentials(),
  ]);

  let count = 0;

  // Update S3 credentials if found in secrets
  if (s3Creds.accessKeyId) { _s3Credentials.accessKeyId = s3Creds.accessKeyId; count++; }
  if (s3Creds.secretAccessKey) { _s3Credentials.secretAccessKey = s3Creds.secretAccessKey; count++; }

  // Update proxy credentials if found in secrets
  if (proxyCreds.password) { _proxyCredentials.password = proxyCreds.password; count++; }
  if (proxyCreds.auth) { _proxyCredentials.auth = proxyCreds.auth; count++; }

  _secretsLoaded = true;
  _secretsLoadedAt = new Date();
  _secretsCount = count;
}

/**
 * Get secrets loading status for health endpoint
 */
export function getSecretsStatus() {
  return {
    loaded: _secretsLoaded,
    loadedAt: _secretsLoadedAt?.toISOString() || null,
    count: _secretsCount,
  };
}

/**
 * Get S3 credentials (loaded from secrets or env)
 */
export function getS3Config() {
  return {
    ...config.S3,
    ACCESS_KEY_ID: _s3Credentials.accessKeyId,
    SECRET_ACCESS_KEY: _s3Credentials.secretAccessKey,
  };
}

/**
 * Get proxy credentials (loaded from secrets or env)
 */
export function getProxyConfig() {
  return {
    ...config.PROXY,
    PASSWORD: _proxyCredentials.password,
    AUTH: _proxyCredentials.auth,
  };
}

/**
 * Validate critical configuration values
 * Throws on invalid config to fail fast on startup
 */
export function validateConfig(): void {
  const errors: string[] = [];

  // Validate PORT
  if (config.PORT < 1 || config.PORT > 65535) {
    errors.push(`Invalid PORT: ${config.PORT} (must be 1-65535)`);
  }

  // Validate PROJECTS_DIR exists
  if (!config.PROJECTS_DIR) {
    errors.push("PROJECTS_DIR is required");
  }

  // Validate TLS config in production
  if (!config.DEVELOPMENT && config.TLS.ENABLED) {
    for (const domain of config.TLS.DOMAINS) {
      if (!domain.keyPath || !domain.certPath) {
        errors.push(`TLS domain ${domain.serverName} missing keyPath or certPath`);
      }
    }
  }

  // Validate rate limit values
  if (config.RATE_LIMIT.WINDOW_MS < 1000) {
    errors.push("RATE_LIMIT.WINDOW_MS must be at least 1000ms");
  }

  // Prevent localhost database in production (defense-in-depth)
  if (!config.DEVELOPMENT) {
    const forbiddenInProd = ["localhost", "127.0.0.1", "0.0.0.0"];
    const dbHost = process.env.DATABASE_URL;
    if (dbHost && forbiddenInProd.some(h => dbHost.includes(h))) {
      errors.push("Production database cannot be localhost");
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n  - ${errors.join("\n  - ")}`);
  }
}

// Fail fast on startup in production
if (process.env.NODE_ENV === "production") {
  validateConfig();
}
