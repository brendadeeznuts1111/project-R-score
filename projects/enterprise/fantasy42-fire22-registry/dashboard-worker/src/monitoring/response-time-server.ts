import { ResponseTimeMonitor } from './response-time-distribution';

/**
 * Fire22 Response Time Monitoring Server
 * Real-time performance tracking with Bun's nanosecond precision
 */

// Initialize the monitor
const monitor = new ResponseTimeMonitor();

// Middleware to track response times
function withResponseTimeTracking(handler: (req: Request) => Promise<Response> | Response) {
  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const endpoint = `${req.method} ${url.pathname}`;

    // Start timing with Bun's nanosecond precision
    const startTime = monitor.startTiming();

    try {
      // Execute the handler
      const response = await handler(req);

      // Record the response time
      const duration = monitor.endTiming(endpoint, startTime);

      // Add response time header
      const headers = new Headers(response.headers);
      headers.set('X-Response-Time', `${duration.toFixed(2)}ms`);
      headers.set('X-Server-Timing', `total;dur=${duration.toFixed(2)}`);

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      // Still record timing for errors
      monitor.endTiming(endpoint, startTime);
      throw error;
    }
  };
}

// Create server with response time monitoring
const server = Bun.serve({
  port: 3004,

  async fetch(req) {
    const url = new URL(req.url);

    // Monitoring API endpoints
    if (url.pathname === '/api/monitoring/response-times') {
      return Response.json(monitor.getAllStats());
    }

    if (url.pathname === '/api/monitoring/endpoint' && url.searchParams.has('name')) {
      const endpoint = url.searchParams.get('name')!;
      const stats = monitor.getEndpointStats(endpoint);
      return Response.json(stats || { error: 'Endpoint not found' });
    }

    if (url.pathname === '/api/monitoring/alerts') {
      const limit = parseInt(url.searchParams.get('limit') || '10');
      return Response.json(monitor.getAlerts(limit));
    }

    if (url.pathname === '/api/monitoring/export') {
      const stats = monitor.getAllStats();
      return Response.json({
        exported_at: new Date().toISOString(),
        ...stats,
      });
    }

    if (url.pathname === '/api/monitoring/clear' && req.method === 'POST') {
      monitor.clear();
      return Response.json({ message: 'All data cleared' });
    }

    if (url.pathname === '/api/monitoring/simulate' && req.method === 'POST') {
      const body = (await req.json()) as { endpoint: string; delay: number };

      // Simulate delay
      await Bun.sleep(body.delay || Math.random() * 1000);

      // Track simulated response
      const start = monitor.startTiming();
      await Bun.sleep(body.delay || 0);
      monitor.endTiming(body.endpoint, start);

      return Response.json({ simulated: true, endpoint: body.endpoint });
    }

    // Dashboard UI
    if (url.pathname === '/' || url.pathname === '/dashboard') {
      return new Response(Bun.file('./src/monitoring/response-time-dashboard.html'));
    }

    // Wrap actual API endpoints with monitoring
    return withResponseTimeTracking(async req => {
      const url = new URL(req.url);

      // Simulate various Fire22 API endpoints with different response times
      if (url.pathname === '/api/reviews/pending') {
        await Bun.sleep(Math.random() * 50 + 10); // 10-60ms
        return Response.json({
          reviews: [
            { id: '1', title: 'Review 1', status: 'pending' },
            { id: '2', title: 'Review 2', status: 'pending' },
          ],
        });
      }

      if (url.pathname === '/api/reviews/stats') {
        await Bun.sleep(Math.random() * 100 + 20); // 20-120ms
        return Response.json({
          total: 100,
          pending: 10,
          approved: 85,
          rejected: 5,
        });
      }

      if (url.pathname === '/api/metrics/dashboard') {
        await Bun.sleep(Math.random() * 150 + 30); // 30-180ms
        return Response.json({
          performance_score: 96,
          security_checks: 15,
          total_packages: 11,
        });
      }

      if (url.pathname === '/api/fire22/customers') {
        await Bun.sleep(Math.random() * 200 + 100); // 100-300ms (slower endpoint)
        return Response.json({
          customers: Array(100)
            .fill(null)
            .map((_, i) => ({
              id: `customer_${i}`,
              name: `Customer ${i}`,
              balance: Math.random() * 10000,
            })),
        });
      }

      if (url.pathname === '/api/manager/getLiveWagers') {
        await Bun.sleep(Math.random() * 500 + 200); // 200-700ms (slowest endpoint)
        return Response.json({
          wagers: Array(50)
            .fill(null)
            .map((_, i) => ({
              id: `wager_${i}`,
              amount: Math.random() * 1000,
              status: 'live',
            })),
        });
      }

      if (url.pathname === '/health') {
        // Health check should be fast
        await Bun.sleep(Math.random() * 5 + 1); // 1-6ms
        return Response.json({
          status: 'healthy',
          timestamp: Date.now(),
        });
      }

      return new Response('Not Found', { status: 404 });
    })(req);
  },
});

console.log(`
🎯 Fire22 Response Time Distribution Monitor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Server: ${server.url}
📊 Dashboard: ${server.url}dashboard
📈 API: ${server.url}api/monitoring/response-times

Features:
✅ Nanosecond precision timing with Bun.nanoseconds()
✅ Real-time percentile calculations (P50, P75, P90, P95, P99, P99.9)
✅ Histogram distribution with configurable buckets
✅ Per-endpoint tracking and global statistics
✅ Automatic alerting for performance degradation
✅ Live dashboard with auto-refresh
✅ Export functionality for analysis

Test Endpoints:
• GET /api/reviews/pending (fast: 10-60ms)
• GET /api/reviews/stats (medium: 20-120ms)
• GET /api/metrics/dashboard (medium: 30-180ms)
• GET /api/fire22/customers (slow: 100-300ms)
• GET /api/manager/getLiveWagers (slowest: 200-700ms)
• GET /health (fastest: 1-6ms)

Monitoring Endpoints:
• GET /api/monitoring/response-times - All statistics
• GET /api/monitoring/alerts - Recent alerts
• GET /api/monitoring/export - Export data
• POST /api/monitoring/clear - Clear all data
• POST /api/monitoring/simulate - Simulate traffic
`);

// Simulate some initial traffic for demo
setTimeout(async () => {
  console.log('\n🚀 Generating sample traffic...\n');

  const endpoints = [
    '/health',
    '/api/reviews/pending',
    '/api/reviews/stats',
    '/api/metrics/dashboard',
    '/api/fire22/customers',
    '/api/manager/getLiveWagers',
  ];

  for (let i = 0; i < 20; i++) {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    fetch(`${server.url}${endpoint}`).catch(() => {});
    await Bun.sleep(100);
  }

  // Show sample stats after traffic
  setTimeout(async () => {
    const response = await fetch(`${server.url}api/monitoring/response-times`);
    const stats = await response.json();

    console.log('📊 Sample Statistics:');
    console.log(`├─ Total Requests: ${stats.summary.totalRequests}`);
    console.log(`├─ Average Response: ${stats.global.stats.mean.toFixed(2)}ms`);
    console.log(`├─ P95 Response: ${stats.global.stats.p95.toFixed(2)}ms`);
    console.log(`├─ P99 Response: ${stats.global.stats.p99.toFixed(2)}ms`);
    console.log(`└─ Active Endpoints: ${stats.summary.totalEndpoints}`);
  }, 3000);
}, 1000);

export { server, monitor };
