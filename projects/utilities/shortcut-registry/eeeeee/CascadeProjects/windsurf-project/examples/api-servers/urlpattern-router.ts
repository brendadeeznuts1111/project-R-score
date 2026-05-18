#!/usr/bin/env bun
// 🌐 URLPattern-based API Router for Factory Wager Empire
// Dynamic routing with environment-based port configuration

import { serve } from "bun";

// Environment-based port configuration
const API_PORTS = {
  landing: parseInt(process.env.LANDING_PORT || '3222'),
  cashApp: parseInt(process.env.CASH_APP_PORT || '3223'),
  familyControls: parseInt(process.env.FAMILY_CONTROLS_PORT || '3224'),
  suspensionRisk: parseInt(process.env.SUSPENSION_RISK_PORT || '3225'),
  crossFamily: parseInt(process.env.CROSS_FAMILY_PORT || '3226'),
};

const HOST = process.env.HOST || 'localhost';

// URLPattern routes for API endpoints
const API_ROUTES = [
  // System Status Routes
  {
    pattern: new URLPattern({ pathname: '/api/system-status' }),
    handler: handleSystemStatus,
  },
  {
    pattern: new URLPattern({ pathname: '/api/revenue' }),
    handler: handleRevenue,
  },
  {
    pattern: new URLPattern({ pathname: '/api/metrics' }),
    handler: handleMetrics,
  },
  
  // Cash App Routes (proxied to cash-app service)
  {
    pattern: new URLPattern({ pathname: '/api/cashapp/*' }),
    handler: (req: Request) => proxyToService(req, 'cashApp'),
  },
  
  // Family Controls Routes (proxied to family-controls service)
  {
    pattern: new URLPattern({ pathname: '/api/family/*' }),
    handler: (req: Request) => proxyToService(req, 'familyControls'),
  },
  
  // Suspension Risk Routes (proxied to suspension-risk service)
  {
    pattern: new URLPattern({ pathname: '/api/risk/*' }),
    handler: (req: Request) => proxyToService(req, 'suspensionRisk'),
  },
  
  // Cross-Family Network Routes (proxied to cross-family service)
  {
    pattern: new URLPattern({ pathname: '/api/network/*' }),
    handler: (req: Request) => proxyToService(req, 'crossFamily'),
  },
];

// API Handlers
async function handleSystemStatus(req: Request): Promise<Response> {
  const systemData = {
    status: 'operational',
    uptime: '99.7%',
    responseTime: '124ms',
    errorRate: '0.3%',
    activeUsers: 12847,
    services: {
      landing: `http://${HOST}:${API_PORTS.landing}`,
      cashApp: `http://${HOST}:${API_PORTS.cashApp}`,
      familyControls: `http://${HOST}:${API_PORTS.familyControls}`,
      suspensionRisk: `http://${HOST}:${API_PORTS.suspensionRisk}`,
      crossFamily: `http://${HOST}:${API_PORTS.crossFamily}`,
    },
    lastUpdated: new Date().toISOString(),
  };
  
  return Response.json(systemData, {
    headers: { 'Access-Control-Allow-Origin': '*' }
  });
}

async function handleRevenue(req: Request): Promise<Response> {
  const revenueData = {
    total: 1620000,
    breakdown: {
      operationalDominance: 73500,
      financialWarming: 142500,
      familyControls: 787686,
      cashAppPriority: 74750,
      aiRiskSavings: 1070000,
    },
    growth: '+260% vs last quarter',
    monthly: [450000, 680000, 920000, 1150000, 1380000, 1620000],
    services: Object.fromEntries(
      Object.entries(API_PORTS).map(([key, port]) => [key, `http://${HOST}:${port}`])
    ),
  };
  
  return Response.json(revenueData, {
    headers: { 'Access-Control-Allow-Origin': '*' }
  });
}

async function handleMetrics(req: Request): Promise<Response> {
  const metrics = {
    operationalDominance: {
      trustLevel: 5,
      identitiesCreated: 2880,
      timeToIdentity: 5,
      successRate: 94,
      monthlyRevenue: 73500,
    },
    financialWarming: {
      successRate: 94,
      dailyPairs: 500,
      roi: 1900,
      monthlyRevenue: 142500,
    },
    familyControls: {
      adoption: 83,
      compliance: 98,
      retention: 80,
      monthlyRevenue: 787686,
    },
    cashAppPriority: {
      conversion: 87,
      checkoutTime: 18,
      successRate: 94,
      monthlyRevenue: 74750,
    },
    aiRiskPrediction: {
      accuracy: 94,
      prevention: 90,
      inferenceSpeed: 45,
      monthlySavings: 1070000,
    },
    ports: API_PORTS,
    host: HOST,
  };
  
  return Response.json(metrics, {
    headers: { 'Access-Control-Allow-Origin': '*' }
  });
}

// Proxy handler for service-specific routes
async function proxyToService(req: Request, service: keyof typeof API_PORTS): Promise<Response> {
  const port = API_PORTS[service];
  const url = new URL(req.url);
  const targetUrl = `http://${HOST}:${port}${url.pathname}${url.search}`;
  
  try {
    // Clone the request with modified URL
    const proxyReq = new Request(targetUrl, {
      method: req.method,
      headers: req.headers,
      body: req.body,
    });
    
    // Forward the request to the target service
    const response = await fetch(proxyReq);
    
    // Return the response with CORS headers
    const corsHeaders = new Headers(response.headers);
    corsHeaders.set('Access-Control-Allow-Origin', '*');
    corsHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    corsHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: corsHeaders,
    });
  } catch (error) {
    return Response.json({
      error: 'Service unavailable',
      service,
      port,
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { 
      status: 503,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}

// Main server with URLPattern routing
const server = serve({
  port: API_PORTS.landing,
  hostname: HOST,
  fetch(req) {
    const url = new URL(req.url);
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }
    
    // Serve landing page
    if (url.pathname === '/' || url.pathname === '/landing') {
      const landingPage = Bun.file('./landing.html');
      return new Response(landingPage, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache',
        },
      });
    }
    
    // Serve dashboard files
    if (url.pathname.startsWith('/dashboard/')) {
      const dashboardPath = url.pathname.replace('/dashboard/', './dashboard/');
      try {
        const dashboardFile = Bun.file(dashboardPath);
        return new Response(dashboardFile, {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache',
          },
        });
      } catch (error) {
        return Response.json({ error: 'Dashboard not found' }, { status: 404 });
      }
    }
    
    // Route API requests using URLPattern
    for (const route of API_ROUTES) {
      if (route.pattern.test(url)) {
        return route.handler(req);
      }
    }
    
    // 404 for unknown routes
    return Response.json({ 
      error: 'Not Found',
      availableRoutes: API_ROUTES.map(r => r.pattern.pathname),
      services: Object.fromEntries(
        Object.entries(API_PORTS).map(([key, port]) => [key, `http://${HOST}:${port}`])
      ),
    }, { status: 404 });
  },
});

console.info(`🌐 URLPattern-based API Router Started:`);
console.info(`   📱 Main Server: http://${HOST}:${API_PORTS.landing}`);
console.info(`   🔄 API Routes: /api/* with dynamic port routing`);
console.info(`   📊 Service Discovery: /api/system-status`);
console.info(`   💰 Revenue Data: /api/revenue`);
console.info(`   📈 Metrics: /api/metrics`);
console.info(`   🛡️ CORS Enabled: Cross-origin requests supported`);
console.info(`   ⚡ URLPattern Routing: Fast pattern matching`);
console.info(`   🔄 Service Proxy: Automatic request forwarding`);
console.info(``);
console.info(`🔧 Configured Services:`);
Object.entries(API_PORTS).forEach(([name, port]) => {
  console.info(`   ${name}: http://${HOST}:${port}`);
});
console.info(``);
console.info(`🎆 Empire Status: Dynamic URLPattern Routing Active!`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.info('\n🛑 Shutting down URLPattern router...');
  server.stop();
  console.info('✅ Router stopped gracefully');
  process.exit(0);
});

console.info('\n🔄 URLPattern router is running. Press Ctrl+C to stop.');
