/**
 * Response Manager
 * Handles standardized API responses, error formatting, and content negotiation
 */

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    field?: string;
  };
  timestamp: string;
  requestId: string;
  version?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  metadata?: Record<string, any>;
}

export interface ErrorDefinition {
  code: string;
  message: string;
  statusCode: number;
  category: 'client' | 'server' | 'auth' | 'validation' | 'rate_limit';
  retryable: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface ResponseConfig {
  includeStackTrace: boolean;
  includeRequestDetails: boolean;
  defaultLanguage: string;
  supportedLanguages: string[];
  enableCompression: boolean;
  maxResponseSize: number;
}

export class ResponseManager {
  private config: ResponseConfig;
  private errorDefinitions: Map<string, ErrorDefinition> = new Map();

  constructor(config: ResponseConfig) {
    this.config = config;
    this.initializeErrorDefinitions();
  }

  /**
   * Initialize standard error definitions
   */
  private initializeErrorDefinitions(): void {
    const errors: ErrorDefinition[] = [
      // Authentication errors
      {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        statusCode: 401,
        category: 'auth',
        retryable: false,
        logLevel: 'info',
      },
      {
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
        statusCode: 403,
        category: 'auth',
        retryable: false,
        logLevel: 'warn',
      },
      {
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired',
        statusCode: 401,
        category: 'auth',
        retryable: true,
        logLevel: 'info',
      },
      {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
        statusCode: 401,
        category: 'auth',
        retryable: false,
        logLevel: 'warn',
      },

      // Validation errors
      {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        statusCode: 400,
        category: 'validation',
        retryable: false,
        logLevel: 'info',
      },
      {
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Required field is missing',
        statusCode: 400,
        category: 'validation',
        retryable: false,
        logLevel: 'info',
      },
      {
        code: 'INVALID_FORMAT',
        message: 'Invalid data format',
        statusCode: 400,
        category: 'validation',
        retryable: false,
        logLevel: 'info',
      },

      // Client errors
      {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        statusCode: 404,
        category: 'client',
        retryable: false,
        logLevel: 'info',
      },
      {
        code: 'METHOD_NOT_ALLOWED',
        message: 'HTTP method not allowed',
        statusCode: 405,
        category: 'client',
        retryable: false,
        logLevel: 'info',
      },
      {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported media type',
        statusCode: 415,
        category: 'client',
        retryable: false,
        logLevel: 'info',
      },

      // Rate limiting
      {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded',
        statusCode: 429,
        category: 'rate_limit',
        retryable: true,
        logLevel: 'warn',
      },

      // Server errors
      {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        statusCode: 500,
        category: 'server',
        retryable: true,
        logLevel: 'error',
      },
      {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service temporarily unavailable',
        statusCode: 503,
        category: 'server',
        retryable: true,
        logLevel: 'error',
      },
      {
        code: 'DATABASE_ERROR',
        message: 'Database operation failed',
        statusCode: 500,
        category: 'server',
        retryable: true,
        logLevel: 'error',
      },

      // Custom errors
      {
        code: 'UNSUPPORTED_API_VERSION',
        message: 'API version not supported',
        statusCode: 406,
        category: 'client',
        retryable: false,
        logLevel: 'info',
      },
      {
        code: 'FEATURE_DISABLED',
        message: 'Feature is currently disabled',
        statusCode: 403,
        category: 'client',
        retryable: false,
        logLevel: 'info',
      },
    ];

    errors.forEach(error => this.errorDefinitions.set(error.code, error));
  }

  /**
   * Create success response
   */
  createSuccessResponse<T>(
    data: T,
    requestId: string,
    options: {
      pagination?: APIResponse['pagination'];
      metadata?: Record<string, any>;
      version?: string;
      statusCode?: number;
    } = {}
  ): Response {
    const response: APIResponse<T> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      requestId,
      ...options,
    };

    return new Response(JSON.stringify(response), {
      status: options.statusCode || 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        ...(options.version && { 'X-API-Version': options.version }),
      },
    });
  }

  /**
   * Create error response
   */
  createErrorResponse(
    errorCode: string,
    requestId: string,
    options: {
      details?: any;
      field?: string;
      version?: string;
      customMessage?: string;
      statusCode?: number;
    } = {}
  ): Response {
    const errorDef = this.errorDefinitions.get(errorCode);

    if (!errorDef) {
      // Unknown error code
      return this.createErrorResponse('INTERNAL_ERROR', requestId, {
        details: { originalErrorCode: errorCode },
      });
    }

    const errorResponse: APIResponse = {
      success: false,
      error: {
        code: errorCode,
        message: options.customMessage || errorDef.message,
        details: options.details,
        field: options.field,
      },
      timestamp: new Date().toISOString(),
      requestId,
      version: options.version,
    };

    // Log error based on level
    const logMessage = `[${errorCode}] ${errorDef.message}`;
    switch (errorDef.logLevel) {
      case 'debug':
        console.debug(logMessage, { requestId, details: options.details });
        break;
      case 'info':
        console.info(logMessage, { requestId, details: options.details });
        break;
      case 'warn':
        console.warn(logMessage, { requestId, details: options.details });
        break;
      case 'error':
        console.error(logMessage, { requestId, details: options.details });
        break;
    }

    const statusCode = options.statusCode || errorDef.statusCode;

    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        'X-Error-Code': errorCode,
        'X-Error-Category': errorDef.category,
        ...(options.version && { 'X-API-Version': options.version }),
        ...(errorDef.retryable && { 'Retry-After': '60' }),
        ...(errorDef.category === 'rate_limit' && { 'X-RateLimit-Reset': '60' }),
      },
    });
  }

  /**
   * Create paginated response
   */
  createPaginatedResponse<T>(
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
    },
    requestId: string,
    options: {
      metadata?: Record<string, any>;
      version?: string;
    } = {}
  ): Response {
    const totalPages = Math.ceil(pagination.total / pagination.limit);

    const response: APIResponse<T[]> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      requestId,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1,
      },
      ...options,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        'X-Total-Count': pagination.total.toString(),
        'X-Page-Count': totalPages.toString(),
        'X-Current-Page': pagination.page.toString(),
        ...(options.version && { 'X-API-Version': options.version }),
      },
    });
  }

  /**
   * Create streaming response
   */
  createStreamingResponse(
    generator: () => AsyncIterable<any>,
    requestId: string,
    options: {
      version?: string;
      contentType?: string;
    } = {}
  ): Response {
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of generator()) {
            const data = JSON.stringify(chunk) + '\n';
            controller.enqueue(new TextEncoder().encode(data));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': options.contentType || 'application/json',
        'X-Request-ID': requestId,
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        ...(options.version && { 'X-API-Version': options.version }),
      },
    });
  }

  /**
   * Handle content negotiation
   */
  negotiateContent(
    request: Request,
    data: any,
    requestId: string,
    options: {
      version?: string;
      supportedFormats?: string[];
    } = {}
  ): Response {
    const accept = request.headers.get('Accept') || 'application/json';
    const supportedFormats = options.supportedFormats || ['application/json'];

    // Simple content negotiation
    if (accept.includes('application/json') || supportedFormats.includes(accept)) {
      return this.createSuccessResponse(data, requestId, options);
    }

    // Unsupported format
    return this.createErrorResponse('UNSUPPORTED_MEDIA_TYPE', requestId, {
      details: { requested: accept, supported: supportedFormats },
      version: options.version,
    });
  }

  /**
   * Validate response size
   */
  validateResponseSize(data: any): boolean {
    const size = JSON.stringify(data).length;
    return size <= this.config.maxResponseSize;
  }

  /**
   * Sanitize error details for client
   */
  sanitizeErrorDetails(details: any, includeStackTrace: boolean = false): any {
    if (!details) return undefined;

    // Remove sensitive information
    const sanitized = { ...details };

    // Remove stack traces unless explicitly enabled
    if (!includeStackTrace && sanitized.stack) {
      delete sanitized.stack;
    }

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'credentials'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Get error definition
   */
  getErrorDefinition(code: string): ErrorDefinition | undefined {
    return this.errorDefinitions.get(code);
  }

  /**
   * Add custom error definition
   */
  addErrorDefinition(definition: ErrorDefinition): void {
    this.errorDefinitions.set(definition.code, definition);
  }

  /**
   * Create health check response
   */
  createHealthResponse(
    health: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      services: Record<string, { status: string; latency?: number; uptime?: number }>;
      timestamp: Date;
    },
    requestId: string
  ): Response {
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 207 : 503;

    return this.createSuccessResponse(health, requestId, {
      statusCode,
      metadata: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
      },
    });
  }

  /**
   * Create API info response
   */
  createAPIInfoResponse(
    info: {
      name: string;
      description: string;
      version: string;
      endpoints: string[];
      documentation: string;
    },
    requestId: string
  ): Response {
    return this.createSuccessResponse(info, requestId, {
      metadata: {
        server: 'Fire22 Dashboard Worker',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Format validation errors
   */
  formatValidationErrors(errors: any[]): {
    code: string;
    message: string;
    details: { field: string; message: string }[];
  } {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: errors.map(error => ({
        field: error.field || 'unknown',
        message: error.message || 'Invalid value',
      })),
    };
  }

  /**
   * Get all error definitions
   */
  getAllErrorDefinitions(): ErrorDefinition[] {
    return Array.from(this.errorDefinitions.values());
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byCategory: Record<string, number>;
    byStatusCode: Record<number, number>;
  } {
    const errors = Array.from(this.errorDefinitions.values());
    const byCategory: Record<string, number> = {};
    const byStatusCode: Record<number, number> = {};

    errors.forEach(error => {
      byCategory[error.category] = (byCategory[error.category] || 0) + 1;
      byStatusCode[error.statusCode] = (byStatusCode[error.statusCode] || 0) + 1;
    });

    return {
      total: errors.length,
      byCategory,
      byStatusCode,
    };
  }
}

// Default response configuration
export const defaultResponseConfig: ResponseConfig = {
  includeStackTrace: false,
  includeRequestDetails: true,
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'es', 'fr', 'de'],
  enableCompression: true,
  maxResponseSize: 10 * 1024 * 1024, // 10MB
};
