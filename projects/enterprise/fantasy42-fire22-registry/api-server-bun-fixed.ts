#!/usr/bin/env bun

/**
 * 🚀 Fire22 Dashboard API Server - Bun Native Edition
 *
 * Fixed version optimized for Bun runtime with proper ES module support
 * and resolved port binding conflicts
 */

import { serve } from 'bun';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function createResponse(data: any = null, message = '', status = 200) {
  const response = {
    success: status < 400,
    timestamp: new Date().toISOString(),
    data,
    message,
  };

  if (status >= 400) {
    response.error = message || 'Request failed';
    delete response.data;
  }

  return Response.json(response, { status });
}

// ============================================================================
// DASHBOARD DATA GENERATORS
// ============================================================================

function generateMockDomainStats() {
  const now = Date.now();
  const baseVariation = Math.sin(now / 3600000) * 0.1;

  return {
    accountsCount: Math.max(50, Math.floor(100 + baseVariation * 20)),
    betsCount: Math.max(200, Math.floor(500 + baseVariation * 100)),
    totalBalance: Math.max(10000, 25000 + baseVariation * 5000),
    timezone: 'America/New_York',
    lastUpdated: new Date().toISOString(),
  };
}

function generateMockDomainAccounts() {
  const accounts = [];
  const accountTypes = ['Premium', 'Standard', 'VIP', 'Basic'];

  for (let i = 1; i <= 25; i++) {
    accounts.push({
      id: `ACC${i.toString().padStart(4, '0')}`,
      username: `user${i}`,
      email: `user${i}@domain.com`,
      type: accountTypes[Math.floor(Math.random() * accountTypes.length)],
      balance: Math.floor(Math.random() * 10000),
      status: Math.random() > 0.1 ? 'Active' : 'Suspended',
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      lastLogin: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  return accounts;
}

function generateMockDomainBets() {
  const bets = [];
  const sports = ['Football', 'Basketball', 'Baseball', 'Soccer', 'Tennis'];
  const statuses = ['Pending', 'Won', 'Lost', 'Cancelled'];

  for (let i = 1; i <= 50; i++) {
    const stake = Math.floor(Math.random() * 1000) + 50;
    const odds = 1 + Math.random() * 3;
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    bets.push({
      id: `BET${i.toString().padStart(6, '0')}`,
      accountId: `ACC${Math.floor(Math.random() * 25) + 1}`,
      sport: sports[Math.floor(Math.random() * sports.length)],
      stake,
      odds: odds.toFixed(2),
      potentialPayout: (stake * odds).toFixed(2),
      status,
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      settledAt:
        status !== 'Pending'
          ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
          : null,
    });
  }

  return bets;
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

async function handleDomainStats(request: Request): Promise<Response> {
  try {
    const stats = generateMockDomainStats();
    return createResponse(stats, 'Domain statistics retrieved successfully');
  } catch (error) {
    console.error('Domain stats error:', error);
    return createResponse(null, 'Failed to retrieve domain statistics', 500);
  }
}

async function handleDomainAccounts(request: Request): Promise<Response> {
  try {
    const accounts = generateMockDomainAccounts();
    return createResponse(accounts, 'Domain accounts retrieved successfully');
  } catch (error) {
    console.error('Domain accounts error:', error);
    return createResponse(null, 'Failed to retrieve domain accounts', 500);
  }
}

async function handleDomainBets(request: Request): Promise<Response> {
  try {
    const bets = generateMockDomainBets();
    return createResponse(bets, 'Domain bets retrieved successfully');
  } catch (error) {
    console.error('Domain bets error:', error);
    return createResponse(null, 'Failed to retrieve domain bets', 500);
  }
}

async function handleDashboardMetrics(request: Request): Promise<Response> {
  try {
    const metrics = {
      totalRevenue: 125000,
      activeUsers: 2500,
      roi: 85,
      performanceScore: 92,
      totalTransactions: 15420,
      averageOrderValue: 89.5,
      conversionRate: 3.2,
      customerRetention: 78.5,
      timestamp: new Date().toISOString(),
    };

    return createResponse(metrics, 'Dashboard metrics retrieved successfully');
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    return createResponse(null, 'Failed to retrieve dashboard metrics', 500);
  }
}

async function handleDashboardAnalytics(request: Request): Promise<Response> {
  try {
    const analytics = {
      userGrowth: {
        current: 2500,
        previous: 2200,
        growth: 13.6,
      },
      revenueGrowth: {
        current: 125000,
        previous: 110000,
        growth: 13.6,
      },
      topPerformingRegions: [
        { region: 'North America', revenue: 45000, users: 800 },
        { region: 'Europe', revenue: 35000, users: 650 },
        { region: 'Asia Pacific', revenue: 28000, users: 520 },
      ],
      conversionFunnel: {
        visitors: 10000,
        signups: 800,
        activeUsers: 650,
        payingUsers: 200,
      },
      timestamp: new Date().toISOString(),
    };

    return createResponse(analytics, 'Dashboard analytics retrieved successfully');
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    return createResponse(null, 'Failed to retrieve dashboard analytics', 500);
  }
}

async function handleDashboardHealth(request: Request): Promise<Response> {
  try {
    const health = {
      status: 'healthy',
      uptime: Bun.nanoseconds() / 1e9, // Convert to seconds
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      services: {
        database: 'healthy',
        api: 'healthy',
        websocket: 'healthy',
        fantasy402: 'healthy',
      },
      timestamp: new Date().toISOString(),
    };

    return createResponse(health, 'Dashboard health check completed');
  } catch (error) {
    console.error('Dashboard health error:', error);
    return createResponse(null, 'Failed to retrieve dashboard health', 500);
  }
}

async function handleDashboardPerformance(request: Request): Promise<Response> {
  try {
    const performance = {
      responseTime: {
        average: 245,
        p95: 450,
        p99: 800,
      },
      throughput: {
        requestsPerSecond: 1250,
        errorRate: 0.02,
      },
      resourceUsage: {
        cpu: 68,
        memory: 72,
        disk: 45,
      },
      database: {
        connectionPool: 85,
        queryLatency: 12,
        cacheHitRate: 94,
      },
      timestamp: new Date().toISOString(),
    };

    return createResponse(performance, 'Dashboard performance metrics retrieved successfully');
  } catch (error) {
    console.error('Dashboard performance error:', error);
    return createResponse(null, 'Failed to retrieve dashboard performance metrics', 500);
  }
}

// ============================================================================
// MAIN REQUEST HANDLER
// ============================================================================

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  // Set CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight requests
  if (method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Health check endpoint
    if (pathname === '/health' && method === 'GET') {
      const health = {
        status: 'healthy',
        service: 'Fire22 Dashboard API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: Bun.nanoseconds() / 1e9,
      };

      return Response.json(health, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
        }
      });
    }

    // API info endpoint
    if (pathname === '/api' && method === 'GET') {
      const apiInfo = {
        name: 'Fire22 Dashboard API',
        version: '1.0.0',
        description: 'Real-time metrics and analytics API for Fire22 dashboards',
        endpoints: {
          metrics: '/api/dashboard/metrics',
          analytics: '/api/dashboard/analytics',
          health: '/api/dashboard/health',
          performance: '/api/dashboard/performance',
        },
        documentation: 'See DASHBOARD-API-README.md for detailed API documentation',
        timestamp: new Date().toISOString(),
      };

      return Response.json(apiInfo, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          'ETag': `"${Date.now()}"`,
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
        }
      });
    }

    // Domain routes
    if (pathname === '/api/domain/stats' && method === 'GET') {
      return handleDomainStats(request);
    }

    if (pathname === '/api/domain/accounts' && method === 'GET') {
      return handleDomainAccounts(request);
    }

    if (pathname === '/api/domain/bets' && method === 'GET') {
      return handleDomainBets(request);
    }

    // Dashboard routes
    if (pathname === '/api/dashboard/metrics' && method === 'GET') {
      return handleDashboardMetrics(request);
    }

    if (pathname === '/api/dashboard/analytics' && method === 'GET') {
      return handleDashboardAnalytics(request);
    }

    if (pathname === '/api/dashboard/health' && method === 'GET') {
      return handleDashboardHealth(request);
    }

    if (pathname === '/api/dashboard/performance' && method === 'GET') {
      return handleDashboardPerformance(request);
    }

    // 404 for unknown routes
    return Response.json({
      error: 'Not found',
      message: `Route ${pathname} not found`,
      availableRoutes: ['/health', '/api', '/api/dashboard/*', '/api/domain/*'],
      timestamp: new Date().toISOString(),
    }, {
      status: 404,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Request handler error:', error);
    return Response.json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

// Use a unique port to avoid conflicts
const PORT = 3003; // Changed from 3000/3001/3002 to avoid conflicts
const HOST = '127.0.0.1';

console.log('🚀 Starting Fire22 Dashboard API Server with Bun...');

try {
  const server = serve({
    port: PORT,
    hostname: HOST,
    fetch: handleRequest,
    development: process.env.NODE_ENV !== 'production',
  });

  console.log(`🚀 Fire22 Dashboard API Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Dashboard endpoints available at:`);
  console.log(`   • http://${HOST}:${PORT}/api/dashboard/metrics`);
  console.log(`   • http://${HOST}:${PORT}/api/dashboard/analytics`);
  console.log(`   • http://${HOST}:${PORT}/api/dashboard/health`);
  console.log(`   • http://${HOST}:${PORT}/api/dashboard/performance`);
  console.log(`🏥 Health check: http://${HOST}:${PORT}/health`);
  console.log(`📖 API info: http://${HOST}:${PORT}/api`);
  console.log(`🔧 Test with: curl http://localhost:${PORT}/health`);

  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Dashboard API Server...');
    server.stop();
    console.log('✅ Server closed successfully');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    server.stop();
    console.log('✅ Server closed successfully');
    process.exit(0);
  });

} catch (error) {
  console.error('❌ Failed to start server:', error);
  console.error('🔍 Check if port', PORT, 'is already in use');
  console.error('💡 Try: lsof -i :' + PORT);
  process.exit(1);
}
