/**
 * System Default Constants
 * Replaces magic numbers throughout the codebase with named constants
 * Improves maintainability and provides single point of configuration
 */

/**
 * Dashboard Configuration Constants
 */
export const DASHBOARD_DEFAULTS = {
  /** Default dashboard width in characters */
  DEFAULT_WIDTH: 80,
  
  /** Default update interval for live updates (milliseconds) */
  LIVE_UPDATE_INTERVAL_MS: 5000,
  
  /** Progress bar size in characters */
  PROGRESS_BAR_SIZE: 10,
  
  /** Health status thresholds (percentages) */
  HEALTH_THRESHOLDS: {
    HEALTHY_MIN: 90,
    DEGRADED_MIN: 70,
    IMPAIRED_MIN: 50,
    CRITICAL_MIN: 0,
  },
  
  /** Maximum width for stdin before HTTP header warning */
  HTTP_HEADER_LIMIT_BYTES: 16384,
} as const;

/**
 * Command History Constants
 */
export const COMMAND_HISTORY_DEFAULTS = {
  /** Maximum number of commands to keep in history */
  MAX_HISTORY_SIZE: 100,
  
  /** Time window for active commands (milliseconds) */
  ACTIVE_COMMAND_WINDOW_MS: 60000,
} as const;

/**
 * Memory Management Constants
 */
export const MEMORY_DEFAULTS = {
  /** Memory threshold in MB (100 MB) */
  MEMORY_THRESHOLD_MB: 100,
  
  /** Memory threshold in bytes */
  MEMORY_THRESHOLD_BYTES: 100 * 1024 * 1024,
} as const;

/**
 * Concurrent Processing Constants
 */
export const CONCURRENT_PROCESSING_DEFAULTS = {
  /** Progress reporting interval (every 5% of total items) */
  PROGRESS_REPORT_DIVISOR: 20,
  
  /** Batch size for concurrent operations */
  BATCH_SIZE: 10,
} as const;

/**
 * Telemetry Constants
 */
export const TELEMETRY_DEFAULTS = {
  /** Telemetry collection interval (milliseconds) */
  COLLECTION_INTERVAL_MS: 60000,
  
  /** Collection interval in seconds */
  COLLECTION_INTERVAL_SECONDS: 60,
} as const;

/**
 * Performance Metrics Constants
 */
export const PERFORMANCE_DEFAULTS = {
  /** CPU usage threshold for optimization suggestions (percentage) */
  CPU_THRESHOLD_PERCENT: 80,
  
  /** Memory usage threshold for optimization suggestions (percentage) */
  MEMORY_THRESHOLD_PERCENT: 80,
  
  /** Response time threshold for optimization suggestions (milliseconds) */
  RESPONSE_TIME_THRESHOLD_MS: 100,
  
  /** Integration health check success rate (probability 0-1) */
  HEALTH_CHECK_SUCCESS_RATE: 0.8,
} as const;

/**
 * Bundle Analysis Constants
 */
export const BUNDLE_DEFAULTS = {
  /** Base bundle size in KB */
  BASE_SIZE_KB: 200,
  
  /** Default feature size in KB */
  DEFAULT_FEATURE_SIZE_KB: 10,
  
  /** Feature-specific sizes in KB */
  FEATURE_SIZES_KB: {
    FEAT_EXTENDED_LOGGING: 50,
    FEAT_ADVANCED_MONITORING: 30,
    FEAT_ENCRYPTION: 20,
    FEAT_AUTO_HEAL: 25,
    FEAT_NOTIFICATIONS: 15,
  },
} as const;

/**
 * Feature Flag Health Check Constants
 */
export const FEATURE_HEALTH_DEFAULTS = {
  /** Integration health check success threshold for 80% availability */
  HEALTH_CHECK_RANDOM_THRESHOLD: 0.2, // 20% failure rate = 80% success
} as const;

/**
 * Helper function to get dashboard padding width
 * @param measuredWidth - Measured width of content
 * @param maxWidth - Maximum width constraint
 * @returns Padding amount needed
 */
export const calculatePadding = (measuredWidth: number, maxWidth: number = DASHBOARD_DEFAULTS.DEFAULT_WIDTH): number => {
  return Math.max(0, maxWidth - measuredWidth);
};

/**
 * Helper function to calculate batch progress percentage
 * @param current - Current item number
 * @param total - Total number of items
 * @returns Whether progress should be reported at this point
 */
export const shouldReportProgress = (current: number, total: number): boolean => {
  const divisor = Math.max(1, Math.floor(total / CONCURRENT_PROCESSING_DEFAULTS.PROGRESS_REPORT_DIVISOR));
  return current % divisor === 0;
};
