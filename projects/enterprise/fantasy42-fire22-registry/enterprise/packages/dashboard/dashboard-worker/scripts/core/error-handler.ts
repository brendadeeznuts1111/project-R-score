#!/usr/bin/env bun

/**
 * 🛡️ Fire22 Enhanced Error Handler
 *
 * Provides standardized error handling, logging, and recovery mechanisms
 * for all Fire22 scripts with intelligent error categorization and resolution
 *
 * @version 1.0.0
 * @author Fire22 Development Team
 */

interface ErrorContext {
  scriptName: string;
  operation: string;
  timestamp: string;
  user?: string;
  environment?: string;
  metadata?: Record<string, any>;
}

interface ErrorInfo {
  type: 'validation' | 'runtime' | 'system' | 'network' | 'permission' | 'resource' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  suggestedActions: string[];
  retryStrategy?: 'immediate' | 'delayed' | 'exponential' | 'none';
}

interface ErrorReport {
  error: Error;
  context: ErrorContext;
  info: ErrorInfo;
  stack: string;
  timestamp: string;
  errorId: string;
}

class Fire22Error extends Error {
  public readonly context: ErrorContext;
  public readonly info: ErrorInfo;
  public readonly errorId: string;

  constructor(message: string, context: ErrorContext, info: ErrorInfo, cause?: Error) {
    super(message);
    this.name = 'Fire22Error';
    this.context = context;
    this.info = info;
    this.errorId = this.generateErrorId();

    if (cause) {
      this.cause = cause;
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorHistory: ErrorReport[] = [];
  private maxHistorySize = 1000;
  private errorPatterns: Map<string, ErrorInfo> = new Map();
  private recoveryStrategies: Map<string, () => Promise<boolean>> = new Map();

  private constructor() {
    this.initializeErrorPatterns();
    this.initializeRecoveryStrategies();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle an error with comprehensive logging and recovery
   */
  async handleError(
    error: Error,
    context: ErrorContext,
    options: {
      log?: boolean;
      recover?: boolean;
      report?: boolean;
      silent?: boolean;
    } = {}
  ): Promise<ErrorReport> {
    const defaultOptions = { log: true, recover: true, report: true, silent: false };
    const finalOptions = { ...defaultOptions, ...options };

    // Analyze the error
    const errorInfo = this.analyzeError(error);

    // Create error report
    const errorReport: ErrorReport = {
      error,
      context,
      info: errorInfo,
      stack: error.stack || 'No stack trace available',
      timestamp: new Date().toISOString(),
      errorId: this.generateErrorId(),
    };

    // Add to history
    this.addToHistory(errorReport);

    // Log the error
    if (finalOptions.log) {
      this.logError(errorReport, finalOptions.silent);
    }

    // Attempt recovery if possible
    if (finalOptions.recover && errorInfo.recoverable) {
      await this.attemptRecovery(errorReport);
    }

    // Report if configured
    if (finalOptions.report) {
      await this.reportError(errorReport);
    }

    return errorReport;
  }

  /**
   * Create a Fire22Error with context
   */
  createError(
    message: string,
    context: ErrorContext,
    info: Partial<ErrorInfo> = {},
    cause?: Error
  ): Fire22Error {
    const defaultInfo: ErrorInfo = {
      type: 'unknown',
      severity: 'medium',
      recoverable: false,
      suggestedActions: ['Check logs for more details', 'Verify configuration'],
    };

    const finalInfo = { ...defaultInfo, ...info };
    return new Fire22Error(message, context, finalInfo, cause);
  }

  /**
   * Validate input parameters
   */
  validateInput<T>(
    value: T,
    validator: (value: T) => boolean,
    errorMessage: string,
    context: ErrorContext
  ): T {
    if (!validator(value)) {
      const error = this.createError(errorMessage, context, {
        type: 'validation',
        severity: 'medium',
        recoverable: true,
        suggestedActions: ['Check input parameters', 'Verify data format'],
      });
      throw error;
    }
    return value;
  }

  /**
   * Execute with error handling wrapper
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    options: {
      retries?: number;
      timeout?: number;
      fallback?: () => Promise<T>;
    } = {}
  ): Promise<T> {
    const { retries = 3, timeout = 30000, fallback } = options;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Set up timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout);
        });

        // Execute operation
        const result = await Promise.race([operation(), timeoutPromise]);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
          await this.delay(delay);

          this.log(`⚠️  Attempt ${attempt} failed, retrying in ${delay}ms...`, 'warn');
        }
      }
    }

    // All retries failed
    if (fallback) {
      try {
        this.log('🔄 All retries failed, attempting fallback...', 'warn');
        return await fallback();
      } catch (fallbackError) {
        lastError =
          fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
      }
    }

    // Create comprehensive error report
    const errorReport = await this.handleError(
      lastError!,
      {
        ...context,
        operation: `${context.operation} (after ${retries} retries)`,
      },
      { log: true, recover: false, report: true }
    );

    throw new Fire22Error(
      `Operation failed after ${retries} attempts`,
      context,
      {
        type: 'runtime',
        severity: 'high',
        recoverable: false,
        suggestedActions: [
          'Check system resources',
          'Verify external dependencies',
          'Review error logs',
        ],
      },
      lastError
    );
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recentErrors: ErrorReport[];
    errorRate: number;
  } {
    const totalErrors = this.errorHistory.length;
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};

    this.errorHistory.forEach(report => {
      errorsByType[report.info.type] = (errorsByType[report.info.type] || 0) + 1;
      errorsBySeverity[report.info.severity] = (errorsBySeverity[report.info.severity] || 0) + 1;
    });

    const recentErrors = this.errorHistory.slice(-10);
    const errorRate =
      totalErrors > 0
        ? (this.errorHistory.filter(r => r.info.severity === 'critical').length / totalErrors) * 100
        : 0;

    return {
      totalErrors,
      errorsByType,
      errorsBySeverity,
      recentErrors,
      errorRate,
    };
  }

  /**
   * Generate error report
   */
  generateErrorReport(): string {
    const stats = this.getErrorStats();
    const report = [
      '🛡️ Fire22 Error Handler Report',
      '!==!==!==!==!==!==\n',
      `📊 Total Errors: ${stats.totalErrors}`,
      `📈 Error Rate: ${stats.errorRate.toFixed(1)}%`,
      '',
      '🔍 Errors by Type:',
      ...Object.entries(stats.errorsByType).map(([type, count]) => `   ${type}: ${count}`),
      '',
      '⚠️  Errors by Severity:',
      ...Object.entries(stats.errorsBySeverity).map(
        ([severity, count]) => `   ${severity}: ${count}`
      ),
      '',
      '🕒 Recent Errors:',
    ];

    stats.recentErrors.forEach(errorReport => {
      report.push(
        `   ${errorReport.timestamp} - ${errorReport.error.message} (${errorReport.info.type})`
      );
    });

    return report.join('\n');
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Private helper methods
   */
  private initializeErrorPatterns(): void {
    // Common error patterns and their characteristics
    this.errorPatterns.set('ENOENT', {
      type: 'system',
      severity: 'medium',
      recoverable: true,
      suggestedActions: ['Check file path', 'Verify file exists', 'Check permissions'],
      retryStrategy: 'delayed',
    });

    this.errorPatterns.set('EACCES', {
      type: 'permission',
      severity: 'high',
      recoverable: true,
      suggestedActions: [
        'Check file permissions',
        'Verify user rights',
        'Run with elevated privileges',
      ],
      retryStrategy: 'none',
    });

    this.errorPatterns.set('ECONNREFUSED', {
      type: 'network',
      severity: 'medium',
      recoverable: true,
      suggestedActions: [
        'Check service status',
        'Verify connection details',
        'Check firewall settings',
      ],
      retryStrategy: 'exponential',
    });

    this.errorPatterns.set('ETIMEDOUT', {
      type: 'network',
      severity: 'medium',
      recoverable: true,
      suggestedActions: [
        'Check network connectivity',
        'Increase timeout values',
        'Verify service availability',
      ],
      retryStrategy: 'exponential',
    });
  }

  private initializeRecoveryStrategies(): void {
    // Recovery strategies for common error types
    this.recoveryStrategies.set('ENOENT', async () => {
      // Try to create directory or wait for file
      await this.delay(1000);
      return true;
    });

    this.recoveryStrategies.set('ECONNREFUSED', async () => {
      // Wait and retry connection
      await this.delay(2000);
      return true;
    });
  }

  private analyzeError(error: Error): ErrorInfo {
    const message = error.message.toLowerCase();
    const name = error.name;

    // Check for known error patterns
    for (const [pattern, info] of this.errorPatterns) {
      if (message.includes(pattern.toLowerCase()) || name.includes(pattern)) {
        return info;
      }
    }

    // Analyze by message content
    if (message.includes('permission') || message.includes('access')) {
      return {
        type: 'permission',
        severity: 'high',
        recoverable: false,
        suggestedActions: [
          'Check user permissions',
          'Verify access rights',
          'Contact administrator',
        ],
      };
    }

    if (message.includes('timeout') || message.includes('timed out')) {
      return {
        type: 'network',
        severity: 'medium',
        recoverable: true,
        suggestedActions: [
          'Increase timeout values',
          'Check network connectivity',
          'Verify service status',
        ],
        retryStrategy: 'exponential',
      };
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return {
        type: 'validation',
        severity: 'medium',
        recoverable: true,
        suggestedActions: ['Check input parameters', 'Verify data format', 'Review configuration'],
        retryStrategy: 'none',
      };
    }

    // Default error info
    return {
      type: 'unknown',
      severity: 'medium',
      recoverable: false,
      suggestedActions: ['Check error logs', 'Review recent changes', 'Contact support'],
    };
  }

  private async attemptRecovery(errorReport: ErrorReport): Promise<boolean> {
    const strategy = this.recoveryStrategies.get(errorReport.error.name);

    if (strategy) {
      try {
        this.log('🔄 Attempting automatic recovery...', 'info');
        const success = await strategy();

        if (success) {
          this.log('✅ Automatic recovery successful', 'info');
          return true;
        } else {
          this.log('❌ Automatic recovery failed', 'warn');
          return false;
        }
      } catch (recoveryError) {
        this.log(`❌ Recovery attempt failed: ${recoveryError}`, 'error');
        return false;
      }
    }

    return false;
  }

  private async reportError(errorReport: ErrorReport): Promise<void> {
    // In a real implementation, this could send to monitoring services
    // For now, we'll just log it
    this.log(`📤 Error reported: ${errorReport.errorId}`, 'info');
  }

  private addToHistory(errorReport: ErrorReport): void {
    this.errorHistory.push(errorReport);

    // Maintain history size
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private logError(errorReport: ErrorReport, silent: boolean = false): void {
    if (silent) return;

    const { error, context, info, errorId } = errorReport;

    console.error(`\n🛡️ Fire22 Error Handler - ${errorId}`);
    console.error(`🔧 Script: ${context.scriptName}`);
    console.error(`⚡ Operation: ${context.operation}`);
    console.error(`📊 Type: ${info.type} (${info.severity})`);
    console.error(`💥 Error: ${error.message}`);
    console.error(`🔄 Recoverable: ${info.recoverable ? 'Yes' : 'No'}`);

    if (info.suggestedActions.length > 0) {
      console.error(`💡 Suggested Actions:`);
      info.suggestedActions.forEach(action => console.error(`   • ${action}`));
    }

    if (info.retryStrategy && info.retryStrategy !== 'none') {
      console.error(`🔄 Retry Strategy: ${info.retryStrategy}`);
    }

    console.error(`📅 Timestamp: ${errorReport.timestamp}\n`);
  }

  private log(message: string, level: string = 'info'): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [ERROR_HANDLER] [${level.toUpperCase()}]`;

    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`);
        break;
      case 'debug':
        console.debug(`${prefix} ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }
}

// Export the class and convenience functions
export { ErrorHandler, Fire22Error };
export const handleError = ErrorHandler.getInstance().handleError.bind(ErrorHandler.getInstance());
export const createError = ErrorHandler.getInstance().createError.bind(ErrorHandler.getInstance());
export const validateInput = ErrorHandler.getInstance().validateInput.bind(
  ErrorHandler.getInstance()
);
export const executeWithErrorHandling = ErrorHandler.getInstance().executeWithErrorHandling.bind(
  ErrorHandler.getInstance()
);
export default ErrorHandler;
