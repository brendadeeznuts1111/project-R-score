#!/usr/bin/env bun

/**
 * 🛡️ Standardized Error Handling System
 * 
 * Comprehensive error handling with proper types, logging, and recovery strategies
 */

import { styled } from '../theme/colors.ts';

/**
 * Base error class for all R2 integration errors
 */
export class R2IntegrationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: any,
    public readonly recoverable: boolean = false
  ) {
    super(message);
    this.name = 'R2IntegrationError';
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, R2IntegrationError);
    }
  }
}

/**
 * Specific error types
 */
export class R2ConnectionError extends R2IntegrationError {
  constructor(message: string, context?: any) {
    super(message, 'R2_CONNECTION_ERROR', context, false);
    this.name = 'R2ConnectionError';
  }
}

export class R2DataError extends R2IntegrationError {
  constructor(message: string, context?: any) {
    super(message, 'R2_DATA_ERROR', context, true);
    this.name = 'R2DataError';
  }
}

export class ValidationError extends R2IntegrationError {
  constructor(message: string, context?: any) {
    super(message, 'VALIDATION_ERROR', context, false);
    this.name = 'ValidationError';
  }
}

export class CacheError extends R2IntegrationError {
  constructor(message: string, context?: any) {
    super(message, 'CACHE_ERROR', context, true);
    this.name = 'CacheError';
  }
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Standardized error handler
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, Date> = new Map();

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle and log errors with proper sanitization
   */
  handle(error: unknown, context: string, severity: ErrorSeverity = ErrorSeverity.MEDIUM): R2IntegrationError {
    const sanitizedError = this.sanitizeError(error);
    const errorCode = this.generateErrorCode(sanitizedError, context);
    
    // Track error frequency
    this.trackError(errorCode);
    
    // Log the error
    this.logError(sanitizedError, context, severity, errorCode);
    
    // Determine if error should be thrown or handled gracefully
    if (severity === ErrorSeverity.CRITICAL || !this.isRecoverable(sanitizedError)) {
      throw sanitizedError;
    }
    
    return sanitizedError;
  }

  /**
   * Sanitize error to prevent sensitive data leakage
   */
  private sanitizeError(error: unknown): R2IntegrationError {
    if (error instanceof R2IntegrationError) {
      return error;
    }

    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    const sanitizedMessage = this.sanitizeMessage(message);
    
    return new R2IntegrationError(
      sanitizedMessage,
      'UNKNOWN_ERROR',
      { originalError: error instanceof Error ? error.name : 'Unknown' },
      false
    );
  }

  /**
   * Sanitize error message to remove sensitive information
   */
  private sanitizeMessage(message: string): string {
    // Remove potential sensitive patterns
    const sensitivePatterns = [
      /key\s*[:=]\s*['"]?[a-zA-Z0-9+/=]{20,}['"]?/gi,
      /token\s*[:=]\s*['"]?[a-zA-Z0-9+/=]{20,}['"]?/gi,
      /password\s*[:=]\s*['"]?[^'"]{8,}['"]?/gi,
      /secret\s*[:=]\s*['"]?[a-zA-Z0-9+/=]{20,}['"]?/gi,
      /\/home\/[^\/\s]+/gi,
      /\/Users\/[^\/\s]+/gi,
      /C:\\Users\\[^\\]+/gi
    ];

    let sanitized = message;
    for (const pattern of sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    return sanitized;
  }

  /**
   * Generate unique error code
   */
  private generateErrorCode(error: R2IntegrationError, context: string): string {
    const timestamp = Date.now().toString(36);
    const hash = Buffer.from(`${context}-${error.code}`).toString('base64').slice(0, 8);
    return `${error.code}-${hash}-${timestamp}`;
  }

  /**
   * Track error frequency for monitoring
   */
  private trackError(errorCode: string): void {
    const current = this.errorCounts.get(errorCode) || 0;
    this.errorCounts.set(errorCode, current + 1);
    this.lastErrors.set(errorCode, new Date());
  }

  /**
   * Log error with appropriate styling
   */
  private logError(
    error: R2IntegrationError, 
    context: string, 
    severity: ErrorSeverity, 
    errorCode: string
  ): void {
    const severityColors = {
      [ErrorSeverity.LOW]: 'muted',
      [ErrorSeverity.MEDIUM]: 'warning',
      [ErrorSeverity.HIGH]: 'error',
      [ErrorSeverity.CRITICAL]: 'error'
    };

    const color = severityColors[severity];
    const count = this.errorCounts.get(errorCode) || 1;
    const countText = count > 1 ? ` (${count}x)` : '';

    console.log(styled(
      `❌ ${error.name}${countText} [${errorCode}]`,
      color as any
    ));
    console.log(styled(`   Context: ${context}`, 'muted'));
    console.log(styled(`   Message: ${error.message}`, 'muted'));
    
    if (error.context && Object.keys(error.context).length > 0) {
      console.log(styled(`   Context: ${JSON.stringify(error.context, null, 2)}`, 'muted'));
    }
  }

  /**
   * Determine if error is recoverable
   */
  private isRecoverable(error: R2IntegrationError): boolean {
    return error.recoverable || 
           error.code === 'R2_DATA_ERROR' || 
           error.code === 'CACHE_ERROR';
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<string, { count: number; lastSeen: Date }> {
    const stats: Record<string, { count: number; lastSeen: Date }> = {};
    
    for (const [code, count] of this.errorCounts) {
      const lastSeen = this.lastErrors.get(code) || new Date();
      stats[code] = { count, lastSeen };
    }
    
    return stats;
  }

  /**
   * Reset error tracking
   */
  resetTracking(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }
}

/**
 * Standardized error handler function
 */
export function handleError(
  error: unknown, 
  context: string, 
  severity: ErrorSeverity = ErrorSeverity.MEDIUM
): R2IntegrationError {
  return ErrorHandler.getInstance().handle(error, context, severity);
}

/**
 * Safe error wrapper for async operations
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context: string,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    handleError(error, context, ErrorSeverity.MEDIUM);
    return fallback;
  }
}

/**
 * Safe error wrapper with retry logic
 */
export async function safeAsyncWithRetry<T>(
  operation: () => Promise<T>,
  context: string,
  maxRetries: number = 3,
  retryDelay: number = 1000,
  fallback?: T
): Promise<T | undefined> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        handleError(error, context, ErrorSeverity.HIGH);
        return fallback;
      }
      
      // Wait before retry
      await Bun.sleep(retryDelay * attempt);
    }
  }
  
  handleError(lastError, context, ErrorSeverity.HIGH);
  return fallback;
}
