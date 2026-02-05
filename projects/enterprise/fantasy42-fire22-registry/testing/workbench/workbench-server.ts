#!/usr/bin/env bun

/**
 * 🧪 Fantasy402 Testing Workbench Server
 *
 * Backend server for the interactive testing workbench
 * - Serves the HTML interface
 * - Provides testing API endpoints
 * - Handles Fantasy402 integration testing
 * - Real-time status updates
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fantasy402Service, Fantasy402Client } from '../../src/services/fantasy402-integration';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'pending';
  duration: number;
  details: string;
  timestamp: string;
}

interface WorkbenchResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

class WorkbenchServer {
  private testResults: TestResult[] = [];
  private isInitialized: boolean = false;

  constructor() {
    this.initializeFantasy402Service();
  }

  private async initializeFantasy402Service(): Promise<void> {
    try {
      console.log('🚀 Initializing Fantasy402 service for workbench...');
      const initialized = await fantasy402Service.initialize();
      this.isInitialized = initialized;

      if (initialized) {
        console.log('✅ Fantasy402 service initialized successfully');
      } else {
        console.warn('⚠️ Fantasy402 service initialization failed');
      }
    } catch (error) {
      console.error('❌ Fantasy402 service initialization error:', error);
    }
  }

  private createResponse<T>(data?: T, error?: string): WorkbenchResponse<T> {
    return {
      success: !error,
      data,
      error,
      timestamp: new Date().toISOString(),
    };
  }

  private async runHealthTest(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const client = fantasy402Service.getClient();
      const isHealthy = await client.healthCheck();
      const duration = Date.now() - startTime;

      return {
        name: 'Health Check',
        status: isHealthy ? 'passed' : 'failed',
        duration,
        details: isHealthy ? 'API is responding' : 'API is not responding',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        name: 'Health Check',
        status: 'failed',
        duration: Date.now() - startTime,
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async runAuthTest(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const client = fantasy402Service.getClient();
      const authenticated = await client.authenticate();
      const duration = Date.now() - startTime;

      return {
        name: 'Authentication Test',
        status: authenticated ? 'passed' : 'failed',
        duration,
        details: authenticated ? 'Authentication successful' : 'Authentication failed',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        name: 'Authentication Test',
        status: 'failed',
        duration: Date.now() - startTime,
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async runWebSocketTest(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const client = fantasy402Service.getClient();
      const connected = await client.connectWebSocket();
      const duration = Date.now() - startTime;

      // Test message handling
      let messageReceived = false;
      const messagePromise = new Promise<void>(resolve => {
        const timeout = setTimeout(() => resolve(), 3000);
        client.once('message', () => {
          messageReceived = true;
          clearTimeout(timeout);
          resolve();
        });
      });

      await messagePromise;

      return {
        name: 'WebSocket Test',
        status: connected ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        details: connected
          ? `Connected${messageReceived ? ' and receiving messages' : ' but no messages received'}`
          : 'Connection failed',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        name: 'WebSocket Test',
        status: 'failed',
        duration: Date.now() - startTime,
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async runApiEndpointsTest(): Promise<TestResult> {
    const startTime = Date.now();
    const results: string[] = [];
    let allPassed = true;

    try {
      const client = fantasy402Service.getClient();

      // Test system status
      try {
        const status = await client.getSystemStatus();
        results.push('System status: ✅');
      } catch (error) {
        results.push('System status: ❌');
        allPassed = false;
      }

      // Test user operations
      try {
        const user = await client.getUserByUsername('test_user');
        results.push('Get user: ✅');
      } catch (error) {
        results.push('Get user: ❌');
        allPassed = false;
      }

      // Test data sync
      try {
        const synced = await client.syncData('test', { test: true });
        results.push('Data sync: ✅');
      } catch (error) {
        results.push('Data sync: ❌');
        allPassed = false;
      }

      return {
        name: 'API Endpoints Test',
        status: allPassed ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        details: results.join(', '),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        name: 'API Endpoints Test',
        status: 'failed',
        duration: Date.now() - startTime,
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async runPerformanceTest(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const client = fantasy402Service.getClient();
      const iterations = 10;
      const times: number[] = [];

      // Run multiple health checks to measure performance
      for (let i = 0; i < iterations; i++) {
        const iterationStart = Date.now();
        await client.healthCheck();
        times.push(Date.now() - iterationStart);
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      return {
        name: 'Performance Test',
        status: avgTime < 1000 ? 'passed' : 'failed', // Pass if average < 1s
        duration: Date.now() - startTime,
        details: `Avg: ${avgTime.toFixed(0)}ms, Min: ${minTime}ms, Max: ${maxTime}ms (${iterations} iterations)`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        name: 'Performance Test',
        status: 'failed',
        duration: Date.now() - startTime,
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async runComprehensiveTest(): Promise<TestResult[]> {
    const tests = [
      await this.runHealthTest(),
      await this.runAuthTest(),
      await this.runWebSocketTest(),
      await this.runApiEndpointsTest(),
      await this.runPerformanceTest(),
    ];

    this.testResults.push(...tests);
    return tests;
  }

  async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    };

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      // Serve the HTML interface
      if (pathname === '/' || pathname === '/workbench') {
        const htmlPath = join(__dirname, 'fantasy402-workbench.html');
        if (existsSync(htmlPath)) {
          const html = readFileSync(htmlPath, 'utf-8');
          return new Response(html, {
            headers: { 'Content-Type': 'text/html', ...corsHeaders },
          });
        } else {
          return new Response('Workbench HTML not found', {
            status: 404,
            headers: corsHeaders,
          });
        }
      }

      // API endpoints
      if (pathname.startsWith('/api/fantasy402/')) {
        return await this.handleApiRequest(pathname, method, request, corsHeaders);
      }

      // 404 for other paths
      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('❌ Request handling error:', error);
      return new Response(JSON.stringify(this.createResponse(undefined, 'Internal server error')), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  }

  private async handleApiRequest(
    pathname: string,
    method: string,
    request: Request,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    const jsonHeaders = { 'Content-Type': 'application/json', ...corsHeaders };

    // Health check
    if (pathname === '/api/fantasy402/health' && method === 'GET') {
      const client = fantasy402Service.getClient();
      const health = {
        status: 'healthy',
        fantasy402: {
          api: await client.healthCheck(),
          authenticated: client.isAuthenticated(),
          websocket: client.isWebSocketConnected(),
        },
        service: {
          initialized: this.isInitialized,
          ready: fantasy402Service.isReady(),
        },
        timestamp: new Date().toISOString(),
      };

      return new Response(JSON.stringify(this.createResponse(health)), { headers: jsonHeaders });
    }

    // Token information
    if (pathname === '/api/fantasy402/token-info' && method === 'GET') {
      const client = fantasy402Service.getClient();
      const tokenInfo = client.getTokenExpiryInfo();

      return new Response(JSON.stringify(this.createResponse(tokenInfo)), { headers: jsonHeaders });
    }

    // Token refresh
    if (pathname === '/api/fantasy402/auth/refresh' && method === 'POST') {
      const client = fantasy402Service.getClient();
      const refreshed = await client.refreshAccessToken();

      return new Response(
        JSON.stringify(
          this.createResponse(
            { refreshed, tokenInfo: client.getTokenExpiryInfo() },
            refreshed ? undefined : 'Token refresh failed'
          )
        ),
        { headers: jsonHeaders }
      );
    }

    // Test endpoints
    if (pathname === '/api/fantasy402/test/health' && method === 'GET') {
      const result = await this.runHealthTest();
      this.testResults.push(result);
      return new Response(JSON.stringify(this.createResponse(result)), { headers: jsonHeaders });
    }

    if (pathname === '/api/fantasy402/auth/test' && method === 'GET') {
      const result = await this.runAuthTest();
      this.testResults.push(result);
      return new Response(JSON.stringify(this.createResponse(result)), { headers: jsonHeaders });
    }

    if (pathname === '/api/fantasy402/websocket/test' && method === 'POST') {
      const result = await this.runWebSocketTest();
      this.testResults.push(result);
      return new Response(JSON.stringify(this.createResponse(result)), { headers: jsonHeaders });
    }

    if (pathname === '/api/fantasy402/test/endpoints' && method === 'GET') {
      const result = await this.runApiEndpointsTest();
      this.testResults.push(result);
      return new Response(JSON.stringify(this.createResponse(result)), { headers: jsonHeaders });
    }

    if (pathname === '/api/fantasy402/test/performance' && method === 'GET') {
      const result = await this.runPerformanceTest();
      this.testResults.push(result);
      return new Response(JSON.stringify(this.createResponse(result)), { headers: jsonHeaders });
    }

    if (pathname === '/api/fantasy402/test/comprehensive' && method === 'GET') {
      const results = await this.runComprehensiveTest();
      const summary = {
        total: results.length,
        passed: results.filter(r => r.status === 'passed').length,
        failed: results.filter(r => r.status === 'failed').length,
        results,
      };

      return new Response(JSON.stringify(this.createResponse(summary)), { headers: jsonHeaders });
    }

    // Get test results
    if (pathname === '/api/fantasy402/test/results' && method === 'GET') {
      const summary = {
        total: this.testResults.length,
        passed: this.testResults.filter(r => r.status === 'passed').length,
        failed: this.testResults.filter(r => r.status === 'failed').length,
        recent: this.testResults.slice(-10), // Last 10 results
      };

      return new Response(JSON.stringify(this.createResponse(summary)), { headers: jsonHeaders });
    }

    // Clear test results
    if (pathname === '/api/fantasy402/test/clear' && method === 'POST') {
      this.testResults = [];
      return new Response(JSON.stringify(this.createResponse({ cleared: true })), {
        headers: jsonHeaders,
      });
    }

    // 404 for unknown API endpoints
    return new Response(JSON.stringify(this.createResponse(undefined, 'API endpoint not found')), {
      status: 404,
      headers: jsonHeaders,
    });
  }
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

const workbenchServer = new WorkbenchServer();

const server = Bun.serve({
  port: process.env.WORKBENCH_PORT || 3001,
  hostname: process.env.WORKBENCH_HOST || 'localhost',

  async fetch(request: Request): Promise<Response> {
    return await workbenchServer.handleRequest(request);
  },

  error(error: Error): Response {
    console.error('❌ Server error:', error);
    return new Response('Internal Server Error', { status: 500 });
  },
});

console.log('🧪 Fantasy402 Testing Workbench Server');
console.log('======================================');
console.log(`🌐 Server running at: http://${server.hostname}:${server.port}`);
console.log(`🔗 Workbench URL: http://${server.hostname}:${server.port}/workbench`);
console.log(`📊 API Base: http://${server.hostname}:${server.port}/api/fantasy402/`);
console.log('');
console.log('Available endpoints:');
console.log('  GET  /workbench                     - Testing workbench UI');
console.log('  GET  /api/fantasy402/health         - Health check');
console.log('  GET  /api/fantasy402/token-info     - Token information');
console.log('  POST /api/fantasy402/auth/refresh   - Refresh token');
console.log('  GET  /api/fantasy402/test/*         - Various test endpoints');
console.log('');
console.log('🚀 Ready for testing!');

export { WorkbenchServer };
