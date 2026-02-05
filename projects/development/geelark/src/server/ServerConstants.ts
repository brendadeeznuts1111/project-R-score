/**
 * Server Configuration Constants
 *
 * Centralized constants for ports, timeouts, intervals, and thresholds
 * used across all server components.
 */

/**
 * Network Configuration
 */
export const NETWORK = {
  /** Default server port for dashboard */
  DASHBOARD_PORT: 3000,

  /** Default hostname for server binding */
  HOSTNAME: "0.0.0.0" as const,

  /** Vite dev server port (for development only) */
  VITE_DEV_PORT: 3001,

  /** WebSocket inspector port */
  INSPECTOR_PORT: 9229,

  /** Alternative ports for testing */
  TEST_PORTS: [3456, 8080, 9000] as const,
} as const;

/**
 * HTTP Timeouts and Limits
 */
export const HTTP = {
  /** Request timeout in milliseconds */
  REQUEST_TIMEOUT: 30000,

  /** Geolocation API timeout in milliseconds */
  GEOLOCATION_TIMEOUT: 10000,

  /** Rate limiting window in milliseconds */
  RATE_LIMIT_WINDOW: 60000,

  /** Rate limit max requests per window */
  RATE_LIMIT_MAX_REQUESTS: 1000,

  /** Default pagination limit */
  DEFAULT_LIMIT: 1000,

  /** Cache max-age for static assets (in seconds) */
  CACHE_MAX_AGE: 3600,

  /** HSTS max-age (1 year in seconds) */
  HSTS_MAX_AGE: 31536000,
} as const;

/**
 * Interval Timers (milliseconds)
 */
export const INTERVALS = {
  /** Metrics publishing interval (1 second) */
  METRICS_PUBLISH: 1000,

  /** Monitoring summary interval (30 seconds) */
  MONITORING_SUMMARY: 30000,

  /** Telemetry alert check interval (5 minutes) */
  TELEMETRY_ALERT_CHECK: 5 * 60 * 1000,

  /** Snapshot interval (1 hour) */
  SNAPSHOT: 60 * 60 * 1000,

  /** Data cleanup interval (1 hour) */
  DATA_CLEANUP: 60 * 60 * 1000,

  /** Anomaly detection interval (10 minutes) */
  ANOMALY_DETECTION: 10 * 60 * 1000,

  /** Refresh metrics interval (5 seconds) */
  METRICS_REFRESH: 5000,
} as const;

/**
 * Database Paths
 */
export const DATABASE_PATHS = {
  /** Telemetry database filename */
  TELEMETRY: "monitoring-telemetry.db",

  /** Monitoring database filename */
  MONITORING: "monitoring.db",

  /** Alerts database filename */
  ALERTS: "alerts.db",

  /** Geolocation database filename */
  GEOLOCATION: "geolocation.db",

  /** Anomaly detection database filename */
  ANOMALY: "anomaly-detection.db",

  /** Socket inspection database filename */
  SOCKET_INSPECTION: "socket-inspection.db",

  /** Authentication database filename */
  AUTH: "monitoring-auth.db",

  /** Dashboard configuration database filename */
  DASHBOARD_CONFIG: "dashboard-config.db",
} as const;

/**
 * Directory Paths
 */
export const DIR_PATHS = {
  /** Snapshots directory name */
  SNAPSHOTS: "snapshots",

  /** Dashboard build output directory */
  DASHBOARD_DIST: "dashboard-dist",

  /** Root directory marker */
  ROOT: "..",
} as const;

/**
 * Telemetry Thresholds
 */
export const TELEMETRY_THRESHOLDS = {
  /** CPU usage alert threshold (%) */
  CPU: 90,

  /** Memory usage alert threshold (%) */
  MEMORY: 85,

  /** Connections count alert threshold */
  CONNECTIONS: 1000,

  /** System load alert threshold */
  LOAD: 5.0,

  /** Slow operation threshold (milliseconds) */
  SLOW_OPERATION: 100,

  /** Old trace cleanup threshold (hours) */
  OLD_TRACES_HOURS: 24,
} as const;

/**
 * WebSocket Configuration
 */
export const WEBSOCKET = {
  /** Dashboard channel name */
  DASHBOARD_CHANNEL: "dashboard",

  /** Message types */
  MESSAGE_TYPES: {
    METRICS: "metrics",
    TELEMETRY_ALERTS: "telemetry-alerts",
    ANOMALIES_DETECTED: "anomalies-detected",
    MONITORING_SUMMARY: "monitoring-summary",
    UPLOAD_PROGRESS: "upload-progress",
  } as const,
} as const;

/**
 * Feature Flags (from constants.tsx)
 */
export const FEATURE_FLAGS = {
  /** Integration flags */
  INTEGRATION_GEELARK_API: "INTEGRATION_GEELARK_API",
  INTEGRATION_PROXY_SERVICE: "INTEGRATION_PROXY_SERVICE",
  INTEGRATION_EMAIL_SERVICE: "INTEGRATION_EMAIL_SERVICE",
  INTEGRATION_SMS_SERVICE: "INTEGRATION_SMS_SERVICE",

  /** Environment flags */
  ENV_DEVELOPMENT: "ENV_DEVELOPMENT",
  ENV_PRODUCTION: "ENV_PRODUCTION",
  ENV_STAGING: "ENV_STAGING",
  ENV_TEST: "ENV_TEST",

  /** Feature flags */
  FEAT_FREE: "FEAT_FREE",
  FEAT_PREMIUM: "FEAT_PREMIUM",
  FEAT_ENTERPRISE: "FEAT_ENTERPRISE",
  FEAT_ENCRYPTION: "FEAT_ENCRYPTION",
  FEAT_AUTO_HEAL: "FEAT_AUTO_HEAL",
  FEAT_NOTIFICATIONS: "FEAT_NOTIFICATIONS",
  FEAT_EXTENDED_LOGGING: "FEAT_EXTENDED_LOGGING",
  FEAT_MOCK_API: "FEAT_MOCK_API",
  FEAT_ADVANCED_MONITORING: "FEAT_ADVANCED_MONITORING",
  FEAT_BATCH_PROCESSING: "FEAT_BATCH_PROCESSING",
  FEAT_VALIDATION_STRICT: "FEAT_VALIDATION_STRICT",

  /** Upload flags */
  FEAT_CLOUD_UPLOAD: "FEAT_CLOUD_UPLOAD",
  FEAT_UPLOAD_PROGRESS: "FEAT_UPLOAD_PROGRESS",
  FEAT_MULTIPART_UPLOAD: "FEAT_MULTIPART_UPLOAD",
  FEAT_UPLOAD_ANALYTICS: "FEAT_UPLOAD_ANALYTICS",
  FEAT_CUSTOM_METADATA: "FEAT_CUSTOM_METADATA",
} as const;

/**
 * Integration Status Matrix
 */
export const INTEGRATION_STATUS = {
  /** GeeLark API integration */
  GEELARK_API: {
    name: "GeeLark API",
    flag: "INTEGRATION_GEELARK_API",
    healthCheck: "HTTP GET /health",
    timeout: "10s",
    retry: 3,
    fallback: "Mock Service",
    icon: "📱",
  },

  /** Proxy Service integration */
  PROXY_SERVICE: {
    name: "Proxy Service",
    flag: "INTEGRATION_PROXY_SERVICE",
    healthCheck: "Connection test",
    timeout: "5s",
    retry: 5,
    fallback: "Local Proxy",
    icon: "🌐",
  },

  /** Email Service integration */
  EMAIL_SERVICE: {
    name: "Email Service",
    flag: "INTEGRATION_EMAIL_SERVICE",
    healthCheck: "SMTP test",
    timeout: "15s",
    retry: 2,
    fallback: "Log to file",
    icon: "📧",
  },
} as const;

/**
 * Alert Severities
 */
export const ALERT_SEVERITY = {
  INFO: "info",
  WARNING: "warning",
  CRITICAL: "critical",
} as const;

/**
 * Environment Types
 */
export const ENVIRONMENT = {
  DEVELOPMENT: "development",
  PRODUCTION: "production",
  STAGING: "staging",
  TEST: "test",
} as const;

/**
 * API Response Constants
 */
export const API_RESPONSE = {
  /** Success status */
  SUCCESS: "success",

  /** Failed status */
  FAILED: "failed",

  /** Healthy status */
  HEALTHY: "healthy",

  /** API version */
  VERSION: "1.0.0",
} as const;

/**
 * Health Score Ranges
 */
export const HEALTH_SCORE = {
  HEALTHY_MIN: 90,
  DEGRADED_MIN: 70,
  IMPAIRED_MIN: 50,

  COLORS: {
    HEALTHY: "#28a745",
    DEGRADED: "#ffc107",
    IMPAIRED: "#fd7e14",
    CRITICAL: "#dc3545",
  },
} as const;

/**
 * Unicode Width Values
 */
export const UNICODE_WIDTH = {
  EMOJI_FLAG_WIDTH: 2,
  SKIN_TONE_WIDTH: 2,
  ZWJ_SEQUENCE_WIDTH: 2,
  ANSI_SEQUENCE_WIDTH: 2,
} as const;

/**
 * Build Output Directories
 */
export const BUILD_DIRS = {
  DEV: "./dist/dev",
  PROD_LITE: "./dist/prod-lite",
  PROD_STANDARD: "./dist/prod-std",
  PROD_PREMIUM: "./dist/prod-premium",
  TEST: "./dist/test",
  AUDIT: "./dist/audit",
  ANDROID: "./dist/android",
  IOS: "./dist/ios",
  WEB: "./dist/web",
} as const;

/**
 * Conversions to milliseconds
 */
export const MS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const;

/**
 * Conversions to seconds
 */
export const SECONDS = {
  MINUTE: 60,
  HOUR: 60 * 60,
  DAY: 24 * 60 * 60,
  WEEK: 7 * 24 * 60 * 60,
  YEAR: 365 * 24 * 60 * 60,
} as const;

/**
 * Upload Configuration
 */
export const UPLOAD = {
  /** Maximum file size for simple upload (5MB) */
  MAX_SIMPLE_SIZE: 5 * 1024 * 1024,

  /** Maximum file size for multipart upload (5TB) */
  MAX_MULTIPART_SIZE: 5 * 1024 * 1024 * 1024 * 1024,

  /** Chunk size for multipart upload (5MB) */
  CHUNK_SIZE: 5 * 1024 * 1024,

  /** Upload timeout (ms) */
  TIMEOUT: 300000,

  /** Progress update interval (ms) */
  PROGRESS_INTERVAL: 500,

  /** Maximum concurrent uploads */
  MAX_CONCURRENT: 10,

  /** S3/R2 providers */
  PROVIDERS: {
    AWS_S3: "s3",
    CLOUDFLARE_R2: "r2",
    LOCAL_DEV: "local",
  } as const,

  /** Content disposition types */
  DISPOSITION: {
    INLINE: "inline",
    ATTACHMENT: "attachment",
  } as const,

  /** Upload status */
  STATUS: {
    INITIATED: "initiated",
    UPLOADING: "uploading",
    COMPLETED: "completed",
    FAILED: "failed",
    CANCELLED: "cancelled",
  } as const,

  /** Content types */
  CONTENT_TYPES: {
    TEXT_PLAIN: "text/plain",
    TEXT_HTML: "text/html",
    TEXT_CSS: "text/css",
    TEXT_JAVASCRIPT: "text/javascript",
    APPLICATION_JSON: "application/json",
    APPLICATION_XML: "application/xml",
    APPLICATION_PDF: "application/pdf",
    IMAGE_JPEG: "image/jpeg",
    IMAGE_PNG: "image/png",
    IMAGE_GIF: "image/gif",
    IMAGE_WEBP: "image/webp",
    VIDEO_MP4: "video/mp4",
    VIDEO_WEBM: "video/webm",
    AUDIO_MPEG: "audio/mpeg",
    AUDIO_OGG: "audio/ogg",
    APPLICATION_OCTET_STREAM: "application/octet-stream",
    APPLICATION_ZIP: "application/zip",
  } as const,

  /** Metadata keys */
  METADATA_KEYS: {
    UPLOADED_BY: "uploaded-by",
    UPLOADED_AT: "uploaded-at",
    ORIGINAL_FILENAME: "original-filename",
    CONTENT_TYPE: "content-type",
    FILE_SIZE: "file-size",
    CHECKSUM: "checksum",
  } as const,
} as const;
