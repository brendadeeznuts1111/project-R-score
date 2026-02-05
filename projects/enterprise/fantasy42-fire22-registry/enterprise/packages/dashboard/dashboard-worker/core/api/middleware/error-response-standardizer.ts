/**
 * 🎯 API Error Response Standardization Middleware
 * Ensures consistent error responses across all Fire22 APIs
 * Integrates with error registry and tracking system
 */

import type { Context } from 'hono';
import { ERROR_MESSAGES } from '../constants';
import { errorTracker } from '../../scripts/error-system/error-tracker';
import { readFileSync } from 'fs';
import { join } from 'path';

interface StandardErrorResponse {
  success: false;
  error: {
    code: string;
    name: string;
    message: string;
    severity: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';
    category: string;
    httpStatusCode: number;
    timestamp: string;
    requestId?: string;
    documentation?: {
      primary: string;
      troubleshooting: string;
      apiReference: string;
    };
    context?: {
      endpoint: string;
      method: string;
      userAgent?: string;
      solutions: string[];
      relatedCodes: string[];
    };
    debug?: {
      stack?: string;
      correlationId?: string;
      userId?: string;
      sessionId?: string;
      traceId?: string;
    };
  };
  metadata?: {
    processingTime?: number;
    retryAfter?: number;
    supportTicket?: string;
  };
}

interface ErrorRegistryCache {
  errorCodes: Record<
    string,
    {
      code: string;
      name: string;
      message: string;
      severity: string;
      category: string;
      httpStatusCode: number;
      description: string;
      solutions: string[];
      documentation: Array<{
        title: string;
        url: string;
        type: string;
      }>;
      relatedCodes: string[];
    }
  >;
  lastUpdated: Date;
}

class ErrorResponseStandardizer {
  private static instance: ErrorResponseStandardizer;
  private registryCache: ErrorRegistryCache | null = null;
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  static getInstance(): ErrorResponseStandardizer {
    if (!ErrorResponseStandardizer.instance) {
      ErrorResponseStandardizer.instance = new ErrorResponseStandardizer();
    }
    return ErrorResponseStandardizer.instance;
  }

  /**
   * Load error registry with caching
   */
  private loadErrorRegistry(): ErrorRegistryCache['errorCodes'] {
    const now = new Date();

    // Check cache validity
    if (
      this.registryCache &&
      now.getTime() - this.registryCache.lastUpdated.getTime() < this.cacheExpiry
    ) {
      return this.registryCache.errorCodes;
    }

    try {
      const registryPath = join(process.cwd(), 'docs', 'error-codes.json');
      const content = readFileSync(registryPath, 'utf-8');
      const registry = JSON.parse(content);

      this.registryCache = {
        errorCodes: registry.errorCodes || {},
        lastUpdated: now,
      };

      return this.registryCache.errorCodes;
    } catch (error) {
      console.warn('⚠️ Failed to load error registry, using fallback:', error.message);
      return {};
    }
  }

  /**
   * Create standardized error response
   */
  createErrorResponse(
    errorCodeOrMessage: string,
    context: {
      request?: Request | Context;
      originalError?: Error;
      statusCode?: number;
      requestId?: string;
      userId?: string;
      sessionId?: string;
      includeDebug?: boolean;
      metadata?: Record<string, unknown>;
    } = {}
  ): StandardErrorResponse {
    const registry = this.loadErrorRegistry();
    const startTime = (context.metadata?.startTime as number) || Date.now();

    // Determine if input is error code or message
    const isErrorCode = /^E[1-8]\d{3}$/.test(errorCodeOrMessage);
    let errorDetails: any;
    let errorCode: string;

    if (isErrorCode) {
      errorCode = errorCodeOrMessage;
      errorDetails = registry[errorCode];
    } else {
      // Try to find error code from message in constants
      errorCode = this.findErrorCodeFromMessage(errorCodeOrMessage);
      errorDetails = registry[errorCode];
    }

    // Fallback to generic error if not found
    if (!errorDetails) {
      errorDetails = {
        code: errorCode || 'E5000',
        name: 'UNKNOWN_ERROR',
        message: errorCodeOrMessage,
        severity: 'ERROR',
        category: 'APPLICATION',
        httpStatusCode: context.statusCode || 500,
        description: 'An unknown error occurred',
        solutions: ['Contact support if this error persists'],
        documentation: [],
        relatedCodes: [],
      };
    }

    // Track error occurrence
    if (errorTracker) {
      errorTracker.trackError(errorDetails.code, {
        endpoint: this.getEndpoint(context.request),
        method: this.getMethod(context.request),
        userAgent: this.getUserAgent(context.request),
        userId: context.userId,
        sessionId: context.sessionId,
      });
    }

    // Build standardized response
    const response: StandardErrorResponse = {
      success: false,
      error: {
        code: errorDetails.code,
        name: errorDetails.name,
        message: errorDetails.message,
        severity: errorDetails.severity as any,
        category: errorDetails.category,
        httpStatusCode: errorDetails.httpStatusCode,
        timestamp: new Date().toISOString(),
        requestId: context.requestId || this.generateRequestId(),
      },
    };

    // Add documentation links
    if (errorDetails.documentation && errorDetails.documentation.length > 0) {
      const docs = errorDetails.documentation;
      response.error.documentation = {
        primary: docs.find(d => d.type === 'guide')?.url || docs[0]?.url || '/docs/troubleshooting',
        troubleshooting:
          docs.find(d => d.type === 'troubleshooting')?.url || '/docs/troubleshooting',
        apiReference: docs.find(d => d.type === 'reference')?.url || '/docs/api',
      };
    }

    // Add context
    if (context.request) {
      response.error.context = {
        endpoint: this.getEndpoint(context.request),
        method: this.getMethod(context.request),
        userAgent: this.getUserAgent(context.request),
        solutions: errorDetails.solutions || [],
        relatedCodes: errorDetails.relatedCodes || [],
      };
    }

    // Add debug information in development
    if (context.includeDebug && process.env.NODE_ENV !== 'production') {
      response.error.debug = {
        stack: context.originalError?.stack,
        correlationId: this.generateCorrelationId(),
        userId: context.userId,
        sessionId: context.sessionId,
        traceId: context.metadata?.traceId as string,
      };
    }

    // Add metadata
    response.metadata = {
      processingTime: Date.now() - startTime,
    };

    // Add rate limiting info if applicable
    if (errorDetails.code === 'E3002') {
      response.metadata.retryAfter = 60; // seconds
    }

    // Add support ticket reference for critical errors
    if (errorDetails.severity === 'CRITICAL') {
      response.metadata.supportTicket = `FIRE22-${Date.now()}`;
    }

    return response;
  }

  /**
   * Find error code from error message
   */
  private findErrorCodeFromMessage(message: string): string {
    // Check constants for matching messages
    const errorMessages = ERROR_MESSAGES;

    for (const category of Object.values(errorMessages)) {
      for (const errorInfo of Object.values(category)) {
        if (typeof errorInfo === 'object' && errorInfo.message === message) {
          return errorInfo.code;
        }
      }
    }

    // Pattern matching for common errors
    if (message.includes('connection') && message.includes('database')) return 'E2001';
    if (message.includes('timeout') && message.includes('database')) return 'E2002';
    if (message.includes('unauthorized')) return 'E3001';
    if (message.includes('rate limit')) return 'E3002';
    if (message.includes('validation')) return 'E5001';
    if (message.includes('not found')) return 'E3005';

    return 'E5000'; // Generic application error
  }

  /**
   * Get endpoint from request
   */
  private getEndpoint(request?: Request | Context): string {
    if (!request) return 'unknown';

    if ('req' in request) {
      // Hono context
      return request.req.url;
    } else {
      // Standard request
      return request.url || 'unknown';
    }
  }

  /**
   * Get method from request
   */
  private getMethod(request?: Request | Context): string {
    if (!request) return 'unknown';

    if ('req' in request) {
      // Hono context
      return request.req.method;
    } else {
      // Standard request
      return request.method || 'unknown';
    }
  }

  /**
   * Get user agent from request
   */
  private getUserAgent(request?: Request | Context): string | undefined {
    if (!request) return undefined;

    if ('req' in request) {
      // Hono context
      return request.req.header('User-Agent');
    } else {
      // Standard request
      return request.headers.get('User-Agent') || undefined;
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate correlation ID for debugging
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Hono middleware for error standardization
   */
  honoMiddleware() {
    return async (c: Context, next: () => Promise<void>) => {
      const startTime = Date.now();

      try {
        await next();
      } catch (error) {
        console.error('🚨 API Error caught by standardizer:', error);

        const standardError = this.createErrorResponse(error.message || 'Internal server error', {
          request: c,
          originalError: error,
          statusCode: error.status || 500,
          requestId: c.get('requestId'),
          userId: c.get('userId'),
          sessionId: c.get('sessionId'),
          includeDebug: process.env.NODE_ENV !== 'production',
          metadata: { startTime },
        });

        return c.json(standardError, standardError.error.httpStatusCode);
      }
    };
  }

  /**
   * Express middleware for error standardization
   */
  expressMiddleware() {
    return (error: Error, req: any, res: any, next: any) => {
      console.error('🚨 API Error caught by standardizer:', error);

      const standardError = this.createErrorResponse(error.message || 'Internal server error', {
        originalError: error,
        statusCode: error.status || 500,
        requestId: req.id || req.headers['x-request-id'],
        userId: req.user?.id,
        sessionId: req.sessionId,
        includeDebug: process.env.NODE_ENV !== 'production',
        metadata: {
          startTime: req.startTime || Date.now(),
          endpoint: req.originalUrl,
          method: req.method,
          userAgent: req.headers['user-agent'],
        },
      });

      res.status(standardError.error.httpStatusCode).json(standardError);
    };
  }

  /**
   * Create success response (for consistency)
   */
  createSuccessResponse<T = any>(
    data: T,
    context: {
      message?: string;
      requestId?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): {
    success: true;
    data: T;
    message?: string;
    requestId?: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
  } {
    return {
      success: true,
      data,
      message: context.message,
      requestId: context.requestId || this.generateRequestId(),
      timestamp: new Date().toISOString(),
      metadata: context.metadata,
    };
  }
}

// Export singleton instance
export const errorStandardizer = ErrorResponseStandardizer.getInstance();

// Export types for use in other modules
export type { StandardErrorResponse };

// Convenience functions
export const createErrorResponse = (
  errorCodeOrMessage: string,
  context?: Parameters<ErrorResponseStandardizer['createErrorResponse']>[1]
) => errorStandardizer.createErrorResponse(errorCodeOrMessage, context || {});

export const createSuccessResponse = <T = any>(
  data: T,
  context?: Parameters<ErrorResponseStandardizer['createSuccessResponse']>[1]
) => errorStandardizer.createSuccessResponse(data, context || {});

// Middleware exports
export const honoErrorMiddleware = () => errorStandardizer.honoMiddleware();
export const expressErrorMiddleware = () => errorStandardizer.expressMiddleware();
