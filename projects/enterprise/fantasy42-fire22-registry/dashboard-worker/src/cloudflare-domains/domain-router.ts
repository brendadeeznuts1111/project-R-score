/**
 * Domain Router - Crystal Clear Architecture
 *
 * Routes requests to appropriate domain workers based on URL patterns
 * Provides unified entry point for all domain operations
 */

interface Env {
  COLLECTIONS_WORKER: Fetcher;
  DISTRIBUTIONS_WORKER: Fetcher;
  FREEPLAY_WORKER: Fetcher;
  BALANCE_WORKER: Fetcher;
  ADJUSTMENT_WORKER: Fetcher;

  // Monitoring and coordination
  MONITORING_ENDPOINT?: string;
  LOG_LEVEL?: string;
}

interface DomainHealth {
  domain: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  responseTime?: number;
  error?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const startTime = Date.now();

    try {
      // Health check for all domains
      if (path === '/health' && request.method === 'GET') {
        return await this.handleGlobalHealthCheck(env, startTime);
      }

      // Domain metrics
      if (path === '/metrics' && request.method === 'GET') {
        return await this.handleGlobalMetrics(env, startTime);
      }

      // Route to appropriate domain worker
      const domain = this.getDomainFromPath(path);

      if (!domain) {
        return new Response(
          JSON.stringify({
            error: 'Domain not found',
            message: 'No domain worker configured for this route',
            availableDomains: [
              'collections',
              'distributions',
              'free-play',
              'balance',
              'adjustment',
            ],
            path: path,
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Route to domain worker
      const response = await this.routeToDomainWorker(domain, request, env);

      // Add domain header for tracking
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers),
          'X-Domain': domain,
          'X-Response-Time': `${Date.now() - startTime}ms`,
        },
      });

      return newResponse;
    } catch (error) {
      console.error('[DOMAIN_ROUTER] Error:', error);

      return new Response(
        JSON.stringify({
          error: 'Domain router error',
          message: error instanceof Error ? error.message : 'Unknown error',
          path: path,
          timestamp: new Date().toISOString(),
          responseTime: `${Date.now() - startTime}ms`,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  },

  getDomainFromPath(path: string): string | null {
    if (path.startsWith('/api/domains/collections')) {
      return 'collections';
    }
    if (path.startsWith('/api/domains/distributions')) {
      return 'distributions';
    }
    if (path.startsWith('/api/domains/free-play')) {
      return 'free-play';
    }
    if (path.startsWith('/api/domains/balance')) {
      return 'balance';
    }
    if (path.startsWith('/api/domains/adjustment')) {
      return 'adjustment';
    }
    return null;
  },

  async routeToDomainWorker(domain: string, request: Request, env: Env): Promise<Response> {
    const workerName = `${domain.toUpperCase()}_WORKER` as keyof Env;

    if (!(workerName in env)) {
      throw new Error(`Worker not configured: ${workerName}`);
    }

    const worker = env[workerName] as Fetcher;
    return await worker.fetch(request);
  },

  async handleGlobalHealthCheck(env: Env, startTime: number): Promise<Response> {
    const domains = ['collections', 'distributions', 'free-play', 'balance', 'adjustment'];
    const healthChecks: DomainHealth[] = [];

    // Check each domain worker
    for (const domain of domains) {
      try {
        const domainStart = Date.now();
        const response = await this.routeToDomainWorker(
          domain,
          new Request(`${domain}/health`),
          env
        );
        const responseTime = Date.now() - domainStart;

        const healthData = await response.json();

        healthChecks.push({
          domain,
          status: response.ok ? 'healthy' : 'degraded',
          timestamp: new Date().toISOString(),
          responseTime,
          error: response.ok ? undefined : 'Health check failed',
        });
      } catch (error) {
        healthChecks.push({
          domain,
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Calculate overall health
    const healthyCount = healthChecks.filter(h => h.status === 'healthy').length;
    const overallStatus =
      healthyCount === domains.length
        ? 'healthy'
        : healthyCount >= domains.length / 2
          ? 'degraded'
          : 'unhealthy';

    const healthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`,
      domains: healthChecks,
      summary: {
        total: domains.length,
        healthy: healthyCount,
        degraded: healthChecks.filter(h => h.status === 'degraded').length,
        unhealthy: healthChecks.filter(h => h.status === 'unhealthy').length,
      },
    };

    return new Response(JSON.stringify(healthResponse, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async handleGlobalMetrics(env: Env, startTime: number): Promise<Response> {
    const domains = ['collections', 'distributions', 'free-play', 'balance', 'adjustment'];
    const domainMetrics: any[] = [];

    // Get metrics from each domain worker
    for (const domain of domains) {
      try {
        const response = await this.routeToDomainWorker(
          domain,
          new Request(`${domain}/metrics`),
          env
        );
        if (response.ok) {
          const metrics = await response.json();
          domainMetrics.push(metrics);
        }
      } catch (error) {
        console.warn(`Failed to get metrics for ${domain}:`, error);
      }
    }

    // Aggregate metrics
    const aggregatedMetrics = {
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`,
      domains: domainMetrics,
      summary: {
        totalDomains: domains.length,
        domainsReporting: domainMetrics.length,
        domainsWithErrors: domainMetrics.filter(m => m.metrics?.errorRate > 5).length,
      },
    };

    return new Response(JSON.stringify(aggregatedMetrics, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
