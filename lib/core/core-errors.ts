// lib/core/core-errors.ts — Standardized error handling system

import { EnterpriseError, SecurityRiskLevel, OperationStatus } from './core-types';

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * Standardized error code enumeration
 * 
 * Error codes are organized by category with the following ranges:
 * - 1000-1999: System errors (initialization, configuration, resources)
 * - 2000-2999: Validation errors (input, type, constraint, schema)
 * - 3000-3999: Network errors (connection, timeout, protocol)
 * - 4000-4999: Security errors (auth, encryption, signatures)
 * - 5000-5999: Resource errors (not found, locked, corrupted)
 * - 6000-6999: Business logic errors (rules, state, quotas)
 * 
 * @example
 * ```typescript
 * // System initialization failure
 * throw createSystemError(
 *   EnterpriseErrorCode.SYSTEM_INITIALIZATION_FAILED,
 *   'Database connection failed',
 *   { host: 'localhost', port: 5432 }
 * );
 * 
 * // Input validation error
 * throw createValidationError(
 *   EnterpriseErrorCode.VALIDATION_INPUT_INVALID,
 *   'Email format is invalid',
 *   'email',
 *   'not-an-email'
 * );
 * ```
 */
export enum EnterpriseErrorCode {
  // ============================================================================
  // System Errors (1000-1999)
  // Use for: Application startup, configuration, system resources
  // Severity: Typically HIGH or CRITICAL
  // ============================================================================
  
  /**
   * System initialization failed
   * 
   * Use when: Application fails to start or initialize critical components
   * 
   * @example
   * ```typescript
   * try {
   *   await database.connect();
   * } catch (error) {
   *   throw createSystemError(
   *     EnterpriseErrorCode.SYSTEM_INITIALIZATION_FAILED,
   *     'Database connection failed during startup',
   *     { host: 'localhost', port: 5432, originalError: error.message }
   *   );
   * }
   * ```
   */
  SYSTEM_INITIALIZATION_FAILED = 'SYS_1000',

  /**
   * System configuration invalid
   * 
   * Use when: Configuration files or environment variables are missing/invalid
   * 
   * @example
   * ```typescript
   * const apiKey = process.env.API_KEY;
   * if (!apiKey) {
   *   throw createSystemError(
   *     EnterpriseErrorCode.SYSTEM_CONFIGURATION_INVALID,
   *     'Missing required environment variable: API_KEY',
   *     { variable: 'API_KEY' }
   *   );
   * }
   * ```
   */
  SYSTEM_CONFIGURATION_INVALID = 'SYS_1001',

  /**
   * System resource exhausted
   * 
   * Use when: Out of memory, disk space, file handles, or other resources
   * 
   * @example
   * ```typescript
   * if (memoryUsage.heapUsed > memoryLimit) {
   *   throw createSystemError(
   *     EnterpriseErrorCode.SYSTEM_RESOURCE_EXHAUSTED,
   *     'Heap memory limit exceeded',
   *     { 
   *       heapUsed: memoryUsage.heapUsed,
   *       heapLimit: memoryLimit,
   *       usagePercent: (memoryUsage.heapUsed / memoryLimit) * 100
   *     }
   *   );
   * }
   * ```
   */
  SYSTEM_RESOURCE_EXHAUSTED = 'SYS_1002',

  /**
   * System timeout
   * 
   * Use when: Operations exceed their time limits (not network-specific)
   * 
   * @example
   * ```typescript
   * const timeout = setTimeout(() => {
   *   throw createSystemError(
   *     EnterpriseErrorCode.SYSTEM_TIMEOUT,
   *     'Database migration exceeded 5 minute limit',
   *     { migrationName: 'add_users_table', elapsedMs: 300000 }
   *   );
   * }, 300000);
   * ```
   */
  SYSTEM_TIMEOUT = 'SYS_1003',

  // ============================================================================
  // Validation Errors (2000-2999)
  // Use for: Input validation, type checking, constraints
  // Severity: Typically LOW (expected user input errors)
  // ============================================================================
  
  /**
   * Validation input invalid
   * 
   * Use when: User input fails validation rules
   * 
   * @example
   * ```typescript
   * function validateEmail(email: string) {
   *   if (!email.includes('@')) {
   *     throw createValidationError(
   *       EnterpriseErrorCode.VALIDATION_INPUT_INVALID,
   *       'Email must contain @ symbol',
   *       'email',
   *       email
   *     );
   *   }
   * }
   * ```
   */
  VALIDATION_INPUT_INVALID = 'VAL_2000',

  /**
   * Validation type mismatch
   * 
   * Use when: Value is not of expected type
   * 
   * @example
   * ```typescript
   * function processAge(age: unknown) {
   *   if (typeof age !== 'number') {
   *     throw createValidationError(
   *       EnterpriseErrorCode.VALIDATION_TYPE_MISMATCH,
   *       `Expected number, received ${typeof age}`,
   *       'age',
   *       age
   *     );
   *   }
   * }
   * ```
   */
  VALIDATION_TYPE_MISMATCH = 'VAL_2001',

  /**
   * Validation constraint violation
   * 
   * Use when: Value violates business constraints (min/max length, range, etc.)
   * 
   * @example
   * ```typescript
   * function validatePassword(password: string) {
   *   if (password.length < 8) {
   *     throw createValidationError(
   *       EnterpriseErrorCode.VALIDATION_CONSTRAINT_VIOLATION,
   *       'Password must be at least 8 characters',
   *       'password',
   *       password,
   *       { constraint: 'minLength', expected: 8, actual: password.length }
   *     );
   *   }
   * }
   * ```
   */
  VALIDATION_CONSTRAINT_VIOLATION = 'VAL_2002',

  /**
   * Validation schema invalid
   * 
   * Use when: JSON Schema, TypeScript interfaces, or data structures are invalid
   * 
   * @example
   * ```typescript
   * const result = schema.validate(data);
   * if (!result.valid) {
   *   throw createValidationError(
   *     EnterpriseErrorCode.VALIDATION_SCHEMA_INVALID,
   *     'Request body does not match expected schema',
   *     'body',
   *     data,
   *     { errors: result.errors }
   *   );
   * }
   * ```
   */
  VALIDATION_SCHEMA_INVALID = 'VAL_2003',

  // ============================================================================
  // Network Errors (3000-3999)
  // Use for: HTTP, TCP, WebSocket, database connections
  // Severity: Typically MEDIUM or HIGH
  // ============================================================================
  
  /**
   * Network connection failed
   * 
   * Use when: Cannot establish network connection
   * 
   * @example
   * ```typescript
   * try {
   *   await fetch('https://api.example.com/data');
   * } catch (error) {
   *   throw createNetworkError(
   *     EnterpriseErrorCode.NETWORK_CONNECTION_FAILED,
   *     'Failed to connect to API server',
   *     'api.example.com',
   *     443,
   *     'https'
   *   );
   * }
   * ```
   */
  NETWORK_CONNECTION_FAILED = 'NET_3000',

  /**
   * Network timeout
   * 
   * Use when: Network operation exceeds time limit
   * 
   * @example
   * ```typescript
   * try {
   *   await fetch(url, { signal: AbortSignal.timeout(5000) });
   * } catch (error) {
   *   if (error.name === 'AbortError') {
   *     throw createNetworkError(
   *       EnterpriseErrorCode.NETWORK_TIMEOUT,
   *       'Request timed out after 5000ms',
   *       new URL(url).hostname,
   *       undefined,
   *       undefined,
   *       { timeoutMs: 5000 }
   *     );
   *   }
   * }
   * ```
   */
  NETWORK_TIMEOUT = 'NET_3001',

  /**
   * Network protocol error
   * 
   * Use when: Protocol-level errors (HTTP parsing, TLS handshake, etc.)
   * 
   * @example
   * ```typescript
   * if (response.status === 502) {
   *   throw createNetworkError(
   *     EnterpriseErrorCode.NETWORK_PROTOCOL_ERROR,
   *     'Invalid response from upstream server',
   *     'gateway.example.com',
   *     undefined,
   *     undefined,
   *     { statusCode: 502, responseHeaders }
   *   );
   * }
   * ```
   */
  NETWORK_PROTOCOL_ERROR = 'NET_3002',

  /**
   * Network unreachable
   * 
   * Use when: Network is completely unavailable (DNS failure, no route)
   * 
   * @example
   * ```typescript
   * try {
   *   await fetch('https://api.example.com');
   * } catch (error) {
   *   if (error.code === 'ENOTFOUND') {
   *     throw createNetworkError(
   *       EnterpriseErrorCode.NETWORK_UNREACHABLE,
   *       'API server DNS lookup failed',
   *       'api.example.com',
   *       undefined,
   *       undefined,
   *       { dnsError: error.message }
   *     );
   *   }
   * }
   * ```
   */
  NETWORK_UNREACHABLE = 'NET_3003',

  // ============================================================================
  // Security Errors (4000-4999)
  // Use for: Authentication, authorization, encryption, signatures
  // Severity: Always CRITICAL
  // ============================================================================
  
  /**
   * Security unauthorized
   * 
   * Use when: Authentication fails (invalid credentials, expired session)
   * 
   * @example
   * ```typescript
   * const user = await authenticateUser(credentials);
   * if (!user) {
   *   throw createSecurityError(
   *     EnterpriseErrorCode.SECURITY_UNAUTHORIZED,
   *     'Invalid username or password',
   *     { ip: request.ip, username: credentials.username }
   *   );
   * }
   * ```
   */
  SECURITY_UNAUTHORIZED = 'SEC_4000',

  /**
   * Security forbidden
   * 
   * Use when: User is authenticated but lacks permission
   * 
   * @example
   * ```typescript
   * if (!user.hasPermission('admin:delete')) {
   *   throw createSecurityError(
   *     EnterpriseErrorCode.SECURITY_FORBIDDEN,
   *     'Admin permission required for deletion',
   *     { 
   *       userId: user.id,
   *       requiredPermission: 'admin:delete',
   *       resource: 'users'
   *     }
   *   );
   * }
   * ```
   */
  SECURITY_FORBIDDEN = 'SEC_4001',

  /**
   * Security token invalid
   * 
   * Use when: JWT, API key, or other tokens are invalid/expired
   * 
   * @example
   * ```typescript
   * try {
   *   const payload = jwt.verify(token, secret);
   * } catch (error) {
   *   throw createSecurityError(
   *     EnterpriseErrorCode.SECURITY_TOKEN_INVALID,
   *     'Authentication token has expired',
   *     { 
   *       tokenExpiry: decodedToken.exp,
   *       currentTime: Math.floor(Date.now() / 1000)
   *     }
   *   );
   * }
   * ```
   */
  SECURITY_TOKEN_INVALID = 'SEC_4002',

  /**
   * Security encryption failed
   * 
   * Use when: Encryption/decryption operations fail
   * 
   * @example
   * ```typescript
   * try {
   *   const encrypted = await encrypt(data, key);
   * } catch (error) {
   *   throw createSecurityError(
   *     EnterpriseErrorCode.SECURITY_ENCRYPTION_FAILED,
   *     'Failed to encrypt sensitive data',
   *     { algorithm: 'AES-256-GCM' }
   *   );
   * }
   * ```
   */
  SECURITY_ENCRYPTION_FAILED = 'SEC_4003',

  /**
   * Security signature invalid
   * 
   * Use when: HMAC, digital signatures, or checksums don't match
   * 
   * @example
   * ```typescript
   * const isValid = verifySignature(payload, signature, publicKey);
   * if (!isValid) {
   *   throw createSecurityError(
   *     EnterpriseErrorCode.SECURITY_SIGNATURE_INVALID,
   *     'Request signature verification failed',
   *     { signatureAlgorithm: 'SHA256', keyId: publicKey.id }
   *   );
   * }
   * ```
   */
  SECURITY_SIGNATURE_INVALID = 'SEC_4004',

  // ============================================================================
  // Resource Errors (5000-5999)
  // Use for: Files, database records, cache entries
  // Severity: Typically MEDIUM
  // ============================================================================
  
  /**
   * Resource not found
   * 
   * Use when: Requested resource doesn't exist
   * 
   * @example
   * ```typescript
   * const user = await db.users.findById(id);
   * if (!user) {
   *   throw createResourceError(
   *     EnterpriseErrorCode.RESOURCE_NOT_FOUND,
   *     `User with ID ${id} not found`,
   *     'User',
   *     id
   *   );
   * }
   * ```
   */
  RESOURCE_NOT_FOUND = 'RES_5000',

  /**
   * Resource already exists
   * 
   * Use when: Creating a resource that already exists
   * 
   * @example
   * ```typescript
   * const existing = await db.users.findByEmail(email);
   * if (existing) {
   *   throw createResourceError(
   *     EnterpriseErrorCode.RESOURCE_ALREADY_EXISTS,
   *     'User with this email already exists',
   *     'User',
   *     existing.id,
   *     { email, existingUserId: existing.id }
   *   );
   * }
   * ```
   */
  RESOURCE_ALREADY_EXISTS = 'RES_5001',

  /**
   * Resource locked
   * 
   * Use when: Resource is locked by another process/user
   * 
   * @example
   * ```typescript
   * const lock = await acquireLock(resourceId);
   * if (!lock.acquired) {
   *   throw createResourceError(
   *     EnterpriseErrorCode.RESOURCE_LOCKED,
   *     'Resource is currently being modified by another user',
   *     'Document',
   *     resourceId,
   *     { 
   *       lockedBy: lock.owner,
   *       lockedAt: lock.timestamp,
   *       expiresAt: lock.expiry
   *     }
   *   );
   * }
   * ```
   */
  RESOURCE_LOCKED = 'RES_5002',

  /**
   * Resource corrupted
   * 
   * Use when: Data integrity issues, checksum failures
   * 
   * @example
   * ```typescript
   * const checksum = calculateChecksum(data);
   * if (checksum !== expectedChecksum) {
   *   throw createResourceError(
   *     EnterpriseErrorCode.RESOURCE_CORRUPTED,
   *     'Data integrity check failed',
   *     'File',
   *     fileId,
   *     { 
   *       expectedChecksum,
   *       actualChecksum: checksum,
   *       corruptionDetected: true
   *     }
   *   );
   * }
   * ```
   */
  RESOURCE_CORRUPTED = 'RES_5003',

  // ============================================================================
  // Business Logic Errors (6000-6999)
  // Use for: Business rules, state machines, quotas
  // Severity: Typically LOW or MEDIUM
  // ============================================================================
  
  /**
   * Business rule violation
   * 
   * Use when: Business logic constraints are violated
   * 
   * @example
   * ```typescript
   * if (withdrawalAmount > account.balance) {
   *   throw createBusinessError(
   *     EnterpriseErrorCode.BUSINESS_RULE_VIOLATION,
   *     'Insufficient funds for withdrawal',
   *     'insufficient_funds',
   *     {
   *       requestedAmount: withdrawalAmount,
   *       availableBalance: account.balance,
   *       shortfall: withdrawalAmount - account.balance
   *     }
   *   );
   * }
   * ```
   */
  BUSINESS_RULE_VIOLATION = 'BIZ_6000',

  /**
   * Business state invalid
   * 
   * Use when: Operation not allowed in current state
   * 
   * @example
   * ```typescript
   * if (order.status !== 'pending') {
   *   throw createBusinessError(
   *     EnterpriseErrorCode.BUSINESS_STATE_INVALID,
   *     `Cannot cancel order with status: ${order.status}`,
   *     'order_cancellation',
   *     { 
   *       orderId: order.id,
   *       currentStatus: order.status,
   *       allowedStatuses: ['pending']
   *     }
   *   );
   * }
   * ```
   */
  BUSINESS_STATE_INVALID = 'BIZ_6001',

  /**
   * Business permission denied
   * 
   * Use when: Business-level permissions (not security)
   * 
   * @example
   * ```typescript
   * if (!subscription.hasFeature('premium_reports')) {
   *   throw createBusinessError(
   *     EnterpriseErrorCode.BUSINESS_PERMISSION_DENIED,
   *     'Premium subscription required for this feature',
   *     'feature_access',
   *     { 
   *       feature: 'premium_reports',
   *       currentPlan: subscription.plan,
   *       requiredPlan: 'premium'
   *     }
   *   );
   * }
   * ```
   */
  BUSINESS_PERMISSION_DENIED = 'BIZ_6002',

  /**
   * Business quota exceeded
   * 
   * Use when: Rate limits, usage quotas exceeded
   * 
   * @example
   * ```typescript
   * if (apiCallsThisMinute > rateLimit) {
   *   throw createBusinessError(
   *     EnterpriseErrorCode.BUSINESS_QUOTA_EXCEEDED,
   *     'API rate limit exceeded. Please try again later.',
   *     'rate_limit',
   *     { 
   *       limit: rateLimit,
   *       current: apiCallsThisMinute,
   *       resetTime: Date.now() + 60000
   *     }
   *   );
   * }
   * ```
   */
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
