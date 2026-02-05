import { logger } from './logger';

export interface ErrorContext {
  module?: string;
  function?: string;
  operation?: string;
  userId?: string;
  requestId?: string;
  [key: string]: any;
}

export interface StandardizedError {
  message: string;
  code?: string;
  statusCode?: number;
  context?: ErrorContext;
  timestamp: string;
  originalError?: Error | unknown;
}

/**
 * Standard error handler with consistent formatting
 */
export class ErrorHandler {
  private static readonly DEFAULT_MODULE = 'unknown';

  /**
   * Handle error with consistent formatting and logging
   */
  static handle(
    error: Error | unknown,
    context: ErrorContext = {},
    options: {
      logLevel?: 'error' | 'warn' | 'info';
      rethrow?: boolean;
      fallbackMessage?: string;
    } = {}
  ): StandardizedError {
    const {
      logLevel = 'error',
      rethrow = false,
      fallbackMessage = 'An unexpected error occurred'
    } = options;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    
    const standardizedError: StandardizedError = {
      message: errorMessage || fallbackMessage,
      code: errorName,
      context: {
        module: this.DEFAULT_MODULE,
        ...context
      },
      timestamp: new Date().toISOString(),
      originalError: error
    };

    // Log the error with consistent format
    const logMessage = `${errorMessage || fallbackMessage}`;
    const logContext = {
      module: standardizedError.context?.module,
      function: standardizedError.context?.function,
      operation: standardizedError.context?.operation,
      requestId: standardizedError.context?.requestId,
      userId: standardizedError.context?.userId,
      error: originalError
    };

    switch (logLevel) {
      case 'warn':
        logger.warn(logMessage, logContext);
        break;
      case 'info':
        logger.info(logMessage, logContext);
        break;
      case 'error':
      default:
        logger.error(logMessage, logContext);
        break;
    }

    if (rethrow) {
      throw error;
    }

    return standardizedError;
  }

  /**
   * Create a standardized error response for APIs
   */
  static createErrorResponse(
    error: StandardizedError,
    statusCode: number = 500
  ): {
    error: {
      message: string;
      code?: string;
      timestamp: string;
      requestId?: string;
    };
    status: number;
  } {
    return {
      error: {
        message: error.message,
        code: error.code,
        timestamp: error.timestamp,
        requestId: error.context?.requestId
      },
      status: statusCode
    };
  }

  /**
   * Safely execute a function with error handling
   */
  static async safeExecute<T>(
    fn: () => Promise<T> | T,
    context: ErrorContext = {},
    options: {
      fallbackValue?: T;
      logLevel?: 'error' | 'warn' | 'info';
    } = {}
  ): Promise<{ success: true; data: T } | { success: false; error: StandardizedError }> {
    try {
      const data = await fn();
      return { success: true, data };
    } catch (error) {
      const standardizedError = this.handle(error, context, {
        logLevel: options.logLevel || 'error',
        rethrow: false
      });
      return { success: false, error: standardizedError };
    }
  }
}

/**
 * Convenience function for error handling
 */
export function handleError(
  error: Error | unknown,
  context: ErrorContext = {},
  options?: {
    logLevel?: 'error' | 'warn' | 'info';
    rethrow?: boolean;
    fallbackMessage?: string;
  }
): StandardizedError {
  return ErrorHandler.handle(error, context, options);
}

/**
 * Convenience function for safe execution
 */
export async function safeExecute<T>(
  fn: () => Promise<T> | T,
  context: ErrorContext = {},
  options?: {
    fallbackValue?: T;
    logLevel?: 'error' | 'warn' | 'info';
  }
): Promise<{ success: true; data: T } | { success: false; error: StandardizedError }> {
  return ErrorHandler.safeExecute(fn, context, options);
}
