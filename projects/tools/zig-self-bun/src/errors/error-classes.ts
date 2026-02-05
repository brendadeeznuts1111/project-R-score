// src/errors/error-classes.ts
//! Custom error classes with structured context and recovery suggestions

import { createLogger } from "../logging/logger";

const logger = createLogger("@errors");

// Base error class with context and recovery
export abstract class BunConfigError extends Error {
  public readonly code: string;
  public readonly domain: string;
  public readonly context: Record<string, any>;
  public readonly recovery?: string;
  public readonly isRecoverable: boolean;

  constructor(
    code: string,
    domain: string,
    message: string,
    context: Record<string, any> = {},
    recovery?: string,
    isRecoverable: boolean = false
  ) {
    super(`[${code}] ${message}`);
    this.name = this.constructor.name;
    this.code = code;
    this.domain = domain;
    this.context = context;
    this.recovery = recovery;
    this.isRecoverable = isRecoverable;
  }

  // Log the error with structured context
  log(): void {
    const logContext = {
      code: this.code,
      domain: this.domain,
      isRecoverable: this.isRecoverable,
      recovery: this.recovery,
      ...this.context,
    };

    if (this.isRecoverable) {
      logger.warn(this.domain, this.message, logContext);
    } else {
      logger.error(this.domain, this.message, logContext);
    }
  }

  // Get error as JSON for API responses
  toJSON(): Record<string, any> {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      domain: this.domain,
      context: this.context,
      recovery: this.recovery,
      isRecoverable: this.isRecoverable,
    };
  }
}

// Config-related errors
export class ConfigError extends BunConfigError {
  constructor(code: string, message: string, context: Record<string, any> = {}) {
    super(code, "@config", message, context);
  }
}

export class ConfigVersionMismatchError extends ConfigError {
  constructor(expected: number, actual: number) {
    super("VERSION_MISMATCH", `Config version mismatch: expected ${expected}, got ${actual}`, {
      expected,
      actual,
    }, "Update client to compatible version", false);
  }
}

export class ConfigCorruptedError extends ConfigError {
  constructor(reason: string) {
    super("CORRUPTED", `Config file corrupted: ${reason}`, {
      reason,
    }, "Restore from backup or reinitialize", true);
  }
}

export class ConfigAccessError extends ConfigError {
  constructor(operation: string, reason: string) {
    super("ACCESS_DENIED", `Config access failed: ${operation} (${reason})`, {
      operation,
      reason,
    }, "Check file permissions", true);
  }
}

// Header validation errors
export class HeaderValidationError extends BunConfigError {
  constructor(code: string, header: string, value: string, message: string, recovery?: string) {
    super(code, "@proxy", message, { header, value }, recovery || "Check header format and value", false);
  }
}

export class InvalidHeaderFormatError extends HeaderValidationError {
  constructor(header: string, value: string, expected: string) {
    super("INVALID_FORMAT", header, value, `Invalid format: expected ${expected}`, "Use correct format as specified");
  }
}

export class HeaderOutOfRangeError extends HeaderValidationError {
  constructor(header: string, value: string, min: number, max: number) {
    super("OUT_OF_RANGE", header, value, `Value out of range: ${min} - ${max}`, "Use value within valid range");
  }
}

export class InvalidChecksumError extends HeaderValidationError {
  constructor(header: string, value: string, expected: string, actual: string) {
    super("CHECKSUM_MISMATCH", header, value,
      `Checksum mismatch: expected ${expected}, got ${actual}`,
      "Ensure data integrity during transmission");
  }
}

// Network errors
export class NetworkError extends BunConfigError {
  constructor(code: string, message: string, context: Record<string, any> = {}) {
    super(code, "@network", message, context);
  }
}

export class ConnectionTimeoutError extends NetworkError {
  constructor(hostname: string, timeout: number) {
    super("CONNECTION_TIMEOUT", `Connection to ${hostname} timed out after ${timeout}ms`, {
      hostname,
      timeout,
    }, "Check network connectivity", true);
  }
}

export class DNSError extends NetworkError {
  constructor(hostname: string, reason: string) {
    super("DNS_FAILED", `DNS resolution failed for ${hostname}: ${reason}`, {
      hostname,
      reason,
    }, "Check DNS configuration", true);
  }
}

export class WebSocketError extends NetworkError {
  constructor(reason: string, context: Record<string, any> = {}) {
    super("WEBSOCKET_FAILED", `WebSocket error: ${reason}`, context, "Check WebSocket connection", true);
  }
}

// Authentication errors
export class AuthError extends BunConfigError {
  constructor(code: string, message: string, context: Record<string, any> = {}) {
    super(code, "@auth", message, context);
  }
}

export class InvalidTokenError extends AuthError {
  constructor(reason: string) {
    super("INVALID_TOKEN", `Token validation failed: ${reason}`, {
      reason,
    }, "Provide valid authentication token", false);
  }
}

export class TokenExpiredError extends AuthError {
  constructor(token: string) {
    super("TOKEN_EXPIRED", "Authentication token has expired", {
      token: token.slice(0, 10) + "...",
    }, "Refresh authentication token", true);
  }
}

export class InsufficientPermissionsError extends AuthError {
  constructor(resource: string, required: string) {
    super("INSUFFICIENT_PERMISSIONS", `Insufficient permissions for ${resource}`, {
      resource,
      required,
    }, "Request elevated permissions", false);
  }
}

// Registry errors
export class RegistryError extends BunConfigError {
  constructor(code: string, message: string, context: Record<string, any> = {}) {
    super(code, "@registry", message, context);
  }
}

export class PackageNotFoundError extends RegistryError {
  constructor(packageName: string) {
    super("PACKAGE_NOT_FOUND", `Package not found: ${packageName}`, {
      packageName,
    }, "Check package name spelling", false);
  }
}

export class PackagePublishError extends RegistryError {
  constructor(packageName: string, reason: string) {
    super("PUBLISH_FAILED", `Failed to publish ${packageName}: ${reason}`, {
      packageName,
      reason,
    }, "Fix validation errors and retry", true);
  }
}

// Terminal errors
export class TerminalError extends BunConfigError {
  constructor(code: string, message: string, context: Record<string, any> = {}) {
    super(code, "@terminal", message, context);
  }
}

export class TerminalResizeError extends TerminalError {
  constructor(reason: string) {
    super("RESIZE_FAILED", `Terminal resize failed: ${reason}`, {
      reason,
    }, "Check terminal capabilities", true);
  }
}

export class TerminalModeError extends TerminalError {
  constructor(requested: string, available: string[]) {
    super("MODE_UNSUPPORTED", `Terminal mode ${requested} not supported`, {
      requested,
      available,
    }, "Use supported terminal mode", true);
  }
}

// Validation helpers
export function createValidationError(
  header: string,
  value: string,
  code: string,
  message: string,
  recovery?: string
): HeaderValidationError {
  const error = new HeaderValidationError(code, header, value, message, recovery);
  error.log();
  return error;
}

// Error recovery helpers
export class ErrorRecovery {
  static async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 1000,
    domain: string = "@unknown"
  ): Promise<T> {
    const logger = createLogger(domain);
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        logger.warn(domain, `Operation failed (attempt ${attempt}/${maxAttempts})`, {
          error: error.message,
          attempt,
          maxAttempts,
        });

        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    throw lastError!;
  }

  static async withTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string = "Operation timed out"
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);

      operation
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeout));
    });
  }

  static async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    key: string,
    failureThreshold: number = 5,
    recoveryTimeout: number = 60000
  ): Promise<T> {
    // Simple in-memory circuit breaker (in production, use Redis/external store)
    const state = circuitBreakerStates.get(key) || {
      failures: 0,
      lastFailure: 0,
      state: 'closed' as 'closed' | 'open' | 'half-open'
    };

    if (state.state === 'open') {
      if (Date.now() - state.lastFailure > recoveryTimeout) {
        state.state = 'half-open';
      } else {
        throw new Error(`Circuit breaker open for ${key}`);
      }
    }

    try {
      const result = await operation();
      if (state.state === 'half-open') {
        state.state = 'closed';
        state.failures = 0;
      }
      circuitBreakerStates.set(key, state);
      return result;
    } catch (error) {
      state.failures++;
      state.lastFailure = Date.now();

      if (state.failures >= failureThreshold) {
        state.state = 'open';
      }

      circuitBreakerStates.set(key, state);
      throw error;
    }
  }
}

// In-memory circuit breaker state (in production, use Redis)
const circuitBreakerStates = new Map<string, {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}>();

// Error boundary for async operations
export class ErrorBoundary {
  private logger: ReturnType<typeof createLogger>;

  constructor(domain: string) {
    this.logger = createLogger(domain);
  }

  async execute<T>(
    operation: () => Promise<T>,
    fallback?: T,
    operationName?: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      this.logger.error(`Operation failed: ${operationName || 'unknown'}`, {
        error: error.message,
        stack: error.stack,
      });

      if (fallback !== undefined) {
        this.logger.info(`Using fallback for ${operationName || 'unknown'}`);
        return fallback;
      }

      throw error;
    }
  }

  executeSync<T>(
    operation: () => T,
    fallback?: T,
    operationName?: string
  ): T {
    try {
      return operation();
    } catch (error: any) {
      this.logger.error(`Operation failed: ${operationName || 'unknown'}`, {
        error: error.message,
        stack: error.stack,
      });

      if (fallback !== undefined) {
        this.logger.info(`Using fallback for ${operationName || 'unknown'}`);
        return fallback;
      }

      throw error;
    }
  }
}

// Global error handler
export function setupGlobalErrorHandler(): void {
  process.on('uncaughtException', (error: Error) => {
    logger.error("@system", "Uncaught exception", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: any) => {
    logger.error("@system", "Unhandled promise rejection", {
      reason: reason?.message || String(reason),
    });
    process.exit(1);
  });
}

// Export convenience functions
export const createConfigError = (code: string, message: string, context?: Record<string, any>) =>
  new ConfigError(code, message, context);

export const createNetworkError = (code: string, message: string, context?: Record<string, any>) =>
  new NetworkError(code, message, context);

export const createAuthError = (code: string, message: string, context?: Record<string, any>) =>
  new AuthError(code, message, context);

export const createRegistryError = (code: string, message: string, context?: Record<string, any>) =>
  new RegistryError(code, message, context);

export const createTerminalError = (code: string, message: string, context?: Record<string, any>) =>
  new TerminalError(code, message, context);

