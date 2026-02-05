/**
 * Error handling utilities
 * 
 * Provides consistent error handling patterns with context wrapping,
 * error recovery strategies, and structured logging
 */

import { getLogger } from "./logger.js";

const logger = getLogger();

/**
 * Error context for better debugging
 */
export interface ErrorContext {
  operation?: string;
  input?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp?: number;
  userId?: string;
  requestId?: string;
}

/**
 * Enhanced error with context
 */
export class ContextualError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error,
    public readonly context?: ErrorContext
  ) {
    super(message);
    this.name = "ContextualError";
    
    // Preserve original error stack if available
    if (originalError?.stack) {
      this.stack = originalError.stack;
    }
  }

  /**
   * Get full error details for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      originalError: this.originalError
        ? {
            name: this.originalError.name,
            message: this.originalError.message,
            stack: this.originalError.stack,
          }
        : undefined,
      context: this.context,
    };
  }
}

/**
 * Wrap error with context for better debugging
 */
export function wrapError(
  error: unknown,
  message: string,
  context?: ErrorContext
): ContextualError {
  const originalError =
    error instanceof Error ? error : new Error(String(error));

  return new ContextualError(message, originalError, {
    timestamp: Date.now(),
    ...context,
  });
}

/**
 * Handle error with logging and optional recovery
 */
export function handleError(
  error: unknown,
  context?: ErrorContext,
  options?: {
    logLevel?: "error" | "warn" | "debug";
    recover?: () => void;
    throw?: boolean;
  }
): void {
  const wrappedError = wrapError(
    error,
    error instanceof Error ? error.message : String(error),
    context
  );

  const logLevel = options?.logLevel || "error";
  const errorDetails = {
    error: wrappedError.toJSON(),
    context: wrappedError.context,
  };

  switch (logLevel) {
    case "error":
      logger.error(context?.operation || "Operation failed", wrappedError.originalError || wrappedError, errorDetails);
      break;
    case "warn":
      logger.warn(context?.operation || "Operation warning", errorDetails);
      break;
    case "debug":
      logger.debug(context?.operation || "Operation debug", errorDetails);
      break;
  }

  // Attempt recovery if provided
  if (options?.recover) {
    try {
      options.recover();
      logger.debug("Error recovery executed", { context: wrappedError.context });
    } catch (recoveryError) {
      logger.error(
        "Error recovery failed",
        recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError)),
        { originalError: wrappedError.toJSON() }
      );
    }
  }

  // Re-throw if requested
  if (options?.throw !== false) {
    throw wrappedError;
  }
}

/**
 * Safe async operation wrapper with error handling
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context?: ErrorContext,
  defaultValue?: T
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    handleError(error, context, {
      logLevel: "error",
      throw: false,
      recover: defaultValue
        ? () => {
            logger.debug("Using default value after error", { context });
          }
        : undefined,
    });

    return defaultValue;
  }
}

/**
 * Safe sync operation wrapper with error handling
 */
export function safeSync<T>(
  operation: () => T,
  context?: ErrorContext,
  defaultValue?: T
): T | undefined {
  try {
    return operation();
  } catch (error) {
    handleError(error, context, {
      logLevel: "error",
      throw: false,
      recover: defaultValue
        ? () => {
            logger.debug("Using default value after error", { context });
          }
        : undefined,
    });

    return defaultValue;
  }
}

/**
 * Retry operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options?: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    context?: ErrorContext;
  }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const initialDelay = options?.initialDelay ?? 1000;
  const maxDelay = options?.maxDelay ?? 10000;
  const context = options?.context;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = Math.min(
          initialDelay * Math.pow(2, attempt),
          maxDelay
        );

        logger.warn("Operation failed, retrying", {
          attempt: attempt + 1,
          maxRetries,
          delay,
          error: lastError.message,
          context,
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted
  handleError(lastError!, context, {
    logLevel: "error",
    throw: true,
  });

  throw lastError!;
}

/**
 * Check if error is a specific custom error type
 */
export function isErrorType<T extends Error>(
  error: unknown,
  errorClass: new (...args: unknown[]) => T
): error is T {
  return error instanceof errorClass;
}

/**
 * Extract error message safely
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error);
}

/**
 * Extract error stack safely
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}

/**
 * Create error context helper
 */
export function createErrorContext(
  operation: string,
  metadata?: Record<string, unknown>
): ErrorContext {
  return {
    operation,
    metadata,
    timestamp: Date.now(),
  };
}

