/**
 * Structured Error Handling for Dev HQ CLI
 * Provides centralized error handling with theme support
 */

import { inspect } from "bun";

// Theme colors
export const theme = {
  error: "\x1b[31m",
  warning: "\x1b[33m",
  info: "\x1b[36m",
  success: "\x1b[32m",
  reset: "\x1b[0m",
};

// Error codes
export const ErrorCodes = {
  ENOENT: "ENOENT",
  EACCES: "EACCES",
  EEXIST: "EEXIST",
  NETWORK: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  UNKNOWN: "UNKNOWN_ERROR",
} as const;

// Error handler options
interface BunErrorHandlerOptions {
  onBunError?: (error: Error) => void;
  onCommandError?: (error: Error) => void;
  debug?: boolean;
}

/**
 * Set up global Bun error handler
 */
export function setBunErrorHandler(options: BunErrorHandlerOptions = {}): void {
  const { onBunError, onCommandError, debug = false } = options;

  // Handle uncaught errors
  process.on("uncaughtException", (error: Error) => {
    console.error(`${theme.error}🚨 Uncaught Exception:${theme.reset}`);
    console.error(error.message);

    if (debug || process.env.DEV_HQ_DEBUG) {
      console.error(inspect(error, { depth: 3, colors: true }));
    }

    onBunError?.(error);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    console.error(`${theme.error}🚨 Unhandled Rejection:${theme.reset}`);
    console.error(error.message);

    if (debug || process.env.DEV_HQ_DEBUG) {
      console.error(inspect(error, { depth: 3, colors: true }));
    }

    onCommandError?.(error);
    process.exit(1);
  });
}

/**
 * Command-specific error recovery
 */
export function handleCommandError(error: Error & { code?: string }): void {
  switch (error.code) {
    case ErrorCodes.ENOENT:
      console.info(`${theme.warning}⚠️  Project not initialized${theme.reset}`);
      console.info(`${theme.info}Run: dev-hq init${theme.reset}`);
      break;

    case ErrorCodes.EACCES:
      console.info(`${theme.error}❌ Permission denied${theme.reset}`);
      console.info(`${theme.info}Try running with elevated privileges${theme.reset}`);
      break;

    case ErrorCodes.EEXIST:
      console.info(`${theme.warning}⚠️  File or directory already exists${theme.reset}`);
      break;

    default:
      console.info(`${theme.error}❌ Error: ${error.message}${theme.reset}`);
      break;
  }

  if (process.env.DEV_HQ_DEBUG) {
    console.error(inspect(error, { depth: 3, colors: true }));
  }
}

/**
 * Wrap async functions with error handling
 */
export function withErrorHandling<T>(
  fn: () => Promise<T>,
  onError?: (error: Error) => void
): Promise<T> {
  return fn().catch((error: Error) => {
    handleCommandError(error);
    onError?.(error);
    process.exit(1);
  });
}

/**
 * Create a recoverable error
 */
export class RecoverableError extends Error {
  constructor(
    message: string,
    public recovery: string,
    public exitCode = 1
  ) {
    super(message);
    this.name = "RecoverableError";
  }

  display(): void {
    console.info(`${theme.warning}⚠️  ${this.message}${theme.reset}`);
    console.info(`${theme.info}${this.recovery}${theme.reset}`);
  }
}
