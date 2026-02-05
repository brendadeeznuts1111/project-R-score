/**
 * Enterprise Error Classes - Proper Error Handling
 *
 * Replace process.exit() with proper error throwing for better
 * testability, error propagation, and resource cleanup.
 */

export class ApplicationError extends Error {
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, code: string = 'APPLICATION_ERROR', isOperational: boolean = true) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ConfigurationError extends ApplicationError {
  constructor(message: string, details?: string[]) {
    super(
      `Configuration Error: ${message}${details ? '\n' + details.map(d => `  - ${d}`).join('\n') : ''}`,
      'CONFIGURATION_ERROR'
    );
    this.name = 'ConfigurationError';
  }
}

export class DatabaseError extends ApplicationError {
  constructor(message: string, originalError?: Error) {
    super(
      `Database Error: ${message}${originalError ? ` (${originalError.message})` : ''}`,
      'DATABASE_ERROR'
    );
    this.name = 'DatabaseError';

    if (originalError) {
      this.cause = originalError;
    }
  }
}

export class ServiceInitializationError extends ApplicationError {
  constructor(serviceName: string, message: string, originalError?: Error) {
    super(
      `Service Initialization Error [${serviceName}]: ${message}${originalError ? ` (${originalError.message})` : ''}`,
      'SERVICE_INITIALIZATION_ERROR'
    );
    this.name = 'ServiceInitializationError';

    if (originalError) {
      this.cause = originalError;
    }
  }
}

export class ValidationError extends ApplicationError {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(`Validation Error${field ? ` (${field})` : ''}: ${message}`, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Error handler for graceful error handling in CLI applications
 */
export function handleApplicationError(error: Error): never {
  if (error instanceof ApplicationError) {
    console.error(`❌ ${error.name}: ${error.message}`);

    // Operational errors get exit code 1
    if (error.isOperational) {
      process.exit(1);
    } else {
      // Programming errors get exit code 2
      process.exit(2);
    }
  } else {
    // Unknown errors
    console.error(`💥 Unexpected Error: ${error.message}`);
    console.error(error.stack);
    process.exit(2);
  }
}

/**
 * Safe execution wrapper for CLI applications
 */
export async function safeExecute<T>(
  operation: () => Promise<T>,
  errorHandler: (error: Error) => never = handleApplicationError
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    errorHandler(error as Error);
  }
}
