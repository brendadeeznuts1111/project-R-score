/**
 * Unified Error Handling Types
 * Single source of truth for all error-related types in Odds-mono-map
 * 
 * @fileoverview Consolidated error types to eliminate duplication
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 */

// =============================================================================
// ERROR SEVERITY ENUMERATION
// =============================================================================

/**
 * Error severity levels for hierarchical error classification
 */
export enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

// =============================================================================
// ERROR CATEGORY ENUMERATION
// =============================================================================

/**
 * Error categories for better error organization and specialized handling
 */
export enum ErrorCategory {
    VALIDATION = 'validation',
    FILE_SYSTEM = 'file_system',
    NETWORK = 'network',
    CONFIGURATION = 'configuration',
    PLUGIN = 'plugin',
    TEMPLATE = 'template',
    VAULT = 'vault'
}

// =============================================================================
// BASE ERROR INTERFACES
// =============================================================================

/**
 * Base context interface for all error types
 * Provides essential debugging and localization information
 */
export interface BaseErrorContext {
    /** Script or module where the error occurred */
    script: string;
    /** Function or method where the error occurred */
    function: string;
    /** Line number where the error occurred (optional) */
    line?: number;
    /** File path where the error occurred (optional) */
    filePath?: string;
    /** Additional contextual data (using unknown for type safety) */
    additionalData?: Record<string, unknown>;
}

/**
 * Extended context interface for validation-specific errors
 */
export interface ValidationErrorContext extends BaseErrorContext {
    /** Field or property that failed validation */
    field: string;
    /** Optional error code for programmatic handling */
    code?: string;
}

/**
 * Extended context interface for template-specific errors
 */
export interface TemplateErrorContext extends ValidationErrorContext {
    /** Name of the template where the error occurred */
    templateName: string;
}

// =============================================================================
// ERROR RESULT INTERFACES
// =============================================================================

/**
 * Standard validation error interface
 * Used for field-level validation errors
 */
export interface ValidationError {
    /** Field or property that failed validation */
    field: string;
    /** Human-readable error message */
    message: string;
    /** Error severity level */
    severity: ErrorSeverity;
    /** Optional error code for programmatic handling */
    code?: string;
}

/**
 * Template-specific validation error
 * Extends base validation error with template-specific fields
 */
export interface TemplateValidationError extends ValidationError {
    /** Template severity using string literals for compatibility */
    severity: 'error' | 'warning' | 'info';
    /** Template name where the error occurred */
    templateName?: string;
}

/**
 * Template validation result interface
 * Aggregates all validation outcomes for a template
 */
export interface TemplateValidationResult {
    /** Overall validation status */
    isValid: boolean;
    /** List of error-level validation issues */
    errors: TemplateValidationError[];
    /** List of warning-level validation issues */
    warnings: TemplateValidationError[];
    /** List of info-level validation issues */
    info: TemplateValidationError[];
}

/**
 * Generic validation result interface
 * Used for non-template validation operations
 */
export interface ValidationResult {
    /** Overall validation status */
    isValid: boolean;
    /** List of validation errors */
    errors: ValidationError[];
    /** List of validation warnings */
    warnings: ValidationError[];
}

// =============================================================================
// ERROR REPORTING INTERFACES
// =============================================================================

/**
 * Error reporting configuration
 * Defines how errors should be reported and processed
 */
export interface ErrorReporting {
    /** Whether to report errors to external services */
    enabled: boolean;
    /** Minimum severity level to report */
    minSeverity: ErrorSeverity;
    /** List of error categories to include/exclude */
    categories: {
        include: ErrorCategory[];
        exclude: ErrorCategory[];
    };
    /** Custom reporting endpoints */
    endpoints: string[];
}

/**
 * Error analytics data
 * Used for tracking error patterns and system health
 */
export interface ErrorAnalytics {
    /** Total error count by severity */
    errorsBySeverity: Record<ErrorSeverity, number>;
    /** Total error count by category */
    errorsByCategory: Record<ErrorCategory, number>;
    /** Most frequent error types */
    topErrors: Array<{
        message: string;
        count: number;
        lastOccurrence: Date;
    }>;
    /** Error trends over time */
    trends: Array<{
        timestamp: Date;
        errorCount: number;
        severity: ErrorSeverity;
    }>;
}

// =============================================================================
// ERROR HANDLER INTERFACES
// =============================================================================

/**
 * Error handler configuration
 * Defines behavior and settings for error handling systems
 */
export interface ErrorHandlerConfig {
    /** Maximum log file size in bytes */
    maxLogSize: number;
    /** Log file retention period in days */
    retentionDays: number;
    /** Whether to enable console output */
    enableConsoleOutput: boolean;
    /** Minimum severity for console output */
    consoleMinSeverity: ErrorSeverity;
    /** Error reporting configuration */
    reporting: ErrorReporting;
}

/**
 * Error handler interface
 * Defines the contract for error handling implementations
 */
export interface IErrorHandler {
    /** Handle an error with given context */
    handleError(error: Error, context: BaseErrorContext): void;
    /** Handle a validation error */
    handleValidationError(message: string, field: string, code?: string): void;
    /** Handle a file system error */
    handleFileSystemError(error: Error, operation: string, filePath: string): void;
    /** Handle a template error */
    handleTemplateError(message: string, templateName: string, field?: string): void;
    /** Get error analytics */
    getAnalytics(): ErrorAnalytics;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard functions for error type checking
 */

/**
 * Checks if a value is a valid ErrorSeverity
 */
export function isErrorSeverity(value: unknown): value is ErrorSeverity {
    return typeof value === 'string' &&
        Object.values(ErrorSeverity).includes(value as ErrorSeverity);
}

/**
 * Checks if a value is a valid ErrorCategory
 */
export function isErrorCategory(value: unknown): value is ErrorCategory {
    return typeof value === 'string' &&
        Object.values(ErrorCategory).includes(value as ErrorCategory);
}

/**
 * Checks if an object implements BaseErrorContext
 */
export function isBaseErrorContext(obj: unknown): obj is BaseErrorContext {
    return typeof obj === 'object' && obj !== null &&
        'script' in obj && typeof (obj as any).script === 'string' &&
        'function' in obj && typeof (obj as any).function === 'string';
}

/**
 * Checks if an object implements ValidationError
 */
export function isValidationError(obj: unknown): obj is ValidationError {
    return typeof obj === 'object' && obj !== null &&
        'field' in obj && typeof (obj as any).field === 'string' &&
        'message' in obj && typeof (obj as any).message === 'string' &&
        'severity' in obj && isErrorSeverity((obj as any).severity);
}

/**
 * Checks if an object implements TemplateValidationError
 */
export function isTemplateValidationError(obj: unknown): obj is TemplateValidationError {
    return isValidationError(obj) &&
        ['error', 'warning', 'info'].includes((obj as any).severity);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Utility functions for error type operations
 */

/**
 * Gets the numeric weight of an error severity for comparison
 */
export function getSeverityWeight(severity: ErrorSeverity): number {
    switch (severity) {
        case ErrorSeverity.LOW: return 1;
        case ErrorSeverity.MEDIUM: return 2;
        case ErrorSeverity.HIGH: return 3;
        case ErrorSeverity.CRITICAL: return 4;
        default: return 2;
    }
}

/**
 * Compares two error severities
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareSeverity(a: ErrorSeverity, b: ErrorSeverity): number {
    const weightA = getSeverityWeight(a);
    const weightB = getSeverityWeight(b);
    return weightA - weightB;
}

/**
 * Checks if severity a is higher than severity b
 */
export function isHigherSeverity(a: ErrorSeverity, b: ErrorSeverity): boolean {
    return compareSeverity(a, b) > 0;
}

/**
 * Creates a standardized error context
 */
export function createErrorContext(
    script: string,
    function: string,
options: Partial<BaseErrorContext> = {}
): BaseErrorContext {
    return {
        script,
        function,
        line: options.line,
        filePath: options.filePath,
        additionalData: options.additionalData
    };
}

/**
 * Creates a validation error context
 */
export function createValidationContext(
    script: string,
    function: string,
field: string,
    options: Partial<ValidationErrorContext> = {}
): ValidationErrorContext {
    return {
        ...createErrorContext(script, function, options),
        field,
        code: options.code
    };
}

/**
 * Creates a template error context
 */
export function createTemplateContext(
    script: string,
    function: string,
templateName: string,
    field: string,
        options: Partial<TemplateErrorContext> = {}
): TemplateErrorContext {
    return {
        ...createValidationContext(script, function, field, options),
        templateName
    };
}

// =============================================================================
// EXPORTS
// =============================================================================

// Export all types and utilities
export {
    // Re-export for convenience
    BaseErrorContext as ErrorContext,
    ValidationErrorContext,
    TemplateErrorContext,
    ErrorReporting as ReportingConfig,
    ErrorAnalytics as Analytics,
    ErrorHandlerConfig as Config,
    IErrorHandler as Handler
};

// Default export with commonly used types
export default {
    ErrorSeverity,
    ErrorCategory,
    BaseErrorContext,
    ValidationError,
    TemplateValidationError,
    TemplateValidationResult,
    ValidationResult,
    ErrorReporting,
    ErrorAnalytics,
    ErrorHandlerConfig,
    IErrorHandler,
    // Type guards
    isErrorSeverity,
    isErrorCategory,
    isBaseErrorContext,
    isValidationError,
    isTemplateValidationError,
    // Utilities
    getSeverityWeight,
    compareSeverity,
    isHigherSeverity,
    createErrorContext,
    createValidationContext,
    createTemplateContext
};
