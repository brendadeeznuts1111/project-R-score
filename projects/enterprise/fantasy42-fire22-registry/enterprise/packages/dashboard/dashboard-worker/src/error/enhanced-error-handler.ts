import { ErrorResponse } from '../types/enhanced-types';

// EnhancedError class implementation
export class EnhancedError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly details: Record<string, any>;
  public readonly timestamp: string;
  public readonly requestId?: string;

  constructor(
    code: string,
    message: string,
    details?: Record<string, any>,
    httpStatus: number = 500
  ) {
    super(message);
    this.name = 'EnhancedError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details || {};
    this.timestamp = new Date().toISOString();
    this.requestId = generateRequestId();

    // Ensure proper prototype chain
    Object.setPrototypeOf(this, EnhancedError.prototype);
  }
}

/**
 * Creates an enhanced error with standardized structure
 * @param code Error code for identification
 * @param message Human-readable error message
 * @param details Additional error context
 * @param httpStatus HTTP status code
 * @returns EnhancedError instance
 */
export function createEnhancedError(
  code: string,
  message: string,
  details?: Record<string, any>,
  httpStatus: number = 500
): EnhancedError {
  return new EnhancedError(code, message, details, httpStatus);
}

/**
 * Formats an enhanced error into a standardized error response
 * @param error EnhancedError instance
 * @returns ErrorResponse object
 */
export function formatErrorResponse(error: EnhancedError): ErrorResponse {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: error.timestamp,
      requestId: error.requestId,
    },
  };
}

/**
 * Handles API errors and returns appropriate HTTP response
 * @param error Error to handle
 * @returns Response object
 */
export function handleApiError(error: unknown): Response {
  if (error instanceof EnhancedError) {
    const errorResponse = formatErrorResponse(error);
    return new Response(JSON.stringify(errorResponse), {
      status: error.httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'X-Error-Code': error.code,
        'X-Request-ID': error.requestId || '',
        'X-Timestamp': error.timestamp,
      },
    });
  }

  // Handle unknown errors
  const unknownError = createEnhancedError(
    'INTERNAL_ERROR',
    'An unexpected error occurred',
    { originalError: error instanceof Error ? error.message : String(error) },
    500
  );

  const errorResponse = formatErrorResponse(unknownError);
  return new Response(JSON.stringify(errorResponse), {
    status: 500,
    headers: {
      'Content-Type': 'application/json',
      'X-Error-Code': 'INTERNAL_ERROR',
      'X-Request-ID': unknownError.requestId || '',
      'X-Timestamp': unknownError.timestamp,
    },
  });
}

/**
 * Wraps an async function with error handling
 * @param fn Async function to wrap
 * @param context Context information for error logging
 * @returns Wrapped function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: string
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      const enhancedError =
        error instanceof EnhancedError
          ? error
          : createEnhancedError(
              'HANDLER_ERROR',
              `Error in ${context}: ${error instanceof Error ? error.message : String(error)}`,
              { originalError: error instanceof Error ? error.stack : undefined },
              (error as EnhancedError)?.httpStatus || 500
            );

      throw enhancedError;
    }
  };
}

/**
 * Validates required fields in an object
 * @param data Object to validate
 * @param requiredFields Array of required field names
 * @param context Context for error messages
 * @throws EnhancedError if validation fails
 */
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[],
  context: string = 'Validation'
): void {
  const missingFields = requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length > 0) {
    throw createEnhancedError(
      'VALIDATION_ERROR',
      `Missing required fields: ${missingFields.join(', ')}`,
      { missingFields, providedFields: Object.keys(data) },
      400
    );
  }
}

/**
 * Validates data types in an object
 * @param data Object to validate
 * @param schema Schema definition for validation
 * @param context Context for error messages
 * @throws EnhancedError if validation fails
 */
export function validateDataTypes(
  data: Record<string, any>,
  schema: Record<string, string>,
  context: string = 'Type Validation'
): void {
  const errors: string[] = [];

  for (const [field, expectedType] of Object.entries(schema)) {
    const value = data[field];

    if (value === undefined || value === null) {
      continue; // Required field validation should be done separately
    }

    const actualType = typeof value;

    if (actualType !== expectedType) {
      errors.push(`Field '${field}' expected type '${expectedType}' but got '${actualType}'`);
    }
  }

  if (errors.length > 0) {
    throw createEnhancedError(
      'TYPE_VALIDATION_ERROR',
      `Type validation failed in ${context}`,
      { errors, providedData: data },
      400
    );
  }
}

/**
 * Generates a unique request ID
 * @returns Unique request ID string
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Error codes registry for consistent error handling
 */
export const ErrorCodes = {
  // Authentication errors
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',

  // Authorization errors
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TYPE_VALIDATION_ERROR: 'TYPE_VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // API errors
  API_ERROR: 'API_ERROR',
  API_TIMEOUT: 'API_TIMEOUT',
  API_UNAVAILABLE: 'API_UNAVAILABLE',

  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Security errors
  SECURITY_VIOLATION: 'SECURITY_VIOLATION',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  INVALID_CSRF_TOKEN: 'INVALID_CSRF_TOKEN',
} as const;

/**
 * HTTP status codes mapping
 */
export const HttpStatusCodes = {
  200: 'OK',
  201: 'CREATED',
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
} as const;
