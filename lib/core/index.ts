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
  handleErrorFromUnknown,
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
  handleErrorFromUnknown as handleR2Error,
  safeAsync,
  safeAsyncWithRetry,
} from './error-handling';

import { ErrorHandler } from './error-handling';

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
// CRC32 Hardware-Accelerated Checksums
// ============================================================================

export {
  // Types
  type CRC32Result,
  type FileChecksumResult,

  // Core functions
  crc32,
  crc32File,
  crc32Chunks,
  verify,
  verifyFile,
  checksumRecord,
  validatePacket,

  // Utilities
  toHex,
  fromHex,
  benchmark,
  runBenchmarks,
} from './crc32';

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
export function getErrorMessageFromUnknown(error: unknown): string {
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
export function createErrorWithCauseFromUnknown(
  message: string,
  cause: Error | string | number | boolean | object | null | undefined
): Error {
  return new Error(message, { cause });
}

/**
 * Safely parse JSON with error handling
 */
export function safeJsonParse<T = any>(text: string, fallback?: T): T | undefined {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    return fallback;
  }
}

/**
 * Safely stringify JSON with error handling
 */
export function safeJsonStringify(value: any, fallback = '{}'): string {
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
export function setupErrorHandling(_config?: { global?: Record<string, unknown> }) {
  const globalHandler = ErrorHandler.getInstance();
  console.info('✅ Error handling system initialized');
  return {
    globalHandler,
    getStats: () => globalHandler,
  };
}

// Default export for convenience
export default {
  setupErrorHandling,
  getErrorMessageFromUnknown,
  isErrorType,
  createErrorWithCauseFromUnknown,
  safeJsonParse,
  safeJsonStringify,
};
