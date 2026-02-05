/**
 * L-Key Telegram Validation Error Codes
 *
 * Comprehensive error code system for validation operations
 * with graceful error handling and recovery mechanisms.
 */

export enum ValidationErrorCode {
  // System Errors (1000-1099)
  SYSTEM_INITIALIZATION_FAILED = 'VAL_1001',
  SYSTEM_CONFIGURATION_INVALID = 'VAL_1002',
  SYSTEM_DEPENDENCY_MISSING = 'VAL_1003',
  SYSTEM_MEMORY_EXHAUSTED = 'VAL_1004',
  SYSTEM_TIMEOUT = 'VAL_1005',

  // API Integration Errors (1100-1199)
  FIRE22_API_UNAVAILABLE = 'VAL_1101',
  FIRE22_API_UNAUTHORIZED = 'VAL_1102',
  FIRE22_API_RATE_LIMITED = 'VAL_1103',
  FIRE22_API_INVALID_RESPONSE = 'VAL_1104',
  FIRE22_API_TIMEOUT = 'VAL_1105',
  FIRE22_API_NETWORK_ERROR = 'VAL_1106',

  // Data Validation Errors (1200-1299)
  CUSTOMER_DATA_INVALID = 'VAL_1201',
  CUSTOMER_ID_MISSING = 'VAL_1202',
  CUSTOMER_ID_INVALID_FORMAT = 'VAL_1203',
  TELEGRAM_ID_INVALID_FORMAT = 'VAL_1204',
  USERNAME_INVALID_FORMAT = 'VAL_1205',
  LKEY_MISSING = 'VAL_1206',
  LKEY_INVALID_FORMAT = 'VAL_1207',
  LKEY_GENERATION_FAILED = 'VAL_1208',

  // Mapping Errors (1300-1399)
  MAPPING_INCONSISTENCY = 'VAL_1301',
  MAPPING_CONFLICT = 'VAL_1302',
  MAPPING_CIRCULAR_REFERENCE = 'VAL_1303',
  MAPPING_DATA_CORRUPTION = 'VAL_1304',

  // Auto-Fix Errors (1400-1499)
  AUTOFIX_FAILED = 'VAL_1401',
  AUTOFIX_PARTIAL_SUCCESS = 'VAL_1402',
  AUTOFIX_PERMISSION_DENIED = 'VAL_1403',
  AUTOFIX_DATA_LOCKED = 'VAL_1404',

  // Export/Report Errors (1500-1599)
  REPORT_GENERATION_FAILED = 'VAL_1501',
  EXPORT_FORMAT_UNSUPPORTED = 'VAL_1502',
  EXPORT_SIZE_LIMIT_EXCEEDED = 'VAL_1503',
  EXPORT_PERMISSION_DENIED = 'VAL_1504',

  // Cache/Storage Errors (1600-1699)
  CACHE_READ_FAILED = 'VAL_1601',
  CACHE_WRITE_FAILED = 'VAL_1602',
  STORAGE_UNAVAILABLE = 'VAL_1603',
  STORAGE_QUOTA_EXCEEDED = 'VAL_1604',

  // Unknown/Generic Errors (1900-1999)
  UNKNOWN_ERROR = 'VAL_1901',
  OPERATION_INTERRUPTED = 'VAL_1902',
  RESOURCE_CLEANUP_FAILED = 'VAL_1903',
}

export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
  retryAfter?: number; // seconds
  suggestions?: string[];
}

export interface ErrorRecoveryStrategy {
  code: ValidationErrorCode;
  maxRetries: number;
  retryDelay: number; // milliseconds
  backoffMultiplier: number;
  recoveryAction?: () => Promise<void>;
}

/**
 * Comprehensive error definitions with recovery strategies
 */
export const ERROR_DEFINITIONS: Record<
  ValidationErrorCode,
  {
    message: string;
    description: string;
    recoverable: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    suggestions: string[];
    retryStrategy?: ErrorRecoveryStrategy;
  }
> = {
  [ValidationErrorCode.SYSTEM_INITIALIZATION_FAILED]: {
    message: 'System initialization failed',
    description: 'The validation system could not be initialized properly',
    recoverable: true,
    severity: 'critical',
    category: 'System',
    suggestions: [
      'Check environment variables',
      'Verify system dependencies',
      'Restart the service',
    ],
    retryStrategy: {
      code: ValidationErrorCode.SYSTEM_INITIALIZATION_FAILED,
      maxRetries: 3,
      retryDelay: 5000,
      backoffMultiplier: 2,
    },
  },

  [ValidationErrorCode.SYSTEM_CONFIGURATION_INVALID]: {
    message: 'Invalid system configuration',
    description: 'Required configuration parameters are missing or invalid',
    recoverable: false,
    severity: 'critical',
    category: 'System',
    suggestions: [
      'Review CLAUDE.md configuration requirements',
      'Check environment variables',
      'Validate configuration file syntax',
    ],
  },

  [ValidationErrorCode.SYSTEM_DEPENDENCY_MISSING]: {
    message: 'Required system dependency missing',
    description: 'A critical system dependency is not available',
    recoverable: false,
    severity: 'critical',
    category: 'System',
    suggestions: [
      'Run bun install --frozen-lockfile',
      'Check package.json dependencies',
      'Verify Bun runtime version',
    ],
  },

  [ValidationErrorCode.FIRE22_API_UNAVAILABLE]: {
    message: 'Fire22 API is unavailable',
    description: 'Cannot connect to Fire22 API endpoints',
    recoverable: true,
    severity: 'high',
    category: 'API Integration',
    suggestions: [
      'Check Fire22 API status',
      'Verify network connectivity',
      'Switch to demo mode for testing',
      'Check DNS resolution',
    ],
    retryStrategy: {
      code: ValidationErrorCode.FIRE22_API_UNAVAILABLE,
      maxRetries: 5,
      retryDelay: 2000,
      backoffMultiplier: 1.5,
    },
  },

  [ValidationErrorCode.FIRE22_API_UNAUTHORIZED]: {
    message: 'Fire22 API authorization failed',
    description: 'Invalid or expired Fire22 API credentials',
    recoverable: false,
    severity: 'high',
    category: 'API Integration',
    suggestions: [
      'Check FIRE22_TOKEN environment variable',
      'Verify API credentials are current',
      'Contact Fire22 API support',
    ],
  },

  [ValidationErrorCode.FIRE22_API_RATE_LIMITED]: {
    message: 'Fire22 API rate limit exceeded',
    description: 'Too many requests to Fire22 API',
    recoverable: true,
    severity: 'medium',
    category: 'API Integration',
    suggestions: [
      'Implement request throttling',
      'Use cached data when available',
      'Wait before retrying',
    ],
    retryStrategy: {
      code: ValidationErrorCode.FIRE22_API_RATE_LIMITED,
      maxRetries: 3,
      retryDelay: 60000, // 1 minute
      backoffMultiplier: 2,
    },
  },

  [ValidationErrorCode.CUSTOMER_ID_INVALID_FORMAT]: {
    message: 'Invalid customer ID format',
    description: 'Customer ID does not match expected format',
    recoverable: true,
    severity: 'medium',
    category: 'Data Validation',
    suggestions: [
      'Use AL### format for customer IDs',
      'Sanitize customer ID input',
      'Check data source integrity',
    ],
  },

  [ValidationErrorCode.TELEGRAM_ID_INVALID_FORMAT]: {
    message: 'Invalid Telegram ID format',
    description: 'Telegram ID should be 9-10 digit numeric string',
    recoverable: true,
    severity: 'medium',
    category: 'Data Validation',
    suggestions: [
      'Verify Telegram ID is numeric',
      'Check for leading/trailing spaces',
      'Validate against Telegram API',
    ],
  },

  [ValidationErrorCode.USERNAME_INVALID_FORMAT]: {
    message: 'Invalid username format',
    description: 'Username contains invalid characters or exceeds length limits',
    recoverable: true,
    severity: 'low',
    category: 'Data Validation',
    suggestions: [
      'Use only alphanumeric characters and underscores',
      'Keep username between 3-32 characters',
      'Apply automatic sanitization',
    ],
  },

  [ValidationErrorCode.LKEY_MISSING]: {
    message: 'L-Key mapping missing',
    description: 'No L-Key found for the specified entity type',
    recoverable: true,
    severity: 'high',
    category: 'Data Validation',
    suggestions: [
      'Generate new L-Key for entity type',
      'Check L-Key mapping configuration',
      'Verify entity type classification',
    ],
  },

  [ValidationErrorCode.LKEY_GENERATION_FAILED]: {
    message: 'L-Key generation failed',
    description: 'Unable to generate new L-Key for entity',
    recoverable: true,
    severity: 'high',
    category: 'Data Validation',
    suggestions: [
      'Check L-Key sequence integrity',
      'Verify category mapping exists',
      'Clear L-Key cache and retry',
    ],
  },

  [ValidationErrorCode.AUTOFIX_FAILED]: {
    message: 'Auto-fix operation failed',
    description: 'Unable to automatically fix validation issues',
    recoverable: true,
    severity: 'medium',
    category: 'Auto-Fix',
    suggestions: ['Review specific error details', 'Apply manual fixes', 'Check data permissions'],
  },

  [ValidationErrorCode.CACHE_READ_FAILED]: {
    message: 'Cache read operation failed',
    description: 'Unable to read data from cache storage',
    recoverable: true,
    severity: 'low',
    category: 'Cache/Storage',
    suggestions: [
      'Clear cache and retry',
      'Check cache service availability',
      'Fall back to direct API calls',
    ],
  },

  [ValidationErrorCode.UNKNOWN_ERROR]: {
    message: 'Unknown error occurred',
    description: 'An unexpected error occurred during validation',
    recoverable: true,
    severity: 'medium',
    category: 'Generic',
    suggestions: [
      'Check application logs for details',
      'Retry the operation',
      'Contact support with error details',
    ],
  },
};

/**
 * Error factory for creating standardized validation errors
 */
export class ValidationErrorFactory {
  static createError(
    code: ValidationErrorCode,
    details?: any,
    customMessage?: string
  ): ValidationError {
    const definition = ERROR_DEFINITIONS[code];

    if (!definition) {
      // Fallback for unknown error codes
      return {
        code: ValidationErrorCode.UNKNOWN_ERROR,
        message: customMessage || 'Unknown validation error',
        details,
        timestamp: new Date(),
        recoverable: true,
        suggestions: ['Check application logs', 'Contact support'],
      };
    }

    return {
      code,
      message: customMessage || definition.message,
      details,
      timestamp: new Date(),
      recoverable: definition.recoverable,
      retryAfter: definition.retryStrategy?.retryDelay
        ? Math.floor(definition.retryStrategy.retryDelay / 1000)
        : undefined,
      suggestions: definition.suggestions,
    };
  }

  static isRecoverable(code: ValidationErrorCode): boolean {
    return ERROR_DEFINITIONS[code]?.recoverable ?? false;
  }

  static getSeverity(code: ValidationErrorCode): string {
    return ERROR_DEFINITIONS[code]?.severity ?? 'medium';
  }

  static getRetryStrategy(code: ValidationErrorCode): ErrorRecoveryStrategy | undefined {
    return ERROR_DEFINITIONS[code]?.retryStrategy;
  }
}

/**
 * Error recovery manager
 */
export class ValidationErrorRecovery {
  private retryAttempts: Map<string, number> = new Map();

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    errorCode: ValidationErrorCode,
    operationId?: string
  ): Promise<T> {
    const strategy = ValidationErrorFactory.getRetryStrategy(errorCode);
    const id = operationId || `op_${Date.now()}`;

    if (!strategy) {
      return operation();
    }

    let lastError: Error;
    const currentAttempts = this.retryAttempts.get(id) || 0;

    for (let attempt = currentAttempts; attempt <= strategy.maxRetries; attempt++) {
      try {
        this.retryAttempts.set(id, attempt);
        const result = await operation();
        this.retryAttempts.delete(id); // Success, clear retry count
        return result;
      } catch (error) {
        lastError = error as Error;

        if (attempt === strategy.maxRetries) {
          this.retryAttempts.delete(id); // Max retries reached, clear count
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const delay = strategy.retryDelay * Math.pow(strategy.backoffMultiplier, attempt);
        console.warn(
          `⚠️ Attempt ${attempt + 1}/${strategy.maxRetries + 1} failed, retrying in ${delay}ms:`,
          error.message
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  clearRetryHistory(operationId?: string): void {
    if (operationId) {
      this.retryAttempts.delete(operationId);
    } else {
      this.retryAttempts.clear();
    }
  }
}

/**
 * Export utility functions
 */
export const createValidationError = ValidationErrorFactory.createError;
export const isRecoverableError = ValidationErrorFactory.isRecoverable;
export const getErrorSeverity = ValidationErrorFactory.getSeverity;
