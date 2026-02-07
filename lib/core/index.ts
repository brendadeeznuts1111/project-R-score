// lib/core/index.ts — Unified exports for error handling and core utilities

// ============================================================================
// Error Types and Classes
// ============================================================================

export {
  // Error codes
  EnterpriseErrorCode,
  
  // Error classes
  BaseEnterpriseError,
  SystemError,
  ValidationError,
  NetworkError,
  SecurityError,
  ResourceError,
  BusinessError,
  
  // Error factory
  EnterpriseErrorFactory,
  
  // Error handler
  EnterpriseErrorHandler,
  
  // Convenience functions
  handleError,
  createSystemError,
  createValidationError,
  createNetworkError,
  createSecurityError,
  createResourceError,
  createBusinessError,
} from './core-errors';

// ============================================================================
// Error Handling Utilities
// ============================================================================

export {
  // Error classes
  R2IntegrationError,
  R2ConnectionError,
  R2DataError,
  CacheError,
  
  // Error severity
  ErrorSeverity,
  
  // Error handler
  ErrorHandler,
  
  // Utility functions
  handleError as handleR2Error,
  safeAsync,
  safeAsyncWithRetry,
} from './error-handling';

// ============================================================================
// Global Error Handling
// ============================================================================

export {
  // Classes and types
  GlobalErrorHandler,
  type GlobalErrorConfig,
  
  // Convenience functions
  initializeGlobalErrorHandling,
  onShutdown,
  getGlobalErrorStatistics,
} from './global-error-handler';

// ============================================================================
// Circuit Breaker
// ============================================================================

export {
  // Classes and types
  CircuitBreaker,
  CircuitBreakerRegistry,
  CircuitBreakerOpenError,
  type CircuitBreakerConfig,
  type CircuitBreakerStats,
  CircuitState,
  
  // Convenience functions
  withCircuitBreaker,
  getCircuitBreakerRegistry,
  getCircuitBreakerHealth,
} from './circuit-breaker';

// ============================================================================
// Error Metrics & Alerting
// ============================================================================

export {
  // Classes and types
  ErrorMetricsCollector,
  AlertSeverity,
  AlertChannel,
  type AlertConfig,
  type ErrorMetric,
  type ErrorAggregation,
  type MetricsExport,
  
  // Convenience functions
  getErrorMetricsCollector,
  recordError,
  configureAlert,
  getErrorAggregation,
} from './error-metrics';

// ============================================================================
// Bun Spawn Utilities
// ============================================================================

export {
  // Types
  type SpawnResult,
  type SafeSpawnOptions,
  type AnsiWidthResult,
  
  // Binary validation
  validateBinaryExists,
  validateBinaryOrThrow,
  
  // Safe spawn
  safeSpawn,
  streamSpawn,
  
  // ANSI utilities
  ansiStringWidth,
  stripAnsi,
  truncateAnsi,
  
  // TTY utilities
  isTTY,
  getTerminalSize,
} from './bun-spawn-utils';

// ============================================================================
// Core Types
// ============================================================================

export {
  // Enums
  OperationStatus,
  SecurityRiskLevel,
  PerformanceTier,
  ResourceState,
  NetworkProtocol,
  DataEncoding,
  CryptoAlgorithm,
  
  // Interfaces
  type EnterpriseOperation,
  type EnterpriseError,
} from './core-types';

// ============================================================================
// Re-export Utilities (for convenience)
// ============================================================================

/**
 * Get error message from unknown error type safely
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

/**
 * Check if error is a specific type
 */
export function isErrorType<T extends Error>(
  error: unknown,
  ErrorClass: new (...args: any[]) => T
): error is T {
  return error instanceof ErrorClass;
}

/**
 * Create error with cause chain
 */
export function createErrorWithCause(
  message: string,
  cause: unknown
): Error {
  const error = new Error(message);
  (error as any).cause = cause;
  return error;
}

/**
 * Safely parse JSON with error handling
 */
export function safeJsonParse<T = any>(
  text: string,
  fallback?: T
): T | undefined {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    return fallback;
  }
}

/**
 * Safely stringify JSON with error handling
 */
export function safeJsonStringify(
  value: any,
  fallback = '{}'
): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return fallback;
  }
}

// ============================================================================
// Default Export
// ============================================================================

/**
 * Quick setup for complete error handling in an application
 */
export function setupErrorHandling(config?: {
  global?: Parameters<typeof initializeGlobalErrorHandling>[0];
}) {
  // Initialize global error handling
  const globalHandler = initializeGlobalErrorHandling(config?.global);
  
  console.log('✅ Error handling system initialized');
  
  return {
    globalHandler,
    getStats: getGlobalErrorStatistics,
  };
}

// Default export for convenience
export default {
  setupErrorHandling,
  getErrorMessage,
  isErrorType,
  createErrorWithCause,
  safeJsonParse,
  safeJsonStringify,
};
