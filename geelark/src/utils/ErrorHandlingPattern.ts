/**
 * Standardized Error Handling Pattern for Geelark
 * Provides consistent error handling across Logger, MemoryManager, and other modules
 * 
 * Pattern: Always throw descriptive errors + provide structured error data
 * Fallback: Errors are caught and logged at entry points (index.ts, CLI.ts, main.ts)
 */

import { Logger } from "../Logger";

export interface ErrorResult<T = any> {
  success: boolean;
  error?: Error | string;
  data?: T;
  code?: string;
  context?: Record<string, any>;
}

export class ErrorHandler {
  /**
   * Standardized error throwing with context
   * @param message - Error message
   * @param code - Error code for categorization
   * @param context - Additional context data
   */
  static throw(message: string, code: string = "UNKNOWN_ERROR", context?: Record<string, any>): never {
    const error = new Error(message);
    (error as any).code = code;
    (error as any).context = context;
    throw error;
  }

  /**
   * Wrap async operation with error handling
   * Returns ErrorResult instead of throwing
   */
  static async tryAsync<T>(
    operation: () => Promise<T>,
    operationName: string,
    logger?: Logger
  ): Promise<ErrorResult<T>> {
    try {
      const data = await operation();
      return { success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code = (error as any)?.code || "ASYNC_OPERATION_FAILED";
      const context = (error as any)?.context || { operation: operationName };

      // Log error if logger provided
      if (logger) {
        await logger.error(`${operationName} failed: ${message}`, { code, context });
      } else {
        console.error(`[${operationName}] ${message}`);
      }

      return {
        success: false,
        error: message,
        code,
        context,
      };
    }
  }

  /**
   * Wrap sync operation with error handling
   * Returns ErrorResult instead of throwing
   */
  static trySync<T>(
    operation: () => T,
    operationName: string,
    logger?: Logger
  ): ErrorResult<T> {
    try {
      const data = operation();
      return { success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code = (error as any)?.code || "SYNC_OPERATION_FAILED";
      const context = (error as any)?.context || { operation: operationName };

      // Log error if logger provided
      if (logger) {
        logger.error(`${operationName} failed: ${message}`, { code, context }).catch(() => {
          console.error(`[${operationName}] ${message}`);
        });
      } else {
        console.error(`[${operationName}] ${message}`);
      }

      return {
        success: false,
        error: message,
        code,
        context,
      };
    }
  }

  /**
   * Format error for display
   */
  static format(error: Error | string): string {
    if (typeof error === "string") {
      return error;
    }
    return `${error.name}: ${error.message}${(error as any).code ? ` [${(error as any).code}]` : ""}`;
  }

  /**
   * Check if error is of specific type
   */
  static isCode(error: any, code: string): boolean {
    return error?.code === code || (error as Error)?.message?.includes(code);
  }
}

/**
 * Standard error codes used throughout the codebase
 */
export const ERROR_CODES = {
  // Logger errors
  LOG_SERVICE_ERROR: "LOG_SERVICE_ERROR",
  LOG_BUFFER_FULL: "LOG_BUFFER_FULL",
  INVALID_LOG_TYPE: "INVALID_LOG_TYPE",

  // Memory errors
  MEMORY_THRESHOLD_EXCEEDED: "MEMORY_THRESHOLD_EXCEEDED",
  RESOURCE_CLEANUP_FAILED: "RESOURCE_CLEANUP_FAILED",
  INVALID_RESOURCE_ID: "INVALID_RESOURCE_ID",

  // Validation errors
  VALIDATION_FAILED: "VALIDATION_FAILED",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",

  // Command errors
  COMMAND_NOT_FOUND: "COMMAND_NOT_FOUND",
  COMMAND_EXECUTION_FAILED: "COMMAND_EXECUTION_FAILED",
  INVALID_COMMAND_ARGS: "INVALID_COMMAND_ARGS",

  // Generic errors
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
  OPERATION_TIMEOUT: "OPERATION_TIMEOUT",
  OPERATION_CANCELLED: "OPERATION_CANCELLED",
} as const;
