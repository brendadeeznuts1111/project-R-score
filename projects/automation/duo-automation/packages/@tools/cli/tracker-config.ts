/**
 * Configuration and naming conventions for Enhanced Bun Native API Tracker
 */

export const TRACKER_CONSTANTS = {
  // Default configuration
  DEFAULT_UPDATE_INTERVAL_MS: 5000,
  DEFAULT_MAX_REPORT_AGE_HOURS: 24,
  DEFAULT_REPORTS_DIRECTORY: './reports/bun-native-metrics',
  DEFAULT_DRYRUN: false,
  
  // Alert thresholds
  ALERT_THRESHOLDS: {
    LOW_NATIVE_RATE: 80,    // Alert if native implementation rate < 80%
    HIGH_ERROR_RATE: 5,     // Alert if error rate > 5%
    SLOW_RESPONSE_TIME: 100, // Alert if average response time > 100ms
    HIGH_MEMORY_USAGE: 500,  // Alert if memory usage > 500MB
  },

  // Performance tiers
  PERFORMANCE_TIERS: {
    FAST_THRESHOLD_MS: 10,
    MODERATE_THRESHOLD_MS: 100,
  },

  // File naming conventions
  FILE_NAMING: {
    REPORT_PREFIX: 'bun-native-metrics',
    TIMESTAMP_FORMAT: 'YYYY-MM-DD-HH-mm-ss-SSS',
    FILE_EXTENSION: '.json',
  },

  // Domain classifications (consistent naming)
  DOMAINS: [
    'filesystem',
    'networking', 
    'crypto',
    'cookies',
    'streams',
    'binary',
    'system',
    'database',
    'build',
    'web',
    'workers',
    'utilities',
    'events',
    'timing',
    'text',
    'nodejs',
    'javascript',
    'runtime'
  ] as const,

  // Implementation types
  IMPLEMENTATION_TYPES: {
    NATIVE: 'native',
    FALLBACK: 'fallback',
    POLYFILL: 'polyfill'
  } as const,

  // Memory efficiency levels
  MEMORY_EFFICIENCY_LEVELS: {
    OPTIMAL_THRESHOLD: 100,
    GOOD_THRESHOLD: 50,
    MODERATE_THRESHOLD: 10,
  },

  // Subscription management
  SUBSCRIPTIONS: {
    ID_PREFIX: 'sub',
    ID_SEPARATOR: '_',
    RANDOM_SUFFIX_LENGTH: 9,
  },

  // Health status
  HEALTH_STATUS: {
    HEALTHY: 'healthy',
    DISABLED: 'disabled',
    DEGRADED: 'degraded',
    ERROR: 'error'
  } as const,

  // Report structure
  REPORT_STRUCTURE: {
    VERSION: '1.0.0',
    METADATA_FIELDS: [
      'timestamp',
      'version',
      'environment',
      'nodeVersion',
      'platform',
      'architecture'
    ],
    SUMMARY_FIELDS: [
      'totalAPIs',
      'totalCalls',
      'nativeImplementationRate',
      'averageResponseTime',
      'errorRate',
      'uptime'
    ]
  },

  // Dryrun mode indicators
  DRYRUN: {
    PREFIX: '🔍 DRYRUN:',
    ALERT_PREFIX: '🔍 DRYRUN ALERT:',
    ERROR_PREFIX: '🔍 DRYRUN ERROR:',
    MODE_INDICATOR: ' (DRYRUN MODE)'
  }
} as const;

/**
 * Type definitions derived from constants
 */
export type DomainType = typeof TRACKER_CONSTANTS.DOMAINS[number];
export type ImplementationType = typeof TRACKER_CONSTANTS.IMPLEMENTATION_TYPES[keyof typeof TRACKER_CONSTANTS.IMPLEMENTATION_TYPES];
export type HealthStatusType = typeof TRACKER_CONSTANTS.HEALTH_STATUS[keyof typeof TRACKER_CONSTANTS.HEALTH_STATUS];
export type PerformanceTierType = 'fast' | 'moderate' | 'slow';
export type MemoryEfficiencyType = 'optimal' | 'good' | 'moderate' | 'high';

/**
 * Configuration builder for consistent setup
 */
export class TrackerConfigBuilder {
  private config = {
    updateIntervalMs: TRACKER_CONSTANTS.DEFAULT_UPDATE_INTERVAL_MS,
    maxReportAgeHours: TRACKER_CONSTANTS.DEFAULT_MAX_REPORT_AGE_HOURS,
    reportsDirectory: TRACKER_CONSTANTS.DEFAULT_REPORTS_DIRECTORY,
    enableGarbageCollection: true,
    alertThresholds: { ...TRACKER_CONSTANTS.ALERT_THRESHOLDS }
  };

  /**
   * Set custom update interval
   */
  public withUpdateInterval(intervalMs: number): this {
    this.config.updateIntervalMs = intervalMs;
    return this;
  }

  /**
   * Set custom report retention period
   */
  public withReportRetention(hours: number): this {
    this.config.maxReportAgeHours = hours;
    return this;
  }

  /**
   * Set custom reports directory
   */
  public withReportsDirectory(directory: string): this {
    this.config.reportsDirectory = directory;
    return this;
  }

  /**
   * Enable or disable garbage collection
   */
  public withGarbageCollection(enabled: boolean): this {
    this.config.enableGarbageCollection = enabled;
    return this;
  }

  /**
   * Set custom alert thresholds
   */
  public withAlertThresholds(thresholds: Partial<typeof TRACKER_CONSTANTS.ALERT_THRESHOLDS>): this {
    this.config.alertThresholds = { ...this.config.alertThresholds, ...thresholds };
    return this;
  }

  /**
   * Build the configuration
   */
  public build() {
    return { ...this.config };
  }
}

/**
 * Utility functions for consistent naming and formatting
 */
export class TrackerUtils {
  /**
   * Generate subscription ID with consistent format
   */
  public static generateSubscriptionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, TRACKER_CONSTANTS.SUBSCRIPTIONS.RANDOM_SUFFIX_LENGTH);
    return `${TRACKER_CONSTANTS.SUBSCRIPTIONS.ID_PREFIX}${TRACKER_CONSTANTS.SUBSCRIPTIONS.ID_SEPARATOR}${timestamp}${TRACKER_CONSTANTS.SUBSCRIPTIONS.ID_SEPARATOR}${random}`;
  }

  /**
   * Generate report filename with timestamp
   */
  public static generateReportFilename(): string {
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '-')
      .replace('Z', '');
    
    return `${TRACKER_CONSTANTS.FILE_NAMING.REPORT_PREFIX}-${timestamp}${TRACKER_CONSTANTS.FILE_NAMING.FILE_EXTENSION}`;
  }

  /**
   * Format duration for display
   */
  public static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  /**
   * Format percentage for display
   */
  public static formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Determine performance tier from duration
   */
  public static getPerformanceTier(duration: number): PerformanceTierType {
    if (duration < TRACKER_CONSTANTS.PERFORMANCE_TIERS.FAST_THRESHOLD_MS) return 'fast';
    if (duration < TRACKER_CONSTANTS.PERFORMANCE_TIERS.MODERATE_THRESHOLD_MS) return 'moderate';
    return 'slow';
  }

  /**
   * Determine memory efficiency from metrics
   */
  public static getMemoryEfficiency(callCount: number, avgDuration: number): MemoryEfficiencyType {
    const efficiency = callCount / avgDuration;
    
    if (efficiency > TRACKER_CONSTANTS.MEMORY_EFFICIENCY_LEVELS.OPTIMAL_THRESHOLD) return 'optimal';
    if (efficiency > TRACKER_CONSTANTS.MEMORY_EFFICIENCY_LEVELS.GOOD_THRESHOLD) return 'good';
    if (efficiency > TRACKER_CONSTANTS.MEMORY_EFFICIENCY_LEVELS.MODERATE_THRESHOLD) return 'moderate';
    return 'high';
  }

  /**
   * Validate domain name
   */
  public static isValidDomain(domain: string): domain is DomainType {
    return TRACKER_CONSTANTS.DOMAINS.includes(domain as DomainType);
  }

  /**
   * Validate implementation type
   */
  public static isValidImplementation(implementation: string): implementation is ImplementationType {
    return Object.values(TRACKER_CONSTANTS.IMPLEMENTATION_TYPES).includes(implementation as ImplementationType);
  }

  /**
   * Create standardized error message
   */
  public static createErrorMessage(context: string, error: Error | string): string {
    const errorText = error instanceof Error ? error.message : error;
    return `[Tracker Error] ${context}: ${errorText}`;
  }

  /**
   * Create standardized log message
   */
  public static createLogMessage(level: 'info' | 'warn' | 'error', context: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
  }
}

/**
 * Predefined configurations for different environments
 */
export const PREDEFINED_CONFIGS = {
  DEVELOPMENT: new TrackerConfigBuilder()
    .withUpdateInterval(2000)
    .withReportRetention(1)
    .withReportsDirectory('./dev-reports')
    .withGarbageCollection(false)
    .build(),

  PRODUCTION: new TrackerConfigBuilder()
    .withUpdateInterval(10000)
    .withReportRetention(168) // 7 days
    .withReportsDirectory('./prod-reports')
    .withGarbageCollection(true)
    .withAlertThresholds({
      LOW_NATIVE_RATE: 90,
      HIGH_ERROR_RATE: 2,
      SLOW_RESPONSE_TIME: 50
    })
    .build(),

  TESTING: new TrackerConfigBuilder()
    .withUpdateInterval(500)
    .withReportRetention(0.1) // 6 minutes
    .withReportsDirectory('./test-reports')
    .withGarbageCollection(true)
    .build()
} as const;

/**
 * Export commonly used combinations
 */
export const DEFAULT_CONFIG = PREDEFINED_CONFIGS.DEVELOPMENT;
export const PRODUCTION_CONFIG = PREDEFINED_CONFIGS.PRODUCTION;
export const TESTING_CONFIG = PREDEFINED_CONFIGS.TESTING;
