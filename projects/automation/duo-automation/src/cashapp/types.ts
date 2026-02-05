/**
 * CashApp Integration v2.0 - TypeScript Types
 * Enterprise-Grade Fraud Detection & Risk Assessment
 */

import type { RedisClient } from "bun";

// ============================================================================
// Core Types
// ============================================================================

export interface CashAppProfile {
  /** Cash App username (e.g., "$johndoe") */
  cashtag: string | null;
  /** Display name shown on profile */
  displayName: string | null;
  /** Account verification status */
  verificationStatus: VerificationStatus;
  /** Linked bank account info */
  linkedBank: string | null;
  /** Transaction volume in last 30 days (cents) */
  transactionVolume30d: number;
  /** Transaction volume in last 90 days (cents) */
  transactionVolume90d?: number;
  /** Average transaction amount (cents) */
  avgTransactionAmount?: number;
  /** Fraud flags from Cash App */
  fraudFlags: FraudFlag[];
  /** Account creation timestamp */
  accountAge?: number;
  /** Last login timestamp */
  lastLogin?: number | null;
  /** Number of devices associated */
  deviceCount?: number;
  /** Phone number (E.164 format) */
  phone: string;
  /** Last profile update */
  lastUpdated: number;
  /** Confidence score (0-1) */
  confidence: number;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

export type VerificationStatus = 
  | 'verified' 
  | 'unverified' 
  | 'pending' 
  | 'suspended' 
  | 'unknown';

export type FraudFlag = 
  | 'CHARGEBACK'
  | 'ACCOUNT_TAKEOVER'
  | 'MONEY_LAUNDERING'
  | 'SYNTHETIC_IDENTITY'
  | 'CHARGEBACK_FRAUD'
  | 'IDENTITY_THEFT'
  | 'PUSH_NOTIFICATION_FRAUD'
  | 'REFUND_ABUSE'
  | 'MERCHANT_DISPUTE'
  | 'SUSPENDED';

// ============================================================================
// Risk Assessment Types
// ============================================================================

export enum RiskFactorV2 {
  // Verification risks
  UNVERIFIED_PAYMENT_APP = 'UNVERIFIED_PAYMENT_APP',
  SUSPENDED_ACCOUNT = 'SUSPENDED_ACCOUNT',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  NO_LINKED_BANK = 'NO_LINKED_BANK',
  UNKNOWN_STATUS = 'UNKNOWN_STATUS',
  
  // Transaction risks
  EXTREME_TRANSACTION_VOLUME = 'EXTREME_TRANSACTION_VOLUME',
  HIGH_TRANSACTION_VOLUME = 'HIGH_TRANSACTION_VOLUME',
  LOW_ACTIVITY = 'LOW_ACTIVITY',
  HIGH_VELOCITY = 'HIGH_VELOCITY',
  UNUSUAL_PATTERNS = 'UNUSUAL_PATTERNS',
  
  // Fraud risks
  CHARGEBACK_HISTORY = 'CHARGEBACK_HISTORY',
  ACCOUNT_TAKEOVER = 'ACCOUNT_TAKEOVER',
  SUSPECTED_AML = 'SUSPECTED_AML',
  SYNTHETIC_IDENTITY = 'SYNTHETIC_IDENTITY',
  GENERIC_FRAUD_FLAG = 'GENERIC_FRAUD_FLAG',
  GLOBAL_FRAUD_MATCH = 'GLOBAL_FRAUD_MATCH',
  
  // Behavioral risks
  MULTI_DEVICE_USAGE = 'MULTI_DEVICE_USAGE',
  GEOGRAPHIC_ANOMALIES = 'GEOGRAPHIC_ANOMALIES',
  UNUSUAL_ACTIVITY_HOURS = 'UNUSUAL_ACTIVITY_HOURS',
  
  // Network risks
  HIGH_RISK_NETWORK = 'HIGH_RISK_NETWORK',
  SUSPICIOUS_CONNECTIONS = 'SUSPICIOUS_CONNECTIONS'
}

export type RiskLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export type RecommendationV2 = 
  | 'ALLOW' 
  | 'MONITOR' 
  | 'REVIEW_REQUIRED' 
  | 'BLOCK' 
  | 'BLOCK_AND_REPORT';

export interface RiskAssessmentV2 {
  /** Overall risk score (0-100) */
  riskScore: number;
  /** Contributing risk factors */
  factors: RiskFactorV2[];
  /** Risk level classification */
  riskLevel: RiskLevel;
  /** Recommended action */
  recommendation: RecommendationV2;
  /** Assessment metadata */
  metadata: RiskMetadata;
}

export interface RiskMetadata {
  /** Assessment timestamp */
  assessedAt: number;
  /** ML model version */
  modelVersion: string;
  /** Profile confidence score */
  confidence?: number;
  /** Profile age in milliseconds */
  profileAge?: number;
  /** Additional context */
  [key: string]: unknown;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface CashAppConfig {
  /** Cash App API key */
  apiKey: string;
  /** Cash App API secret */
  apiSecret: string;
  /** Environment mode */
  environment: 'production' | 'sandbox';
  /** Webhook URL for alerts */
  webhookUrl?: string;
  /** Alert email recipients */
  alertEmails?: string[];
  /** Cache TTL in seconds */
  cacheTTL?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Risk thresholds */
  riskThresholds?: RiskThresholds;
}

export interface RiskThresholds {
  /** Low risk threshold (default: 30) */
  low: number;
  /** Medium risk threshold (default: 60) */
  medium: number;
  /** High risk threshold (default: 80) */
  high: number;
}

export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
  low: 30,
  medium: 60,
  high: 80
};

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface ResolveOptions {
  /** Use Redis cache */
  useCache?: boolean;
  /** Force cache refresh */
  forceRefresh?: boolean;
  /** Include risk metadata */
  includeMetadata?: boolean;
  /** Request timeout in ms */
  timeout?: number;
}

export interface BatchResolveOptions {
  /** Concurrent request limit */
  concurrency?: number;
  /** Progress callback */
  progressCallback?: (progress: ProgressUpdate) => void;
  /** Per-request timeout */
  timeoutPerRequest?: number;
}

export interface ProgressUpdate {
  completed: number;
  total: number;
}

export interface BatchResult {
  /** Phone-to-profile mapping */
  results: Record<string, CashAppProfile | null>;
  /** Phone-to-error mapping */
  errors: Record<string, Error>;
  /** Batch statistics */
  stats: BatchStats;
}

export interface BatchStats {
  /** Total phones processed */
  total: number;
  /** Successful lookups */
  successful: number;
  /** Failed lookups */
  failed: number;
  /** Cache hit rate (0-1) */
  cacheHitRate: number;
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CacheEntry<T> {
  /** Cached data */
  data: T;
  /** Cache timestamp */
  cachedAt: number;
  /** TTL in seconds */
  ttl: number;
  /** Access count */
  accessCount: number;
}

export interface CacheStats {
  /** Total cache entries */
  totalEntries: number;
  /** Cache hits */
  hits: number;
  /** Cache misses */
  misses: number;
  /** Hit rate */
  hitRate: number;
  /** Memory usage in bytes */
  memoryUsage: number;
}

// ============================================================================
// Rate Limiting Types
// ============================================================================

export interface RateLimitConfig {
  /** Maximum requests per window */
  points: number;
  /** Window duration in seconds */
  duration: number;
  /** Block duration in seconds */
  blockDuration?: number;
}

export interface RateLimitResult {
  /** Whether request is allowed */
  allowed: boolean;
  /** Remaining requests */
  remaining: number;
  /** Retry after seconds (if blocked) */
  retryAfter?: number;
  /** Reset timestamp */
  resetAt: number;
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface WebhookPayload {
  /** Event type */
  event: WebhookEventType;
  /** Event timestamp */
  timestamp: string;
  /** Profile summary */
  profile: WebhookProfile;
  /** Risk assessment */
  risk: WebhookRisk;
  /** Recommended action */
  recommendation: RecommendationV2;
  /** Source metadata */
  metadata: WebhookMetadata;
}

export type WebhookEventType = 
  | 'HIGH_RISK_CASHAPP_PROFILE'
  | 'PROFILE_BLOCKED'
  | 'FRAUD_DETECTED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'CACHE_CLEARED'
  | 'BATCH_COMPLETE';

export interface WebhookProfile {
  /** Masked phone number */
  phone: string;
  /** Cash App username */
  cashtag: string | null;
  /** Verification status */
  verificationStatus: VerificationStatus;
}

export interface WebhookRisk {
  /** Risk score (0-100) */
  score: number;
  /** Risk level */
  level: RiskLevel;
  /** Risk factors */
  factors: RiskFactorV2[];
}

export interface WebhookMetadata {
  /** Source identifier */
  source: string;
  /** Environment */
  environment: 'production' | 'sandbox';
  /** Request ID */
  requestId?: string;
  /** Additional context */
  [key: string]: unknown;
}

// ============================================================================
// Audit Types
// ============================================================================

export interface AuditLog {
  /** Action performed */
  action: string;
  /** Phone number */
  phone: string;
  /** Risk score */
  riskScore?: number;
  /** Timestamp */
  timestamp: number;
  /** Service name */
  service: string;
  /** Version */
  version: string;
  /** Additional fields */
  [key: string]: unknown;
}

export interface AuditQuery {
  /** Start timestamp */
  startTime?: number;
  /** End timestamp */
  endTime?: number;
  /** Phone number filter */
  phone?: string;
  /** Action filter */
  action?: string;
  /** Risk score range */
  riskScoreMin?: number;
  /** Risk score max */
  riskScoreMax?: number;
  /** Limit results */
  limit?: number;
  /** Offset */
  offset?: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class CashAppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'CashAppError';
  }
}

export class NotFoundError extends CashAppError {
  constructor(phone: string) {
    super(`CashApp profile not found for ${phone}`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends CashAppError {
  constructor(retryAfter: number = 60) {
    super(`Rate limit exceeded. Retry after ${retryAfter}s`, 'RATE_LIMITED', 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
  retryAfter: number;
}

export class CircuitBreakerError extends CashAppError {
  constructor() {
    super('Circuit breaker is open', 'CIRCUIT_OPEN', 503);
    this.name = 'CircuitBreakerError';
  }
}

// ============================================================================
// Export Aliases
// ============================================================================

export { CashAppError as CashAppResolverError };
