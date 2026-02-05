// Error middleware with automatic documentation search integration
import type { ServerWebSocket } from "bun";
import { smartErrorHandler } from './error-handler';
import { OddsProtocolError } from './error-types';

export interface ErrorResponse {
  success: false;
  error: {
    id: string;
    message: string;
    code?: string;
    category?: string;
    documentation?: Array<{
      title: string;
      content: string;
      url?: string;
      relevanceScore: number;
    }>;
    suggestions?: string[];
    timestamp: number;
  };
}

export class ErrorMiddleware {
  /**
   * HTTP error handler middleware
   */
  static async handleHTTPError(error: Error, request: Request): Promise<Response> {
    const context = {
      timestamp: Date.now(),
      sessionId: this.getSessionId(request),
      requestId: this.getRequestId(request),
      package: 'api-gateway',
      function: this.getFunctionName(error),
      line: this.getLineNumber(error)
    };

    let errorResponse;
    
    if (error instanceof OddsProtocolError) {
      errorResponse = await error.handleWithContext(context);
    } else {
      errorResponse = await smartErrorHandler.handleError(error, context);
    }

    const response: ErrorResponse = {
      success: false,
      error: {
        id: errorResponse.errorId,
        message: errorResponse.message,
        code: (error as OddsProtocolError).code,
        category: (error as OddsProtocolError).category,
        documentation: errorResponse.documentation,
        suggestions: errorResponse.suggestions,
        timestamp: context.timestamp
      }
    };

    // Log error for debugging
    console.error('🚨 Error handled with documentation search:', {
      errorId: errorResponse.errorId,
      message: errorResponse.message,
      documentationFound: errorResponse.documentation?.length || 0,
      suggestions: errorResponse.suggestions?.length || 0
    });

    return new Response(JSON.stringify(response), {
      status: this.getHTTPStatus(error),
      headers: {
        'Content-Type': 'application/json',
        'X-Error-ID': errorResponse.errorId,
        'X-Error-Category': (error as OddsProtocolError).category || 'unknown'
      }
    });
  }

  /**
   * WebSocket error handler
   */
  static async handleWebSocketError(
    error: Error, 
    ws: ServerWebSocket<any>, 
    message?: string
  ): Promise<void> {
    const context = {
      timestamp: Date.now(),
      sessionId: (ws as any).sessionId,
      package: 'websocket-server',
      function: 'websocket-message-handler'
    };

    const errorResponse = await smartErrorHandler.handleError(error, context);

    // Send error response to client
    const errorPayload = {
      type: 'error',
      errorId: errorResponse.errorId,
      message: errorResponse.message,
      documentation: errorResponse.documentation,
      suggestions: errorResponse.suggestions,
      timestamp: context.timestamp
    };

    ws.send(JSON.stringify(errorPayload));

    // Log for debugging
    console.error('🚨 WebSocket error handled:', {
      errorId: errorResponse.errorId,
      message: errorResponse.message,
      clientSession: context.sessionId,
      documentationFound: errorResponse.documentation?.length || 0
    });
  }

  /**
   * Process error handler for background tasks
   */
  static async handleProcessError(
    error: Error, 
    processName: string,
    context: Record<string, any> = {}
  ): Promise<void> {
    const errorContext = {
      timestamp: Date.now(),
      package: processName,
      function: context.function || 'unknown',
      ...context
    };

    const errorResponse = await smartErrorHandler.handleError(error, errorContext);

    // Log structured error with documentation
    console.error(`🚨 Process error in ${processName}:`, {
      errorId: errorResponse.errorId,
      message: errorResponse.message,
      documentation: errorResponse.documentation,
      suggestions: errorResponse.suggestions,
      context: errorContext
    });

    // In production, you might want to:
    // - Send to error tracking service
    // - Create alerts for critical errors
    // - Store in database for analysis
  }

  /**
   * Wrap async functions with automatic error handling
   */
  static withErrorHandling<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context: { packageName: string; functionName: string }
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        if (error instanceof Error) {
          await this.handleProcessError(error, context.packageName, {
            function: context.functionName,
            args: args.length
          });
        }
        throw error; // Re-throw after logging
      }
    };
  }

  /**
   * Extract session ID from request
   */
  private static getSessionId(request: Request): string | undefined {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return undefined;
    
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const sessionCookie = cookies.find(c => c.startsWith('sessionId='));
    return sessionCookie?.substring('sessionId='.length) || undefined;
  }

  /**
   * Extract request ID from headers
   */
  private static getRequestId(request: Request): string | undefined {
    return request.headers.get('x-request-id') || 
           request.headers.get('x-correlation-id') || 
           undefined;
  }

  /**
   * Extract function name from error stack
   */
  private static getFunctionName(error: Error): string {
    const stack = error.stack;
    if (!stack) return 'unknown';
    
    const lines = stack.split('\n');
    for (const line of lines) {
      const match = line.match(/at\s+(.+?)\s+\(/);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return 'unknown';
  }

  /**
   * Extract line number from error stack
   */
  private static getLineNumber(error: Error): number | undefined {
    const stack = error.stack;
    if (!stack) return undefined;
    
    const lines = stack.split('\n');
    for (const line of lines) {
      const match = line.match(/:(\d+):\d+/);
      if (match && match[1]) {
        return parseInt(match[1]);
      }
    }
    
    return undefined;
  }

  /**
   * Get appropriate HTTP status code based on error type
   */
  private static getHTTPStatus(error: Error): number {
    if (error instanceof OddsProtocolError) {
      switch (error.category) {
        case 'validation':
          return 400;
        case 'network':
          return 503;
        case 'business':
          return 422;
        case 'integration':
          return 502;
        case 'system':
          return 500;
        default:
          return 500;
      }
    }
    
    // Handle common error types
    if (error.message.includes('not found')) return 404;
    if (error.message.includes('unauthorized')) return 401;
    if (error.message.includes('forbidden')) return 403;
    if (error.message.includes('timeout')) return 408;
    if (error.message.includes('too many requests')) return 429;
    
    return 500; // Internal Server Error
  }

  /**
   * Create error monitoring dashboard data
   */
  static getErrorMonitoringData(): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    recentErrors: Array<{
      id: string;
      message: string;
      category: string;
      timestamp: number;
      documentation: boolean;
    }>;
    topSearchTerms: Array<{
      term: string;
      frequency: number;
    }>;
  } {
    const stats = smartErrorHandler.getErrorStats();
    
    let totalErrors = 0;
    const errorsByCategory: Record<string, number> = {};
    const recentErrors: any[] = [];
    const searchTerms: Record<string, number> = {};
    
    for (const [key, errors] of Object.entries(stats)) {
      totalErrors += errors.total;
      
      // Count by category (extract from key or error data)
      const category = this.extractCategoryFromKey(key);
      errorsByCategory[category] = (errorsByCategory[category] || 0) + errors.total;
      
      // Track recent errors
      if (errors.lastError) {
        recentErrors.push({
          id: `error-${Date.now()}`,
          message: 'Recent error',
          category,
          timestamp: errors.lastError,
          documentation: true
        });
      }
    }
    
    return {
      totalErrors,
      errorsByCategory,
      recentErrors: recentErrors.slice(-10),
      topSearchTerms: Object.entries(searchTerms)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([term, frequency]) => ({ term, frequency }))
    };
  }

  private static extractCategoryFromKey(key: string): string {
    if (key.includes('network')) return 'network';
    if (key.includes('validation')) return 'validation';
    if (key.includes('business')) return 'business';
    if (key.includes('system')) return 'system';
    if (key.includes('integration')) return 'integration';
    return 'unknown';
  }
}
