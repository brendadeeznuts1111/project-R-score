/**
 * API Metrics & Tracking Constants
 * 
 * Defines all constants for tracking API calls, performance metrics, error codes,
 * and monitoring thresholds across the Geelark application.
 * 
 * @see METRICS_TRACKING_GUIDE.md for implementation details
 * @see ERROR_CODES_REGISTRY.txt for error code reference
 */

// =============================================================================
// API Endpoints Configuration
// =============================================================================

export const TRACKED_ENDPOINTS = {
  // Health & Status Endpoints
  '/health': {
    method: 'GET' as const,
    priority: 'high' as const,
    alertThreshold: { latency: 100, errorRate: 0.01 }
  },
  '/status': {
    method: 'GET' as const,
    priority: 'high' as const,
    alertThreshold: { latency: 100, errorRate: 0.01 }
  },
  
  // Dashboard Endpoints
  '/dashboard': {
    method: 'GET' as const,
    priority: 'high' as const,
    alertThreshold: { latency: 500, errorRate: 0.05 }
  },
  '/dashboard/metrics': {
    method: 'GET' as const,
    priority: 'high' as const,
    alertThreshold: { latency: 200, errorRate: 0.05 }
  },
  
  // API Endpoints
  '/api/data/process': {
    method: 'POST' as const,
    priority: 'critical' as const,
    alertThreshold: { latency: 5000, errorRate: 0.01 }
  },
  '/api/users': {
    method: 'GET' as const,
    priority: 'high' as const,
    alertThreshold: { latency: 500, errorRate: 0.05 }
  },
  '/api/users/:id': {
    method: 'GET' as const,
    priority: 'medium' as const,
    alertThreshold: { latency: 200, errorRate: 0.05 }
  }
} as const;

export type TrackedEndpoint = keyof typeof TRACKED_ENDPOINTS;

// =============================================================================
// Performance Thresholds
// =============================================================================

export const PERFORMANCE_THRESHOLDS = {
  'api.response': {
    warning: 500,    // milliseconds
    critical: 1000,
    unit: 'ms' as const
  },
  'db.query': {
    warning: 200,    // milliseconds
    critical: 500,
    unit: 'ms' as const
  },
  'file.read': {
    warning: 100,    // milliseconds
    critical: 500,
    unit: 'ms' as const
  },
  'file.write': {
    warning: 200,    // milliseconds
    critical: 1000,
    unit: 'ms' as const
  },
  'memory.usage': {
    warning: 80,     // percentage
    critical: 95,
    unit: '%' as const
  },
  'cpu.usage': {
    warning: 80,     // percentage
    critical: 95,
    unit: '%' as const
  },
  'throughput': {
    warning: 100,    // requests per second (low is bad)
    critical: 10,    // minimum acceptable
    unit: 'req/s' as const
  }
} as const;

// =============================================================================
// API Call Tracking Configuration
// =============================================================================

export const API_CALL_CONFIG = {
  // Enable/disable API call tracking
  ENABLED: true,
  
  // Track request/response sizes
  TRACK_SIZE: true,
  
  // Track request headers
  TRACK_HEADERS: false,  // Set to true only if analyzing header sizes
  
  // Exclude endpoints from tracking (e.g., health checks)
  EXCLUDE_PATTERNS: [
    /^\/health$/,
    /^\/status$/,
    /^\/metrics$/
  ],
  
  // Sample rate (1.0 = 100%, 0.1 = 10%)
  SAMPLE_RATE: 1.0,
  
  // Maximum request/response size to log (bytes)
  MAX_LOG_SIZE: 5000
} as const;

// =============================================================================
// Error Code Definitions
// =============================================================================

export const ERROR_CODES = {
  // System Errors (1000-1999)
  SYS_001: { message: 'System initialization failed', statusCode: 500, severity: 'critical' as const },
  SYS_002: { message: 'Configuration loading failed', statusCode: 500, severity: 'critical' as const },
  SYS_003: { message: 'Memory threshold exceeded', statusCode: 503, severity: 'critical' as const },
  SYS_004: { message: 'CPU threshold exceeded', statusCode: 503, severity: 'warning' as const },
  SYS_005: { message: 'Disk space critical', statusCode: 507, severity: 'critical' as const },
  
  // API Errors (2000-2999)
  API_001: { message: 'Invalid request format', statusCode: 400, severity: 'error' as const },
  API_002: { message: 'Unauthorized access', statusCode: 401, severity: 'error' as const },
  API_003: { message: 'Resource not found', statusCode: 404, severity: 'warning' as const },
  API_004: { message: 'Rate limit exceeded', statusCode: 429, severity: 'warning' as const },
  API_005: { message: 'Internal server error', statusCode: 500, severity: 'critical' as const },
  
  // Validation Errors (3000-3999)
  VAL_001: { message: 'Invalid email format', statusCode: 400, severity: 'error' as const },
  VAL_002: { message: 'Invalid phone number', statusCode: 400, severity: 'error' as const },
  VAL_003: { message: 'Missing required field', statusCode: 400, severity: 'error' as const },
  VAL_004: { message: 'Password too weak', statusCode: 400, severity: 'error' as const },
  
  // Database Errors (4000-4999)
  DB_001: { message: 'Database connection failed', statusCode: 503, severity: 'critical' as const },
  DB_002: { message: 'Query timeout', statusCode: 504, severity: 'warning' as const },
  DB_003: { message: 'Duplicate entry', statusCode: 409, severity: 'error' as const },
  DB_004: { message: 'Transaction failed', statusCode: 500, severity: 'error' as const },
  
  // Authentication Errors (5000-5999)
  AUTH_001: { message: 'Invalid credentials', statusCode: 401, severity: 'error' as const },
  AUTH_002: { message: 'Session expired', statusCode: 401, severity: 'warning' as const },
  AUTH_003: { message: 'Token invalid', statusCode: 401, severity: 'error' as const },
  
  // Business Logic Errors (6000-6999)
  BIZ_001: { message: 'Insufficient funds', statusCode: 400, severity: 'warning' as const },
  BIZ_002: { message: 'Duplicate registration', statusCode: 409, severity: 'warning' as const },
  BIZ_003: { message: 'Resource already in use', statusCode: 409, severity: 'warning' as const },
  
  // Unknown Errors (9000-9999)
  ERR_001: { message: 'Unknown error', statusCode: 500, severity: 'error' as const },
  ERR_002: { message: 'Unexpected server error', statusCode: 500, severity: 'critical' as const }
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

// =============================================================================
// Metric Names & Categories
// =============================================================================

export const METRIC_NAMES = {
  // API Metrics
  API_REQUESTS_TOTAL: 'api.requests.total',
  API_REQUESTS_SUCCESS: 'api.requests.success',
  API_REQUESTS_FAILED: 'api.requests.failed',
  API_LATENCY: 'api.latency',
  API_REQUEST_SIZE: 'api.request_size',
  API_RESPONSE_SIZE: 'api.response_size',
  
  // Performance Metrics
  DB_QUERY_DURATION: 'db.query.duration',
  FILE_READ_DURATION: 'file.read.duration',
  FILE_WRITE_DURATION: 'file.write.duration',
  PROCESSING_DURATION: 'processing.duration',
  
  // Resource Metrics
  MEMORY_USAGE: 'memory.usage',
  CPU_USAGE: 'cpu.usage',
  UPTIME: 'system.uptime',
  
  // Error Metrics
  ERRORS_TOTAL: 'errors.total',
  ERRORS_BY_CODE: 'errors.by_code',
  ERROR_RATE: 'errors.rate',
  
  // Health Metrics
  HEALTH_SCORE: 'health.score',
  THROUGHPUT: 'throughput'
} as const;

export type MetricName = typeof METRIC_NAMES[keyof typeof METRIC_NAMES];

// =============================================================================
// Time Windows for Aggregation
// =============================================================================

export const TIME_WINDOWS = {
  IMMEDIATE: 1000,        // 1 second
  SHORT: 60000,           // 1 minute
  MEDIUM: 300000,         // 5 minutes
  LONG: 3600000,          // 1 hour
  VERY_LONG: 86400000     // 24 hours
} as const;

export type TimeWindow = typeof TIME_WINDOWS[keyof typeof TIME_WINDOWS];

// =============================================================================
// Aggregation Types
// =============================================================================

export const AGGREGATION_TYPES = {
  COUNT: 'count' as const,
  SUM: 'sum' as const,
  AVERAGE: 'average' as const,
  MIN: 'min' as const,
  MAX: 'max' as const,
  PERCENTILE: 'percentile' as const,
  RATE: 'rate' as const
} as const;

export type AggregationType = typeof AGGREGATION_TYPES[keyof typeof AGGREGATION_TYPES];

// =============================================================================
// Alert Rules Configuration
// =============================================================================

export const ALERT_RULES = {
  error_rate_high: {
    name: 'Error Rate High',
    condition: (metrics: any) => metrics.errorRate > 0.05,
    message: 'Error rate above 5%',
    severity: 'critical' as const,
    actionable: true,
    threshold: 0.05,
    window: 300000  // 5 minutes
  },
  
  latency_high: {
    name: 'API Latency High',
    condition: (metrics: any) => metrics.avgLatency > 1000,
    message: 'Average latency above 1 second',
    severity: 'warning' as const,
    threshold: 1000,
    window: 300000
  },
  
  memory_critical: {
    name: 'Memory Critical',
    condition: (metrics: any) => metrics.memoryUsage > 0.95,
    message: 'Memory usage above 95%',
    severity: 'critical' as const,
    action: 'triggerGC' as const,
    threshold: 0.95,
    window: 60000
  },
  
  cpu_high: {
    name: 'CPU Usage High',
    condition: (metrics: any) => metrics.cpuUsage > 0.80,
    message: 'CPU usage above 80%',
    severity: 'warning' as const,
    threshold: 0.80,
    window: 300000
  },
  
  uptime_low: {
    name: 'Uptime Low',
    condition: (metrics: any) => metrics.uptime < 3600,
    message: 'Application running for less than 1 hour',
    severity: 'info' as const,
    threshold: 3600,
    window: 60000
  },
  
  throughput_low: {
    name: 'Throughput Low',
    condition: (metrics: any) => metrics.throughput < 10,
    message: 'Request throughput below minimum',
    severity: 'warning' as const,
    threshold: 10,
    window: 300000
  }
} as const;

// =============================================================================
// Health Score Calculation Weights
// =============================================================================

export const HEALTH_WEIGHTS = {
  errorRate: 0.30,
  latency: 0.25,
  uptime: 0.20,
  memoryUsage: 0.15,
  cpuUsage: 0.10
} as const;

// Verification: weights should sum to 1.0
const weightSum = Object.values(HEALTH_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(weightSum - 1.0) > 0.001) {
  console.warn(`Health weights do not sum to 1.0: ${weightSum}`);
}

// =============================================================================
// Percentile Calculations
// =============================================================================

export const PERCENTILES = {
  P50: 50,
  P75: 75,
  P90: 90,
  P95: 95,
  P99: 99
} as const;

// =============================================================================
// Metric Retention Policies
// =============================================================================

export const RETENTION_POLICIES = {
  RAW_METRICS: 86400000,          // 24 hours
  HOURLY_AGGREGATE: 604800000,    // 7 days
  DAILY_AGGREGATE: 2592000000,    // 30 days
  MONTHLY_AGGREGATE: 31104000000  // 360 days
} as const;

// =============================================================================
// Dashboard Display Constants
// =============================================================================

export const DASHBOARD_DISPLAY = {
  // Update intervals
  UPDATE_INTERVAL_MS: 5000,        // Every 5 seconds
  CHART_REFRESH_MS: 10000,         // Every 10 seconds
  
  // Data points to display
  CHART_DATA_POINTS: 60,           // Show last 60 data points
  MAX_RECENT_ERRORS: 20,           // Show 20 most recent errors
  TOP_ENDPOINTS: 10,               // Show 10 slowest endpoints
  
  // Color thresholds
  COLORS: {
    healthy: '#22c55e',           // Green
    degraded: '#f59e0b',          // Amber
    impaired: '#ef4444',          // Red
    critical: '#991b1b'           // Dark Red
  }
} as const;

// =============================================================================
// Export All Metrics Constants
// =============================================================================

export default {
  ERROR_CODES,
  TRACKED_ENDPOINTS,
  PERFORMANCE_THRESHOLDS,
  METRIC_NAMES,
  TIME_WINDOWS,
  AGGREGATION_TYPES,
  ALERT_RULES,
  HEALTH_WEIGHTS,
  PERCENTILES,
  RETENTION_POLICIES,
  DASHBOARD_DISPLAY,
  API_CALL_CONFIG
} as const;
