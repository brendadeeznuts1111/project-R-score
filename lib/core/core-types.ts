// lib/core/core-types.ts — Core type definitions

// ============================================================================
// CORE ENUMERATIONS
// ============================================================================

/**
 * Standardized status enumeration for all operations
 */
export enum OperationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

/**
 * Security risk levels for enterprise assessment
 */
export enum SecurityRiskLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  MINIMAL = 'minimal',
}

/**
 * Performance classification metrics
 */
export enum PerformanceTier {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  ACCEPTABLE = 'acceptable',
  POOR = 'poor',
  CRITICAL = 'critical',
}

/**
 * Resource management states
 */
export enum ResourceState {
  ACTIVE = 'active',
  IDLE = 'idle',
  EXHAUSTED = 'exhausted',
  CORRUPTED = 'corrupted',
  UNAVAILABLE = 'unavailable',
}

/**
 * Protocol types for network operations
 */
export enum NetworkProtocol {
  HTTP = 'http',
  HTTPS = 'https',
  HTTP2 = 'http2',
  WS = 'ws',
  WSS = 'wss',
}

/**
 * Data encoding formats
 */
export enum DataEncoding {
  UTF8 = 'utf8',
  UTF16 = 'utf16',
  ASCII = 'ascii',
  BASE64 = 'base64',
  HEX = 'hex',
}

/**
 * Cryptographic algorithms
 */
export enum CryptoAlgorithm {
  AES_GCM = 'aes-gcm',
  AES_CBC = 'aes-cbc',
  SHA256 = 'sha256',
  SHA512 = 'sha512',
  PBKDF2 = 'pbkdf2',
}

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * Base interface for all enterprise operations
 */
export interface EnterpriseOperation {
  readonly operationId: string;
  readonly timestamp: number;
  readonly status: OperationStatus;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Standardized error response structure
 */
export interface EnterpriseError {
  readonly code: string;
  readonly message: string;
  readonly severity: SecurityRiskLevel;
  readonly timestamp: number;
  readonly context?: Record<string, unknown>;
  readonly stack?: string;
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  readonly duration: number;
  readonly throughput: number;
  readonly latency: number;
  readonly errorRate: number;
  readonly memoryUsage: number;
  readonly timestamp: number;
}

/**
 * Security assessment result
 */
export interface SecurityAssessment {
  readonly riskLevel: SecurityRiskLevel;
  readonly riskScore: number;
  readonly vulnerabilities: string[];
  readonly recommendations: string[];
  readonly assessedAt: number;
}

/**
 * Resource utilization metrics
 */
export interface ResourceUtilization {
  readonly total: number;
  readonly used: number;
  readonly available: number;
  readonly utilizationRate: number;
  readonly state: ResourceState;
}

/**
 * Network connection configuration
 */
export interface NetworkConfiguration {
  readonly protocol: NetworkProtocol;
  readonly hostname: string;
  readonly port: number;
  readonly timeout: number;
  readonly retryAttempts: number;
  readonly securityEnabled: boolean;
}

/**
 * Cryptographic configuration
 */
export interface CryptoConfiguration {
  readonly algorithm: CryptoAlgorithm;
  readonly keySize: number;
  readonly iterations: number;
  readonly saltLength: number;
  readonly ivLength: number;
}

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Standardized result type for operations
 */
export type EnterpriseResult<T, E = EnterpriseError> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };

/**
 * Async enterprise result type
 */
export type AsyncEnterpriseResult<T, E = EnterpriseError> = Promise<EnterpriseResult<T, E>>;

/**
 * Event handler type
 */
export type EventHandler<T = unknown> = (event: T) => void | Promise<void>;

/**
 * Validation function type
 */
export type Validator<T> = (value: T) => boolean | string;

/**
 * Transformer function type
 */
export type Transformer<T, U> = (input: T) => U;

/**
 * Predicate function type
 */
export type Predicate<T> = (value: T) => boolean;

// ============================================================================
// CORE CONSTANTS
// ============================================================================

/**
 * Enterprise standard timeouts (in milliseconds)
 */
export const ENTERPRISE_TIMEOUTS = {
  NETWORK_REQUEST: 30000,
  FILE_OPERATION: 10000,
  CRYPTO_OPERATION: 5000,
  DATABASE_QUERY: 15000,
  CACHE_OPERATION: 1000,
  DEFAULT: 5000,
} as const;

/**
 * Enterprise standard limits
 */
export const ENTERPRISE_LIMITS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_REQUEST_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_RESPONSE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_CONCURRENT_CONNECTIONS: 1000,
  MAX_RETRY_ATTEMPTS: 3,
  MAX_CACHE_SIZE: 1024 * 1024 * 1024, // 1GB
} as const;

/**
 * Enterprise standard HTTP status codes
 */
export const ENTERPRISE_HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
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

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Make all properties of T readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Make all properties of T optional
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extract keys of T that are of type U
 */
export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Create a type with only the specified keys
 */
export type PickByType<T, U> = Pick<T, KeysOfType<T, U>>;

/**
 * Brand type for creating nominal types
 */
export type Brand<T, B> = T & { __brand: B };

/**
 * Branded string types for type safety
 */
export type SafeString = Brand<string, 'SafeString'>;
export type Base64String = Brand<string, 'Base64String'>;
export type HexString = Brand<string, 'HexString'>;
export type UUID = Brand<string, 'UUID'>;
export type ISO8601String = Brand<string, 'ISO8601String'>;
