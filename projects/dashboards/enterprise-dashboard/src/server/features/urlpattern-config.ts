// =============================================================================
// URLPattern Configuration - Centralized BASE_URL and Pattern Definitions
// =============================================================================
// All URL patterns should use BASE_URL as the base for string-based patterns
// Uses Bun 1.3.4+ URLPattern API with exec() method support

// =============================================================================
// FROZEN CONSTANTS - These cannot be modified at runtime
// =============================================================================

export const BASE_URL = "https://api.enterprise.local" as const;
export const BASE_WS_URL = "wss://api.enterprise.local" as const;
export const BASE_HTTP_URL = "http://api.enterprise.local" as const;

export const API_VERSION = "v1" as const;
export const API_PREFIX = `/${API_VERSION}` as const;

export const FROZEN_TIMEOUTS = {
  REQUEST_TIMEOUT: 30000,
  SOCKET_TIMEOUT: 30000,
  KEEP_ALIVE_TIMEOUT: 5000,
  IDLE_TIMEOUT: 60000,
  GRACEFUL_SHUTDOWN: 10000,
  HEALTH_CHECK_INTERVAL: 5000,
  METRICS_COLLECTION_INTERVAL: 1000,
  PATTERN_CACHE_WARMUP: 100,
  DNS_CACHE_TTL: 30000,
  RATE_LIMIT_WINDOW: 60000,
  SESSION_EXPIRY: 3600000,
  TOKEN_REFRESH_BEFORE: 60000,
} as const;

export const FROZEN_LIMITS = {
  MAX_REQUEST_BODY: 10 * 1024 * 1024,
  MAX_RESPONSE_BODY: 50 * 1024 * 1024,
  MAX_URL_LENGTH: 2048,
  MAX_HEADERS: 64,
  MAX_COOKIES: 32,
  MAX_QUERY_PARAMS: 64,
  MAX_ROUTE_PARAMS: 16,
  MAX_CONCURRENT_REQUESTS: 256,
  MAX_CONNECTIONS_PER_HOST: 10,
  MAX_FREE_SOCKETS: 5,
  MAX_SOCKETS: 10,
} as const;

export const FROZEN_REGEX = {
  UUID_V4: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  SEMVER: /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?(?:\+[a-z0-9.-]+)?$/,
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  IPV6: /^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?:(?::[0-9a-fA-F]{1,4}){1,6})|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(?::[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(?:ffff(?::0{1,4}){0,1}:){0,1}(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))$/,
  PORT: /^[1-9][0-9]{0,4}$/,
  ISO_DATE: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  API_KEY: /^sk-[a-zA-Z0-9]{20,}$/,
} as const;

export const FROZEN_HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// =============================================================================
// ENVIRONMENT VARIABLES WITH DEFAULTS
// =============================================================================

export const ENV = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parseInt(process.env.PORT ?? "8080", 10),
  HOST: process.env.HOST ?? "0.0.0.0",
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
  
  // API Configuration
  API_PREFIX: API_PREFIX,
  BASE_URL: BASE_URL,
  
  // Feature Flags
  ENABLE_METRICS: process.env.ENABLE_METRICS === "true",
  ENABLE_CORS: process.env.ENABLE_CORS !== "false",
  ENABLE_COMPRESSION: process.env.ENABLE_COMPRESSION !== "false",
  
  // Performance
  MAX_CONCURRENT_REQUESTS: FROZEN_LIMITS.MAX_CONCURRENT_REQUESTS,
  REQUEST_TIMEOUT: FROZEN_TIMEOUTS.REQUEST_TIMEOUT,
  
  // Secrets
  USE_KEYCHAIN: process.env.USE_KEYCHAIN !== "false",
} as const;

// =============================================================================
// URLPattern Definitions with BASE_URL
// =============================================================================

export const URL_PATTERNS = {
  // API Routes (using string patterns with BASE_URL)
  API: {
    USERS: `${BASE_URL}${API_PREFIX}/users/:id`,
    USERS_LIST: `${BASE_URL}${API_PREFIX}/users`,
    PROJECTS: `${BASE_URL}${API_PREFIX}/projects/:projectId`,
    PROJECTS_LIST: `${BASE_URL}${API_PREFIX}/projects`,
    ANALYTICS: `${BASE_URL}${API_PREFIX}/analytics/:metric`,
    ANALYTICS_RANGE: `${BASE_URL}${API_PREFIX}/analytics/:metric/:range`,
    SETTINGS: `${BASE_URL}${API_PREFIX}/settings/:section`,
    HEALTH: `${BASE_URL}${API_PREFIX}/health`,
    METRICS: `${BASE_URL}${API_PREFIX}/metrics`,
    VERSION: `${BASE_URL}${API_PREFIX}/version`,
  },
  
  // WebSocket Routes
  WS: {
    REALTIME: `${BASE_WS_URL}/realtime`,
    EVENTS: `${BASE_WS_URL}/events/:channel`,
    METRICS_STREAM: `${BASE_WS_URL}/metrics/stream`,
  },
  
  // Admin Routes (more restrictive patterns)
  ADMIN: {
    DASHBOARD: `${BASE_URL}${API_PREFIX}/admin/dashboard`,
    USERS: `${BASE_URL}${API_PREFIX}/admin/users/:id`,
    SYSTEM: `${BASE_URL}${API_PREFIX}/admin/system/:component`,
    AUDIT: `${BASE_URL}${API_PREFIX}/admin/audit/:id`,
    CONFIG: `${BASE_URL}${API_PREFIX}/admin/config/:section`,
  },
  
  // Auth Routes
  AUTH: {
    LOGIN: `${BASE_URL}${API_PREFIX}/auth/login`,
    LOGOUT: `${BASE_URL}${API_PREFIX}/auth/logout`,
    REFRESH: `${BASE_URL}${API_PREFIX}/auth/refresh`,
    ME: `${BASE_URL}${API_PREFIX}/auth/me`,
    MFA: `${BASE_URL}${API_PREFIX}/auth/mfa/:type`,
  },
  
  // Static Assets
  ASSETS: {
    IMAGES: `${BASE_URL}/assets/images/:name`,
    FONTS: `${BASE_URL}/assets/fonts/:name`,
    SCRIPTS: `${BASE_URL}/assets/scripts/:name`,
    STYLES: `${BASE_URL}/assets/styles/:name`,
  },
} as const;

// =============================================================================
// URLPattern Compiled Patterns (for internal routing)
// =============================================================================

export const COMPILED_PATTERNS = {
  // Using URLPatternInit for type safety
  USERS: new URLPattern({ pathname: `${API_PREFIX}/users/:id` }),
  USERS_LIST: new URLPattern({ pathname: `${API_PREFIX}/users` }),
  PROJECTS: new URLPattern({ pathname: `${API_PREFIX}/projects/:projectId` }),
  PROJECTS_LIST: new URLPattern({ pathname: `${API_PREFIX}/projects` }),
  ANALYTICS: new URLPattern({ pathname: `${API_PREFIX}/analytics/:metric` }),
  ANALYTICS_RANGE: new URLPattern({ pathname: `${API_PREFIX}/analytics/:metric/:range` }),
  SETTINGS: new URLPattern({ pathname: `${API_PREFIX}/settings/:section` }),
  HEALTH: new URLPattern({ pathname: `${API_PREFIX}/health` }),
  METRICS: new URLPattern({ pathname: `${API_PREFIX}/metrics` }),
  VERSION: new URLPattern({ pathname: `${API_PREFIX}/version` }),
  ADMIN_DASHBOARD: new URLPattern({ pathname: `${API_PREFIX}/admin/dashboard` }),
  AUTH_LOGIN: new URLPattern({ pathname: `${API_PREFIX}/auth/login` }),
  AUTH_REFRESH: new URLPattern({ pathname: `${API_PREFIX}/auth/refresh` }),
} as const;

// =============================================================================
// Metrics Collection System
// =============================================================================

interface MetricValue {
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

interface MetricsCollection {
  requests: Map<string, MetricValue>;
  latency: Map<string, MetricValue>;
  errors: Map<string, MetricValue>;
  custom: Map<string, MetricValue>;
}

class URLPatternMetricsCollector {
  private static instance: URLPatternMetricsCollector;
  private metrics: MetricsCollection;
  private collectionInterval: ReturnType<typeof setInterval> | null = null;
  private enabled: boolean;

  private constructor() {
    this.metrics = {
      requests: new Map(),
      latency: new Map(),
      errors: new Map(),
      custom: new Map(),
    };
    this.enabled = ENV.ENABLE_METRICS;
  }

  static getInstance(): URLPatternMetricsCollector {
    if (!URLPatternMetricsCollector.instance) {
      URLPatternMetricsCollector.instance = new URLPatternMetricsCollector();
    }
    return URLPatternMetricsCollector.instance;
  }

  startCollection(): void {
    if (!this.enabled || this.collectionInterval) return;

    this.collectionInterval = setInterval(() => {
      this.snapshot();
    }, FROZEN_TIMEOUTS.METRICS_COLLECTION_INTERVAL);
  }

  stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
  }

  private snapshot(): void {
    const now = Date.now();
    
    // Log current metrics snapshot
    const requestCount = this.metrics.requests.size;
    const latencySum = Array.from(this.metrics.latency.values())
      .reduce((sum, m) => sum + m.value, 0);
    const errorCount = this.metrics.errors.size;

    if (requestCount > 0) {
      console.log(
        `[METRICS] requests=${requestCount} avg_latency=${(latencySum / requestCount).toFixed(2)}ms errors=${errorCount}`
      );
    }
  }

  recordRequest(method: string, path: string, status: number): void {
    const key = `${method}:${path}:${status}`;
    this.metrics.requests.set(key, {
      value: (this.metrics.requests.get(key)?.value ?? 0) + 1,
      timestamp: Date.now(),
    });
  }

  recordLatency(method: string, path: string, duration: number): void {
    const key = `${method}:${path}`;
    this.metrics.latency.set(key, {
      value: duration,
      timestamp: Date.now(),
    });
  }

  recordError(type: string, message: string): void {
    const key = `${type}:${message}`;
    this.metrics.errors.set(key, {
      value: (this.metrics.errors.get(key)?.value ?? 0) + 1,
      timestamp: Date.now(),
    });
  }

  recordCustom(name: string, value: number, tags?: Record<string, string>): void {
    this.metrics.custom.set(name, { value, timestamp: Date.now(), tags });
  }

  getMetrics(): {
    requests: Record<string, number>;
    latency: Record<string, number>;
    errors: Record<string, number>;
    custom: Record<string, MetricValue>;
  } {
    const formatMap = (m: Map<string, MetricValue>) => {
      const result: Record<string, number> = {};
      for (const [k, v] of m) {
        result[k] = v.value;
      }
      return result;
    };

    return {
      requests: formatMap(this.metrics.requests),
      latency: formatMap(this.metrics.latency),
      errors: formatMap(this.metrics.errors),
      custom: Object.fromEntries(this.metrics.custom),
    };
  }

  reset(): void {
    this.metrics.requests.clear();
    this.metrics.latency.clear();
    this.metrics.errors.clear();
    this.metrics.custom.clear();
  }
}

export const metrics = URLPatternMetricsCollector.getInstance();

// =============================================================================
// Helper Functions
// =============================================================================

export function getPatternForRoute(route: string): URLPattern | null {
  const normalized = route.replace(BASE_URL, "");
  return COMPILED_PATTERNS[normalized as keyof typeof COMPILED_PATTERNS] ?? null;
}

export function matchApiRoute(url: string): { route: string; params: Record<string, string> } | null {
  for (const [name, pattern] of Object.entries(COMPILED_PATTERNS)) {
    const result = pattern.exec(url);
    if (result) {
      const params: Record<string, string> = {};
      if (result.pathname?.groups) {
        for (const [key, value] of Object.entries(result.pathname.groups)) {
          params[key] = value ?? "";
        }
      }
      return { route: name, params };
    }
  }
  return null;
}

export function getTimeout(key: keyof typeof FROZEN_TIMEOUTS): number {
  return FROZEN_TIMEOUTS[key];
}

export function getLimit(key: keyof typeof FROZEN_LIMITS): number {
  return FROZEN_LIMITS[key];
}

export function isProduction(): boolean {
  return ENV.NODE_ENV === "production";
}

export function shouldEnableMetrics(): boolean {
  return ENV.ENABLE_METRICS;
}

export { URLPatternMetricsCollector };
