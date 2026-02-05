#!/usr/bin/env bun

/**
 * Fire22 Dashboard API Server
 *
 * Simple Bun server to serve dashboard API endpoints for development and testing
 */

import dashboardRoutes from './src/api/routes/dashboard.routes';

const server = Bun.serve({
  port: process.env.PORT || 3001,
  hostname: '0.0.0.0',

  async fetch(request) {
    const url = new URL(request.url);

    // Handle CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          service: 'Fire22 Dashboard API',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Dashboard API routes
    if (url.pathname.startsWith('/api/dashboard')) {
      try {
        // Create a mock request object for the router
        const mockRequest = {
          url: request.url,
          method: request.method,
          headers: Object.fromEntries(request.headers.entries()),
          json: request.json.bind(request),
          text: request.text.bind(request),
          arrayBuffer: request.arrayBuffer.bind(request),
        };

        // Handle the request through the dashboard router
        const response = await dashboardRoutes.handle(mockRequest);

        if (response) {
          return response;
        }
      } catch (error) {
        console.error('Dashboard API error:', error);
        return new Response(
          JSON.stringify({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // API info endpoint
    if (url.pathname === '/api') {
      return new Response(
        JSON.stringify({
          name: 'Fire22 Dashboard API',
          version: '1.0.0',
          description: 'Real-time metrics and analytics API for Fire22 dashboards',
          endpoints: {
            metrics: '/api/dashboard/metrics',
            analytics: '/api/dashboard/analytics',
            health: '/api/dashboard/health',
            performance: '/api/dashboard/performance',
          },
          documentation: 'See README.md for detailed API documentation',
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Default response for unmatched routes
    return new Response(
      JSON.stringify({
        error: 'Not found',
        message: `Route ${url.pathname} not found`,
        availableRoutes: ['/health', '/api', '/api/dashboard/*'],
        timestamp: new Date().toISOString(),
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  },

  error(error) {
    console.error('Server error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  },
});

console.log(`🚀 Fire22 Dashboard API Server running on http://${server.hostname}:${server.port}`);
console.log(`📊 Dashboard endpoints available at:`);
console.log(`   • http://${server.hostname}:${server.port}/api/dashboard/metrics`);
console.log(`   • http://${server.hostname}:${server.port}/api/dashboard/analytics`);
console.log(`   • http://${server.hostname}:${server.port}/api/dashboard/health`);
console.log(`   • http://${server.hostname}:${server.port}/api/dashboard/performance`);
console.log(`🏥 Health check: http://${server.hostname}:${server.port}/health`);
console.log(`📖 API info: http://${server.hostname}:${server.port}/api`);

export default server;
