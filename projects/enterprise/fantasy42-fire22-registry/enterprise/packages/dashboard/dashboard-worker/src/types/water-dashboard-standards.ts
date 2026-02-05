/**
 * 🔥 Fire22 Water Dashboard Global Standards & Types
 * Comprehensive type definitions and standards for the entire Water Dashboard system
 * Version: 2.0.0
 * Last Updated: 2025-08-27
 */

// !==!==!==!==!==!==!==!==!==!==!===
// VERSIONING STANDARDS
// !==!==!==!==!==!==!==!==!==!==!===

/**
 * Semantic Versioning Standard (SemVer)
 * Format: MAJOR.MINOR.PATCH-PRERELEASE+BUILD
 * Example: 2.1.3-beta.1+20250827
 */
export interface VersionStandard {
  major: number; // Breaking changes
  minor: number; // New features (backward compatible)
  patch: number; // Bug fixes (backward compatible)
  prerelease?: string; // Optional: alpha, beta, rc
  build?: string; // Optional: build metadata
}

/**
 * Component Versioning System
 * All components must follow this versioning structure
 */
export class ComponentVersion {
  constructor(
    public readonly component: string,
    public readonly version: VersionStandard,
    public readonly releaseDate: Date,
    public readonly changelog: string[]
  ) {}

  toString(): string {
    const { major, minor, patch, prerelease, build } = this.version;
    let versionString = `${major}.${minor}.${patch}`;
    if (prerelease) versionString += `-${prerelease}`;
    if (build) versionString += `+${build}`;
    return versionString;
  }
}

// !==!==!==!==!==!==!==!==!==!==!===
// GLOBAL DATA TYPES
// !==!==!==!==!==!==!==!==!==!==!===

/**
 * Fire22 L-Key Standard Type
 * All L-keys must follow this format
 */
export type Fire22LKey = `L-${number}`;

/**
 * Complete L-Key mapping interface
 */
export interface Fire22LKeyMapping {
  lkey: Fire22LKey;
  databaseField: string;
  tableName: string;
  description: string;
  fieldType: SQLDataType;
  isIndexed: boolean;
  multilingual: boolean;
  validationRules?: ValidationRule[];
  version: string;
}

/**
 * Supported SQL data types across all storage tiers
 */
export type SQLDataType =
  | 'TEXT'
  | 'INTEGER'
  | 'REAL'
  | 'DECIMAL'
  | 'BOOLEAN'
  | 'TIMESTAMP'
  | 'JSON'
  | 'BLOB';

/**
 * Validation rule structure
 */
export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

// !==!==!==!==!==!==!==!==!==!==!===
// STORAGE TIER STANDARDS
// !==!==!==!==!==!==!==!==!==!==!===

/**
 * D1 Database Standards
 */
export interface D1DatabaseStandard {
  binding: string;
  name: string;
  id?: string;
  retentionDays: number;
  maxRowsPerQuery: number;
  queryTimeout: number;
  connectionPool: {
    min: number;
    max: number;
    idle: number;
  };
  performanceTargets: {
    queryResponseTime: number; // milliseconds
    writeLatency: number; // milliseconds
    readLatency: number; // milliseconds
  };
}

/**
 * R2 Bucket Standards
 */
export interface R2BucketStandard {
  binding: string;
  bucketName: string;
  retentionYears: number;
  compressionEnabled: boolean;
  compressionRatio: number; // Expected compression ratio (0-1)
  archiveStructure: {
    format: 'date-partitioned' | 'monthly' | 'yearly';
    fileFormat: 'json' | 'parquet' | 'csv';
    naming: string; // Pattern for file naming
  };
  performanceTargets: {
    uploadLatency: number; // milliseconds
    downloadLatency: number; // milliseconds
    throughputMBps: number; // MB per second
  };
}

/**
 * KV Namespace Standards
 */
export interface KVNamespaceStandard {
  binding: string;
  id: string;
  ttlSeconds: number;
  maxItemsPerKey: number;
  cacheStrategy: 'lru' | 'lfu' | 'fifo';
  performanceTargets: {
    hitRate: number; // Target hit rate (0-1)
    missLatency: number; // milliseconds
    hitLatency: number; // milliseconds
  };
}

/**
 * Durable Objects Standards
 */
export interface DurableObjectStandard {
  className: string;
  namespace: string;
  scriptName?: string;
  persistenceModel: 'transactional' | 'eventual';
  storage: {
    maxKeySize: number; // bytes
    maxValueSize: number; // bytes
    maxKeys: number;
  };
  alarm?: {
    maxConcurrent: number;
    retryPolicy: 'exponential' | 'linear' | 'fixed';
  };
  performanceTargets: {
    initTime: number; // milliseconds
    requestLatency: number; // milliseconds
    storageLatency: number; // milliseconds
  };
}

// !==!==!==!==!==!==!==!==!==!==!===
// WEB LOG STANDARDS
// !==!==!==!==!==!==!==!==!==!==!===

/**
 * Log Type Enumeration
 * All log types must be one of these values
 */
export enum LogType {
  TRANSACTION = 'transaction',
  WAGER = 'wager',
  AUTHENTICATION = 'authentication',
  SECURITY = 'security',
  SYSTEM = 'system',
  API_ACCESS = 'api_access',
  ERROR = 'error',
  AUDIT = 'audit',
}

/**
 * Standard web log entry structure
 */
export interface WebLogEntry {
  id: string; // UUID v4
  timestamp: Date;
  logType: LogType;
  actionType?: string;
  customerId?: string; // L-603
  ipAddress?: string;
  userAgent?: string;

  // Financial fields (with L-key references)
  amount?: number; // L-69
  riskAmount?: number; // L-627
  winAmount?: number; // L-628
  balance?: number; // L-187
  depositAmount?: number; // L-202
  withdrawalAmount?: number; // L-206

  // Betting fields (with L-key references)
  straightsBet?: number; // L-12
  parlaysBet?: number; // L-15
  ifBets?: number; // L-16
  teasersBet?: number; // L-85
  livePropsBet?: number; // L-1390

  // Security & compliance
  riskScore?: number; // 0-100
  isSuspicious?: boolean;
  fraudDetection?: string; // L-848
  auditTrail?: string; // L-1391

  // Metadata
  fire22LanguageKeys?: Fire22LKey[];
  languageCode?: LanguageCode;
  actionData?: Record<string, any>;
  status?: TransactionStatus;
  errorMessage?: string;

  // Versioning
  schemaVersion: string;
}

/**
 * Supported language codes
 */
export type LanguageCode = 'en' | 'es' | 'pt';

/**
 * Transaction status enumeration
 */
export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REVERSED = 'reversed',
}

// !==!==!==!==!==!==!==!==!==!==!===
// CUSTOMER STANDARDS
// !==!==!==!==!==!==!==!==!==!==!===

/**
 * Customer type enumeration
 */
export enum CustomerType {
  PLAYER = 'player',
  AGENT = 'agent',
  SUPERAGENT = 'superagent',
  MASTER = 'master',
  VIP = 'vip',
}

/**
 * Standard Fire22 customer structure
 */
export interface Fire22Customer {
  id: string; // L-603: Customer ID
  customerName: string; // L-526: Name
  customerType: CustomerType; // L-152: Type
  loginId: string; // L-889: Login ID
  passwordHash?: string; // L-214: Password (never expose)

  // Financial
  balance: number; // L-187: Balance
  creditLimit?: number;
  currency: string;

  // Security
  securitySettings?: SecuritySettings; // L-1387
  accountVerification?: AccountVerification; // L-1388
  lastLogin?: Date;
  loginAttempts?: number;

  // Preferences
  languageCode: LanguageCode;
  timezone?: string;
  notifications?: NotificationPreferences;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  isLocked?: boolean;

  // L-keys
  fire22LanguageKeys: Fire22LKey[];
}

/**
 * Security settings structure
 */
export interface SecuritySettings {
  twoFactorEnabled: boolean;
  ipWhitelist?: string[];
  sessionTimeout: number; // minutes
  passwordExpiryDays?: number;
  securityQuestions?: Array<{
    question: string;
    answerHash: string;
  }>;
}

/**
 * Account verification structure
 */
export interface AccountVerification {
  emailVerified: boolean;
  phoneVerified: boolean;
  identityVerified: boolean;
  verificationLevel: 'basic' | 'standard' | 'enhanced' | 'full';
  verifiedAt?: Date;
  verifiedBy?: string;
  documents?: string[]; // Document IDs
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  marketing: boolean;
}

// !==!==!==!==!==!==!==!==!==!==!===
// ANALYTICS STANDARDS
// !==!==!==!==!==!==!==!==!==!==!===

/**
 * Standard analytics summary structure
 */
export interface AnalyticsSummary {
  period: {
    start: Date;
    end: Date;
    duration: number; // milliseconds
  };

  transaction: {
    totalEvents: number;
    totalAmount: number; // L-69 aggregation
    avgAmount: number; // L-69 average
    totalDeposits: number; // L-202 aggregation
    totalWithdrawals: number; // L-206 aggregation
    suspiciousEvents: number;
  };

  wager: {
    totalEvents: number;
    totalStraights: number; // L-12 aggregation
    totalParlays: number; // L-15 aggregation
    totalLiveProps: number; // L-1390 aggregation
    totalRiskAmount: number; // L-627 aggregation
    totalWinAmount: number; // L-628 aggregation
    avgRiskScore: number;
  };

  authentication: {
    totalLogins: number;
    failedLogins: number;
    uniqueUsers: number;
    avgSessionDuration: number; // minutes
  };

  security: {
    totalAlerts: number;
    highRiskEvents: number;
    blockedTransactions: number;
    fraudDetections: number; // L-848 count
  };

  performance: {
    avgResponseTime: number; // milliseconds
    p95ResponseTime: number; // milliseconds
    errorRate: number; // percentage
    uptime: number; // percentage
  };
}

// !==!==!==!==!==!==!==!==!==!==!===
// CACHE MANAGER STANDARDS
// !==!==!==!==!==!==!==!==!==!==!===

/**
 * Cache entry structure
 */
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  ttl: number; // seconds
  createdAt: Date;
  expiresAt: Date;
  hits: number;
  lastAccessed: Date;
  size: number; // bytes
  compressed: boolean;
  version: string;
}

/**
 * Cache statistics
 */
export interface CacheStatistics {
  totalEntries: number;
  totalSize: number; // bytes
  hitRate: number; // 0-1
  missRate: number; // 0-1
  evictionCount: number;
  avgEntrySize: number; // bytes
  avgTTL: number; // seconds
  oldestEntry: Date;
  newestEntry: Date;
}

/**
 * Cache configuration
 */
export interface CacheConfiguration {
  maxEntries: number;
  maxSizeBytes: number;
  defaultTTL: number; // seconds
  evictionPolicy: 'lru' | 'lfu' | 'ttl' | 'fifo';
  compressionThreshold: number; // bytes
  warmupEnabled: boolean;
  persistEnabled: boolean;
  namespace: string;
}

// !==!==!==!==!==!==!==!==!==!==!===
// WORKER STANDARDS
// !==!==!==!==!==!==!==!==!==!==!===

/**
 * Worker configuration standard
 */
export interface WorkerConfiguration {
  name: string;
  environment: 'development' | 'staging' | 'production';
  routes: string[];

  bindings: {
    databases?: D1DatabaseStandard[];
    r2Buckets?: R2BucketStandard[];
    kvNamespaces?: KVNamespaceStandard[];
    durableObjects?: DurableObjectStandard[];
    secrets?: string[];
    vars?: Record<string, string>;
  };

  limits: {
    cpuMs: number;
    memoryMB: number;
    subrequests: number;
    duration: number; // seconds
  };

  compatibility: {
    date: string;
    flags?: string[];
  };

  triggers?: {
    crons?: Array<{
      schedule: string;
      handler: string;
    }>;
    queues?: string[];
  };
}

// !==!==!==!==!==!==!==!==!==!==!===
// TESTING STANDARDS
// !==!==!==!==!==!==!==!==!==!==!===

/**
 * Test suite configuration
 */
export interface TestSuiteConfiguration {
  name: string;
  type: 'unit' | 'integration' | 'e2e' | 'performance';

  coverage: {
    enabled: boolean;
    threshold: {
      lines: number;
      functions: number;
      branches: number;
      statements: number;
    };
  };

  timeout: number; // milliseconds
  retries: number;
  parallel: boolean;

  environment: {
    preset: string;
    setup?: string;
    teardown?: string;
    globals?: Record<string, any>;
  };

  reporting: {
    format: 'json' | 'html' | 'lcov' | 'text';
    outputDir: string;
    verbose: boolean;
  };
}

/**
 * Test case structure
 */
export interface TestCase {
  id: string;
  suite: string;
  name: string;
  type: 'unit' | 'integration' | 'e2e' | 'performance';

  input?: any;
  expectedOutput?: any;
  assertions: Array<{
    type: string;
    actual: any;
    expected: any;
    message?: string;
  }>;

  duration: number; // milliseconds
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  error?: Error;

  metadata?: {
    tags?: string[];
    priority?: 'low' | 'medium' | 'high' | 'critical';
    author?: string;
    createdAt?: Date;
    updatedAt?: Date;
  };
}

// !==!==!==!==!==!==!==!==!==!==!===
// BUN CONFIGURATION STANDARDS
// !==!==!==!==!==!==!==!==!==!==!===

/**
 * Bun configuration standard
 */
export interface BunConfiguration {
  // Runtime
  runtime: {
    jsx: 'react' | 'preact' | 'solid';
    jsxImportSource?: string;
    smol?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  };

  // Package management
  install: {
    lockfile?: {
      save?: boolean;
      frozen?: boolean;
    };
    registry?: string;
    cache?: string;
    globalCache?: string;
    globalBinDir?: string;
  };

  // Test runner
  test: {
    root?: string;
    preload?: string[];
    smol?: boolean;
    coverage?: boolean;
    coverageThreshold?: number;
    timeout?: number;
  };

  // Development
  dev: {
    port?: number;
    hostname?: string;
    publicPath?: string;
    hmr?: boolean;
  };

  // Performance
  performance: {
    // DNS optimization
    dns?: {
      ttl?: number; // BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS
      prefetch?: string[];
      cache?: boolean;
    };

    // Memory
    memory?: {
      maxHeap?: number; // MB
      maxOldSpace?: number; // MB
    };

    // Concurrency
    concurrency?: {
      workers?: number;
      maxThreads?: number;
    };
  };
}

// !==!==!==!==!==!==!==!==!==!==!===
// ERROR HANDLING STANDARDS
// !==!==!==!==!==!==!==!==!==!==!===

/**
 * Standard error structure
 */
export class Fire22Error extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: any,
    public readonly lkey?: Fire22LKey
  ) {
    super(message);
    this.name = 'Fire22Error';
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      lkey: this.lkey,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Error codes enumeration
 */
export enum ErrorCode {
  // Authentication errors
  AUTH_INVALID_TOKEN = 'AUTH_001',
  AUTH_TOKEN_EXPIRED = 'AUTH_002',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_003',

  // Database errors
  DB_CONNECTION_FAILED = 'DB_001',
  DB_QUERY_FAILED = 'DB_002',
  DB_TRANSACTION_FAILED = 'DB_003',

  // Validation errors
  VALIDATION_FAILED = 'VAL_001',
  INVALID_LKEY = 'VAL_002',
  INVALID_AMOUNT = 'VAL_003',

  // Business logic errors
  INSUFFICIENT_BALANCE = 'BIZ_001',
  LIMIT_EXCEEDED = 'BIZ_002',
  DUPLICATE_TRANSACTION = 'BIZ_003',

  // System errors
  INTERNAL_ERROR = 'SYS_001',
  SERVICE_UNAVAILABLE = 'SYS_002',
  RATE_LIMIT_EXCEEDED = 'SYS_003',
}

// !==!==!==!==!==!==!==!==!==!==!===
// GLOBAL CONSTANTS
// !==!==!==!==!==!==!==!==!==!==!===

/**
 * System-wide constants
 */
export const GLOBAL_CONSTANTS = {
  // Versioning
  SYSTEM_VERSION: '2.0.0',
  SCHEMA_VERSION: '1.0.0',
  API_VERSION: 'v2',

  // Timeouts (milliseconds)
  DEFAULT_TIMEOUT: 30000,
  DATABASE_TIMEOUT: 10000,
  API_TIMEOUT: 15000,
  CACHE_TIMEOUT: 1000,

  // Limits
  MAX_BATCH_SIZE: 1000,
  MAX_QUERY_RESULTS: 10000,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_CACHE_SIZE: 100 * 1024 * 1024, // 100MB

  // Retention
  LOG_RETENTION_DAYS: 90,
  ARCHIVE_RETENTION_YEARS: 7,
  CACHE_TTL_DEFAULT: 3600, // seconds

  // Performance targets
  TARGET_RESPONSE_TIME: 50, // milliseconds
  TARGET_CACHE_HIT_RATE: 0.85,
  TARGET_UPTIME: 0.999,

  // Fire22 specific
  FIRE22_API_BASE: 'https://fire22.ag/cloud/api',
  FIRE22_LKEY_PREFIX: 'L-',
  FIRE22_SUPPORTED_LANGUAGES: ['en', 'es', 'pt'],

  // Security
  JWT_EXPIRY: 86400, // 24 hours in seconds
  SESSION_TIMEOUT: 1800, // 30 minutes in seconds
  MAX_LOGIN_ATTEMPTS: 5,
  PASSWORD_MIN_LENGTH: 8,

  // Pagination
  DEFAULT_PAGE_SIZE: 100,
  MAX_PAGE_SIZE: 1000,

  // Monitoring
  HEALTH_CHECK_INTERVAL: 60000, // 1 minute
  METRICS_COLLECTION_INTERVAL: 30000, // 30 seconds

  // Feature flags
  FEATURES: {
    ENABLE_CACHING: true,
    ENABLE_COMPRESSION: true,
    ENABLE_RATE_LIMITING: true,
    ENABLE_AUDIT_LOGGING: true,
    ENABLE_FRAUD_DETECTION: true,
    ENABLE_REAL_TIME_UPDATES: true,
    ENABLE_DNS_OPTIMIZATION: true,
    ENABLE_DURABLE_OBJECTS: false, // Coming soon
  },
} as const;

// !==!==!==!==!==!==!==!==!==!==!===
// UTILITY TYPES
// !==!==!==!==!==!==!==!==!==!==!===

/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make all properties required recursively
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Extract keys that have string values
 */
export type StringKeys<T> = {
  [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

/**
 * Extract keys that have number values
 */
export type NumberKeys<T> = {
  [K in keyof T]: T[K] extends number ? K : never;
}[keyof T];

/**
 * Async version of a type
 */
export type Async<T> = Promise<T> | T;

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

// !==!==!==!==!==!==!==!==!==!==!===
// EXPORTS
// !==!==!==!==!==!==!==!==!==!==!===

export default {
  // Version info
  VERSION: GLOBAL_CONSTANTS.SYSTEM_VERSION,
  SCHEMA_VERSION: GLOBAL_CONSTANTS.SCHEMA_VERSION,

  // Enums
  LogType,
  TransactionStatus,
  CustomerType,
  ErrorCode,

  // Classes
  ComponentVersion,
  Fire22Error,

  // Constants
  GLOBAL_CONSTANTS,
};
