/**
 * Fire22 Error Handling Middleware
 *
 * Global error boundary and request wrapping for consistent error handling
 */

import { ErrorHandler } from './ErrorHandler';
import { ERROR_CODES } from './types';

export interface RequestHandler {
  (request: Request, env: any, ctx?: ExecutionContext): Promise<Response>;
}

export interface ErrorMiddlewareOptions {
  isDevelopment?: boolean;
  enableCORS?: boolean;
  corsOrigins?: string[];
}

/**
 * Global error boundary middleware
 */
export function withErrorHandling(
  handler: RequestHandler,
  options: ErrorMiddlewareOptions = {}
): RequestHandler {
  const errorHandler = ErrorHandler.getInstance(options.isDevelopment);

  return async (request: Request, env: any, ctx?: ExecutionContext): Promise<Response> => {
    try {
      // Add correlation ID to request headers for tracing
      const correlationId = `fire22_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create a new request with correlation header
      const enhancedRequest = new Request(request, {
        headers: {
          ...Object.fromEntries(request.headers.entries()),
          'x-correlation-id': correlationId,
        },
      });

      // Execute the main handler
      const response = await handler(enhancedRequest, env, ctx);

      // Add correlation ID to response headers
      const enhancedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'x-correlation-id': correlationId,
        },
      });

      // Add CORS headers if enabled
      if (options.enableCORS) {
        return addCORSHeaders(enhancedResponse, options.corsOrigins);
      }

      return enhancedResponse;
    } catch (error) {
      console.error('Unhandled error in request handler:', error);

      // Handle different types of errors
      if (error instanceof Error) {
        if (error.message.includes('database') || error.message.includes('D1')) {
          return errorHandler.handleDatabaseError(error, request);
        }

        if (error.message.includes('fetch') || error.message.includes('network')) {
          return errorHandler.handleExternalServiceError('external-api', error, request);
        }

        return errorHandler.handleGenericError(error, request);
      }

      // Handle non-Error objects
      const genericError = new Error(typeof error === 'string' ? error : 'Unknown error occurred');
      return errorHandler.handleGenericError(genericError, request);
    }
  };
}

/**
 * Database operation wrapper with error handling
 */
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string,
  request?: Request
): Promise<T> {
  const errorHandler = ErrorHandler.getInstance();

  try {
    return await operation();
  } catch (error) {
    console.error(`Database error in ${operationName}:`, error);
    throw errorHandler.createError(
      ERROR_CODES.DATABASE_ERROR,
      `Database operation failed: ${operationName}`,
      request,
      error as Error,
      { operationName }
    );
  }
}

/**
 * External service call wrapper with error handling
 */
export async function withExternalServiceErrorHandling<T>(
  operation: () => Promise<T>,
  serviceName: string,
  request?: Request
): Promise<T> {
  const errorHandler = ErrorHandler.getInstance();

  try {
    return await operation();
  } catch (error) {
    console.error(`External service error for ${serviceName}:`, error);
    throw errorHandler.createError(
      ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      `External service failed: ${serviceName}`,
      request,
      error as Error,
      { serviceName }
    );
  }
}

/**
 * Add CORS headers to response
 */
export function addCORSHeaders(response: Response, allowedOrigins: string[] = ['*']): Response {
  const headers = new Headers(response.headers);

  // Handle origin
  if (allowedOrigins.includes('*')) {
    headers.set('Access-Control-Allow-Origin', '*');
  } else {
    // In production, check against allowed origins
    headers.set('Access-Control-Allow-Origin', allowedOrigins[0]);
  }

  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, X-Correlation-Id'
  );
  headers.set('Access-Control-Expose-Headers', 'X-Correlation-Id, X-Error-Code');
  headers.set('Access-Control-Max-Age', '86400');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Handle CORS preflight requests
 */
export function handleCORSPreflight(
  request: Request,
  allowedOrigins: string[] = ['*']
): Response | null {
  if (request.method === 'OPTIONS') {
    const headers = new Headers();

    if (allowedOrigins.includes('*')) {
      headers.set('Access-Control-Allow-Origin', '*');
    } else {
      headers.set('Access-Control-Allow-Origin', allowedOrigins[0]);
    }

    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, X-Correlation-Id'
    );
    headers.set('Access-Control-Max-Age', '86400');

    return new Response(null, { status: 204, headers });
  }

  return null;
}

/**
 * Create success response with consistent format
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  meta?: Record<string, any>
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      message: message || 'Operation completed successfully',
      data,
      meta,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Validation error helper
 */
export function createValidationError(
  message: string,
  field?: string,
  value?: any,
  request?: Request
): Response {
  const errorHandler = ErrorHandler.getInstance();
  const error = errorHandler.createError(ERROR_CODES.INVALID_INPUT, message, request, undefined, {
    field,
    value,
  });

  return errorHandler.createErrorResponse(error);
}

/**
 * Authentication error helper
 */
export function createAuthError(
  message: string = 'Authentication required',
  request?: Request
): Response {
  const errorHandler = ErrorHandler.getInstance();
  const error = errorHandler.createError(ERROR_CODES.UNAUTHORIZED, message, request);

  return errorHandler.createErrorResponse(error);
}

/**
 * Not found error helper
 */
export function createNotFoundError(resource: string, request?: Request): Response {
  const errorHandler = ErrorHandler.getInstance();
  const error = errorHandler.createError(
    ERROR_CODES.NOT_FOUND,
    `${resource} not found`,
    request,
    undefined,
    { resource }
  );

  return errorHandler.createErrorResponse(error);
}

/**
 * Rate limit error helper
 */
export function createRateLimitError(limit: number, window: string, request?: Request): Response {
  const errorHandler = ErrorHandler.getInstance();
  const error = errorHandler.createError(
    ERROR_CODES.RATE_LIMITED,
    `Rate limit exceeded: ${limit} requests per ${window}`,
    request,
    undefined,
    { limit, window }
  );

  return errorHandler.createErrorResponse(error);
}
