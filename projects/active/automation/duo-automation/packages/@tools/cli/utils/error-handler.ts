/**
 * packages/cli/utils/error-handler.ts
 * Enterprise-grade error handling with recovery strategies and suggestions
 * Follows .clinerules error hierarchy and TypeScript compliance
 */

import { CLIError, ValidationError, ConfigError, SecretsError, PlatformError, TimeoutError, ErrorCode, ErrorSuggestions } from '../types/errors';
import type { Logger } from './logger';

export interface ErrorContext {
  component?: string;
  operation?: string;
  platform?: string;
  timestamp?: Date;
  recoveryAttempted?: boolean;
}

export interface ErrorHandlerConfig {
  logger?: Logger;
  exitOnFatal?: boolean;
  retryConfig?: {
    maxAttempts: number;
    initialDelayMs: number;
    backoffMultiplier: number;
  };
}

/**
 * ErrorHandler - Centralized error management with recovery strategies
 * Compliant with .clinerules error handling standards
 */
export class ErrorHandler {
  private logger?: Logger;
  private exitOnFatal: boolean;
  private retryConfig: Required<ErrorHandlerConfig['retryConfig']>;

  constructor(config: ErrorHandlerConfig = {}) {
    this.logger = config.logger;
    this.exitOnFatal = config.exitOnFatal ?? true;
    this.retryConfig = config.retryConfig ?? {
      maxAttempts: 3,
      initialDelayMs: 100,
      backoffMultiplier: 2
    };
  }

  /**
   * Handle and format any error with recovery suggestions
   */
  handle(error: unknown, context: ErrorContext = {}): CLIError {
    const cliError = this.normalizeToCLIError(error, context);
    this.logError(cliError);
    
    if (this.shouldExitFatal(cliError)) {
      process.exit(1);
    }
    
    return cliError;
  }

  /**
   * Execute operation with automatic retry on transient failures
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext = {}
  ): Promise<T> {
    let lastError: unknown;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        const isTransient = this.isTransientError(error);
        if (!isTransient || attempt === this.retryConfig.maxAttempts) {
          throw error;
        }
        
        const delayMs = this.retryConfig.initialDelayMs * 
          Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
        
        this.logger?.warn(
          `Transient error on attempt ${attempt}/${this.retryConfig.maxAttempts}, retrying in ${delayMs}ms`,
          { error, context }
        );
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    throw lastError;
  }

  /**
   * Normalize any error to CLIError with proper context
   */
  private normalizeToCLIError(error: unknown, context: ErrorContext): CLIError {
    if (error instanceof CLIError) {
      return error;
    }

    if (error instanceof ValidationError) {
      return new CLIError(
        error.message,
        ErrorCode.ValidationFailed,
        context,
        error.getContext()
      );
    }

    if (error instanceof ConfigError) {
      return new CLIError(
        error.message,
        ErrorCode.ConfigInvalid,
        context,
        error.getContext()
      );
    }

    if (error instanceof SecretsError) {
      return new CLIError(
        error.message,
        ErrorCode.SecretsAccessDenied,
        context,
        error.getContext()
      );
    }

    if (error instanceof PlatformError) {
      return new CLIError(
        error.message,
        ErrorCode.PlatformUnsupported,
        context,
        error.getContext()
      );
    }

    if (error instanceof TimeoutError) {
      return new CLIError(
        error.message,
        ErrorCode.OperationTimeout,
        context,
        error.getContext()
      );
    }

    if (error instanceof Error) {
      return new CLIError(
        error.message,
        ErrorCode.InternalError,
        { ...context, originalError: error.name }
      );
    }

    return new CLIError(
      'Unknown error occurred',
      ErrorCode.InternalError,
      { ...context, originalError: String(error) }
    );
  }

  /**
   * Log error with appropriate level and formatting
   */
  private logError(error: CLIError): void {
    if (!this.logger) return;

    const suggestions = ErrorSuggestions[error.code];
    const message = `[${error.code}] ${error.message}`;

    if (this.isTransientError(error)) {
      this.logger.warn(message, error.context);
    } else if (this.isFatalError(error)) {
      this.logger.error(message, error.context);
    } else {
      this.logger.info(message, error.context);
    }

    if (suggestions) {
      this.logger.info(`💡 Suggestions: ${suggestions.join(', ')}`);
    }

    if (error.context) {
      this.logger.debug('Error Context:', error.context);
    }
  }

  /**
   * Determine if error should cause process exit
   */
  private shouldExitFatal(error: CLIError): boolean {
    if (!this.exitOnFatal) return false;
    return this.isFatalError(error);
  }

  /**
   * Check if error is fatal (non-recoverable)
   */
  private isFatalError(error: CLIError): boolean {
    const fatalCodes: ErrorCode[] = [
      ErrorCode.ConfigInvalid,
      ErrorCode.PlatformUnsupported,
      ErrorCode.SecretsAccessDenied
    ];
    return fatalCodes.includes(error.code);
  }

  /**
   * Check if error is transient (might succeed on retry)
   */
  private isTransientError(error: unknown): boolean {
    if (error instanceof TimeoutError) return true;
    
    if (error instanceof CLIError) {
      const transientCodes: ErrorCode[] = [
        ErrorCode.OperationTimeout,
        ErrorCode.NetworkError
      ];
      return transientCodes.includes(error.code);
    }

    if (error instanceof Error) {
      const transientPatterns = [
        /ECONNREFUSED/,
        /ENOTFOUND/,
        /timeout/i,
        /ETIMEDOUT/
      ];
      return transientPatterns.some(p => p.test(error.message));
    }

    return false;
  }

  /**
   * Format error for user-friendly CLI display
   */
  formatForDisplay(error: CLIError): string {
    const lines = [
      `❌ ${error.message}`,
      `   Code: ${error.code}`
    ];

    const suggestions = ErrorSuggestions[error.code];
    if (suggestions && suggestions.length > 0) {
      lines.push(`   💡 Try: ${suggestions[0]}`);
    }

    return lines.join('\n');
  }

  /**
   * Extract structured error information for logging/reporting
   */
  getErrorReport(error: CLIError): Record<string, unknown> {
    return {
      code: error.code,
      message: error.message,
      context: error.context,
      suggestions: ErrorSuggestions[error.code],
      timestamp: context.timestamp || new Date().toISOString(),
      stack: error.stack
    };
  }
}

/**
 * Global error handler instance
 */
let globalErrorHandler: ErrorHandler;

export function getGlobalErrorHandler(): ErrorHandler {
  if (!globalErrorHandler) {
    globalErrorHandler = new ErrorHandler();
  }
  return globalErrorHandler;
}

export function setGlobalErrorHandler(handler: ErrorHandler): void {
  globalErrorHandler = handler;
}

export function resetGlobalErrorHandler(): void {
  globalErrorHandler = new ErrorHandler();
}