#!/usr/bin/env bun
// packages/cli/types/errors.ts - Error Handling Types and Classes

/**
 * ErrorCode Enum - Standardized error codes for CLI operations
 */
export enum ErrorCode {
  PlatformUnsupported = 'PLATFORM_UNSUPPORTED',
  SecretsAccessDenied = 'SECRETS_ACCESS_DENIED',
  ConfigInvalid = 'CONFIG_INVALID',
  OperationTimeout = 'OPERATION_TIMEOUT',
  DependencyMissing = 'DEPENDENCY_MISSING',
  CommandNotFound = 'COMMAND_NOT_FOUND',
  InvalidOptions = 'INVALID_OPTIONS',
  FileNotFound = 'FILE_NOT_FOUND',
  PermissionDenied = 'PERMISSION_DENIED',
  NetworkError = 'NETWORK_ERROR',
  ValidationFailed = 'VALIDATION_FAILED',
  InternalError = 'INTERNAL_ERROR'
}

/**
 * CLIErrorContext Interface - Contextual information about an error
 */
export interface CLIErrorContext {
  command: string; // Command that generated the error
  operation: string; // Specific operation that failed
  platform: NodeJS.Platform; // OS platform
  timestamp: Date; // When error occurred
  details?: Record<string, any>; // Additional context
  stack?: string; // Stack trace if available
}

/**
 * CLIError Class - Custom error type for CLI operations
 * Extends Error with structured error information
 */
export class CLIError extends Error {
  public readonly code: string;
  public readonly context?: CLIErrorContext;
  public readonly suggestions?: string[];

  constructor(
    code: string,
    message: string,
    context?: CLIErrorContext,
    suggestions?: string[]
  ) {
    super(message);
    this.name = 'CLIError';
    this.code = code;
    this.context = context;
    this.suggestions = suggestions;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, CLIError.prototype);
  }

  /**
   * Get human-readable error message with context
   */
  public getFullMessage(): string {
    let message = `[${this.code}] ${this.message}`;
    
    if (this.context?.details) {
      message += `\n  Details: ${JSON.stringify(this.context.details)}`;
    }
    
    if (this.suggestions && this.suggestions.length > 0) {
      message += '\n  Suggestions:';
      this.suggestions.forEach(suggestion => {
        message += `\n    - ${suggestion}`;
      });
    }
    
    return message;
  }

  /**
   * Serialize error to JSON for logging
   */
  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      suggestions: this.suggestions
    };
  }
}

/**
 * ValidationError Class - Specific error for validation failures
 */
export class ValidationError extends CLIError {
  constructor(
    message: string,
    public field: string,
    public value: any,
    context?: CLIErrorContext
  ) {
    super(
      ErrorCode.ValidationFailed,
      `Validation failed for field '${field}': ${message}`,
      context,
      [`Check that '${field}' value is correct`, `Received: ${JSON.stringify(value)}`]
    );
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * ConfigError Class - Configuration-specific errors
 */
export class ConfigError extends CLIError {
  constructor(
    message: string,
    public configPath: string,
    context?: CLIErrorContext
  ) {
    super(
      ErrorCode.ConfigInvalid,
      `Configuration error: ${message}`,
      context,
      [
        `Check configuration file at: ${configPath}`,
        'Run "empire-pro init" to create a valid configuration',
        'Use "empire-pro config --help" for more information'
      ]
    );
    this.name = 'ConfigError';
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}

/**
 * SecretsError Class - Secrets management-specific errors
 */
export class SecretsError extends CLIError {
  constructor(
    message: string,
    public operation: string,
    context?: CLIErrorContext
  ) {
    super(
      ErrorCode.SecretsAccessDenied,
      `Secrets operation failed: ${message}`,
      context,
      [
        'Ensure Bun.secrets is properly configured',
        `Check permissions for '${operation}' operation`,
        'Verify platform-specific secret storage is available'
      ]
    );
    this.name = 'SecretsError';
    Object.setPrototypeOf(this, SecretsError.prototype);
  }
}

/**
 * PlatformError Class - Platform compatibility errors
 */
export class PlatformError extends CLIError {
  constructor(
    message: string,
    public platform: NodeJS.Platform,
    context?: CLIErrorContext
  ) {
    super(
      ErrorCode.PlatformUnsupported,
      `Platform not supported: ${message}`,
      context,
      [
        `This feature is not available on ${platform}`,
        'Ensure you are using a supported platform (Windows, macOS, Linux)'
      ]
    );
    this.name = 'PlatformError';
    Object.setPrototypeOf(this, PlatformError.prototype);
  }
}

/**
 * TimeoutError Class - Operation timeout errors
 */
export class TimeoutError extends CLIError {
  constructor(
    message: string,
    public timeoutMs: number,
    context?: CLIErrorContext
  ) {
    super(
      ErrorCode.OperationTimeout,
      `Operation timed out after ${timeoutMs}ms: ${message}`,
      context,
      [
        'The operation took too long to complete',
        'Try increasing the timeout value with --timeout flag',
        'Check network connectivity for remote operations'
      ]
    );
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * ErrorSuggestions Map - Common error codes with suggested resolutions
 */
export const ErrorSuggestions: Record<ErrorCode, string[]> = {
  [ErrorCode.PlatformUnsupported]: [
    'This feature requires a different operating system',
    'Check the documentation for platform-specific alternatives'
  ],
  [ErrorCode.SecretsAccessDenied]: [
    'Check system permissions for secret storage',
    'Ensure platform-specific credential manager is running'
  ],
  [ErrorCode.ConfigInvalid]: [
    'Validate configuration file format',
    'Use "empire-pro init" to create a new configuration'
  ],
  [ErrorCode.OperationTimeout]: [
    'The operation took too long',
    'Try again or increase timeout value'
  ],
  [ErrorCode.DependencyMissing]: [
    'Install missing dependencies with package manager',
    'Check project documentation for setup requirements'
  ],
  [ErrorCode.CommandNotFound]: [
    'Check command name spelling',
    'Run "empire-pro --help" for available commands'
  ],
  [ErrorCode.InvalidOptions]: [
    'Review command options with --help',
    'Validate option format and values'
  ],
  [ErrorCode.FileNotFound]: [
    'Check file path exists and is accessible',
    'Verify permissions for file access'
  ],
  [ErrorCode.PermissionDenied]: [
    'Check file/directory permissions',
    'Ensure your user has required access level'
  ],
  [ErrorCode.NetworkError]: [
    'Check network connectivity',
    'Verify remote service is accessible'
  ],
  [ErrorCode.ValidationFailed]: [
    'Review input values against requirements',
    'Check data type and format'
  ],
  [ErrorCode.InternalError]: [
    'This is an internal error - please report it',
    'Include error details when reporting issue'
  ]
};

export default {
  ErrorCode,
  CLIError,
  ValidationError,
  ConfigError,
  SecretsError,
  PlatformError,
  TimeoutError,
  CLIErrorContext,
  ErrorSuggestions
};