/**
 * Fire22 Error Classification System
 *
 * Comprehensive error types and classification for consistent error handling
 * across the entire Fire22 Dashboard system.
 */

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory =
  | 'client'
  | 'server'
  | 'network'
  | 'database'
  | 'auth'
  | 'validation'
  | 'external';
export type ErrorRecoverable = 'recoverable' | 'non-recoverable' | 'partial';

export interface ErrorContext {
  correlationId: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  userAgent?: string;
  ip?: string;
  endpoint?: string;
  method?: string;
  params?: Record<string, any>;
  stack?: string;
  additional?: Record<string, any>;
}

export interface Fire22Error {
  code: string;
  message: string;
  userMessage?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  recoverable: ErrorRecoverable;
  httpStatus: number;
  context: ErrorContext;
  retryable: boolean;
  retryAfter?: number;
  troubleshooting?: string[];
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    severity: ErrorSeverity;
    correlationId: string;
    timestamp: string;
    troubleshooting?: string[];
  };
  success: false;
  data: null;
  meta?: {
    requestId?: string;
    retryAfter?: number;
    supportContact?: string;
  };
}

// Predefined error codes for Fire22 system
export const ERROR_CODES = {
  // Client Errors (4xx)
  INVALID_INPUT: 'FIRE22_INVALID_INPUT',
  UNAUTHORIZED: 'FIRE22_UNAUTHORIZED',
  FORBIDDEN: 'FIRE22_FORBIDDEN',
  NOT_FOUND: 'FIRE22_NOT_FOUND',
  RATE_LIMITED: 'FIRE22_RATE_LIMITED',
  PAYLOAD_TOO_LARGE: 'FIRE22_PAYLOAD_TOO_LARGE',

  // Server Errors (5xx)
  INTERNAL_ERROR: 'FIRE22_INTERNAL_ERROR',
  DATABASE_ERROR: 'FIRE22_DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'FIRE22_EXTERNAL_SERVICE_ERROR',
  SERVICE_UNAVAILABLE: 'FIRE22_SERVICE_UNAVAILABLE',
  TIMEOUT: 'FIRE22_TIMEOUT',

  // Registry Errors
  REGISTRY_UNAVAILABLE: 'FIRE22_REGISTRY_UNAVAILABLE',
  PACKAGE_NOT_FOUND: 'FIRE22_PACKAGE_NOT_FOUND',
  SECURITY_SCAN_FAILED: 'FIRE22_SECURITY_SCAN_FAILED',
  STORAGE_ERROR: 'FIRE22_STORAGE_ERROR',

  // Cloudflare R2 Errors
  R2_BUCKET_ALREADY_EXISTS: 'FIRE22_R2_BUCKET_ALREADY_EXISTS',

  // Fire22 API Errors
  FIRE22_API_ERROR: 'FIRE22_API_ERROR',
  FIRE22_AUTH_FAILED: 'FIRE22_AUTH_FAILED',
  FIRE22_RATE_LIMITED: 'FIRE22_RATE_LIMITED',

  // Configuration Errors
  CONFIG_MISSING: 'FIRE22_CONFIG_MISSING',
  ENV_VAR_MISSING: 'FIRE22_ENV_VAR_MISSING',
} as const;

// Error classification mapping
export const ERROR_CLASSIFICATIONS: Record<string, Partial<Fire22Error>> = {
  [ERROR_CODES.INVALID_INPUT]: {
    severity: 'low',
    category: 'validation',
    recoverable: 'non-recoverable',
    httpStatus: 400,
    retryable: false,
  },

  [ERROR_CODES.UNAUTHORIZED]: {
    severity: 'medium',
    category: 'auth',
    recoverable: 'non-recoverable',
    httpStatus: 401,
    retryable: false,
  },

  [ERROR_CODES.DATABASE_ERROR]: {
    severity: 'high',
    category: 'database',
    recoverable: 'recoverable',
    httpStatus: 503,
    retryable: true,
    retryAfter: 5,
  },

  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: {
    severity: 'medium',
    category: 'external',
    recoverable: 'recoverable',
    httpStatus: 503,
    retryable: true,
    retryAfter: 10,
  },

  [ERROR_CODES.REGISTRY_UNAVAILABLE]: {
    severity: 'medium',
    category: 'server',
    recoverable: 'partial',
    httpStatus: 503,
    retryable: true,
    retryAfter: 30,
  },

  [ERROR_CODES.TIMEOUT]: {
    severity: 'medium',
    category: 'network',
    recoverable: 'recoverable',
    httpStatus: 504,
    retryable: true,
    retryAfter: 5,
  },

  [ERROR_CODES.R2_BUCKET_ALREADY_EXISTS]: {
    severity: 'low',
    category: 'validation',
    recoverable: 'non-recoverable',
    httpStatus: 409,
    retryable: false,
  },
};

// Troubleshooting guides
export const TROUBLESHOOTING_GUIDES: Record<string, string[]> = {
  [ERROR_CODES.DATABASE_ERROR]: [
    'Check database connection status',
    'Verify D1 database binding configuration',
    'Review recent database schema changes',
    'Monitor database performance metrics',
  ],

  [ERROR_CODES.REGISTRY_UNAVAILABLE]: [
    'Check registry service health endpoint',
    'Verify R2 and KV storage connectivity',
    'Review registry configuration settings',
    'Check Cloudflare Workers status page',
  ],

  [ERROR_CODES.FIRE22_API_ERROR]: [
    'Verify Fire22 API credentials and token',
    'Check Fire22 API rate limits',
    'Review Fire22 API endpoint status',
    'Validate request payload format',
  ],

  [ERROR_CODES.UNAUTHORIZED]: [
    'Check JWT token validity and expiration',
    'Verify user authentication status',
    'Review required permissions and scopes',
    'Ensure proper Authorization header format',
  ],

  [ERROR_CODES.R2_BUCKET_ALREADY_EXISTS]: [
    'The R2 bucket already exists in your account',
    'You can safely use the existing bucket',
    'If you need to recreate it, delete the existing bucket first',
    'Check your wrangler.toml for the correct bucket name configuration',
    'Verify bucket ownership in the Cloudflare dashboard',
  ],
};
