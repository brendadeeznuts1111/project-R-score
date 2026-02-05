// fantasy42-fire22-registry/src/polish-integration.ts - Polish System Integration
// ═══════════════════════════════════════════════════════════════════════════════
// Extends existing error handling with polish features

import { ApplicationError, handleApplicationError } from "./errors.ts";
import {
  SystemPolish,
  EnhancedErrorHandler,
  LoadingSpinner,
  withSpinner,
  colors,
  logger,
  feedback,
  type ErrorContext,
} from "../../lib/polish/index.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Enhanced Error Handler (Extends existing pattern)
// ─────────────────────────────────────────────────────────────────────────────

export class PolishedErrorHandler extends EnhancedErrorHandler {
  handleApplicationError(error: Error): void {
    if (error instanceof ApplicationError) {
      const context: ErrorContext = {
        operation: error.code,
        timestamp: new Date(),
        stack: error.stack,
        details: {
          isOperational: error.isOperational,
        },
      };

      // Show polished error message
      console.log();
      console.log(colors.error(`${error.name}: ${error.message}`));

      // Show solutions based on error code
      const solutions = this.getSolutionsForCode(error.code);
      if (solutions.length > 0) {
        console.log();
        console.log(colors.info("Possible solutions:"));
        solutions.forEach(s => console.log(colors.dim(`  ${s}`)));
      }
      console.log();

      // Trigger error feedback
      feedback.error().catch(() => null);
    } else {
      // Use base handler for unknown errors
      this.handle(() => { throw error; }, undefined, "unknown");
    }
  }

  private getSolutionsForCode(code: string): string[] {
    const solutions: Record<string, string[]> = {
      CONFIGURATION_ERROR: [
        "Check your bunfig.toml configuration",
        "Verify environment variables are set",
        "Run: bun run registry:fix",
      ],
      DATABASE_ERROR: [
        "Ensure database is initialized: bun run db:init",
        "Check database file permissions",
        "Run: bun run db:health",
      ],
      SERVICE_INITIALIZATION_ERROR: [
        "Check service dependencies are installed",
        "Verify required ports are available",
        "Review service configuration",
      ],
      VALIDATION_ERROR: [
        "Check input data format",
        "Review validation rules",
        "See API documentation for expected formats",
      ],
    };

    return solutions[code] || [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Safe Execution with Polish
// ─────────────────────────────────────────────────────────────────────────────

const polishedHandler = new PolishedErrorHandler();

export async function safeExecutePolished<T>(
  operation: () => Promise<T>,
  operationName: string,
  showSpinner = true
): Promise<T | null> {
  if (showSpinner) {
    return withSpinner(operationName, async () => {
      try {
        return await operation();
      } catch (error) {
        polishedHandler.handleApplicationError(error as Error);
        return null as T;
      }
    });
  }

  try {
    return await operation();
  } catch (error) {
    polishedHandler.handleApplicationError(error as Error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Registry Operations with Polish
// ─────────────────────────────────────────────────────────────────────────────

export async function registryOperation<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T | null> {
  const spinner = new LoadingSpinner();
  spinner.start(`${name}...`);

  try {
    const result = await operation();
    spinner.succeed(name);
    await feedback.success();
    return result;
  } catch (error) {
    spinner.fail(name);
    polishedHandler.handleApplicationError(error as Error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI Entry Point Enhancement
// ─────────────────────────────────────────────────────────────────────────────

export async function polishedMain(
  main: () => Promise<void>
): Promise<void> {
  try {
    await main();
    await feedback.success();
  } catch (error) {
    polishedHandler.handleApplicationError(error as Error);
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Operations with Polish
// ─────────────────────────────────────────────────────────────────────────────

export async function polishedDbOperation<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T | null> {
  return registryOperation(`Database: ${name}`, operation);
}

// ─────────────────────────────────────────────────────────────────────────────
// Export enhanced handlers
// ─────────────────────────────────────────────────────────────────────────────

export { polishedHandler };

export const polishHandlers = {
  error: polishedHandler,
  safeExecute: safeExecutePolished,
  registryOp: registryOperation,
  dbOp: polishedDbOperation,
  main: polishedMain,
};
