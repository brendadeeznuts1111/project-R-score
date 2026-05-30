/**
 * Error Class Hierarchy
 *
 * Provides typed error classes for all error scenarios in the system.
 * Every error has a machine-readable code for client handling.
 *
 * Usage:
 *   throw new NotFoundError('Player not found', 'PLAYER_NOT_FOUND');
 *   throw new ValidationError('Invalid stake', { field: 'stake', issue: 'must be > 0' });
 *
 * All errors follow the API response format:
 *   { error: string, code: string, details?: object, timestamp: string, requestId: string }
 */

// ---------------------------------------------------------------------------
// Base error class
// ---------------------------------------------------------------------------

export class TerminalError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string = "INTERNAL_ERROR",
    statusCode: number = 500,
    details?: Record<string, unknown>,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert to API response format.
   */
  toJSON(requestId?: string): {
    error: string;
    code: string;
    details?: Record<string, unknown>;
    timestamp: string;
    requestId: string;
  } {
    return {
      error: this.message,
      code: this.code,
      ...(this.details ? { details: this.details } : {}),
      timestamp: this.timestamp,
      requestId: requestId || "unknown",
    };
  }
}

// ---------------------------------------------------------------------------
// Specific error classes
// ---------------------------------------------------------------------------

/**
 * Authentication errors — 401 Unauthorized
 */
export class AuthError extends TerminalError {
  constructor(
    message: string = "Unauthorized",
    code: string = "UNAUTHORIZED",
    details?: Record<string, unknown>
  ) {
    super(message, code, 401, details, true);
  }
}

/**
 * Authorization errors — 403 Forbidden
 */
export class ForbiddenError extends TerminalError {
  constructor(
    message: string = "Forbidden",
    code: string = "FORBIDDEN",
    details?: Record<string, unknown>
  ) {
    super(message, code, 403, details, true);
  }
}

/**
 * Validation errors — 400 Bad Request
 */
export class ValidationError extends TerminalError {
  constructor(
    message: string = "Validation failed",
    details?: Record<string, unknown>
  ) {
    super(message, "VALIDATION_ERROR", 400, details, true);
  }

  /**
   * Create a field-level validation error.
   */
  static field(
    field: string,
    issue: string,
    received?: unknown
  ): ValidationError {
    return new ValidationError("Request validation failed", {
      field,
      issue,
      ...(received !== undefined ? { received } : {}),
    });
  }
}

/**
 * Not found errors — 404 Not Found
 */
export class NotFoundError extends TerminalError {
  constructor(
    message: string = "Resource not found",
    code: string = "NOT_FOUND",
    resource?: string,
    resourceId?: string
  ) {
    super(
      message,
      code,
      404,
      {
        ...(resource ? { resource } : {}),
        ...(resourceId ? { resourceId } : {}),
      },
      true
    );
  }
}

/**
 * Rate limit errors — 429 Too Many Requests
 */
export class RateLimitError extends TerminalError {
  public readonly retryAfter: number;
  public readonly limit: number;
  public readonly window: string;

  constructor(
    message: string = "Rate limit exceeded",
    retryAfter: number = 60,
    limit: number = 60,
    window: string = "minute",
    tier: string = "standard"
  ) {
    super(
      message,
      "RATE_LIMITED",
      429,
      { retryAfter, limit, window, tier },
      true
    );
    this.retryAfter = retryAfter;
    this.limit = limit;
    this.window = window;
  }

  /**
   * Get rate limit headers for the response.
   */
  getHeaders(): Record<string, string> {
    return {
      "X-RateLimit-Limit": String(this.limit),
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": String(
        Math.floor(Date.now() / 1000) + this.retryAfter
      ),
      "X-RateLimit-Tier": this.window,
      "Retry-After": String(this.retryAfter),
    };
  }
}

/**
 * Bad gateway errors — 502 (upstream unreachable)
 */
export class BadGatewayError extends TerminalError {
  constructor(
    message: string = "Upstream service unavailable",
    upstream?: string
  ) {
    super(
      message,
      "BAD_GATEWAY",
      502,
      upstream ? { upstream } : undefined,
      true
    );
  }
}

/**
 * Gateway timeout errors — 504
 */
export class GatewayTimeoutError extends TerminalError {
  constructor(
    message: string = "Upstream request timed out",
    timeoutMs?: number
  ) {
    super(
      message,
      "GATEWAY_TIMEOUT",
      504,
      timeoutMs ? { timeoutMs } : undefined,
      true
    );
  }
}

/**
 * Database errors — 500
 */
export class DatabaseError extends TerminalError {
  constructor(
    message: string = "Database error",
    details?: Record<string, unknown>
  ) {
    super(message, "DB_CONNECTION_ERROR", 500, details, true);
  }
}

/**
 * Conflict errors — 409 (duplicate, etc.)
 */
export class ConflictError extends TerminalError {
  constructor(
    message: string = "Resource conflict",
    code: string = "CONFLICT",
    details?: Record<string, unknown>
  ) {
    super(message, code, 409, details, true);
  }
}

// ---------------------------------------------------------------------------
// Error code registry (all valid error codes)
// ---------------------------------------------------------------------------

export const ERROR_CODES = {
  // Auth
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",

  // Request
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  CONFLICT: "CONFLICT",

  // Server
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DB_CONNECTION_ERROR: "DB_CONNECTION_ERROR",
  BAD_GATEWAY: "BAD_GATEWAY",
  GATEWAY_TIMEOUT: "GATEWAY_TIMEOUT",

  // Partner Profile OS
  PARTNER_NOT_FOUND: "PARTNER_NOT_FOUND",
  TEMPLATE_NOT_FOUND: "TEMPLATE_NOT_FOUND",
  INVALID_TRANSITION: "INVALID_TRANSITION",
  GUARD_CHECK_FAILED: "GUARD_CHECK_FAILED",
  BLACKLISTED_BOOK: "BLACKLISTED_BOOK",
  KYC_PENDING: "KYC_PENDING",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  OPSEC_VIOLATION: "OPSEC_VIOLATION",
  MAX_EXPOSURE_EXCEEDED: "MAX_EXPOSURE_EXCEEDED",
  DAILY_LIMIT_EXCEEDED: "DAILY_LIMIT_EXCEEDED",
  MAX_SOURCES_REACHED: "MAX_SOURCES_REACHED",
  SOURCE_NOT_FOUND: "SOURCE_NOT_FOUND",
  API_ACCESS_DENIED: "API_ACCESS_DENIED",
  DUPLICATE_PARTNER: "DUPLICATE_PARTNER",
  DEPOSIT_FAILED: "DEPOSIT_FAILED",
  WITHDRAWAL_FAILED: "WITHDRAWAL_FAILED",

  // Telegram Hub
  TELEGRAM_BOT_UNHEALTHY: "TELEGRAM_BOT_UNHEALTHY",
  QUEUE_OVERFLOW: "QUEUE_OVERFLOW",

  // Template
  INVALID_TEMPLATE: "INVALID_TEMPLATE",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
