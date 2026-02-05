/**
 * Fire22 Registry Error Codes - Production Registry Specific
 *
 * Comprehensive error code definitions with solutions, monitoring,
 * and production-ready error handling
 */

export enum ErrorCategory {
  REGISTRY = 'REGISTRY',
  CONNECTION = 'CONNECTION',
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  STORAGE = 'STORAGE',
  CIRCUIT_BREAKER = 'CIRCUIT_BREAKER',
  RATE_LIMIT = 'RATE_LIMIT',
  MONITORING = 'MONITORING',
}

export enum ErrorSeverity {
  CRITICAL = 'CRITICAL',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

export interface ErrorCode {
  code: string;
  name: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  httpStatus: number;
  description: string;
  causes: string[];
  solutions: string[];
  monitoring: {
    alertThreshold: number;
    alertWindow: string;
    runbook: string;
  };
  metadata?: Record<string, any>;
}

// Registry Error Codes (R1000-R1999)
export const REGISTRY_ERRORS: Record<string, ErrorCode> = {
  R1001: {
    code: 'R1001',
    name: 'REGISTRY_INITIALIZATION_FAILED',
    message: 'Registry initialization failed',
    category: ErrorCategory.REGISTRY,
    severity: ErrorSeverity.CRITICAL,
    httpStatus: 503,
    description: 'Registry service failed to initialize properly on startup',
    causes: [
      'D1 database connection failure',
      'R2 storage bucket access denied',
      'KV namespace binding missing',
      'Environment variables not configured',
      'Cloudflare Workers runtime issues',
    ],
    solutions: [
      'Check D1 database status and bindings',
      'Verify R2 bucket permissions and configuration',
      'Validate KV namespace binding in wrangler.toml',
      'Review environment variable configuration',
      'Check Cloudflare Workers deployment logs',
    ],
    monitoring: {
      alertThreshold: 1,
      alertWindow: '1m',
      runbook: '/docs/runbooks/registry-initialization',
    },
  },

  R1002: {
    code: 'R1002',
    name: 'REGISTRY_HEALTH_DEGRADED',
    message: 'Registry health is degraded',
    category: ErrorCategory.REGISTRY,
    severity: ErrorSeverity.WARNING,
    httpStatus: 503,
    description: 'Registry is operational but some services are unhealthy',
    causes: [
      'Database connection intermittent',
      'Storage service slow responses',
      'Cache service partially unavailable',
      'High error rates from dependencies',
    ],
    solutions: [
      'Check individual service health endpoints',
      'Review connection pool utilization',
      'Monitor circuit breaker states',
      'Scale resources if needed',
    ],
    monitoring: {
      alertThreshold: 1,
      alertWindow: '5m',
      runbook: '/docs/runbooks/registry-degraded',
    },
  },

  R1003: {
    code: 'R1003',
    name: 'PACKAGE_PUBLISH_FAILED',
    message: 'Package publication failed',
    category: ErrorCategory.REGISTRY,
    severity: ErrorSeverity.ERROR,
    httpStatus: 400,
    description: 'Failed to publish package to registry',
    causes: [
      'Invalid package metadata',
      'Package already exists with same version',
      'Tarball upload failed',
      'Database transaction failure',
      'Package size exceeds limits',
    ],
    solutions: [
      'Validate package.json structure',
      'Increment package version',
      'Check storage space and permissions',
      'Retry with exponential backoff',
      'Reduce package size',
    ],
    monitoring: {
      alertThreshold: 10,
      alertWindow: '10m',
      runbook: '/docs/runbooks/package-publish-failures',
    },
  },
};

// Connection Error Codes (C2000-C2999)
export const CONNECTION_ERRORS: Record<string, ErrorCode> = {
  C2001: {
    code: 'C2001',
    name: 'DATABASE_CONNECTION_FAILED',
    message: 'Database connection failed',
    category: ErrorCategory.CONNECTION,
    severity: ErrorSeverity.CRITICAL,
    httpStatus: 503,
    description: 'Unable to establish connection to D1 database',
    causes: [
      'D1 database service unavailable',
      'Database binding configuration error',
      'Network connectivity issues',
      'Database resource limits exceeded',
      'Authentication/authorization failure',
    ],
    solutions: [
      'Check Cloudflare D1 service status',
      'Verify database binding in wrangler.toml',
      'Review database metrics and limits',
      'Check database permissions',
      'Implement connection retry logic',
    ],
    monitoring: {
      alertThreshold: 5,
      alertWindow: '5m',
      runbook: '/docs/runbooks/database-connection',
    },
  },

  C2002: {
    code: 'C2002',
    name: 'STORAGE_CONNECTION_FAILED',
    message: 'Storage connection failed',
    category: ErrorCategory.CONNECTION,
    severity: ErrorSeverity.ERROR,
    httpStatus: 503,
    description: 'Unable to connect to R2 storage service',
    causes: [
      'R2 service temporarily unavailable',
      'Bucket access permissions insufficient',
      'Storage binding misconfigured',
      'Network timeout to R2 endpoints',
      'Rate limits exceeded',
    ],
    solutions: [
      'Check Cloudflare R2 service status',
      'Verify bucket permissions and policies',
      'Review R2 binding configuration',
      'Implement storage retry mechanisms',
      'Check usage against R2 limits',
    ],
    monitoring: {
      alertThreshold: 3,
      alertWindow: '5m',
      runbook: '/docs/runbooks/storage-connection',
    },
  },

  C2003: {
    code: 'C2003',
    name: 'CACHE_CONNECTION_FAILED',
    message: 'Cache connection failed',
    category: ErrorCategory.CONNECTION,
    severity: ErrorSeverity.WARNING,
    httpStatus: 200,
    description: 'KV cache service unavailable, operating without cache',
    causes: [
      'KV namespace temporarily unavailable',
      'Cache binding misconfigured',
      'KV operation limits exceeded',
      'Network issues to KV service',
    ],
    solutions: [
      'Check Cloudflare KV service status',
      'Verify KV binding configuration',
      'Review KV usage metrics',
      'Implement cache fallback logic',
    ],
    monitoring: {
      alertThreshold: 10,
      alertWindow: '10m',
      runbook: '/docs/runbooks/cache-connection',
    },
  },
};

// Authentication Error Codes (A3000-A3999)
export const AUTHENTICATION_ERRORS: Record<string, ErrorCode> = {
  A3001: {
    code: 'A3001',
    name: 'INVALID_AUTH_TOKEN',
    message: 'Invalid authentication token',
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.WARNING,
    httpStatus: 401,
    description: 'Request contains invalid or malformed authentication token',
    causes: [
      'Missing Authorization header',
      'Malformed Bearer token format',
      'Expired authentication token',
      'Invalid token signature',
      'Revoked or blacklisted token',
    ],
    solutions: [
      'Include valid Authorization header',
      'Use Bearer token format: "Bearer <token>"',
      'Refresh expired tokens',
      'Generate new authentication token',
      'Check token blacklist status',
    ],
    monitoring: {
      alertThreshold: 50,
      alertWindow: '10m',
      runbook: '/docs/runbooks/authentication-failures',
    },
  },

  A3002: {
    code: 'A3002',
    name: 'INSUFFICIENT_SCOPE_PERMISSIONS',
    message: 'Insufficient permissions for package scope',
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.WARNING,
    httpStatus: 403,
    description: 'Token does not have permission to access requested package scope',
    causes: [
      'Package not in allowed scopes',
      'Token lacks publish permissions',
      'Organization membership required',
      'Scope-specific restrictions apply',
    ],
    solutions: [
      'Use packages in allowed scopes (@fire22, @ff, @brendadeeznuts)',
      'Request publish permissions for scope',
      'Join required organization',
      'Contact registry administrators',
    ],
    monitoring: {
      alertThreshold: 20,
      alertWindow: '10m',
      runbook: '/docs/runbooks/permission-denied',
    },
  },
};

// Validation Error Codes (V4000-V4999)
export const VALIDATION_ERRORS: Record<string, ErrorCode> = {
  V4001: {
    code: 'V4001',
    name: 'INVALID_PACKAGE_JSON',
    message: 'Invalid package.json format',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.ERROR,
    httpStatus: 400,
    description: 'Package metadata does not conform to required format',
    causes: [
      'Malformed JSON structure',
      'Missing required fields (name, version)',
      'Invalid semver version format',
      'Package name format violations',
      'Metadata size exceeds limits',
    ],
    solutions: [
      'Validate JSON structure and syntax',
      'Include required name and version fields',
      'Use valid semantic version format',
      'Follow npm package naming conventions',
      'Reduce metadata size',
    ],
    monitoring: {
      alertThreshold: 15,
      alertWindow: '10m',
      runbook: '/docs/runbooks/package-validation',
    },
  },

  V4002: {
    code: 'V4002',
    name: 'INVALID_PACKAGE_SIZE',
    message: 'Package size exceeds limits',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.ERROR,
    httpStatus: 413,
    description: 'Package tarball exceeds maximum allowed size',
    causes: [
      'Package contains large binary files',
      'Unoptimized dependencies included',
      'Generated files not excluded',
      'Development files included in package',
    ],
    solutions: [
      'Remove or optimize large binary files',
      'Use .npmignore to exclude unnecessary files',
      'Optimize package contents',
      'Consider splitting large packages',
    ],
    monitoring: {
      alertThreshold: 5,
      alertWindow: '10m',
      runbook: '/docs/runbooks/package-size-limits',
    },
  },
};

// Storage Error Codes (S5000-S5999)
export const STORAGE_ERRORS: Record<string, ErrorCode> = {
  S5001: {
    code: 'S5001',
    name: 'STORAGE_QUOTA_EXCEEDED',
    message: 'Storage quota exceeded',
    category: ErrorCategory.STORAGE,
    severity: ErrorSeverity.CRITICAL,
    httpStatus: 507,
    description: 'R2 storage quota has been exceeded',
    causes: [
      'Too many packages stored',
      'Large package files consuming space',
      'Old package versions not cleaned up',
      'Storage quota configuration too low',
    ],
    solutions: [
      'Clean up old package versions',
      'Implement package lifecycle management',
      'Increase storage quota',
      'Optimize package sizes',
    ],
    monitoring: {
      alertThreshold: 1,
      alertWindow: '1m',
      runbook: '/docs/runbooks/storage-quota',
    },
  },

  S5002: {
    code: 'S5002',
    name: 'PACKAGE_UPLOAD_FAILED',
    message: 'Package upload failed',
    category: ErrorCategory.STORAGE,
    severity: ErrorSeverity.ERROR,
    httpStatus: 500,
    description: 'Failed to upload package tarball to storage',
    causes: [
      'R2 service temporarily unavailable',
      'Network timeout during upload',
      'Storage permissions insufficient',
      'Corrupted package data',
      'Concurrent upload conflicts',
    ],
    solutions: [
      'Retry upload with exponential backoff',
      'Check R2 service status',
      'Verify storage permissions',
      'Validate package integrity',
      'Implement upload conflict resolution',
    ],
    monitoring: {
      alertThreshold: 10,
      alertWindow: '5m',
      runbook: '/docs/runbooks/package-upload',
    },
  },
};

// Circuit Breaker Error Codes (CB6000-CB6999)
export const CIRCUIT_BREAKER_ERRORS: Record<string, ErrorCode> = {
  CB6001: {
    code: 'CB6001',
    name: 'DATABASE_CIRCUIT_BREAKER_OPEN',
    message: 'Database circuit breaker is open',
    category: ErrorCategory.CIRCUIT_BREAKER,
    severity: ErrorSeverity.CRITICAL,
    httpStatus: 503,
    description: 'Database circuit breaker opened due to consecutive failures',
    causes: [
      'Multiple consecutive database failures',
      'Database response timeouts',
      'Database connection pool exhaustion',
      'Database service degradation',
    ],
    solutions: [
      'Check database health and availability',
      'Review database connection configuration',
      'Wait for circuit breaker to reset',
      'Scale database resources if needed',
    ],
    monitoring: {
      alertThreshold: 1,
      alertWindow: '1m',
      runbook: '/docs/runbooks/circuit-breaker-database',
    },
  },

  CB6002: {
    code: 'CB6002',
    name: 'STORAGE_CIRCUIT_BREAKER_OPEN',
    message: 'Storage circuit breaker is open',
    category: ErrorCategory.CIRCUIT_BREAKER,
    severity: ErrorSeverity.ERROR,
    httpStatus: 503,
    description: 'Storage circuit breaker opened due to consecutive failures',
    causes: [
      'Multiple storage operation failures',
      'R2 service timeouts or errors',
      'Storage rate limits exceeded',
      'Storage service degradation',
    ],
    solutions: [
      'Check R2 service status',
      'Review storage operation patterns',
      'Wait for circuit breaker to reset',
      'Implement storage fallback mechanisms',
    ],
    monitoring: {
      alertThreshold: 1,
      alertWindow: '2m',
      runbook: '/docs/runbooks/circuit-breaker-storage',
    },
  },
};

// Rate Limiting Error Codes (RL7000-RL7999)
export const RATE_LIMIT_ERRORS: Record<string, ErrorCode> = {
  RL7001: {
    code: 'RL7001',
    name: 'REQUEST_RATE_LIMIT_EXCEEDED',
    message: 'Request rate limit exceeded',
    category: ErrorCategory.RATE_LIMIT,
    severity: ErrorSeverity.WARNING,
    httpStatus: 429,
    description: 'Client has exceeded the allowed request rate',
    causes: [
      'Too many requests from single client',
      'Automated tooling without rate limiting',
      'DDoS or abuse attempt',
      'Client retry loop without backoff',
    ],
    solutions: [
      'Implement client-side rate limiting',
      'Add exponential backoff to retries',
      'Distribute requests over time',
      'Contact support for rate limit increases',
    ],
    monitoring: {
      alertThreshold: 100,
      alertWindow: '5m',
      runbook: '/docs/runbooks/rate-limiting',
    },
  },

  RL7002: {
    code: 'RL7002',
    name: 'PUBLISH_RATE_LIMIT_EXCEEDED',
    message: 'Package publish rate limit exceeded',
    category: ErrorCategory.RATE_LIMIT,
    severity: ErrorSeverity.WARNING,
    httpStatus: 429,
    description: 'Too many package publications in time window',
    causes: [
      'Automated publishing without throttling',
      'Bulk package imports',
      'Development workflow publishing too frequently',
      'CI/CD pipeline misconfiguration',
    ],
    solutions: [
      'Throttle automated publishing',
      'Batch package publications',
      'Review CI/CD publishing triggers',
      'Implement publish queuing',
    ],
    monitoring: {
      alertThreshold: 20,
      alertWindow: '10m',
      runbook: '/docs/runbooks/publish-rate-limits',
    },
  },
};

// Monitoring Error Codes (M8000-M8999)
export const MONITORING_ERRORS: Record<string, ErrorCode> = {
  M8001: {
    code: 'M8001',
    name: 'METRICS_COLLECTION_FAILED',
    message: 'Metrics collection failed',
    category: ErrorCategory.MONITORING,
    severity: ErrorSeverity.WARNING,
    httpStatus: 200,
    description: 'Unable to collect or store performance metrics',
    causes: [
      'Metrics storage service unavailable',
      'Metric collection logic errors',
      'Memory constraints affecting metrics',
      'Metrics aggregation timeouts',
    ],
    solutions: [
      'Check metrics storage service',
      'Review metrics collection code',
      'Increase memory allocation',
      'Optimize metrics aggregation',
    ],
    monitoring: {
      alertThreshold: 5,
      alertWindow: '15m',
      runbook: '/docs/runbooks/metrics-collection',
    },
  },
};

// Consolidated error registry
export const ALL_ERROR_CODES: Record<string, ErrorCode> = {
  ...REGISTRY_ERRORS,
  ...CONNECTION_ERRORS,
  ...AUTHENTICATION_ERRORS,
  ...VALIDATION_ERRORS,
  ...STORAGE_ERRORS,
  ...CIRCUIT_BREAKER_ERRORS,
  ...RATE_LIMIT_ERRORS,
  ...MONITORING_ERRORS,
};

// Error lookup functions
export function getErrorByCode(code: string): ErrorCode | undefined {
  return ALL_ERROR_CODES[code];
}

export function getErrorsByCategory(category: ErrorCategory): ErrorCode[] {
  return Object.values(ALL_ERROR_CODES).filter(error => error.category === category);
}

export function getErrorsBySeverity(severity: ErrorSeverity): ErrorCode[] {
  return Object.values(ALL_ERROR_CODES).filter(error => error.severity === severity);
}

// Error response formatter
export function formatErrorResponse(code: string, details?: Record<string, any>): object {
  const error = getErrorByCode(code);

  if (!error) {
    return {
      error: 'unknown',
      message: 'Unknown error code',
      code,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    error: error.category.toLowerCase(),
    code: error.code,
    name: error.name,
    message: error.message,
    description: error.description,
    httpStatus: error.httpStatus,
    severity: error.severity,
    solutions: error.solutions,
    runbook: error.monitoring.runbook,
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID(),
    ...details,
  };
}

// Monitoring alert checker
export function shouldAlert(code: string, occurrences: number, timeWindow: string): boolean {
  const error = getErrorByCode(code);
  if (!error) return false;

  // Simple threshold check - in production, this would be more sophisticated
  return occurrences >= error.monitoring.alertThreshold;
}

// Error statistics
export function getErrorStatistics(): object {
  const stats = {
    totalErrorCodes: Object.keys(ALL_ERROR_CODES).length,
    byCategory: {} as Record<string, number>,
    bySeverity: {} as Record<string, number>,
    criticalErrorCodes: [] as string[],
  };

  for (const error of Object.values(ALL_ERROR_CODES)) {
    // Category counts
    stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;

    // Severity counts
    stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;

    // Critical errors
    if (error.severity === ErrorSeverity.CRITICAL) {
      stats.criticalErrorCodes.push(error.code);
    }
  }

  return stats;
}
