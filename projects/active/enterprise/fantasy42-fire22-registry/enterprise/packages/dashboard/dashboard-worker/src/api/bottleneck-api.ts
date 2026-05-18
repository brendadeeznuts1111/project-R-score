/**
 * Bottleneck Resolution API Endpoints
 *
 * API for one-click bottleneck detection and resolution
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bottleneckResolver } from '../staging-reviews/bottleneck-resolver';

const app = new Hono();

// Enable CORS
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
);

/**
 * Detect all active bottlenecks
 */
app.get('/api/bottlenecks/detect', async c => {
  try {
    const bottlenecks = await bottleneckResolver.detectBottlenecks();

    return c.json({
      success: true,
      count: bottlenecks.length,
      bottlenecks: bottlenecks.map(b => ({
        id: b.id,
        title: b.title,
        description: b.description,
        impact: b.impact,
        metric: b.metric,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Detection failed',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * Resolve a specific bottleneck
 */
app.post('/api/bottlenecks/:id/resolve', async c => {
  try {
    const id = c.req.param('id');
    const result = await bottleneckResolver.resolveBottleneck(id);

    return c.json({
      success: result.success,
      bottleneckId: id,
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Resolution failed',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * Auto-resolve all bottlenecks
 */
app.post('/api/bottlenecks/auto-resolve', async c => {
  try {
    const result = await bottleneckResolver.autoResolveAll();

    return c.json({
      success: result.failed === 0,
      summary: {
        total: result.total,
        resolved: result.resolved,
        failed: result.failed,
      },
      results: result.results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Auto-resolve failed',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * Get performance metrics
 */
app.get('/api/bottlenecks/metrics', async c => {
  try {
    const metrics = await bottleneckResolver.getPerformanceMetrics();

    return c.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get metrics',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * Run complete setup
 */
app.post('/api/bottlenecks/complete-setup', async c => {
  try {
    const result = await bottleneckResolver.runCompleteSetup();

    return c.json({
      success: result.success,
      steps: result.steps,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Setup failed',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * Quick actions endpoints
 */
app.post('/api/bottlenecks/quick/:action', async c => {
  try {
    const action = c.req.param('action');
    let result: any = {};

    switch (action) {
      case 'optimize-dns':
        result = await bottleneckResolver.resolveBottleneck('dns-prefetch');
        break;

      case 'optimize-cache':
        result = await bottleneckResolver.resolveBottleneck('cache-ttl');
        break;

      case 'optimize-database':
        result = await bottleneckResolver.resolveBottleneck('db-pool');
        break;

      case 'cleanup-memory':
        result = await bottleneckResolver.resolveBottleneck('memory-leak');
        break;

      case 'build-production':
        result = await bottleneckResolver.resolveBottleneck('bundle-size');
        break;

      default:
        return c.json(
          {
            success: false,
            error: `Unknown action: ${action}`,
            availableActions: [
              'optimize-dns',
              'optimize-cache',
              'optimize-database',
              'cleanup-memory',
              'build-production',
            ],
            timestamp: new Date().toISOString(),
          },
          400
        );
    }

    return c.json({
      success: result.success,
      action,
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Action failed',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * Health check for bottleneck system
 */
app.get('/api/bottlenecks/health', async c => {
  try {
    const bottlenecks = await bottleneckResolver.detectBottlenecks();
    const metrics = await bottleneckResolver.getPerformanceMetrics();

    const criticalCount = bottlenecks.filter(b => b.impact === 'critical').length;
    const highCount = bottlenecks.filter(b => b.impact === 'high').length;

    const status =
      criticalCount > 0
        ? 'critical'
        : highCount > 2
          ? 'warning'
          : bottlenecks.length > 5
            ? 'degraded'
            : 'healthy';

    return c.json({
      success: true,
      status,
      bottlenecks: {
        total: bottlenecks.length,
        critical: criticalCount,
        high: highCount,
        medium: bottlenecks.filter(b => b.impact === 'medium').length,
        low: bottlenecks.filter(b => b.impact === 'low').length,
      },
      performance: {
        dnsCache: metrics.dns.cacheSize,
        memoryUsage: `${metrics.memory.percentage}%`,
        databaseHealth: metrics.database.health,
        apiResponseTime: `${metrics.api.averageResponseTime}ms`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

export default app;
