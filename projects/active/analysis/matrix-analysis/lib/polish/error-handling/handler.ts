// lib/polish/error-handling/handler.ts - Enhanced Error Handler
// ═══════════════════════════════════════════════════════════════════════════════
// Returns null instead of throwing (per CLAUDE.md conventions)

import { Runtime, colors } from "../core/runtime.ts";
import { logger, Logger } from "../core/logger.ts";
import type { ErrorContext, ErrorSeverity, PolishConfig } from "../types.ts";
import { ERROR_CODES, type ErrorCode, getErrorDefinition } from "./codes.ts";
import { attemptRecovery, suggestSolutions, getQuickActions } from "./recovery.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Enhanced Error Handler
// ─────────────────────────────────────────────────────────────────────────────

export interface ErrorHandlerOptions {
  silent?: boolean;
  autoRecover?: boolean;
  showSolutions?: boolean;
  logToFile?: boolean;
  onError?: (error: Error, context: ErrorContext) => void;
}

export class EnhancedErrorHandler {
  private options: ErrorHandlerOptions;
  private logger: Logger;
  private errorLog: Array<{ error: Error; context: ErrorContext }> = [];

  constructor(options: ErrorHandlerOptions = {}) {
    this.options = {
      silent: false,
      autoRecover: true,
      showSolutions: true,
      logToFile: false,
      ...options,
    };
    this.logger = new Logger({ prefix: "Error" });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Core Handlers (Return null, don't throw)
  // ─────────────────────────────────────────────────────────────────────────

  handle<T>(operation: () => T, fallback: T, operationName = "operation"): T {
    try {
      return operation();
    } catch (error) {
      this.processError(error, operationName);
      return fallback;
    }
  }

  async handleAsync<T>(
    operation: () => Promise<T>,
    fallback: T,
    operationName = "async operation"
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      await this.processErrorAsync(error, operationName);
      return fallback;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Wrap Functions for Error Handling
  // ─────────────────────────────────────────────────────────────────────────

  wrap<T extends (...args: unknown[]) => unknown>(
    fn: T,
    fallback: ReturnType<T>,
    name?: string
  ): T {
    const handler = this;
    const fnName = name ?? fn.name ?? "anonymous";

    return function (this: unknown, ...args: Parameters<T>): ReturnType<T> {
      return handler.handle(() => fn.apply(this, args), fallback, fnName);
    } as T;
  }

  wrapAsync<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    fallback: Awaited<ReturnType<T>>,
    name?: string
  ): T {
    const handler = this;
    const fnName = name ?? fn.name ?? "anonymous";

    return async function (
      this: unknown,
      ...args: Parameters<T>
    ): Promise<Awaited<ReturnType<T>>> {
      return handler.handleAsync(() => fn.apply(this, args), fallback, fnName);
    } as T;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Error Processing
  // ─────────────────────────────────────────────────────────────────────────

  private processError(error: unknown, operation: string): void {
    const err = this.normalizeError(error);
    const context = this.createContext(operation, err);

    this.logError(err, context);
    this.options.onError?.(err, context);
  }

  private async processErrorAsync(error: unknown, operation: string): Promise<void> {
    const err = this.normalizeError(error);
    const context = this.createContext(operation, err);

    this.logError(err, context);

    // Attempt recovery if enabled
    if (this.options.autoRecover) {
      const result = await attemptRecovery(err, context);
      if (result.recovered) {
        this.logger.success(`Recovered: ${result.message}`);
      }
    }

    this.options.onError?.(err, context);
  }

  private normalizeError(error: unknown): Error {
    if (error instanceof Error) return error;
    return new Error(String(error));
  }

  private createContext(operation: string, error: Error): ErrorContext {
    return {
      operation,
      timestamp: new Date(),
      stack: error.stack,
      details: {},
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Error Logging & Display
  // ─────────────────────────────────────────────────────────────────────────

  private logError(error: Error, context: ErrorContext): void {
    this.errorLog.push({ error, context });

    if (this.options.silent) return;

    // Determine severity from error message
    const severity = this.detectSeverity(error);

    // Display error
    this.displayError(error, context, severity);

    // Show solutions if enabled
    if (this.options.showSolutions) {
      const solutions = suggestSolutions(error, context);
      if (solutions.length > 0) {
        this.displaySolutions(solutions);
      }
    }
  }

  private detectSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();

    if (message.includes("critical") || message.includes("fatal")) return "critical";
    if (message.includes("warning")) return "warning";
    if (message.includes("info")) return "info";

    // Check against error codes
    for (const def of Object.values(ERROR_CODES)) {
      if (message.includes(def.message.toLowerCase())) {
        return def.severity;
      }
    }

    return "error";
  }

  private displayError(error: Error, context: ErrorContext, severity: ErrorSeverity): void {
    const icon = severity === "critical" ? "⚡" : severity === "warning" ? "⚠" : "✗";
    const colorFn =
      severity === "critical" || severity === "error" ? colors.error : colors.warning;

    console.info();
    console.info(colorFn(`${icon} ${severity.toUpperCase()}: ${error.message}`));
    console.info(colors.dim(`  in ${context.operation}`));

    if (context.stack && severity === "critical") {
      const stackLines = context.stack.split("\n").slice(1, 4);
      for (const line of stackLines) {
        console.info(colors.dim(`  ${line.trim()}`));
      }
    }
  }

  private displaySolutions(solutions: string[]): void {
    console.info();
    console.info(colors.info("💡 Suggestions:"));
    for (const solution of solutions.slice(0, 3)) {
      console.info(colors.dim(`   → ${solution}`));
    }
    console.info();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Error Code Helpers
  // ─────────────────────────────────────────────────────────────────────────

  reportCode(code: ErrorCode, additionalMessage?: string): void {
    const def = getErrorDefinition(code);
    const error = new Error(
      additionalMessage ? `${def.message}: ${additionalMessage}` : def.message
    );
    this.processError(error, code);
  }

  async reportCodeAsync(code: ErrorCode, additionalMessage?: string): Promise<void> {
    const def = getErrorDefinition(code);
    const error = new Error(
      additionalMessage ? `${def.message}: ${additionalMessage}` : def.message
    );
    await this.processErrorAsync(error, code);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Error Log Access
  // ─────────────────────────────────────────────────────────────────────────

  getErrorLog(): Array<{ error: Error; context: ErrorContext }> {
    return [...this.errorLog];
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }

  getRecentErrors(count = 5): Array<{ error: Error; context: ErrorContext }> {
    return this.errorLog.slice(-count);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Instance
// ─────────────────────────────────────────────────────────────────────────────

export const errorHandler = new EnhancedErrorHandler();

// ─────────────────────────────────────────────────────────────────────────────
// Convenience Functions
// ─────────────────────────────────────────────────────────────────────────────

export function handleError<T>(
  operation: () => T,
  fallback: T,
  name?: string
): T {
  return errorHandler.handle(operation, fallback, name);
}

export async function handleErrorAsync<T>(
  operation: () => Promise<T>,
  fallback: T,
  name?: string
): Promise<T> {
  return errorHandler.handleAsync(operation, fallback, name);
}

// ─────────────────────────────────────────────────────────────────────────────
// User-Friendly Error Messages
// ─────────────────────────────────────────────────────────────────────────────

export function formatUserError(error: Error, context?: string): string {
  const message = error.message;

  // Clean up technical jargon for user display
  let friendly = message
    .replace(/ENOENT/gi, "File not found")
    .replace(/EACCES/gi, "Permission denied")
    .replace(/ETIMEDOUT/gi, "Request timed out")
    .replace(/ECONNREFUSED/gi, "Connection refused")
    .replace(/Cannot read propert(y|ies).*of (undefined|null)/gi, "Data unavailable");

  if (context) {
    friendly = `${context}: ${friendly}`;
  }

  return friendly;
}
