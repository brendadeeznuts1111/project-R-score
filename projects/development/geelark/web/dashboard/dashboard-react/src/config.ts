/**
 * Dashboard Client Configuration Constants
 *
 * Constants used by the React dashboard frontend.
 */

/**
 * API Configuration
 */
export const API_CONFIG = {
  /** Base API path */
  BASE: '/api',

  /** WebSocket base URL (auto-detected in runtime) */
  get WS_BASE() {
    return typeof process !== 'undefined' && process.env?.VITE_WS_BASE
      ? process.env.VITE_WS_BASE
      : `ws://${typeof window !== 'undefined' ? window.location.host : 'localhost:3000'}`;
  },

  /** Health check endpoint */
  HEALTH: '/api/health',

  /** Info endpoint */
  INFO: '/api/info',

  /** Flags meta endpoint */
  FLAGS_META: '/api/flags/meta',

  /** Merged flags endpoint */
  FLAGS_MERGED: '/api/flags/merged',

  /** Build configurations endpoint */
  BUILD_CONFIGS: '/api/build/configs',

  /** Build trigger endpoint */
  BUILD_TRIGGER: '/api/build/trigger',

  /** Metrics endpoint */
  METRICS: '/api/metrics',

  /** Dashboard path */
  DASHBOARD: '/dashboard',
} as const;

/**
 * WebSocket Configuration
 */
export const WS_CONFIG = {
  /** Dashboard channel */
  CHANNEL: 'dashboard',

  /** Reconnection interval (ms) */
  RECONNECT_INTERVAL: 3000,

  /** Max reconnection attempts */
  MAX_RECONNECT_ATTEMPTS: 5,

  /** Connection timeout (ms) */
  CONNECTION_TIMEOUT: 10000,
} as const;

/**
 * UI Configuration
 */
export const UI_CONFIG = {
  /** Auto-refresh interval (ms) */
  AUTO_REFRESH_INTERVAL: 30000,

  /** Debounce delay (ms) */
  DEBOUNCE_DELAY: 300,

  /** Toast notification duration (ms) */
  TOAST_DURATION: 3000,

  /** Modal animation duration (ms) */
  MODAL_ANIMATION_DURATION: 200,

  /** Default page size for tables */
  DEFAULT_PAGE_SIZE: 10,

  /** Max items per page */
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * Build Configuration
 */
export const BUILD_CONFIG = {
  /** Default output directory */
  DEFAULT_OUTDIR: './dist',

  /** Default minify setting */
  DEFAULT_MINIFY: true,

  /** Chunk size warning limit (KB) */
  CHUNK_SIZE_WARNING_LIMIT: 500,
} as const;

/**
 * Feature Flag Defaults
 */
export const FEATURE_FLAGS = {
  /** Default active flags */
  DEFAULT_ACTIVE: [
    'ENV_PRODUCTION',
    'FEAT_FREE',
    'FEAT_ENCRYPTION',
  ],

  /** Critical flags that should always be enabled in production */
  CRITICAL_PRODUCTION: [
    'ENV_PRODUCTION',
    'FEAT_ENCRYPTION',
  ],

  /** Development-only flags */
  DEVELOPMENT_ONLY: [
    'ENV_DEVELOPMENT',
    'FEAT_MOCK_API',
    'FEAT_EXTENDED_LOGGING',
  ],
} as const;

/**
 * Integration Status
 */
export const INTEGRATION_STATUS = {
  /** Integration health check timeout (ms) */
  HEALTH_CHECK_TIMEOUT: 10000,

  /** Retry intervals (ms) */
  RETRY_INTERVALS: {
    SHORT: 5000,
    MEDIUM: 15000,
    LONG: 30000,
  },

  /** Fallback behavior */
  FALLBACK: {
    /** Enable fallback service */
    ENABLED: true,

    /** Fallback timeout (ms) */
    TIMEOUT: 30000,
  },
} as const;

/**
 * Monitoring Thresholds
 */
export const MONITORING_THRESHOLDS = {
  /** CPU usage warning threshold (%) */
  CPU_WARNING: 70,

  /** CPU usage critical threshold (%) */
  CPU_CRITICAL: 90,

  /** Memory usage warning threshold (%) */
  MEMORY_WARNING: 75,

  /** Memory usage critical threshold (%) */
  MEMORY_CRITICAL: 85,

  /** Response time warning threshold (ms) */
  RESPONSE_TIME_WARNING: 500,

  /** Response time critical threshold (ms) */
  RESPONSE_TIME_CRITICAL: 1000,
} as const;

/**
 * Color Scheme (Health Scores)
 */
export const HEALTH_COLORS = {
  HEALTHY: '#28a745',
  DEGRADED: '#ffc107',
  IMPAIRED: '#fd7e14',
  CRITICAL: '#dc3545',
} as const;

/**
 * Bundle Size Ranges (KB)
 */
export const BUNDLE_SIZE_RANGES = {
  SMALL: 100,
  MEDIUM: 300,
  LARGE: 500,
  XLARGE: 800,
} as const;

/**
 * Performance Metrics
 */
export const PERFORMANCE_METRICS = {
  /** Fast response time (ms) */
  FAST: 100,

  /** Medium response time (ms) */
  MEDIUM: 500,

  /** Slow response time (ms) */
  SLOW: 1000,

  /** Very slow response time (ms) */
  VERY_SLOW: 2000,
} as const;

/**
 * Time Intervals (for display)
 */
export const TIME_INTERVALS = {
  /** Refresh intervals (ms) */
  REFRESH: {
    FAST: 5000,
    NORMAL: 15000,
    SLOW: 30000,
  },

  /** Timeout durations (ms) */
  TIMEOUT: {
    SHORT: 5000,
    NORMAL: 15000,
    LONG: 30000,
  },
} as const;

/**
 * Dev Server Configuration
 */
export const DEV_SERVER = {
  /** Port for Vite dev server */
  PORT: 3001,

  /** Host for Vite dev server */
  HOST: '0.0.0.0',

  /** API proxy target (backend server) */
  API_PROXY_TARGET: 'http://localhost:3000',
} as const;
