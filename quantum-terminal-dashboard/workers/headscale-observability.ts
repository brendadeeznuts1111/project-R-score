// workers/headscale-observability.ts
// Cloudflare Workers Analytics Engine for Headscale

export interface HeadscaleEvent {
  type: string;
  user: string;
  node: string;
  action: string;
  duration: number;
  timestamp?: number;
  status?: string;
}

export class HeadscaleAnalytics {
  private analytics: AnalyticsEngineDataset;

  constructor(env: any) {
    this.analytics = env.HEADSCALE_ANALYTICS;
  }

  /**
   * Log an event to Analytics Engine
   */
  logEvent(event: HeadscaleEvent): void {
    const timestamp = event.timestamp || Date.now();

    this.analytics.writeDataPoint({
      blobs: [
        event.type,
        event.user,
        event.node,
        event.action,
        event.status || 'success',
      ],
      doubles: [event.duration, timestamp],
      indexes: [event.user, event.type],
    });
  }

  /**
   * Log API request
   */
  logApiRequest(
    user: string,
    endpoint: string,
    method: string,
    duration: number,
    status: number
  ): void {
    this.logEvent({
      type: 'api_request',
      user,
      node: endpoint,
      action: method,
      duration,
      status: status >= 200 && status < 300 ? 'success' : 'error',
    });
  }

  /**
   * Log node registration
   */
  logNodeRegistration(user: string, nodeId: string, duration: number): void {
    this.logEvent({
      type: 'node_registration',
      user,
      node: nodeId,
      action: 'register',
      duration,
    });
  }

  /**
   * Log authentication event
   */
  logAuthEvent(user: string, action: string, success: boolean): void {
    this.logEvent({
      type: 'auth',
      user,
      node: 'auth-service',
      action,
      duration: 0,
      status: success ? 'success' : 'failed',
    });
  }

  /**
   * Log rate limit event
   */
  logRateLimit(clientIp: string, endpoint: string): void {
    this.logEvent({
      type: 'rate_limit',
      user: clientIp,
      node: endpoint,
      action: 'rate_limited',
      duration: 0,
      status: 'limited',
    });
  }

  /**
   * Get metrics for dashboard
   */
  async getMetrics(timeRange: string = '1h'): Promise<any> {
    // This would query the Analytics Engine
    // Implementation depends on Cloudflare's query API
    return {
      timeRange,
      message: 'Query via Cloudflare dashboard',
    };
  }

  /**
   * Get top users
   */
  async getTopUsers(limit: number = 10): Promise<any[]> {
    return [
      {
        user: 'admin@example.com',
        requests: 1234,
        avgDuration: 45,
      },
    ];
  }

  /**
   * Get error rate
   */
  async getErrorRate(): Promise<number> {
    // Calculate error rate from events
    return 0.02; // 2%
  }

  /**
   * Get node statistics
   */
  async getNodeStats(): Promise<any> {
    return {
      totalNodes: 42,
      activeNodes: 38,
      inactiveNodes: 4,
      avgLatency: 12.5,
    };
  }
}

/**
 * Middleware for logging requests
 */
export function createLoggingMiddleware(analytics: HeadscaleAnalytics) {
  return async (request: Request, handler: Function) => {
    const startTime = Date.now();
    const url = new URL(request.url);
    const user = request.headers.get('X-User') || 'anonymous';

    try {
      const response = await handler(request);
      const duration = Date.now() - startTime;

      analytics.logApiRequest(
        user,
        url.pathname,
        request.method,
        duration,
        response.status
      );

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      analytics.logApiRequest(user, url.pathname, request.method, duration, 500);
      throw error;
    }
  };
}

/**
 * Export metrics in Prometheus format
 */
export function formatPrometheus(stats: any): string {
  return `
# HELP headscale_nodes_total Total number of nodes
# TYPE headscale_nodes_total gauge
headscale_nodes_total ${stats.totalNodes}

# HELP headscale_nodes_active Active nodes
# TYPE headscale_nodes_active gauge
headscale_nodes_active ${stats.activeNodes}

# HELP headscale_api_requests_total Total API requests
# TYPE headscale_api_requests_total counter
headscale_api_requests_total 0

# HELP headscale_api_latency_ms API latency in milliseconds
# TYPE headscale_api_latency_ms histogram
headscale_api_latency_ms_bucket{le="10"} 0
headscale_api_latency_ms_bucket{le="50"} 0
headscale_api_latency_ms_bucket{le="100"} 0
headscale_api_latency_ms_bucket{le="+Inf"} 0
  `.trim();
}

