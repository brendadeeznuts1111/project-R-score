/**
 * Fire22 Centralized Error Handler
 * 
 * Enterprise-grade error handling with logging, monitoring, and recovery
 */

import { 
  Fire22Error, 
  ErrorResponse, 
  ErrorContext, 
  ERROR_CODES, 
  ERROR_CLASSIFICATIONS, 
  TROUBLESHOOTING_GUIDES,
  ErrorSeverity,
  ErrorCategory 
} from './types';

export class ErrorHandler {
  private static instance: ErrorHandler;
  private isDevelopment: boolean;
  private errorCounts: Map<string, number> = new Map();
  private lastErrors: Fire22Error[] = [];
  private maxErrorHistory = 100;

  constructor(isDevelopment = false) {
    this.isDevelopment = isDevelopment;
  }

  static getInstance(isDevelopment = false): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(isDevelopment);
    }
    return ErrorHandler.instance;
  }

  /**
   * Generate unique correlation ID for error tracking
   */
  private generateCorrelationId(): string {
    return `fire22_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create error context from request
   */
  private createErrorContext(
    request?: Request,
    additional?: Record<string, any>
  ): ErrorContext {
    const correlationId = this.generateCorrelationId();
    const timestamp = new Date().toISOString();
    
    const context: ErrorContext = {
      correlationId,
      timestamp,
      additional: additional || {}
    };

    if (request) {
      const url = new URL(request.url);
      context.endpoint = url.pathname;
      context.method = request.method;
      context.userAgent = request.headers.get('user-agent') || undefined;
      context.ip = request.headers.get('cf-connecting-ip') || undefined;
      context.requestId = request.headers.get('x-request-id') || undefined;
      
      // Extract user info from JWT if available
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        try {
          // Simple JWT payload extraction (without verification for context only)
          const token = authHeader.replace('Bearer ', '');
          const payload = JSON.parse(atob(token.split('.')[1]));
          context.userId = payload.sub || payload.userId;
        } catch (e) {
          // Ignore JWT parsing errors for context
        }
      }
    }

    return context;
  }

  /**
   * Create standardized Fire22 error
   */
  createError(
    code: string,
    message: string,
    request?: Request,
    originalError?: Error,
    additional?: Record<string, any>
  ): Fire22Error {
    const classification = ERROR_CLASSIFICATIONS[code] || {
      severity: 'medium' as ErrorSeverity,
      category: 'server' as ErrorCategory,
      recoverable: 'non-recoverable' as const,
      httpStatus: 500,
      retryable: false,
    };

    const context = this.createErrorContext(request, {
      ...additional,
      originalError: originalError?.message,
    });

    if (originalError && this.isDevelopment) {
      context.stack = originalError.stack;
    }

    const fire22Error: Fire22Error = {
      code,
      message,
      userMessage: this.getUserFriendlyMessage(code, message),
      severity: classification.severity!,
      category: classification.category!,
      recoverable: classification.recoverable!,
      httpStatus: classification.httpStatus!,
      context,
      retryable: classification.retryable!,
      retryAfter: classification.retryAfter,
      troubleshooting: TROUBLESHOOTING_GUIDES[code],
    };

    // Track error for monitoring
    this.trackError(fire22Error);

    return fire22Error;
  }

  /**
   * Convert Fire22Error to HTTP Response
   */
  createErrorResponse(error: Fire22Error): Response {
    const errorResponse: ErrorResponse = {
      error: {
        code: error.code,
        message: error.userMessage || error.message,
        severity: error.severity,
        correlationId: error.context.correlationId,
        timestamp: error.context.timestamp,
        troubleshooting: this.isDevelopment ? error.troubleshooting : undefined,
      },
      success: false,
      data: null,
    };

    // Add retry information for retryable errors
    if (error.retryable && error.retryAfter) {
      errorResponse.meta = {
        retryAfter: error.retryAfter,
        supportContact: 'support@fire22.dev',
      };
    }

    // Add request ID if available
    if (error.context.requestId) {
      errorResponse.meta = {
        ...errorResponse.meta,
        requestId: error.context.requestId,
      };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Error-Code': error.code,
      'X-Correlation-Id': error.context.correlationId,
    };

    // Add retry headers for retryable errors
    if (error.retryable && error.retryAfter) {
      headers['Retry-After'] = error.retryAfter.toString();
    }

    return new Response(JSON.stringify(errorResponse), {
      status: error.httpStatus,
      headers,
    });
  }

  /**
   * Handle generic JavaScript errors
   */
  handleGenericError(
    originalError: Error,
    request?: Request,
    additional?: Record<string, any>
  ): Response {
    console.error('Unhandled error:', originalError);
    
    const error = this.createError(
      ERROR_CODES.INTERNAL_ERROR,
      'An unexpected error occurred',
      request,
      originalError,
      additional
    );

    return this.createErrorResponse(error);
  }

  /**
   * Handle database errors with retry logic
   */
  handleDatabaseError(
    originalError: Error,
    request?: Request,
    operation?: string
  ): Response {
    const error = this.createError(
      ERROR_CODES.DATABASE_ERROR,
      `Database operation failed: ${operation || 'unknown'}`,
      request,
      originalError,
      { operation }
    );

    return this.createErrorResponse(error);
  }

  /**
   * Handle external service errors
   */
  handleExternalServiceError(
    serviceName: string,
    originalError: Error,
    request?: Request
  ): Response {
    const error = this.createError(
      ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      `External service unavailable: ${serviceName}`,
      request,
      originalError,
      { serviceName }
    );

    return this.createErrorResponse(error);
  }

  /**
   * Handle Cloudflare R2 bucket errors
   */
  handleR2BucketError(
    bucketName: string,
    errorCode: number,
    originalError: Error,
    request?: Request
  ): Response {
    // Handle specific Cloudflare R2 error codes
    if (errorCode === 10004) {
      const error = this.createError(
        ERROR_CODES.R2_BUCKET_ALREADY_EXISTS,
        `R2 bucket '${bucketName}' already exists and is owned by your account`,
        request,
        originalError,
        { bucketName, cloudflareErrorCode: errorCode }
      );
      return this.createErrorResponse(error);
    }

    // Default to storage error for other R2 issues
    const error = this.createError(
      ERROR_CODES.STORAGE_ERROR,
      `R2 storage error for bucket '${bucketName}'`,
      request,
      originalError,
      { bucketName, cloudflareErrorCode: errorCode }
    );

    return this.createErrorResponse(error);
  }

  /**
   * Create user-friendly error messages
   */
  private getUserFriendlyMessage(code: string, originalMessage: string): string {
    const userMessages: Record<string, string> = {
      [ERROR_CODES.DATABASE_ERROR]: 'We\'re experiencing temporary database issues. Please try again in a few moments.',
      [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 'External service is temporarily unavailable. Please try again later.',
      [ERROR_CODES.REGISTRY_UNAVAILABLE]: 'Package registry is temporarily unavailable. Please try again later.',
      [ERROR_CODES.UNAUTHORIZED]: 'Authentication required. Please log in and try again.',
      [ERROR_CODES.FORBIDDEN]: 'You don\'t have permission to access this resource.',
      [ERROR_CODES.NOT_FOUND]: 'The requested resource was not found.',
      [ERROR_CODES.RATE_LIMITED]: 'Too many requests. Please slow down and try again later.',
      [ERROR_CODES.INVALID_INPUT]: 'Please check your input and try again.',
      [ERROR_CODES.TIMEOUT]: 'Request timed out. Please try again.',
      [ERROR_CODES.R2_BUCKET_ALREADY_EXISTS]: 'The R2 bucket already exists and is ready to use.',
    };

    return userMessages[code] || (this.isDevelopment ? originalMessage : 'An error occurred. Please try again.');
  }

  /**
   * Track errors for monitoring
   */
  private trackError(error: Fire22Error): void {
    // Increment error count
    const current = this.errorCounts.get(error.code) || 0;
    this.errorCounts.set(error.code, current + 1);

    // Add to error history
    this.lastErrors.unshift(error);
    if (this.lastErrors.length > this.maxErrorHistory) {
      this.lastErrors = this.lastErrors.slice(0, this.maxErrorHistory);
    }

    // Log error based on severity
    this.logError(error);

    // Send to monitoring if configured
    this.sendToMonitoring(error);
  }

  /**
   * Log error with appropriate level
   */
  private logError(error: Fire22Error): void {
    const logData = {
      code: error.code,
      message: error.message,
      correlationId: error.context.correlationId,
      severity: error.severity,
      category: error.category,
      endpoint: error.context.endpoint,
      userId: error.context.userId,
    };

    switch (error.severity) {
      case 'critical':
        console.error('🚨 CRITICAL ERROR:', logData);
        break;
      case 'high':
        console.error('❌ HIGH SEVERITY ERROR:', logData);
        break;
      case 'medium':
        console.warn('⚠️ MEDIUM SEVERITY ERROR:', logData);
        break;
      case 'low':
        console.info('ℹ️ LOW SEVERITY ERROR:', logData);
        break;
    }
  }

  /**
   * Send error to monitoring systems
   */
  private async sendToMonitoring(error: Fire22Error): Promise<void> {
    try {
      // In production, integrate with Sentry, DataDog, etc.
      // For now, just console log for monitoring pickup
      if (error.severity === 'critical' || error.severity === 'high') {
        console.log({
          service: 'fire22-dashboard',
          error: error.code,
          severity: error.severity,
          correlationId: error.context.correlationId,
          timestamp: error.context.timestamp,
          endpoint: error.context.endpoint,
        });
      }
      }

      // Send R2/Storage errors to infrastructure team
      if (error.code === ERROR_CODES.R2_BUCKET_ALREADY_EXISTS || 
          error.code === ERROR_CODES.STORAGE_ERROR) {
        await this.notifyInfrastructureTeam(error);
      }

      // Send critical errors to appropriate department teams
      if (error.severity === 'critical') {
        await this.notifyDepartmentTeam(error);
      }
    } catch (monitoringError) {
      console.error('Failed to send error to monitoring:', monitoringError);
    }
  }

  /**
   * Notify infrastructure team about storage-related issues
   */
  private async notifyInfrastructureTeam(error: Fire22Error): Promise<void> {
    const notification = {
      team: 'infrastructure-team',
      errorCode: error.code,
      severity: error.severity,
      message: error.message,
      correlationId: error.context.correlationId,
      timestamp: error.context.timestamp,
      context: {
        bucketName: error.context.additional?.bucketName,
        cloudflareErrorCode: error.context.additional?.cloudflareErrorCode,
      },
      troubleshooting: error.troubleshooting,
    };

    // Log for team notification system pickup
    
    // Also notify Cloudflare team for R2/Worker issues
    if (error.code === ERROR_CODES.R2_BUCKET_ALREADY_EXISTS || 
        error.code === ERROR_CODES.STORAGE_ERROR ||
        error.context.additional?.cloudflareErrorCode) {
      const cloudflareNotification = {
        ...notification,
        team: 'cloudflare-team',
        wranglerContext: {
          errorCode: error.context.additional?.cloudflareErrorCode,
          bucketName: error.context.additional?.bucketName,
          endpoint: error.context.endpoint,
        }
      };
    }
    
    // Notify CI team if this affects deployments
    if (error.context.endpoint?.includes('/deploy') || 
        error.context.endpoint?.includes('/build') ||
        error.context.additional?.isDeploymentError) {
      const ciNotification = {
        ...notification,
        team: 'ci-team',
        deploymentContext: {
          endpoint: error.context.endpoint,
          errorCode: error.code,
          timestamp: error.context.timestamp,
        }
      };
    }
  }

  /**
   * Notify appropriate department team based on error category
   */
  private async notifyDepartmentTeam(error: Fire22Error): Promise<void> {
    let team = 'devops-team'; // Default team

    // Route to appropriate team based on error category
    switch (error.category) {
      case 'auth':
        team = 'security-team';
        break;
      case 'database':
        team = 'data-team';
        break;
      case 'external':
      case 'network':
        team = 'infrastructure-team';
        break;
      case 'server':
        team = 'devops-team';
        break;
    }

    const notification = {
      team,
      errorCode: error.code,
      severity: error.severity,
      category: error.category,
      message: error.message,
      correlationId: error.context.correlationId,
      timestamp: error.context.timestamp,
      endpoint: error.context.endpoint,
      userId: error.context.userId,
      troubleshooting: error.troubleshooting,
    };

    // Log for team notification system pickup
  }

  /**
   * Get error statistics for health checks
   */
  getErrorStats() {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    const errorsByCode = Object.fromEntries(this.errorCounts);
    const recentErrors = this.lastErrors.slice(0, 10).map(error => ({
      code: error.code,
      timestamp: error.context.timestamp,
      correlationId: error.context.correlationId,
      severity: error.severity,
    }));

    return {
      totalErrors,
      errorsByCode,
      recentErrors,
      uptimeErrors: totalErrors,
    };
  }

  /**
   * Clear error history (for testing)
   */
  clearErrorHistory(): void {
    this.errorCounts.clear();
    this.lastErrors = [];
  }
}