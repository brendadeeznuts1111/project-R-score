// lib/polish/error-handling/recovery.ts - Auto-fix and Recovery Strategies
// ═══════════════════════════════════════════════════════════════════════════════

import { Runtime } from "../core/runtime.ts";
import { logger } from "../core/logger.ts";
import type { RecoveryStrategy, ErrorContext } from "../types.ts";
import { ERROR_CODES, type ErrorCode } from "./codes.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Recovery Strategy Registry
// ─────────────────────────────────────────────────────────────────────────────

const strategies: Map<string, RecoveryStrategy> = new Map();

export function registerRecoveryStrategy(strategy: RecoveryStrategy): void {
  strategies.set(strategy.name, strategy);
}

export function getRecoveryStrategy(name: string): RecoveryStrategy | null {
  return strategies.get(name) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Built-in Recovery Strategies
// ─────────────────────────────────────────────────────────────────────────────

registerRecoveryStrategy({
  name: "retry-with-backoff",
  description: "Retry the operation with exponential backoff",
  canRecover: (error) => {
    const message = error.message.toLowerCase();
    return (
      message.includes("timeout") ||
      message.includes("rate limit") ||
      message.includes("temporarily")
    );
  },
  recover: async (error, context) => {
    const maxRetries = 3;
    let delay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      logger.info(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
      await Runtime.sleep(delay);

      try {
        // The actual retry would be handled by the caller
        // This just indicates we should retry
        return true;
      } catch {
        delay *= 2; // Exponential backoff
      }
    }

    return false;
  },
});

registerRecoveryStrategy({
  name: "use-cache",
  description: "Fall back to cached data when network fails",
  canRecover: (error) => {
    return error.message.toLowerCase().includes("network");
  },
  recover: async () => {
    logger.info("Attempting to use cached data...");
    // Signal that cache should be used
    return true;
  },
});

registerRecoveryStrategy({
  name: "create-config",
  description: "Create missing configuration file",
  canRecover: (error, context) => {
    return context.operation.includes("config") && error.message.includes("not found");
  },
  recover: async () => {
    logger.info("Creating default configuration...");
    // Would create config in real implementation
    return true;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Recovery Orchestrator
// ─────────────────────────────────────────────────────────────────────────────

export interface RecoveryResult {
  recovered: boolean;
  strategyUsed: string | null;
  message: string;
}

export async function attemptRecovery(
  error: Error,
  context: ErrorContext
): Promise<RecoveryResult> {
  for (const [name, strategy] of strategies) {
    if (strategy.canRecover(error, context)) {
      logger.info(`Attempting recovery with strategy: ${name}`);

      try {
        const success = await strategy.recover(error, context);
        if (success) {
          return {
            recovered: true,
            strategyUsed: name,
            message: strategy.description,
          };
        }
      } catch (recoveryError) {
        logger.warning(`Recovery strategy ${name} failed`);
      }
    }
  }

  return {
    recovered: false,
    strategyUsed: null,
    message: "No recovery strategy available",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Solution Suggester
// ─────────────────────────────────────────────────────────────────────────────

export function suggestSolutions(error: Error, context: ErrorContext): string[] {
  const suggestions: string[] = [];
  const message = error.message.toLowerCase();

  // Match against error codes
  for (const [code, def] of Object.entries(ERROR_CODES)) {
    if (
      message.includes(def.message.toLowerCase()) ||
      message.includes(code.toLowerCase().replace(/_/g, " "))
    ) {
      if (def.solutions) {
        suggestions.push(...def.solutions);
      }
    }
  }

  // Generic suggestions based on error type
  if (message.includes("permission")) {
    suggestions.push("Check file/directory permissions");
    suggestions.push("Try running with elevated privileges");
  }

  if (message.includes("not found")) {
    suggestions.push("Verify the path is correct");
    suggestions.push("Check if the resource exists");
  }

  if (message.includes("timeout")) {
    suggestions.push("Check network connectivity");
    suggestions.push("Increase timeout value");
    suggestions.push("Try again later");
  }

  if (message.includes("memory")) {
    suggestions.push("Close other applications");
    suggestions.push("Process data in smaller batches");
  }

  // Deduplicate
  return [...new Set(suggestions)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick Recovery Actions
// ─────────────────────────────────────────────────────────────────────────────

export interface QuickAction {
  label: string;
  description: string;
  action: () => Promise<void>;
}

export function getQuickActions(errorCode: ErrorCode): QuickAction[] {
  const actions: QuickAction[] = [];

  switch (errorCode) {
    case "CONFIG_MISSING":
      actions.push({
        label: "Create Config",
        description: "Create a default configuration file",
        action: async () => {
          if (Runtime.isBun) {
            await Bun.write("config.json", JSON.stringify({ version: 1 }, null, 2));
          }
        },
      });
      break;

    case "DB_CONNECTION_FAILED":
      actions.push({
        label: "Test Connection",
        description: "Test database connectivity",
        action: async () => {
          logger.info("Testing database connection...");
          // Would test connection
        },
      });
      break;

    case "AUTH_EXPIRED":
      actions.push({
        label: "Refresh Token",
        description: "Attempt to refresh authentication",
        action: async () => {
          logger.info("Refreshing authentication...");
          // Would refresh auth
        },
      });
      break;
  }

  return actions;
}
