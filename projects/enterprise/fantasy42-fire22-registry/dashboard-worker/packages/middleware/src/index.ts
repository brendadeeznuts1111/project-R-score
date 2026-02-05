// Fire22 Middleware System - Main Entry Point
export interface RequestContext {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
  timestamp: number;
  requestId: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  timestamp: string;
  requestId: string;
  details?: any;
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: string;
  requestId: string;
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

export class MiddlewareSystem {
  private requestCount = 0;
  private performanceMetrics = new Map<string, number[]>();

  // Generate unique request ID
  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestCount}`;
  }

  // Parse and validate request body
  async parseRequestBody(request: Request): Promise<any> {
    try {
      const contentType = request.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const body = await request.json();
        return this.validateRequestBody(body);
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        const body: Record<string, any> = {};
        for (const [key, value] of formData.entries()) {
          body[key] = value;
        }
        return this.validateRequestBody(body);
      } else {
        return null; // No body or unsupported content type
      }
    } catch (error) {
      throw new Error(
        `Failed to parse request body: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Validate request body structure
  private validateRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      throw new Error('Request body must be a valid object');
    }

    // Add additional validation as needed
    return body;
  }

  // Create standardized error response
  createErrorResponse(
    error: string,
    code: string = 'INTERNAL_ERROR',
    details?: any,
    requestId?: string
  ): ErrorResponse {
    return {
      success: false,
      error,
      code,
      timestamp: new Date().toISOString(),
      requestId: requestId || this.generateRequestId(),
      details,
    };
  }

  // Create standardized success response
  createSuccessResponse<T>(data: T, requestId?: string): SuccessResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      requestId: requestId || this.generateRequestId(),
    };
  }

  // Rate limiting middleware
  async checkRateLimit(
    identifier: string,
    maxRequests: number = 100,
    windowMs: number = 900000
  ): Promise<boolean> {
    const now = Date.now();
    const key = `rate_limit:${identifier}`;

    if (!this.performanceMetrics.has(key)) {
      this.performanceMetrics.set(key, []);
    }

    const requests = this.performanceMetrics.get(key)!;

    // Remove expired requests
    const validRequests = requests.filter(time => now - time < windowMs);

    if (validRequests.length >= maxRequests) {
      return false; // Rate limit exceeded
    }

    validRequests.push(now);
    this.performanceMetrics.set(key, validRequests);
    return true;
  }

  // Performance monitoring
  startPerformanceTimer(operation: string): () => number {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      this.recordPerformanceMetric(operation, duration);
      return duration;
    };
  }

  private recordPerformanceMetric(operation: string, duration: number): void {
    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, []);
    }

    const metrics = this.performanceMetrics.get(operation)!;
    metrics.push(duration);

    // Keep only last 1000 measurements
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }
  }

  // Get performance statistics
  getPerformanceStats(operation: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    p95: number;
  } | null {
    const metrics = this.performanceMetrics.get(operation);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const sorted = [...metrics].sort((a, b) => a - b);
    const count = metrics.length;
    const average = metrics.reduce((sum, m) => sum + m, 0) / count;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p95Index = Math.floor(count * 0.95);
    const p95 = sorted[p95Index];

    return { count, average, min, max, p95 };
  }

  // Get all performance metrics
  getAllPerformanceStats(): Record<string, ReturnType<typeof this.getPerformanceStats>> {
    const stats: Record<string, ReturnType<typeof this.getPerformanceStats>> = {};

    for (const [operation] of this.performanceMetrics) {
      stats[operation] = this.getPerformanceStats(operation);
    }

    return stats;
  }
}

// Export default instance
export const middlewareSystem = new MiddlewareSystem();
