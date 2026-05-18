#!/usr/bin/env bun

/**
 * ⚠️ Standardized Error Handler for Fire22 Workspace
 *
 * Comprehensive error handling system that provides consistent error
 * management across all workspace orchestration components. Includes
 * error classification, recovery strategies, logging, and monitoring.
 *
 * Key Features:
 * - Standardized error types with context information
 * - Automatic error recovery and retry mechanisms
 * - Error aggregation and reporting
 * - Performance impact monitoring
 * - Integration with monitoring systems
 * - Graceful degradation strategies
 *
 * @version 1.0.0
 * @author Fire22 Development Team
 */

import { Logger, LogLevel } from './shared-utilities.ts';

// === ERROR CLASSIFICATION SYSTEM ===

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ErrorCategory {
  VALIDATION = 'validation',
  FILESYSTEM = 'filesystem',
  NETWORK = 'network',
  PROCESS = 'process',
  MEMORY = 'memory',
  PERMISSION = 'permission',
  CONFIGURATION = 'configuration',
  EXTERNAL_SERVICE = 'external_service',
  USER_INPUT = 'user_input',
  SYSTEM = 'system',
}

export enum RecoveryStrategy {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  DEGRADE = 'degrade',
  FAIL_FAST = 'fail_fast',
  IGNORE = 'ignore',
  ESCALATE = 'escalate',
}

// === BASE ERROR CLASSES ===

export abstract class WorkspaceBaseError extends Error {
  public readonly timestamp: number;
  public readonly errorId: string;
  public context: Record<string, any>;
  public attempts: number = 0;
  public recovered: boolean = false;

  constructor(
    message: string,
    public readonly code: string,
    public readonly severity: ErrorSeverity,
    public readonly category: ErrorCategory,
    public readonly recoveryStrategy: RecoveryStrategy,
    context: Record<string, any> = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = Date.now();
    this.errorId = this.generateErrorId();
    this.context = { ...context };

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Add context information to the error
   */
  addContext(key: string, value: any): this {
    this.context[key] = value;
    return this;
  }

  /**
   * Mark this error as recovered
   */
  markRecovered(): this {
    this.recovered = true;
    return this;
  }

  /**
   * Increment attempt counter
   */
  incrementAttempts(): this {
    this.attempts++;
    return this;
  }

  /**
   * Get error details as structured object
   */
  toJSON(): any {
    return {
      errorId: this.errorId,
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      category: this.category,
      recoveryStrategy: this.recoveryStrategy,
      timestamp: this.timestamp,
      attempts: this.attempts,
      recovered: this.recovered,
      context: this.context,
      stack: this.stack,
    };
  }

  private generateErrorId(): string {
    return `${this.category}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// === SPECIFIC ERROR TYPES ===

export class ValidationError extends WorkspaceBaseError {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: any,
    context: Record<string, any> = {}
  ) {
    super(
      message,
      'VALIDATION_FAILED',
      ErrorSeverity.MEDIUM,
      ErrorCategory.VALIDATION,
      RecoveryStrategy.FAIL_FAST,
      { field, value, ...context }
    );
  }
}

export class FileSystemError extends WorkspaceBaseError {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly path: string,
    context: Record<string, any> = {}
  ) {
    super(
      message,
      'FILESYSTEM_ERROR',
      ErrorSeverity.HIGH,
      ErrorCategory.FILESYSTEM,
      RecoveryStrategy.RETRY,
      { operation, path, ...context }
    );
  }
}

export class ProcessError extends WorkspaceBaseError {
  constructor(
    message: string,
    public readonly command: string[],
    public readonly exitCode: number,
    context: Record<string, any> = {}
  ) {
    super(
      message,
      'PROCESS_FAILED',
      ErrorSeverity.HIGH,
      ErrorCategory.PROCESS,
      RecoveryStrategy.RETRY,
      { command: command.join(' '), exitCode, ...context }
    );
  }
}

export class NetworkError extends WorkspaceBaseError {
  constructor(
    message: string,
    public readonly url: string,
    public readonly statusCode?: number,
    context: Record<string, any> = {}
  ) {
    super(
      message,
      'NETWORK_ERROR',
      ErrorSeverity.MEDIUM,
      ErrorCategory.NETWORK,
      RecoveryStrategy.RETRY,
      { url, statusCode, ...context }
    );
  }
}

export class MemoryError extends WorkspaceBaseError {
  constructor(
    message: string,
    public readonly memoryUsage: number,
    public readonly memoryLimit: number,
    context: Record<string, any> = {}
  ) {
    super(
      message,
      'MEMORY_EXCEEDED',
      ErrorSeverity.CRITICAL,
      ErrorCategory.MEMORY,
      RecoveryStrategy.DEGRADE,
      { memoryUsage, memoryLimit, ...context }
    );
  }
}

export class ConfigurationError extends WorkspaceBaseError {
  constructor(
    message: string,
    public readonly configKey: string,
    public readonly expectedType?: string,
    context: Record<string, any> = {}
  ) {
    super(
      message,
      'INVALID_CONFIGURATION',
      ErrorSeverity.HIGH,
      ErrorCategory.CONFIGURATION,
      RecoveryStrategy.FALLBACK,
      { configKey, expectedType, ...context }
    );
  }
}

export class ExternalServiceError extends WorkspaceBaseError {
  constructor(
    message: string,
    public readonly service: string,
    public readonly responseCode?: number,
    context: Record<string, any> = {}
  ) {
    super(
      message,
      'EXTERNAL_SERVICE_UNAVAILABLE',
      ErrorSeverity.MEDIUM,
      ErrorCategory.EXTERNAL_SERVICE,
      RecoveryStrategy.FALLBACK,
      { service, responseCode, ...context }
    );
  }
}

// === ERROR RECOVERY SYSTEM ===

export interface RecoveryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  jitter?: boolean;
}

export class ErrorRecoverySystem {
  private static recoveryHandlers = new Map<
    string,
    (error: WorkspaceBaseError) => Promise<boolean>
  >();
  private static errorStats = new Map<string, { count: number; lastOccurred: number }>();

  /**
   * Register a recovery handler for a specific error code
   */
  static registerRecoveryHandler(
    errorCode: string,
    handler: (error: WorkspaceBaseError) => Promise<boolean>
  ): void {
    this.recoveryHandlers.set(errorCode, handler);
  }

  /**
   * Attempt to recover from an error using registered handlers
   */
  static async attemptRecovery(error: WorkspaceBaseError): Promise<boolean> {
    const handler = this.recoveryHandlers.get(error.code);
    if (!handler) {
      return false;
    }

    try {
      const recovered = await handler(error);
      if (recovered) {
        error.markRecovered();
        Logger.info(`Successfully recovered from error: ${error.code}`);
        return true;
      }
    } catch (recoveryError) {
      Logger.error(`Recovery handler failed for ${error.code}`, recoveryError);
    }

    return false;
  }

  /**
   * Implement retry logic with exponential backoff
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RecoveryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 30000,
      backoffFactor = 2,
      jitter = true,
    } = options;

    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry on the last attempt or for non-retryable errors
        if (attempt === maxRetries || !this.shouldRetry(error)) {
          throw error;
        }

        // Calculate delay with exponential backoff and optional jitter
        let delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);
        if (jitter) {
          delay = delay * (0.5 + Math.random() * 0.5); // ±50% jitter
        }

        Logger.warn(
          `Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`
        );
        await new Promise(resolve => setTimeout(resolve, delay));

        // Increment attempt counter if it's a workspace error
        if (error instanceof WorkspaceBaseError) {
          error.incrementAttempts();
        }
      }
    }

    throw lastError;
  }

  /**
   * Determine if an error should be retried
   */
  private static shouldRetry(error: any): boolean {
    if (error instanceof WorkspaceBaseError) {
      return error.recoveryStrategy === RecoveryStrategy.RETRY;
    }

    // Default retry logic for non-workspace errors
    if (error.code === 'ENOENT' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    return false;
  }

  /**
   * Update error statistics
   */
  private static updateErrorStats(error: WorkspaceBaseError): void {
    const key = `${error.category}:${error.code}`;
    const stats = this.errorStats.get(key) || { count: 0, lastOccurred: 0 };
    stats.count++;
    stats.lastOccurred = Date.now();
    this.errorStats.set(key, stats);
  }

  /**
   * Get error statistics for monitoring
   */
  static getErrorStats(): Map<string, { count: number; lastOccurred: number }> {
    return new Map(this.errorStats);
  }
}

// === CENTRALIZED ERROR HANDLER ===

export class StandardizedErrorHandler {
  private static instance: StandardizedErrorHandler;
  private errorBuffer: WorkspaceBaseError[] = [];
  private readonly maxBufferSize = 1000;
  private monitoringCallbacks: Array<(error: WorkspaceBaseError) => void> = [];

  static getInstance(): StandardizedErrorHandler {
    if (!StandardizedErrorHandler.instance) {
      StandardizedErrorHandler.instance = new StandardizedErrorHandler();
    }
    return StandardizedErrorHandler.instance;
  }

  /**
   * Handle an error with standardized processing
   */
  async handleError(
    error: Error | WorkspaceBaseError,
    context?: Record<string, any>
  ): Promise<void> {
    let workspaceError: WorkspaceBaseError;

    if (error instanceof WorkspaceBaseError) {
      workspaceError = error;
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          workspaceError.addContext(key, value);
        });
      }
    } else {
      // Convert regular errors to workspace errors
      workspaceError = this.convertToWorkspaceError(error, context);
    }

    // Add to error buffer
    this.addToBuffer(workspaceError);

    // Log the error
    this.logError(workspaceError);

    // Attempt recovery based on strategy
    await this.processRecoveryStrategy(workspaceError);

    // Notify monitoring systems
    this.notifyMonitoring(workspaceError);

    // Update error statistics
    ErrorRecoverySystem['updateErrorStats'](workspaceError);
  }

  /**
   * Convert a regular Error to a WorkspaceBaseError
   */
  private convertToWorkspaceError(error: Error, context?: Record<string, any>): WorkspaceBaseError {
    // Determine error category and recovery strategy based on error characteristics
    let category = ErrorCategory.SYSTEM;
    let severity = ErrorSeverity.MEDIUM;
    let recoveryStrategy = RecoveryStrategy.RETRY;
    let code = 'UNKNOWN_ERROR';

    // Analyze error to determine appropriate classification
    if (
      error.message.toLowerCase().includes('file') ||
      error.message.toLowerCase().includes('directory')
    ) {
      category = ErrorCategory.FILESYSTEM;
      code = 'FILESYSTEM_ERROR';
    } else if (
      error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('connection')
    ) {
      category = ErrorCategory.NETWORK;
      code = 'NETWORK_ERROR';
    } else if (
      error.message.toLowerCase().includes('memory') ||
      error.message.toLowerCase().includes('heap')
    ) {
      category = ErrorCategory.MEMORY;
      severity = ErrorSeverity.HIGH;
      recoveryStrategy = RecoveryStrategy.DEGRADE;
      code = 'MEMORY_ERROR';
    } else if (
      error.message.toLowerCase().includes('permission') ||
      error.message.toLowerCase().includes('access')
    ) {
      category = ErrorCategory.PERMISSION;
      severity = ErrorSeverity.HIGH;
      recoveryStrategy = RecoveryStrategy.ESCALATE;
      code = 'PERMISSION_ERROR';
    }

    // Create a generic workspace error
    return new (class extends WorkspaceBaseError {
      constructor() {
        super(error.message, code, severity, category, recoveryStrategy, context);
        this.stack = error.stack;
      }
    })();
  }

  /**
   * Add error to buffer for analysis
   */
  private addToBuffer(error: WorkspaceBaseError): void {
    this.errorBuffer.push(error);

    // Trim buffer if it exceeds max size
    if (this.errorBuffer.length > this.maxBufferSize) {
      this.errorBuffer = this.errorBuffer.slice(-this.maxBufferSize);
    }
  }

  /**
   * Log error with appropriate level and formatting
   */
  private logError(error: WorkspaceBaseError): void {
    const logLevel = this.getLogLevel(error.severity);
    const logMessage = `[${error.category.toUpperCase()}] ${error.message} (${error.code})`;

    switch (logLevel) {
      case LogLevel.ERROR:
        Logger.error(logMessage, error.toJSON());
        break;
      case LogLevel.WARN:
        Logger.warn(logMessage, error.toJSON());
        break;
      case LogLevel.INFO:
        Logger.info(logMessage, error.toJSON());
        break;
      default:
        Logger.debug(logMessage, error.toJSON());
    }
  }

  /**
   * Process recovery strategy for the error
   */
  private async processRecoveryStrategy(error: WorkspaceBaseError): Promise<void> {
    switch (error.recoveryStrategy) {
      case RecoveryStrategy.RETRY:
        // Retry is handled by the calling code using ErrorRecoverySystem.executeWithRetry
        break;

      case RecoveryStrategy.FALLBACK:
        await this.attemptFallback(error);
        break;

      case RecoveryStrategy.DEGRADE:
        await this.performGracefulDegradation(error);
        break;

      case RecoveryStrategy.ESCALATE:
        await this.escalateError(error);
        break;

      case RecoveryStrategy.IGNORE:
        Logger.info(`Ignoring error as per recovery strategy: ${error.code}`);
        break;

      case RecoveryStrategy.FAIL_FAST:
        Logger.error('Failing fast due to critical error', error);
        throw error;
    }
  }

  /**
   * Attempt fallback behavior
   */
  private async attemptFallback(error: WorkspaceBaseError): Promise<void> {
    Logger.info(`Attempting fallback for error: ${error.code}`);
    // Fallback logic would be implemented based on error type
  }

  /**
   * Perform graceful degradation
   */
  private async performGracefulDegradation(error: WorkspaceBaseError): Promise<void> {
    Logger.warn(`Performing graceful degradation for error: ${error.code}`);
    // Degradation logic would be implemented based on error type
  }

  /**
   * Escalate error to higher-level systems
   */
  private async escalateError(error: WorkspaceBaseError): Promise<void> {
    Logger.error(`Escalating error: ${error.code}`);
    // Escalation logic would be implemented (alerts, notifications, etc.)
  }

  /**
   * Get appropriate log level for error severity
   */
  private getLogLevel(severity: ErrorSeverity): LogLevel {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return LogLevel.ERROR;
      case ErrorSeverity.MEDIUM:
        return LogLevel.WARN;
      case ErrorSeverity.LOW:
        return LogLevel.INFO;
      default:
        return LogLevel.DEBUG;
    }
  }

  /**
   * Notify monitoring systems
   */
  private notifyMonitoring(error: WorkspaceBaseError): void {
    this.monitoringCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (err) {
        Logger.error('Error in monitoring callback', err);
      }
    });
  }

  /**
   * Register monitoring callback
   */
  registerMonitoringCallback(callback: (error: WorkspaceBaseError) => void): void {
    this.monitoringCallbacks.push(callback);
  }

  /**
   * Get error buffer for analysis
   */
  getErrorBuffer(): readonly WorkspaceBaseError[] {
    return [...this.errorBuffer];
  }

  /**
   * Clear error buffer
   */
  clearErrorBuffer(): void {
    this.errorBuffer = [];
  }

  /**
   * Generate error report for monitoring
   */
  generateErrorReport(): any {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    const recentErrors = this.errorBuffer.filter(error => now - error.timestamp < oneHour);

    const errorsByCategory = new Map<ErrorCategory, number>();
    const errorsBySeverity = new Map<ErrorSeverity, number>();

    recentErrors.forEach(error => {
      errorsByCategory.set(error.category, (errorsByCategory.get(error.category) || 0) + 1);
      errorsBySeverity.set(error.severity, (errorsBySeverity.get(error.severity) || 0) + 1);
    });

    return {
      timestamp: new Date().toISOString(),
      period: '1 hour',
      totalErrors: recentErrors.length,
      errorsByCategory: Object.fromEntries(errorsByCategory),
      errorsBySeverity: Object.fromEntries(errorsBySeverity),
      criticalErrors: recentErrors.filter(e => e.severity === ErrorSeverity.CRITICAL).length,
      recoveredErrors: recentErrors.filter(e => e.recovered).length,
      topErrors: this.getTopErrors(recentErrors),
    };
  }

  /**
   * Get most common errors
   */
  private getTopErrors(errors: WorkspaceBaseError[]): Array<{ code: string; count: number }> {
    const errorCounts = new Map<string, number>();

    errors.forEach(error => {
      errorCounts.set(error.code, (errorCounts.get(error.code) || 0) + 1);
    });

    return Array.from(errorCounts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}

// === CONVENIENCE FUNCTIONS ===

/**
 * Handle an error with standardized processing
 */
export async function handleError(
  error: Error | WorkspaceBaseError,
  context?: Record<string, any>
): Promise<void> {
  const handler = StandardizedErrorHandler.getInstance();
  await handler.handleError(error, context);
}

/**
 * Execute operation with error handling and retry
 */
export async function executeWithErrorHandling<T>(
  operation: () => Promise<T>,
  options: RecoveryOptions & { context?: Record<string, any> } = {}
): Promise<T> {
  const { context, ...recoveryOptions } = options;

  return ErrorRecoverySystem.executeWithRetry(async () => {
    try {
      return await operation();
    } catch (error) {
      await handleError(error instanceof Error ? error : new Error(String(error)), context);
      throw error;
    }
  }, recoveryOptions);
}

/**
 * Create a standardized error
 */
export function createError(
  message: string,
  code: string,
  severity: ErrorSeverity,
  category: ErrorCategory,
  recoveryStrategy: RecoveryStrategy,
  context?: Record<string, any>
): WorkspaceBaseError {
  return new (class extends WorkspaceBaseError {
    constructor() {
      super(message, code, severity, category, recoveryStrategy, context);
    }
  })();
}

export default {
  // Error classes
  WorkspaceBaseError,
  ValidationError,
  FileSystemError,
  ProcessError,
  NetworkError,
  MemoryError,
  ConfigurationError,
  ExternalServiceError,

  // Enums
  ErrorSeverity,
  ErrorCategory,
  RecoveryStrategy,

  // Systems
  ErrorRecoverySystem,
  StandardizedErrorHandler,

  // Utilities
  handleError,
  executeWithErrorHandling,
  createError,
};
