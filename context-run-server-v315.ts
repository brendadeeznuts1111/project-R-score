#!/usr/bin/env bun

/**
 * Context Run Server v3.15
 * 
 * Advanced server with context-aware deep linking, wiki integration,
 * session management, R2 storage, and comprehensive monitoring.
 * 
 * Features:
 * - Context-aware deep link processing
 * - Wiki documentation integration
 * - Session management with persistence
 * - R2 cloud storage analytics
 * - Real-time monitoring dashboard
 * - Advanced error handling and recovery
 * - Performance optimization and caching
 */

import { serve } from 'bun';
import {
  EnhancedFreshCutsDeepLinkHandler,
  WikiIntegration,
  SessionManager,
  R2Integration,
  type EnhancedDeepLinkConfig
} from './freshcuts-deep-linking-integrations';

// Mock Venmo gateway for server
class ServerVenmoGateway {
  async createPayment(request: any) {
    return {
      paymentId: `payment_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      status: 'pending' as const,
      amount: request.amount,
      currency: request.currency,
      description: request.description,
      privateTransaction: request.privateTransaction,
      createdAt: new Date().toISOString(),
      metadata: request.metadata
    };
  }
}

// Server configuration
const SERVER_CONFIG = {
  port: parseInt(process.env.CONTEXT_SERVER_PORT || '3015'),
  host: process.env.CONTEXT_SERVER_HOST || 'localhost',
  environment: process.env.NODE_ENV || 'development',
  cors: process.env.CORS_ENABLED !== 'false',
  logging: process.env.SERVER_LOGGING !== 'false',
  metrics: process.env.METRICS_ENABLED === 'true'
};

// Integration configuration
const INTEGRATION_CONFIG: EnhancedDeepLinkConfig = {
  wiki: {
    enabled: process.env.WIKI_ENABLED === 'true',
    baseUrl: process.env.WIKI_BASE_URL || 'https://docs.freshcuts.com',
    apiKey: process.env.WIKI_API_KEY,
    cacheTimeout: parseInt(process.env.WIKI_CACHE_TIMEOUT || '300'),
    documentationPaths: {
      payments: '/api/v1/docs/payments',
      bookings: '/api/v1/docs/bookings',
      tips: '/api/v1/docs/tips',
      navigation: '/api/v1/docs/navigation'
    }
  },
  session: {
    enabled: process.env.SESSION_ENABLED !== 'false',
    storage: (process.env.SESSION_STORAGE as any) || 'memory',
    timeout: parseInt(process.env.SESSION_TIMEOUT || '1800'),
    cookieName: process.env.SESSION_COOKIE_NAME || 'context_session',
    encryptionKey: process.env.SESSION_ENCRYPTION_KEY
  },
  r2: {
    enabled: process.env.R2_ENABLED === 'true',
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_DEEP_LINK_BUCKET || 'context-server-analytics',
    prefix: process.env.R2_PREFIX || 'context-server/',
    region: process.env.R2_REGION || 'auto',
    encryption: process.env.R2_ENCRYPTION === 'true'
  },
  analytics: {
    enabled: process.env.ANALYTICS_ENABLED !== 'false',
    trackProcessingTime: true,
    trackErrors: true,
    trackMetadata: true
  },
  rateLimit: {
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '1000'),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000')
  }
};

// Server metrics
class ServerMetrics {
  private metrics = {
    requests: {
      total: 0,
      deepLinks: 0,
      errors: 0,
      byAction: {} as Record<string, number>
    },
    performance: {
      averageResponseTime: 0,
      slowRequests: 0,
      totalResponseTime: 0
    },
    sessions: {
      active: 0,
      total: 0
    },
    integrations: {
      wiki: { hits: 0, errors: 0 },
      r2: { uploads: 0, downloads: 0, errors: 0 }
    },
    uptime: Date.now(),
    lastReset: Date.now()
  };

  recordRequest(responseTime: number, action?: string, error?: boolean) {
    this.metrics.requests.total++;
    if (action) {
      this.metrics.requests.deepLinks++;
      this.metrics.requests.byAction[action] = (this.metrics.requests.byAction[action] || 0) + 1;
    }
    if (error) {
      this.metrics.requests.errors++;
    }
    
    this.metrics.performance.totalResponseTime += responseTime;
    this.metrics.performance.averageResponseTime = 
      this.metrics.performance.totalResponseTime / this.metrics.requests.total;
    
    if (responseTime > 1000) {
      this.metrics.performance.slowRequests++;
    }
  }

  recordIntegration(type: 'wiki' | 'r2', operation: 'hit' | 'error' | 'upload' | 'download') {
    if (type === 'wiki') {
      if (operation === 'hit') this.metrics.integrations.wiki.hits++;
      if (operation === 'error') this.metrics.integrations.wiki.errors++;
    } else if (type === 'r2') {
      if (operation === 'upload') this.metrics.integrations.r2.uploads++;
      if (operation === 'download') this.metrics.integrations.r2.downloads++;
      if (operation === 'error') this.metrics.integrations.r2.errors++;
    }
  }

  updateSessionStats(active: number, total: number) {
    this.metrics.sessions.active = active;
    this.metrics.sessions.total = total;
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.uptime,
      memory: process.memoryUsage(),
      version: '3.15.0'
    };
  }

  reset() {
    this.metrics = {
      requests: {
        total: 0,
        deepLinks: 0,
        errors: 0,
        byAction: {}
      },
      performance: {
        averageResponseTime: 0,
        slowRequests: 0,
        totalResponseTime: 0
      },
      sessions: {
        active: 0,
        total: 0
      },
      integrations: {
        wiki: { hits: 0, errors: 0 },
        r2: { uploads: 0, downloads: 0, errors: 0 }
      },
      uptime: Date.now(),
      lastReset: Date.now()
    };
  }
}

// Context-aware request handler
class ContextRequestHandler {
  private deepLinkHandler: EnhancedFreshCutsDeepLinkHandler;
  private metrics: ServerMetrics;

  constructor(deepLinkHandler: EnhancedFreshCutsDeepLinkHandler, metrics: ServerMetrics) {
    this.deepLinkHandler = deepLinkHandler;
    this.metrics = metrics;
  }

  async handleRequest(request: Request): Promise<Response> {
    const startTime = Date.now();
    const url = new URL(request.url);
    
    try {
      // CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-ID',
        'Access-Control-Max-Age': '86400'
      };

      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      // Route handling
      let response: Response;
      let action: string | undefined;

      if (url.pathname === '/api/deep-link' && request.method === 'POST') {
        response = await this.handleDeepLink(request);
        action = 'deep-link-processing';
      } else if (url.pathname === '/api/analytics' && request.method === 'GET') {
        response = await this.handleAnalytics(request);
        action = 'analytics-fetch';
      } else if (url.pathname === '/api/metrics' && request.method === 'GET') {
        response = await this.handleMetrics(request);
        action = 'metrics-fetch';
      } else if (url.pathname === '/api/health' && request.method === 'GET') {
        response = await this.handleHealth(request);
        action = 'health-check';
      } else if (url.pathname === '/' || url.pathname === '/dashboard') {
        response = await this.handleDashboard(request);
        action = 'dashboard-serve';
      } else {
        response = new Response('Not Found', { status: 404 });
      }

      // Add CORS headers to response
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      // Record metrics
      const responseTime = Date.now() - startTime;
      this.metrics.recordRequest(responseTime, action, response.status >= 400);

      return response;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.metrics.recordRequest(responseTime, undefined, true);
      
      console.error('Request handling error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  private async handleDeepLink(request: Request): Promise<Response> {
    const sessionId = request.headers.get('X-Session-ID') || undefined;
    const body = await request.json();
    
    if (!body.url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await this.deepLinkHandler.handleDeepLink(body.url, sessionId);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  private async handleAnalytics(request: Request): Promise<Response> {
    const requestUrl = new URL(request.url);
    const days = parseInt(requestUrl.searchParams.get('days') || '7');
    const analytics = await this.deepLinkHandler.getAnalyticsDashboard(days);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString()
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  private async handleMetrics(request: Request): Promise<Response> {
    const metrics = this.metrics.getMetrics();
    
    return new Response(
      JSON.stringify({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  private async handleHealth(request: Request): Promise<Response> {
    const health = {
      status: 'healthy',
      version: '3.15.0',
      uptime: Date.now() - this.metrics.getMetrics().uptime,
      environment: SERVER_CONFIG.environment,
      integrations: {
        wiki: INTEGRATION_CONFIG.wiki?.enabled || false,
        sessions: INTEGRATION_CONFIG.session?.enabled || false,
        r2: INTEGRATION_CONFIG.r2?.enabled || false,
        analytics: INTEGRATION_CONFIG.analytics?.enabled || false
      },
      timestamp: new Date().toISOString()
    };
    
    return new Response(
      JSON.stringify({
        success: true,
        data: health
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  private async handleDashboard(request: Request): Promise<Response> {
    const dashboardHtml = this.generateDashboardHTML();
    return new Response(dashboardHtml, {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  private generateDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Context Run Server v3.15 - Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { 
            background: rgba(255, 255, 255, 0.95); 
            border-radius: 15px; 
            padding: 30px; 
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }
        .header h1 { 
            font-size: 2.5em; 
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }
        .header p { color: #666; font-size: 1.1em; }
        .grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px;
        }
        .card { 
            background: rgba(255, 255, 255, 0.95); 
            border-radius: 15px; 
            padding: 25px; 
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .card:hover { 
            transform: translateY(-5px); 
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
        }
        .card h3 { 
            color: #333; 
            margin-bottom: 15px; 
            font-size: 1.3em;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .card .icon { 
            width: 24px; 
            height: 24px; 
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }
        .metric { 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            margin: 10px 0;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
        }
        .metric:last-child { border-bottom: none; }
        .metric-label { color: #666; }
        .metric-value { 
            font-weight: bold; 
            color: #333;
            font-size: 1.1em;
        }
        .status { 
            padding: 5px 15px; 
            border-radius: 20px; 
            font-size: 0.9em;
            font-weight: bold;
        }
        .status.healthy { background: #d4edda; color: #155724; }
        .status.warning { background: #fff3cd; color: #856404; }
        .status.error { background: #f8d7da; color: #721c24; }
        .api-section {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }
        .api-section h2 { 
            color: #333; 
            margin-bottom: 20px;
            font-size: 1.8em;
        }
        .api-endpoint {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
        }
        .api-endpoint code {
            background: #e9ecef;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', monospace;
        }
        .refresh-btn {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 1em;
            font-weight: bold;
            transition: transform 0.3s ease;
            margin: 20px 0;
        }
        .refresh-btn:hover { transform: scale(1.05); }
        .loading { opacity: 0.6; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Context Run Server v3.15</h1>
            <p>Advanced Deep Link Processing with Context Awareness</p>
            <div style="margin-top: 20px;">
                <span class="status healthy" id="server-status">● Healthy</span>
                <span style="margin-left: 20px; color: #666;">Environment: ${SERVER_CONFIG.environment}</span>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <h3><div class="icon">📊</div>Server Metrics</h3>
                <div class="metric">
                    <span class="metric-label">Total Requests</span>
                    <span class="metric-value" id="total-requests">-</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Deep Links Processed</span>
                    <span class="metric-value" id="deep-links">-</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Average Response Time</span>
                    <span class="metric-value" id="avg-response">-</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Error Rate</span>
                    <span class="metric-value" id="error-rate">-</span>
                </div>
            </div>

            <div class="card">
                <h3><div class="icon">🔐</div>Session Management</h3>
                <div class="metric">
                    <span class="metric-label">Active Sessions</span>
                    <span class="metric-value" id="active-sessions">-</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Total Sessions</span>
                    <span class="metric-value" id="total-sessions">-</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Session Storage</span>
                    <span class="metric-value">${INTEGRATION_CONFIG.session?.storage || 'memory'}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Session Timeout</span>
                    <span class="metric-value">${INTEGRATION_CONFIG.session?.timeout || 1800}s</span>
                </div>
            </div>

            <div class="card">
                <h3><div class="icon">🔗</div>Deep Link Actions</h3>
                <div class="metric">
                    <span class="metric-label">Payments</span>
                    <span class="metric-value" id="payments">-</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Bookings</span>
                    <span class="metric-value" id="bookings">-</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Tips</span>
                    <span class="metric-value" id="tips">-</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Navigation</span>
                    <span class="metric-value" id="navigation">-</span>
                </div>
            </div>

            <div class="card">
                <h3><div class="icon">🔌</div>Integrations</h3>
                <div class="metric">
                    <span class="metric-label">Wiki Integration</span>
                    <span class="metric-value" id="wiki-status">${INTEGRATION_CONFIG.wiki?.enabled ? '✅ Enabled' : '❌ Disabled'}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">R2 Storage</span>
                    <span class="metric-value" id="r2-status">${INTEGRATION_CONFIG.r2?.enabled ? '✅ Enabled' : '❌ Disabled'}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Analytics</span>
                    <span class="metric-value" id="analytics-status">${INTEGRATION_CONFIG.analytics?.enabled ? '✅ Enabled' : '❌ Disabled'}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Server Uptime</span>
                    <span class="metric-value" id="uptime">-</span>
                </div>
            </div>
        </div>

        <button class="refresh-btn" onclick="refreshMetrics()">🔄 Refresh Metrics</button>

        <div class="api-section">
            <h2>🚀 API Endpoints</h2>
            
            <div class="api-endpoint">
                <strong>POST</strong> <code>/api/deep-link</code>
                <p style="margin-top: 10px; color: #666;">Process deep links with full context awareness</p>
                <code style="display: block; margin-top: 10px; background: #f1f3f4; padding: 10px; border-radius: 5px;">
{ "url": "freshcuts://payment?amount=45&shop=nyc_01" }
                </code>
            </div>

            <div class="api-endpoint">
                <strong>GET</strong> <code>/api/analytics?days=7</code>
                <p style="margin-top: 10px; color: #666;">Get analytics dashboard data</p>
            </div>

            <div class="api-endpoint">
                <strong>GET</strong> <code>/api/metrics</code>
                <p style="margin-top: 10px; color: #666;">Get real-time server metrics</p>
            </div>

            <div class="api-endpoint">
                <strong>GET</strong> <code>/api/health</code>
                <p style="margin-top: 10px; color: #666;">Health check and integration status</p>
            </div>
        </div>
    </div>

    <script>
        async function refreshMetrics() {
            const btn = document.querySelector('.refresh-btn');
            btn.classList.add('loading');
            btn.textContent = '🔄 Loading...';

            try {
                const response = await fetch('/api/metrics');
                const result = await response.json();
                const metrics = result.data;

                // Update server metrics
                document.getElementById('total-requests').textContent = metrics.requests.total.toLocaleString();
                document.getElementById('deep-links').textContent = metrics.requests.deepLinks.toLocaleString();
                document.getElementById('avg-response').textContent = metrics.performance.averageResponseTime.toFixed(2) + 'ms';
                const errorRate = metrics.requests.total > 0 ? (metrics.requests.errors / metrics.requests.total * 100).toFixed(2) : 0;
                document.getElementById('error-rate').textContent = errorRate + '%';

                // Update session metrics
                document.getElementById('active-sessions').textContent = metrics.sessions.active.toLocaleString();
                document.getElementById('total-sessions').textContent = metrics.sessions.total.toLocaleString();

                // Update action metrics
                document.getElementById('payments').textContent = (metrics.requests.byAction.payment || 0).toLocaleString();
                document.getElementById('bookings').textContent = (metrics.requests.byAction.booking || 0).toLocaleString();
                document.getElementById('tips').textContent = (metrics.requests.byAction.tip || 0).toLocaleString();
                const navigationCount = (metrics.requests.byAction.shop || 0) + (metrics.requests.byAction.barber || 0) + (metrics.requests.byAction.profile || 0);
                document.getElementById('navigation').textContent = navigationCount.toLocaleString();

                // Update uptime
                const uptimeSeconds = Math.floor(metrics.uptime / 1000);
                const hours = Math.floor(uptimeSeconds / 3600);
                const minutes = Math.floor((uptimeSeconds % 3600) / 60);
                document.getElementById('uptime').textContent = \`\${hours}h \${minutes}m\`;

            } catch (error) {
                console.error('Failed to refresh metrics:', error);
            } finally {
                btn.classList.remove('loading');
                btn.textContent = '🔄 Refresh Metrics';
            }
        }

        // Auto-refresh every 30 seconds
        setInterval(refreshMetrics, 30000);
        
        // Initial load
        refreshMetrics();
    </script>
</body>
</html>`;
  }
}

// Main server function
async function startContextServer() {
  console.log('🚀 Starting Context Run Server v3.15...\n');

  // Initialize components
  const metrics = new ServerMetrics();
  const deepLinkHandler = new EnhancedFreshCutsDeepLinkHandler(new ServerVenmoGateway(), INTEGRATION_CONFIG);
  const requestHandler = new ContextRequestHandler(deepLinkHandler, metrics);

  // Start server
  const server = serve({
    port: SERVER_CONFIG.port,
    hostname: SERVER_CONFIG.host,
    fetch: (request) => requestHandler.handleRequest(request),
    error(error) {
      console.error('Server error:', error);
    }
  });

  console.log('✅ Context Run Server v3.15 Started Successfully!\n');
  console.log('📊 Server Configuration:');
  console.log(`   Port: ${SERVER_CONFIG.port}`);
  console.log(`   Host: ${SERVER_CONFIG.host}`);
  console.log(`   Environment: ${SERVER_CONFIG.environment}`);
  console.log(`   CORS: ${SERVER_CONFIG.cors ? 'Enabled' : 'Disabled'}`);
  console.log(`   Logging: ${SERVER_CONFIG.logging ? 'Enabled' : 'Disabled'}\n`);

  console.log('🔌 Integration Status:');
  console.log(`   Wiki Integration: ${INTEGRATION_CONFIG.wiki?.enabled ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   Session Management: ${INTEGRATION_CONFIG.session?.enabled ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   R2 Storage: ${INTEGRATION_CONFIG.r2?.enabled ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   Analytics: ${INTEGRATION_CONFIG.analytics?.enabled ? '✅ Enabled' : '❌ Disabled'}\n`);

  console.log('🌐 Available Endpoints:');
  console.log(`   Dashboard: http://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}/`);
  console.log(`   Deep Links: POST http://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}/api/deep-link`);
  console.log(`   Analytics: GET http://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}/api/analytics`);
  console.log(`   Metrics: GET http://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}/api/metrics`);
  console.log(`   Health: GET http://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}/api/health\n`);

  console.log('🧪 Example Usage:');
  console.log(`   curl -X POST http://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}/api/deep-link \\`);
  console.log(`        -H "Content-Type: application/json" \\`);
  console.log(`        -d '{"url": "freshcuts://payment?amount=45&shop=nyc_01"}'\n`);

  console.log('📈 Real-time Dashboard: http://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}/dashboard');
  console.log('🔍 Health Check: http://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}/api/health');
  console.log(`🚀 Server is ready to handle requests!\n`);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Context Run Server v3.15...');
    server.stop();
    console.log('✅ Server stopped gracefully.');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down Context Run Server v3.15...');
    server.stop();
    console.log('✅ Server stopped gracefully.');
    process.exit(0);
  });

  return server;
}

// Start server if this file is run directly
if (import.meta.main) {
  startContextServer().catch(console.error);
}

export { startContextServer };
export const ContextRunServerV315 = startContextServer;
