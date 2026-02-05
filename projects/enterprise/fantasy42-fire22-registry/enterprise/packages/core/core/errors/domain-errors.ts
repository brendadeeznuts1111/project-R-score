/**
 * Crystal Clear Architecture - Domain Error Handling
 * Standardized error patterns for Domain-Driven Design
 */

export enum ErrorCode {
  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
  INVALID_FORMAT = 'INVALID_FORMAT',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',

  // Domain Errors
  ENTITY_NOT_FOUND = 'ENTITY_NOT_FOUND',
  ENTITY_ALREADY_EXISTS = 'ENTITY_ALREADY_EXISTS',
  DOMAIN_CONSTRAINT_VIOLATION = 'DOMAIN_CONSTRAINT_VIOLATION',
  BUSINESS_LOGIC_ERROR = 'BUSINESS_LOGIC_ERROR',

  // Infrastructure Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',

  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // System Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorContext {
  domain?: string;
  entity?: string;
  entityId?: string;
  operation?: string;
  userId?: string;
  correlationId?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface DomainErrorDetails {
  field?: string;
  value?: any;
  constraint?: string;
  expected?: any;
  actual?: any;
}

/**
 * Base Domain Error Class
 * All domain errors should extend this class
 */
export class DomainError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly details?: DomainErrorDetails;
  public readonly cause?: Error;

  constructor(
    message: string,
    code: ErrorCode,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: ErrorContext = {},
    details?: DomainErrorDetails,
    cause?: Error
  ) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.severity = severity;
    this.context = {
      timestamp: new Date().toISOString(),
      correlationId: this.generateCorrelationId(),
      ...context,
    };
    this.details = details;
    this.cause = cause;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  private generateCorrelationId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert error to structured log format
   */
  toLogFormat(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      context: this.context,
      details: this.details,
      stack: this.stack,
      cause: this.cause
        ? {
            name: this.cause.name,
            message: this.cause.message,
            stack: this.cause.stack,
          }
        : undefined,
    };
  }

  /**
   * Convert to HTTP response format
   */
  toHttpResponse(): {
    statusCode: number;
    error: {
      code: ErrorCode;
      message: string;
      details?: DomainErrorDetails;
      correlationId: string;
    };
  } {
    return {
      statusCode: this.getHttpStatusCode(),
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        correlationId: this.context.correlationId!,
      },
    };
  }

  private getHttpStatusCode(): number {
    switch (this.code) {
      case ErrorCode.UNAUTHORIZED:
        return 401;
      case ErrorCode.FORBIDDEN:
        return 403;
      case ErrorCode.ENTITY_NOT_FOUND:
        return 404;
      case ErrorCode.VALIDATION_ERROR:
      case ErrorCode.REQUIRED_FIELD_MISSING:
      case ErrorCode.INVALID_FORMAT:
      case ErrorCode.BUSINESS_RULE_VIOLATION:
        return 400;
      case ErrorCode.ENTITY_ALREADY_EXISTS:
        return 409;
      case ErrorCode.RATE_LIMIT_EXCEEDED:
        return 429;
      case ErrorCode.SERVICE_UNAVAILABLE:
        return 503;
      case ErrorCode.INTERNAL_ERROR:
      default:
        return 500;
    }
  }
}

/**
 * Validation Error - For input validation failures
 */
export class ValidationError extends DomainError {
  constructor(message: string, context: ErrorContext = {}, details?: DomainErrorDetails) {
    super(message, ErrorCode.VALIDATION_ERROR, ErrorSeverity.LOW, context, details);
    this.name = 'ValidationError';
  }
}

/**
 * Entity Not Found Error
 */
export class EntityNotFoundError extends DomainError {
  constructor(entity: string, entityId: string, context: ErrorContext = {}) {
    super(
      `${entity} with id ${entityId} not found`,
      ErrorCode.ENTITY_NOT_FOUND,
      ErrorSeverity.MEDIUM,
      { ...context, entity, entityId }
    );
    this.name = 'EntityNotFoundError';
  }
}

/**
 * Business Rule Violation Error
 */
export class BusinessRuleViolationError extends DomainError {
  constructor(message: string, context: ErrorContext = {}, details?: DomainErrorDetails) {
    super(message, ErrorCode.BUSINESS_RULE_VIOLATION, ErrorSeverity.HIGH, context, details);
    this.name = 'BusinessRuleViolationError';
  }
}

/**
 * Infrastructure Error - For external service failures
 */
export class InfrastructureError extends DomainError {
  constructor(message: string, cause?: Error, context: ErrorContext = {}) {
    super(
      message,
      cause instanceof Error && cause.message.includes('ECONNREFUSED')
        ? ErrorCode.NETWORK_ERROR
        : ErrorCode.EXTERNAL_SERVICE_ERROR,
      ErrorSeverity.HIGH,
      context,
      undefined,
      cause
    );
    this.name = 'InfrastructureError';
  }
}

/**
 * Authentication Error
 */
export class AuthenticationError extends DomainError {
  constructor(message: string = 'Authentication required', context: ErrorContext = {}) {
    super(message, ErrorCode.UNAUTHORIZED, ErrorSeverity.HIGH, context);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization Error
 */
export class AuthorizationError extends DomainError {
  constructor(message: string = 'Access denied', context: ErrorContext = {}) {
    super(message, ErrorCode.FORBIDDEN, ErrorSeverity.HIGH, context);
    this.name = 'AuthorizationError';
  }
}

/**
 * Error Factory - For creating domain-specific errors
 */
export class DomainErrorFactory {
  private readonly domain: string;

  constructor(domain: string) {
    this.domain = domain;
  }

  validationError(message: string, field?: string, value?: any): ValidationError {
    return new ValidationError(message, { domain: this.domain }, { field, value });
  }

  entityNotFound(entity: string, id: string): EntityNotFoundError {
    return new EntityNotFoundError(entity, id, { domain: this.domain, entity });
  }

  businessRuleViolation(message: string, constraint?: string): BusinessRuleViolationError {
    return new BusinessRuleViolationError(message, { domain: this.domain }, { constraint });
  }

  infrastructureError(message: string, cause?: Error): InfrastructureError {
    return new InfrastructureError(message, cause, { domain: this.domain });
  }
}

/**
 * Error Handler - Centralized error processing
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorHandlers: Map<ErrorCode, (error: DomainError) => void> = new Map();

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  registerHandler(code: ErrorCode, handler: (error: DomainError) => void): void {
    this.errorHandlers.set(code, handler);
  }

  async handle(error: Error | DomainError): Promise<void> {
    if (error instanceof DomainError) {
      // Call specific error handler if registered
      const handler = this.errorHandlers.get(error.code);
      if (handler) {
        await Promise.resolve(handler(error));
      }

      // Log the error
      await this.logError(error);
    } else {
      // Handle non-domain errors
      await this.logError(
        new DomainError(
          error.message,
          ErrorCode.INTERNAL_ERROR,
          ErrorSeverity.CRITICAL,
          { domain: 'system' },
          undefined,
          error
        )
      );
    }
  }

  private async logError(error: DomainError): Promise<void> {
    // This will integrate with our logging system
    console.error(JSON.stringify(error.toLogFormat(), null, 2));
  }
}

/**
 * Error Boundary - For catching and handling errors in async operations
 */
export class ErrorBoundary {
  static async execute<T>(operation: () => Promise<T>, context: ErrorContext = {}): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const domainError =
        error instanceof DomainError
          ? error
          : new DomainError(
              error instanceof Error ? error.message : 'Unknown error',
              ErrorCode.INTERNAL_ERROR,
              ErrorSeverity.CRITICAL,
              context,
              undefined,
              error instanceof Error ? error : undefined
            );

      await ErrorHandler.getInstance().handle(domainError);
      throw domainError;
    }
  }

  static async executeWithFallback<T>(
    operation: () => Promise<T>,
    fallback: T,
    context: ErrorContext = {}
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const domainError =
        error instanceof DomainError
          ? error
          : new DomainError(
              error instanceof Error ? error.message : 'Unknown error',
              ErrorCode.INTERNAL_ERROR,
              ErrorSeverity.MEDIUM,
              context,
              undefined,
              error instanceof Error ? error : undefined
            );

      await ErrorHandler.getInstance().handle(domainError);
      return fallback;
    }
  }
}
