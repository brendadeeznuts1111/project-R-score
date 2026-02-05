/**
 * Error Tracker Service
 * 
 * Service for tracking, managing, and routing application errors
 * with standardized error codes and metadata.
 * 
 * Features:
 * - Standardized error code handling
 * - Error categorization and severity levels
 * - Integration with MetricsCollector for tracking
 * - Custom error creation with context
 * - Error aggregation and reporting
 * 
 * @see ERROR_CODES_REGISTRY.txt for error code reference
 * @see METRICS_TRACKING_GUIDE.md for tracking integration
 */

import { Logger } from '../Logger';
import { MetricsCollector } from './MetricsCollector';
import { ERROR_CODES, type ErrorCode } from '../constants/api-metrics';

// =============================================================================
// Type Definitions
// =============================================================================

export interface ApplicationError extends Error {
  code: ErrorCode;
  statusCode: number;
  severity: 'warn' | 'error' | 'critical';
  context?: Record<string, any>;
  timestamp: number;
}

export interface ErrorContext {
  endpoint?: string;
  userId?: string;
  requestId?: string;
  operation?: string;
  [key: string]: any;
}

export interface ErrorReport {
  code: ErrorCode;
  message: string;
  timestamp: number;
  severity: 'warn' | 'error' | 'critical';
  count: number;
  lastOccurrence: number;
  context?: ErrorContext;
}

export interface ErrorStats {
  totalErrors: number;
  byCode: Record<string, number>;
  bySeverity: Record<string, number>;
  recentErrors: ErrorReport[];
}

// =============================================================================
// Custom Error Class
// =============================================================================

export class CustomApplicationError extends Error implements ApplicationError {
  code: ErrorCode;
  statusCode: number;
  severity: 'warn' | 'error' | 'critical';
  context?: Record<string, any>;
  timestamp: number;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    severity: 'warn' | 'error' | 'critical',
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.statusCode = statusCode;
    this.severity = severity;
    this.context = context;
    this.timestamp = Date.now();
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// =============================================================================
// Error Tracker Service
// =============================================================================

export class ErrorTracker {
  private static instance: ErrorTracker | null = null;
  private metrics: MetricsCollector;
  private logger?: Logger;
  private errorCounts: Map<string, number> = new Map();
  private errorHistory: ErrorReport[] = [];
  private maxHistory: number = 1000;

  private constructor(metricsCollector: MetricsCollector, logger?: Logger) {
    this.metrics = metricsCollector;
    this.logger = logger;
  }

  /**
   * Get or create singleton instance
   */
  static getInstance(metricsCollector: MetricsCollector, logger?: Logger): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker(metricsCollector, logger);
    }
    return ErrorTracker.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    ErrorTracker.instance = null;
  }

  /**
   * Map severity from ERROR_CODES to ApplicationError severity
   */
  private mapSeverity(severity: 'warn' | 'error' | 'warning' | 'critical'): 'warn' | 'error' | 'critical' {
    if (severity === 'warning') return 'warn';
    return severity as 'warn' | 'error' | 'critical';
  }

  // =========================================================================
  // Error Creation & Tracking
  // =========================================================================

  /**
   * Create and track an error
   */
  trackError(
    code: ErrorCode,
    context?: ErrorContext
  ): ApplicationError {
    const errorInfo = ERROR_CODES[code];
    
    if (!errorInfo) {
      // Fallback for unknown error codes
      return this.createUnknownError(code, context);
    }

    const error = new CustomApplicationError(
      errorInfo.message,
      code,
      errorInfo.statusCode,
      this.mapSeverity(errorInfo.severity),
      context
    );

    // Record in history
    this.recordError(error, errorInfo);

    // Track in metrics
    this.metrics.recordError({
      code,
      message: errorInfo.message,
      severity: this.mapSeverity(errorInfo.severity),
      context
    });

    // Log error
    if (this.logger) {
      this.logError(error, errorInfo);
    }

    return error;
  }

  /**
   * Create error without tracking (for special cases)
   */
  createError(
    code: ErrorCode,
    context?: ErrorContext
  ): ApplicationError {
    const errorInfo = ERROR_CODES[code];
    
    return new CustomApplicationError(
      errorInfo?.message || 'Unknown error',
      code,
      errorInfo?.statusCode || 500,
      this.mapSeverity(errorInfo?.severity || 'error'),
      context
    );
  }

  /**
   * Handle unexpected/unknown errors
   */
  private createUnknownError(code: string, context?: ErrorContext): ApplicationError {
    return new CustomApplicationError(
      `Unknown error: ${code}`,
      'ERR_001' as ErrorCode,
      500,
      'error',
      { unknownCode: code, ...context }
    );
  }

  // =========================================================================
  // Error Recording & History
  // =========================================================================

  /**
   * Record error in history
   */
  private recordError(error: ApplicationError, errorInfo: any): void {
    // Increment count
    const currentCount = this.errorCounts.get(error.code) || 0;
    this.errorCounts.set(error.code, currentCount + 1);

    // Add to history
    const report: ErrorReport = {
      code: error.code,
      message: error.message,
      timestamp: error.timestamp,
      severity: error.severity,
      count: currentCount + 1,
      lastOccurrence: error.timestamp,
      context: error.context
    };

    this.errorHistory.push(report);

    // Maintain history size
    if (this.errorHistory.length > this.maxHistory) {
      this.errorHistory.shift();
    }
  }

  /**
   * Get error report for a specific code
   */
  getErrorReport(code: ErrorCode): ErrorReport | undefined {
    return this.errorHistory
      .reverse()
      .find(report => report.code === code);
  }

  /**
   * Get all error reports
   */
  getAllErrorReports(): ErrorReport[] {
    return [...this.errorHistory];
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 10): ErrorReport[] {
    return this.errorHistory.slice(-limit).reverse();
  }

  /**
   * Get error statistics
   */
  getErrorStats(): ErrorStats {
    const byCode: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    this.errorCounts.forEach((count, code) => {
      byCode[code] = count;
    });

    this.errorHistory.forEach(report => {
      bySeverity[report.severity] = (bySeverity[report.severity] || 0) + 1;
    });

    return {
      totalErrors: this.errorHistory.length,
      byCode,
      bySeverity,
      recentErrors: this.getRecentErrors(5)
    };
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: 'warn' | 'error' | 'critical'): ErrorReport[] {
    return this.errorHistory.filter(report => report.severity === severity);
  }

  /**
   * Get error trends (errors in time window)
   */
  getErrorTrend(timeWindowMs: number = 3600000): number {
    const cutoff = Date.now() - timeWindowMs;
    return this.errorHistory.filter(report => report.timestamp > cutoff).length;
  }

  /**
   * Check if error rate is high
   */
  isErrorRateHigh(threshold: number = 0.05, timeWindowMs: number = 300000): boolean {
    const errorRate = this.metrics.getErrorRate(timeWindowMs);
    return errorRate > threshold;
  }

  // =========================================================================
  // Error Management
  // =========================================================================

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
    this.errorCounts.clear();
  }

  /**
   * Reset error count
   */
  resetErrorCount(code?: ErrorCode): void {
    if (code) {
      this.errorCounts.delete(code);
    } else {
      this.errorCounts.clear();
    }
  }

  /**
   * Get error count for a code
   */
  getErrorCount(code: ErrorCode): number {
    return this.errorCounts.get(code) || 0;
  }

  /**
   * Check if error code exists
   */
  isValidErrorCode(code: string): boolean {
    return code in ERROR_CODES;
  }

  // =========================================================================
  // Error Handling Utilities
  // =========================================================================

  /**
   * Determine if error is retryable
   */
  isRetryable(error: ApplicationError): boolean {
    // Retryable status codes: 408, 429, 500-599
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(error.statusCode);
  }

  /**
   * Get retry delay in milliseconds
   */
  getRetryDelay(error: ApplicationError, attempt: number = 1): number {
    // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms (max)
    const baseDelay = 100;
    const maxDelay = 1600;
    const delay = baseDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, maxDelay);
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(error: ApplicationError): string {
    // Map error codes to user-friendly messages
    const userMessages: Record<string, string> = {
      SYS_001: 'System error. Please try again later.',
      SYS_002: 'Configuration error. Please contact support.',
      SYS_003: 'System is under heavy load. Please try again in a moment.',
      API_001: 'Invalid request format.',
      API_002: 'Unauthorized access.',
      API_003: 'Resource not found.',
      API_004: 'Too many requests. Please wait a moment.',
      API_005: 'Server error. Please try again later.',
      VAL_001: 'Invalid email format.',
      VAL_002: 'Invalid phone number.',
      VAL_003: 'Required field missing.',
      VAL_004: 'Password is too weak.',
      DB_001: 'Database error. Please try again.',
      DB_002: 'Request timeout. Please try again.',
      DB_003: 'This record already exists.',
      AUTH_001: 'Invalid credentials.',
      AUTH_002: 'Session expired. Please login again.',
      AUTH_003: 'Invalid token. Please login again.'
    };

    return userMessages[error.code] || 'An error occurred. Please try again.';
  }

  /**
   * Get recommended action for error
   */
  getRecommendedAction(error: ApplicationError): string {
    const actions: Record<string, string> = {
      SYS_001: 'Restart the application',
      SYS_003: 'Wait and retry',
      API_004: 'Wait before making more requests',
      DB_001: 'Check database connection',
      DB_002: 'Retry the request',
      AUTH_001: 'Check credentials and try again',
      AUTH_002: 'Login again'
    };

    return actions[error.code] || 'Check error code documentation';
  }

  // =========================================================================
  // Logging
  // =========================================================================

  /**
   * Log error with appropriate level
   */
  private logError(error: ApplicationError, errorInfo: any): void {
    if (!this.logger) return;

    const logData = {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      severity: error.severity,
      context: error.context,
      timestamp: new Date(error.timestamp).toISOString(),
      action: this.getRecommendedAction(error)
    };

    switch (error.severity) {
      case 'critical':
        this.logger.error(`CRITICAL: ${error.code} - ${error.message}`, logData);
        break;
      case 'error':
        this.logger.error(`ERROR: ${error.code} - ${error.message}`, logData);
        break;
      case 'warn':
        // Note: Logger doesn't have warn, use error with lower level
        this.logger.error(`WARN: ${error.code} - ${error.message}`, logData);
        break;
    }
  }

  // =========================================================================
  // Export & Reporting
  // =========================================================================

  /**
   * Export error history as JSON
   */
  exportAsJSON(): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        stats: this.getErrorStats(),
        history: this.errorHistory
      },
      null,
      2
    );
  }

  /**
   * Get error summary for dashboard
   */
  getDashboardSummary(): {
    totalErrors: number;
    criticalErrors: number;
    recentErrors: ErrorReport[];
    topErrors: Array<{ code: string; count: number }>;
    errorRate: number;
  } {
    const stats = this.getErrorStats();
    const topErrors = Object.entries(stats.byCode)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([code, count]) => ({ code, count }));

    return {
      totalErrors: stats.totalErrors,
      criticalErrors: stats.bySeverity['critical'] || 0,
      recentErrors: stats.recentErrors,
      topErrors,
      errorRate: this.metrics.getErrorRate()
    };
  }
}
