/**
 * Enhanced Logging Types with L-Key Integration
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  traceId?: string;
  lKey?: string;
  entityId?: string;
  component?: string;
  version?: string;
  environment?: string;
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context: LogContext;
  metadata?: Record<string, any>;
  stack?: string;
  duration?: number;
}

export interface LKeyLogEntry extends LogEntry {
  lKey: string;
  lKeyCategory: string;
  entityType: string;
  entityId: string;
  action: string;
  flowSequence?: string[];
  auditTrail: string[];
}

export interface TransactionLogEntry extends LogEntry {
  transactionId: string;
  transactionType: string;
  transactionLKey: string;
  amount: number;
  currency: string;
  fromCustomerId: string;
  toCustomerId: string;
  paymentMethod: string;
  paymentMethodLKey: string;
  status: string;
  statusLKey: string;
  fees: {
    baseFee: number;
    totalFee: number;
    effectiveRate: number;
  };
  riskScore: number;
  complianceChecks: string[];
}

export interface SecurityLogEntry extends LogEntry {
  securityEvent: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  sourceIP?: string;
  userAgent?: string;
  endpoint?: string;
  riskScore?: number;
  blocked: boolean;
  reason: string;
  mitigation?: string;
}

export interface PerformanceLogEntry extends LogEntry {
  operation: string;
  duration: number;
  cpuUsage?: number;
  memoryUsage?: number;
  throughput?: number;
  latency?: number;
  errorRate?: number;
  slowQueryThreshold?: number;
}

export interface AuditReport {
  periodStart: Date;
  periodEnd: Date;
  totalEntries: number;
  byLevel: Record<string, number>;
  byLKey: Record<string, number>;
  byAction: Record<string, number>;
  securityEvents: number;
  performanceMetrics: {
    averageResponseTime: number;
    errorRate: number;
    throughput: number;
  };
  topErrors: Array<{
    message: string;
    count: number;
    lastOccurrence: Date;
  }>;
  complianceMetrics: {
    totalTransactions: number;
    highRiskTransactions: number;
    blockedTransactions: number;
    averageRiskScore: number;
  };
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  filePath?: string;
  remoteEndpoint?: string;
  bufferSize: number;
  flushInterval: number;
  enableMetrics: boolean;
  enableSecurity: boolean;
  enablePerformance: boolean;
  enableLKeyTracking: boolean;
  maxLogFileSize: number;
  logRotation: boolean;
  retentionDays: number;
}

export interface LogBuffer {
  entries: LogEntry[];
  maxSize: number;
  currentSize: number;
  lastFlush: Date;
}

export interface LogMetrics {
  totalLogs: number;
  logsByLevel: Record<LogLevel, number>;
  logsByComponent: Record<string, number>;
  averageLogSize: number;
  logsPerSecond: number;
  errorRate: number;
  lastReset: Date;
}

export interface LogFilter {
  level?: LogLevel;
  component?: string;
  lKey?: string;
  userId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  textSearch?: string;
  regex?: RegExp;
}

// Enhanced Analytics Types (placeholder exports - actual implementations are in respective files)
export interface AnalyticsLogEntry extends LKeyLogEntry {
  errorCode?: string;
  errorType?:
    | 'CACHE_MISS'
    | 'DB_TIMEOUT'
    | 'API_FAILURE'
    | 'VALIDATION_ERROR'
    | 'NETWORK_ERROR'
    | 'MEMORY_ERROR';
  resolution?: string;
  impact?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedUsers?: number;
  recoveryTime?: number;
  correlationId?: string;
}

export interface PerformanceMetrics {
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
    average: number;
  };
  throughput: {
    requestsPerSecond: number;
    transactionsPerSecond: number;
    peakRPS: number;
  };
  errorRates: {
    total: number;
    byType: Map<string, number>;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
}

export interface OptimizationRecommendation {
  id: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'CACHE' | 'DATABASE' | 'NETWORK' | 'CODE' | 'INFRASTRUCTURE';
  title: string;
  description: string;
}

export interface DetailedCacheMetrics {
  cacheType: string;
  totalOperations: number;
  hitRate: number;
  missRate: number;
  evictionRate: number;
  averageLatency: number;
}

export interface CacheOptimizationSuggestion {
  id: string;
  cacheType: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'PERFORMANCE' | 'COST' | 'RELIABILITY' | 'CAPACITY';
  title: string;
  description: string;
}

export interface RealTimeAlert {
  id: string;
  timestamp: Date;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'EMERGENCY';
  category: string;
  type: string;
  title: string;
  description: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface AnomalyDetection {
  id: string;
  timestamp: Date;
  metric: string;
  value: number;
  anomalyScore: number;
  anomalyType: 'SPIKE' | 'DROP' | 'TREND_CHANGE' | 'PATTERN_BREAK' | 'OUTLIER';
}

export interface PredictiveAlert {
  id: string;
  timestamp: Date;
  prediction: {
    metric: string;
    predictedValue: number;
    predictedAt: Date;
    confidence: number;
    model: string;
  };
}
