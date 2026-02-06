/**
 * Enterprise Error Handling System
 *
 * Standardized error creation, handling, and management
 * for enterprise-grade applications.
 *
 * @version 1.0.0
 * @author Enterprise Platform Team
 */

import { EnterpriseError, SecurityRiskLevel, OperationStatus } from './core-types';

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * Standardized error code enumeration
 */
export enum EnterpriseErrorCode {
  // System Errors (1000-1999)
  SYSTEM_INITIALIZATION_FAILED = 'SYS_1000',
  SYSTEM_CONFIGURATION_INVALID = 'SYS_1001',
  SYSTEM_RESOURCE_EXHAUSTED = 'SYS_1002',
  SYSTEM_TIMEOUT = 'SYS_1003',

  // Validation Errors (2000-2999)
  VALIDATION_INPUT_INVALID = 'VAL_2000',
  VALIDATION_TYPE_MISMATCH = 'VAL_2001',
  VALIDATION_CONSTRAINT_VIOLATION = 'VAL_2002',
  VALIDATION_SCHEMA_INVALID = 'VAL_2003',

  // Network Errors (3000-3999)
  NETWORK_CONNECTION_FAILED = 'NET_3000',
  NETWORK_TIMEOUT = 'NET_3001',
  NETWORK_PROTOCOL_ERROR = 'NET_3002',
  NETWORK_UNREACHABLE = 'NET_3003',

  // Security Errors (4000-4999)
  SECURITY_UNAUTHORIZED = 'SEC_4000',
  SECURITY_FORBIDDEN = 'SEC_4001',
  SECURITY_TOKEN_INVALID = 'SEC_4002',
  SECURITY_ENCRYPTION_FAILED = 'SEC_4003',
  SECURITY_SIGNATURE_INVALID = 'SEC_4004',

  // Resource Errors (5000-5999)
  RESOURCE_NOT_FOUND = 'RES_5000',
  RESOURCE_ALREADY_EXISTS = 'RES_5001',
  RESOURCE_LOCKED = 'RES_5002',
  RESOURCE_CORRUPTED = 'RES_5003',

  // Business Logic Errors (6000-6999)
  BUSINESS_RULE_VIOLATION = 'BIZ_6000',
  BUSINESS_STATE_INVALID = 'BIZ_6001',
  BUSINESS_PERMISSION_DENIED = 'BIZ_6002',
  BUSINESS_QUOTA_EXCEEDED = 'BIZ_6003',
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Base enterprise error class
 */
export abstract class BaseEnterpriseError extends Error {
  public readonly code: EnterpriseErrorCode;
  public readonly severity: SecurityRiskLevel;
  public readonly timestamp: number;
  public readonly context?: Record<string, unknown>;

  constructor(
    code: EnterpriseErrorCode,
    message: string,
    severity: SecurityRiskLevel = SecurityRiskLevel.MEDIUM,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.severity = severity;
    this.timestamp = Date.now();
    this.context = context;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert to standardized error interface
   */
  public toEnterpriseError(): EnterpriseError {
    return {
      code: this.code,
      message: this.message,
      severity: this.severity,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
    };
  }

  /**
   * Check if error is critical
   */
  public isCritical(): boolean {
    return this.severity === SecurityRiskLevel.CRITICAL;
  }

  /**
   * Check if error is security-related
   */
  public isSecurityError(): boolean {
    return this.code.startsWith('SEC_');
  }
}

/**
 * System-related errors
 */
export class SystemError extends BaseEnterpriseError {
  constructor(code: EnterpriseErrorCode, message: string, context?: Record<string, unknown>) {
    super(code, message, SecurityRiskLevel.HIGH, context);
  }
}

/**
 * Validation errors
 */
export class ValidationError extends BaseEnterpriseError {
  public readonly field?: string;
  public readonly value?: unknown;

  constructor(
    code: EnterpriseErrorCode,
    message: string,
    field?: string,
    value?: unknown,
    context?: Record<string, unknown>
  ) {
    super(code, message, SecurityRiskLevel.LOW, context);
    this.field = field;
    this.value = value;
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends BaseEnterpriseError {
  public readonly hostname?: string;
  public readonly port?: number;
  public readonly protocol?: string;

  constructor(
    code: EnterpriseErrorCode,
    message: string,
    hostname?: string,
    port?: number,
    protocol?: string,
    context?: Record<string, unknown>
  ) {
    super(code, message, SecurityRiskLevel.MEDIUM, context);
    this.hostname = hostname;
    this.port = port;
    this.protocol = protocol;
  }
}

/**
 * Security-related errors
 */
export class SecurityError extends BaseEnterpriseError {
  constructor(code: EnterpriseErrorCode, message: string, context?: Record<string, unknown>) {
    super(code, message, SecurityRiskLevel.CRITICAL, context);
  }
}

/**
 * Resource-related errors
 */
export class ResourceError extends BaseEnterpriseError {
  public readonly resourceType?: string;
  public readonly resourceId?: string;

  constructor(
    code: EnterpriseErrorCode,
    message: string,
    resourceType?: string,
    resourceId?: string,
    context?: Record<string, unknown>
  ) {
    super(code, message, SecurityRiskLevel.MEDIUM, context);
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Business logic errors
 */
export class BusinessError extends BaseEnterpriseError {
  public readonly rule?: string;

  constructor(
    code: EnterpriseErrorCode,
    message: string,
    rule?: string,
    context?: Record<string, unknown>
  ) {
    super(code, message, SecurityRiskLevel.LOW, context);
    this.rule = rule;
  }
}

// ============================================================================
// ERROR FACTORY
// ============================================================================

/**
 * Factory for creating standardized errors
 */
export class EnterpriseErrorFactory {
  /**
   * Create a system error
   */
  static createSystemError(
    code: EnterpriseErrorCode,
    message: string,
    context?: Record<string, unknown>
  ): SystemError {
    return new SystemError(code, message, context);
  }

  /**
   * Create a validation error
   */
  static createValidationError(
    code: EnterpriseErrorCode,
    message: string,
    field?: string,
    value?: unknown,
    context?: Record<string, unknown>
  ): ValidationError {
    return new ValidationError(code, message, field, value, context);
  }

  /**
   * Create a network error
   */
  static createNetworkError(
    code: EnterpriseErrorCode,
    message: string,
    hostname?: string,
    port?: number,
    protocol?: string,
    context?: Record<string, unknown>
  ): NetworkError {
    return new NetworkError(code, message, hostname, port, protocol, context);
  }

  /**
   * Create a security error
   */
  static createSecurityError(
    code: EnterpriseErrorCode,
    message: string,
    context?: Record<string, unknown>
  ): SecurityError {
    return new SecurityError(code, message, context);
  }

  /**
   * Create a resource error
   */
  static createResourceError(
    code: EnterpriseErrorCode,
    message: string,
    resourceType?: string,
    resourceId?: string,
    context?: Record<string, unknown>
  ): ResourceError {
    return new ResourceError(code, message, resourceType, resourceId, context);
  }

  /**
   * Create a business error
   */
  static createBusinessError(
    code: EnterpriseErrorCode,
    message: string,
    rule?: string,
    context?: Record<string, unknown>
  ): BusinessError {
    return new BusinessError(code, message, rule, context);
  }

  /**
   * Create error from unknown error
   */
  static fromUnknown(error: unknown): BaseEnterpriseError {
    if (error instanceof BaseEnterpriseError) {
      return error;
    }

    if (error instanceof Error) {
      return new SystemError(EnterpriseErrorCode.SYSTEM_INITIALIZATION_FAILED, error.message, {
        originalError: error.name,
        stack: error.stack,
      });
    }

    if (typeof error === 'string') {
      return new SystemError(EnterpriseErrorCode.SYSTEM_INITIALIZATION_FAILED, error);
    }

    return new SystemError(
      EnterpriseErrorCode.SYSTEM_INITIALIZATION_FAILED,
      'Unknown error occurred',
      { originalError: error }
    );
  }
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

/**
 * Centralized error handler
 */
export class EnterpriseErrorHandler {
  private static instance: EnterpriseErrorHandler;
  private errorHandlers: Map<string, (error: BaseEnterpriseError) => void> = new Map();

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): EnterpriseErrorHandler {
    if (!EnterpriseErrorHandler.instance) {
      EnterpriseErrorHandler.instance = new EnterpriseErrorHandler();
    }
    return EnterpriseErrorHandler.instance;
  }

  /**
   * Register error handler
   */
  public registerHandler(
    errorCode: EnterpriseErrorCode,
    handler: (error: BaseEnterpriseError) => void
  ): void {
    this.errorHandlers.set(errorCode, handler);
  }

  /**
   * Handle error
   */
  public handleError(error: BaseEnterpriseError): void {
    const handler = this.errorHandlers.get(error.code);
    if (handler) {
      handler(error);
    } else {
      this.defaultErrorHandler(error);
    }
  }

  /**
   * Default error handler
   */
  private defaultErrorHandler(error: BaseEnterpriseError): void {
    console.error(`[${error.severity.toUpperCase()}] ${error.code}: ${error.message}`);

    if (error.context) {
      console.error('Context:', error.context);
    }

    if (error.stack && error.isCritical()) {
      console.error('Stack trace:', error.stack);
    }
  }

  /**
   * Handle unknown error
   */
  public handleUnknown(error: unknown): void {
    const enterpriseError = EnterpriseErrorFactory.fromUnknown(error);
    this.handleError(enterpriseError);
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Handle error with centralized handler
 */
export const handleError = (error: unknown): void => {
  EnterpriseErrorHandler.getInstance().handleUnknown(error);
};

/**
 * Create system error
 */
export const createSystemError = (
  code: EnterpriseErrorCode,
  message: string,
  context?: Record<string, unknown>
): SystemError => {
  return EnterpriseErrorFactory.createSystemError(code, message, context);
};

/**
 * Create validation error
 */
export const createValidationError = (
  code: EnterpriseErrorCode,
  message: string,
  field?: string,
  value?: unknown,
  context?: Record<string, unknown>
): ValidationError => {
  return EnterpriseErrorFactory.createValidationError(code, message, field, value, context);
};

/**
 * Create network error
 */
export const createNetworkError = (
  code: EnterpriseErrorCode,
  message: string,
  hostname?: string,
  port?: number,
  protocol?: string,
  context?: Record<string, unknown>
): NetworkError => {
  return EnterpriseErrorFactory.createNetworkError(
    code,
    message,
    hostname,
    port,
    protocol,
    context
  );
};

/**
 * Create security error
 */
export const createSecurityError = (
  code: EnterpriseErrorCode,
  message: string,
  context?: Record<string, unknown>
): SecurityError => {
  return EnterpriseErrorFactory.createSecurityError(code, message, context);
};

/**
 * Create resource error
 */
export const createResourceError = (
  code: EnterpriseErrorCode,
  message: string,
  resourceType?: string,
  resourceId?: string,
  context?: Record<string, unknown>
): ResourceError => {
  return EnterpriseErrorFactory.createResourceError(
    code,
    message,
    resourceType,
    resourceId,
    context
  );
};

/**
 * Create business error
 */
export const createBusinessError = (
  code: EnterpriseErrorCode,
  message: string,
  rule?: string,
  context?: Record<string, unknown>
): BusinessError => {
  return EnterpriseErrorFactory.createBusinessError(code, message, rule, context);
};
