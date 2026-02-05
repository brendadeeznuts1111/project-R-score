// src/index.ts
import { PROD_DEPS } from "./utils/s3Exports";
import { diMonitor } from "./monitoring/diPerformance";
import { devDashboard } from "./dashboard/dev-dashboard";
import { DisputeSystem } from "./disputes/dispute-system";
import { DisputeDashboard } from "./dashboard/dispute-dashboard";
import { join } from "path";

/**
 * Health check endpoint for monitoring DI system
 */
export function createHealthCheck() {
  const healthStatus = diMonitor.getHealthStatus();
  
  return {
    status: healthStatus.status,
    di: {
      available: PROD_DEPS !== undefined,
      functions: healthStatus.functions,
      memory: healthStatus.memoryUsage,
      alerts: healthStatus.alerts,
    },
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
  };
}

// Example Express.js style handler (adapt to your framework)
export function healthHandler(req: Request) {
  const health = createHealthCheck();
  const statusCode = health.status === 'ok' ? 200 : 503;
  
  return new Response(JSON.stringify(health), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}

// Metrics endpoint for monitoring systems
export function metricsHandler(req: Request) {
  const metrics = diMonitor.exportMetrics();
  
  return new Response(JSON.stringify(metrics), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'max-age=30', // Cache for 30 seconds
    },
  });
}

// Dashboard endpoint for development oversight
export function dashboardHandler(req: Request) {
  const dashboardData = devDashboard.getDashboardData();
  
  return new Response(JSON.stringify(dashboardData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}

// Dispute dashboard endpoint
export function disputeDashboardHandler(req: Request) {
  const disputeDashboard = new DisputeDashboard();
  const dashboardData = disputeDashboard.getDashboardData();
  
  return new Response(JSON.stringify(dashboardData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}

// Serve the dispute dashboard HTML
export async function disputeDashboardPageHandler(req: Request) {
  try {
    const htmlPath = join(process.cwd(), 'web', 'dispute-dashboard.html');
    const html = await Bun.file(htmlPath).text();
    
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    return new Response('Dispute dashboard not found', { status: 404 });
  }
}

// Serve the dashboard HTML
export async function dashboardPageHandler(req: Request) {
  try {
    const htmlPath = join(process.cwd(), 'web', 'dashboard.html');
    const html = await Bun.file(htmlPath).text();
    
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    return new Response('Dashboard not found', { status: 404 });
  }
}

// Bun.serve example
if (import.meta.main) {
  const server = Bun.serve({
    port: 3000,
    fetch(req) {
      const url = new URL(req.url);
      
      if (url.pathname === '/health') {
        return healthHandler(req);
      }
      
      if (url.pathname === '/metrics') {
        return metricsHandler(req);
      }
      
      if (url.pathname === '/dashboard') {
        return dashboardHandler(req);
      }
      
      if (url.pathname === '/dispute-dashboard') {
        return disputeDashboardHandler(req);
      }
      
      if (url.pathname === '/' || url.pathname === '/dashboard.html') {
        return dashboardPageHandler(req);
      }
      
      if (url.pathname === '/disputes' || url.pathname === '/dispute-dashboard.html') {
        return disputeDashboardPageHandler(req);
      }
      
      return new Response('Not Found', { status: 404 });
    },
  });
  
  console.log(`🚀 Health check server running on http://localhost:${server.port}/health`);
  console.log(`📊 Metrics endpoint: http://localhost:${server.port}/metrics`);
  console.log(`🎯 Development Dashboard: http://localhost:${server.port}/dashboard`);
  console.log(`⚖️ Dispute Dashboard: http://localhost:${server.port}/disputes`);
  console.log(`🌐 Web Dashboard: http://localhost:${server.port}/`);
}
