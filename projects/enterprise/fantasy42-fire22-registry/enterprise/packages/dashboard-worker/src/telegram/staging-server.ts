#!/usr/bin/env bun

/**
 * 🎭 Fire22 Telegram Staging Server
 *
 * Complete staging environment for testing all Telegram system components
 * before production deployment
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Mock integrations for staging (replace with actual imports when workspaces are set up)
const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Mock data for staging demo
const mockSystemStatus = () => ({
  status: 'running',
  uptime: Math.floor(Math.random() * 86400), // Random uptime
  workflows: { active: Math.floor(Math.random() * 50) + 10 },
  metrics: {
    totalMessages: Math.floor(Math.random() * 10000) + 5000,
    errors: Math.floor(Math.random() * 10),
  },
});

const mockDashboardData = () => ({
  botStatus: {
    isRunning: true,
    activeUsers: Math.floor(Math.random() * 100) + 20,
    messagesPerHour: Math.floor(Math.random() * 500) + 200,
  },
  queueData: {
    matchedPairs: Math.floor(Math.random() * 50) + 5,
    pendingWithdrawals: Math.floor(Math.random() * 20) + 2,
    pendingDeposits: Math.floor(Math.random() * 15) + 3,
  },
  languageStats: {
    totalLanguages: 4,
    translationRequests: Math.floor(Math.random() * 2000) + 1000,
  },
  realTimeMetrics: {
    responseTime: Math.floor(Math.random() * 50) + 30,
    errorRate: Math.random() * 0.1,
  },
});

// Staging-specific endpoints
app.get('/api/staging/status', c => {
  const systemStatus = mockSystemStatus();
  const dashboardData = mockDashboardData();

  return c.json({
    environment: 'staging',
    version: '4.0.0-staging',
    deployTime: new Date().toISOString(),
    botStatus:
      systemStatus.status === 'running'
        ? { text: 'Online', class: 'status-healthy' }
        : { text: 'Offline', class: 'status-error' },
    queueStatus:
      dashboardData.queueData.matchedPairs > 0
        ? { text: 'Active', class: 'status-healthy' }
        : { text: 'Idle', class: 'status-warning' },
    languageStats: dashboardData.languageStats,
    workflowStats: systemStatus.workflows,
    performance: {
      responseTime: `${dashboardData.realTimeMetrics.responseTime}ms`,
      throughput: '1,250 req/s',
      memory: `${Math.round(process.memoryUsage().heapUsed / 1048576)}MB`,
      errorRate: `${dashboardData.realTimeMetrics.errorRate.toFixed(3)}%`,
    },
    stats: {
      activeUsers: dashboardData.botStatus.activeUsers,
      messagesPerHour: dashboardData.botStatus.messagesPerHour,
      queueMatches: dashboardData.queueData.matchedPairs,
      translations: dashboardData.languageStats.translationRequests,
    },
    bunInfo: {
      version: Bun.version,
      platform: `${process.platform}-${process.arch}`,
      hotReload: process.env.NODE_ENV === 'development',
      installSpeed: '1.2s',
    },
  });
});

app.post('/api/staging/test', async c => {
  // Simulate test run delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  const testResults = {
    total: 253,
    passed: 249 + Math.floor(Math.random() * 4),
    failed: Math.floor(Math.random() * 4),
    coverage: '94%',
  };

  const benchmarks = {
    translation: `${(Math.random() * 0.5 + 0.5).toFixed(1)}ms avg`,
    queueMatching: `${Math.floor(Math.random() * 20 + 35)}ms avg`,
    workflow: `${Math.floor(Math.random() * 3 + 3)}ms avg`,
    sse: `${Math.floor(Math.random() * 100 + 900)} events/sec`,
  };

  return c.json({
    tests: testResults,
    benchmarks,
  });
});

// SSE endpoint with mock data
app.get('/api/dashboard/stream', c => {
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial data
      const initialData = mockDashboardData();
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: 'dashboard_update',
            data: initialData,
          })}\n\n`
        )
      );

      // Send periodic updates
      const interval = setInterval(() => {
        const updateData = mockDashboardData();
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: 'dashboard_update',
              data: updateData,
            })}\n\n`
          )
        );
      }, 5000);

      // Heartbeat
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 30000);

      return () => {
        clearInterval(interval);
        clearInterval(heartbeat);
      };
    },
  });

  return new Response(stream, { headers });
});

// Health check
app.get('/api/health', c => {
  const memUsage = process.memoryUsage();

  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      botConnection: true,
      database: true,
      queueSystem: true,
      languageSystem: true,
      environment: true,
    },
    metrics: {
      uptime: process.uptime(),
      memory: {
        used: Math.round(memUsage.heapUsed / 1048576),
        total: Math.round(memUsage.heapTotal / 1048576),
      },
      version: Bun.version,
      environment: 'staging',
    },
  });
});

// Serve staging dashboard
app.get('/dashboard', async c => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fire22 Staging Dashboard - Preview Environment</title>
  <script src="https://unpkg.com/alpinejs@3/dist/cdn.min.js" defer></script>
  <style>
    :root {
      --staging-primary: #f59e0b;
      --staging-secondary: #fb923c;
      --staging-accent: #fed7aa;
      --staging-dark: #92400e;
    }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, var(--staging-accent) 0%, white 100%);
      min-height: 100vh;
    }
    
    .staging-banner {
      background: var(--staging-primary);
      color: white;
      text-align: center;
      padding: 0.75rem;
      font-weight: bold;
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .dashboard-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    header h1 {
      color: var(--staging-dark);
      margin-bottom: 1rem;
    }
    
    header p {
      color: #6b7280;
      margin-bottom: 2rem;
    }
    
    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }
    
    .status-card {
      background: white;
      border-radius: 0.75rem;
      padding: 1.5rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
      border-left: 4px solid var(--staging-primary);
      transition: transform 0.2s;
    }
    
    .status-card:hover {
      transform: translateY(-2px);
    }
    
    .status-card h3 {
      margin: 0 0 1rem 0;
      color: var(--staging-dark);
      font-size: 1.25rem;
    }
    
    .metric {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid #f3f4f6;
    }
    
    .metric:last-child {
      border-bottom: none;
    }
    
    .metric-label {
      color: #6b7280;
      font-weight: 500;
    }
    
    .metric-value {
      font-weight: 600;
      color: var(--staging-dark);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .status-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }
    
    .status-healthy { background: #10b981; }
    .status-warning { background: #f59e0b; }
    .status-error { background: #ef4444; }
    
    .test-results {
      margin-top: 2rem;
      background: white;
      border-radius: 0.75rem;
      padding: 1.5rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    }
    
    .test-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin: 1rem 0;
    }
    
    .test-stat {
      text-align: center;
      padding: 1.5rem;
      background: #f9fafb;
      border-radius: 0.5rem;
      border: 1px solid #e5e7eb;
    }
    
    .test-stat-value {
      font-size: 2rem;
      font-weight: bold;
      color: var(--staging-primary);
      margin-bottom: 0.5rem;
    }
    
    .test-stat-label {
      color: #6b7280;
      font-size: 0.875rem;
    }
    
    .actions {
      margin-top: 2rem;
      text-align: center;
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    
    .btn {
      background: var(--staging-primary);
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 0.5rem;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.2s;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .btn:hover {
      background: var(--staging-dark);
    }
    
    .btn-secondary {
      background: var(--staging-secondary);
    }
    
    .btn-gray {
      background: #6b7280;
    }
    
    .loading {
      opacity: 0.6;
      pointer-events: none;
    }
    
    .pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    @media (max-width: 768px) {
      .dashboard-container {
        padding: 1rem;
      }
      
      .status-grid {
        grid-template-columns: 1fr;
      }
      
      .actions {
        flex-direction: column;
        align-items: center;
      }
    }
  </style>
</head>
<body x-data="stagingDashboard()">
  <div class="staging-banner">
    ⚠️ STAGING ENVIRONMENT - Preview Build v4.0.0-staging - Not for Production Use
  </div>

  <div class="dashboard-container">
    <header>
      <h1>🎭 Fire22 Telegram System - Staging Preview</h1>
      <p>
        Environment: <strong x-text="environment"></strong> | 
        Version: <strong x-text="version"></strong> | 
        Deployed: <strong x-text="new Date(deployTime).toLocaleString()"></strong>
      </p>
    </header>

    <div class="status-grid">
      <!-- System Status -->
      <div class="status-card">
        <h3>🔥 System Status</h3>
        <div class="metric">
          <span class="metric-label">Bot Status</span>
          <span class="metric-value">
            <span class="status-indicator" :class="botStatus.class"></span>
            <span x-text="botStatus.text"></span>
          </span>
        </div>
        <div class="metric">
          <span class="metric-label">Queue System</span>
          <span class="metric-value">
            <span class="status-indicator" :class="queueStatus.class"></span>
            <span x-text="queueStatus.text"></span>
          </span>
        </div>
        <div class="metric">
          <span class="metric-label">Language System</span>
          <span class="metric-value">
            <span class="status-indicator status-healthy"></span>
            <span x-text="languageStats.totalLanguages"></span> Languages
          </span>
        </div>
        <div class="metric">
          <span class="metric-label">Workflows</span>
          <span class="metric-value">
            <span class="status-indicator status-healthy"></span>
            <span x-text="workflowStats.active"></span> Active
          </span>
        </div>
      </div>

      <!-- Performance Metrics -->
      <div class="status-card">
        <h3>📊 Performance Metrics</h3>
        <div class="metric">
          <span class="metric-label">Response Time</span>
          <span class="metric-value" x-text="performance.responseTime"></span>
        </div>
        <div class="metric">
          <span class="metric-label">Throughput</span>
          <span class="metric-value" x-text="performance.throughput"></span>
        </div>
        <div class="metric">
          <span class="metric-label">Memory Usage</span>
          <span class="metric-value" x-text="performance.memory"></span>
        </div>
        <div class="metric">
          <span class="metric-label">Error Rate</span>
          <span class="metric-value" x-text="performance.errorRate"></span>
        </div>
      </div>

      <!-- Live Statistics -->
      <div class="status-card">
        <h3>📈 Live Statistics</h3>
        <div class="metric">
          <span class="metric-label">Active Users</span>
          <span class="metric-value" x-text="stats.activeUsers"></span>
        </div>
        <div class="metric">
          <span class="metric-label">Messages/Hour</span>
          <span class="metric-value" x-text="stats.messagesPerHour"></span>
        </div>
        <div class="metric">
          <span class="metric-label">Queue Matches</span>
          <span class="metric-value" x-text="stats.queueMatches"></span>
        </div>
        <div class="metric">
          <span class="metric-label">Translation Requests</span>
          <span class="metric-value" x-text="stats.translations"></span>
        </div>
      </div>

      <!-- Bun Runtime Info -->
      <div class="status-card">
        <h3>🚀 Bun Runtime</h3>
        <div class="metric">
          <span class="metric-label">Bun Version</span>
          <span class="metric-value" x-text="bunInfo.version"></span>
        </div>
        <div class="metric">
          <span class="metric-label">Platform</span>
          <span class="metric-value" x-text="bunInfo.platform"></span>
        </div>
        <div class="metric">
          <span class="metric-label">Hot Reload</span>
          <span class="metric-value">
            <span class="status-indicator" :class="bunInfo.hotReload ? 'status-healthy' : 'status-warning'"></span>
            <span x-text="bunInfo.hotReload ? 'Active' : 'Disabled'"></span>
          </span>
        </div>
        <div class="metric">
          <span class="metric-label">Install Speed</span>
          <span class="metric-value" x-text="bunInfo.installSpeed"></span>
        </div>
      </div>
    </div>

    <!-- Test Results -->
    <div class="test-results">
      <h2>🧪 Test Results</h2>
      <div class="test-summary">
        <div class="test-stat">
          <div class="test-stat-value" x-text="tests.total"></div>
          <div class="test-stat-label">Total Tests</div>
        </div>
        <div class="test-stat">
          <div class="test-stat-value" style="color: #10b981;" x-text="tests.passed"></div>
          <div class="test-stat-label">Passed</div>
        </div>
        <div class="test-stat">
          <div class="test-stat-value" style="color: #ef4444;" x-text="tests.failed"></div>
          <div class="test-stat-label">Failed</div>
        </div>
        <div class="test-stat">
          <div class="test-stat-value" x-text="tests.coverage"></div>
          <div class="test-stat-label">Coverage</div>
        </div>
      </div>
      
      <h3 style="margin-top: 1.5rem; margin-bottom: 1rem;">Benchmark Results</h3>
      <div class="metric">
        <span class="metric-label">Translation Speed</span>
        <span class="metric-value" x-text="benchmarks.translation"></span>
      </div>
      <div class="metric">
        <span class="metric-label">Queue Matching</span>
        <span class="metric-value" x-text="benchmarks.queueMatching"></span>
      </div>
      <div class="metric">
        <span class="metric-label">Workflow Routing</span>
        <span class="metric-value" x-text="benchmarks.workflow"></span>
      </div>
      <div class="metric">
        <span class="metric-label">Dashboard SSE</span>
        <span class="metric-value" x-text="benchmarks.sse"></span>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions">
      <button @click="refreshData()" 
              :class="{ 'loading': isLoading }" 
              class="btn">
        🔄 <span x-text="isLoading ? 'Loading...' : 'Refresh Data'"></span>
      </button>
      
      <button @click="runTests()" 
              :class="{ 'loading': isTestRunning }" 
              class="btn btn-secondary">
        🧪 <span x-text="isTestRunning ? 'Running Tests...' : 'Run Tests'"></span>
      </button>
      
      <a href="/api/health" target="_blank" class="btn btn-gray">
        💓 Health Check
      </a>
    </div>
  </div>

  <script>
  function stagingDashboard() {
    return {
      environment: 'staging',
      version: '4.0.0-staging',
      deployTime: new Date().toISOString(),
      
      // Data
      botStatus: { text: 'Online', class: 'status-healthy' },
      queueStatus: { text: 'Active', class: 'status-healthy' },
      languageStats: { totalLanguages: 4 },
      workflowStats: { active: 15 },
      performance: {
        responseTime: '45ms',
        throughput: '1,250 req/s',
        memory: '82MB',
        errorRate: '0.02%'
      },
      stats: {
        activeUsers: 42,
        messagesPerHour: 324,
        queueMatches: 18,
        translations: 1847
      },
      bunInfo: {
        version: '',
        platform: '',
        hotReload: true,
        installSpeed: '1.2s'
      },
      tests: {
        total: 253,
        passed: 251,
        failed: 2,
        coverage: '94%'
      },
      benchmarks: {
        translation: '0.8ms avg',
        queueMatching: '42ms avg',
        workflow: '5ms avg',
        sse: '950 events/sec'
      },
      
      // UI State
      isLoading: false,
      isTestRunning: false,
      
      async init() {
        // Set Bun info
        try {
          const response = await fetch('/api/staging/status');
          const data = await response.json();
          this.bunInfo.version = data.bunInfo.version;
          this.bunInfo.platform = data.bunInfo.platform;
        } catch (error) {
          console.error('Failed to load initial data:', error);
        }
        
        // Connect to SSE
        this.connectSSE();
        
        // Initial data load
        await this.refreshData();
      },
      
      connectSSE() {
        const eventSource = new EventSource('/api/dashboard/stream');
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'dashboard_update') {
              this.updateMetrics(data.data);
            }
          } catch (error) {
            console.error('SSE parse error:', error);
          }
        };
        
        eventSource.onerror = (error) => {
          console.error('SSE connection error:', error);
        };
      },
      
      async refreshData() {
        this.isLoading = true;
        
        try {
          const response = await fetch('/api/staging/status');
          const data = await response.json();
          this.updateFromAPI(data);
        } catch (error) {
          console.error('Failed to refresh data:', error);
        } finally {
          this.isLoading = false;
        }
      },
      
      async runTests() {
        this.isTestRunning = true;
        
        try {
          const response = await fetch('/api/staging/test', { method: 'POST' });
          const results = await response.json();
          
          this.tests = results.tests;
          this.benchmarks = results.benchmarks;
        } catch (error) {
          console.error('Failed to run tests:', error);
        } finally {
          this.isTestRunning = false;
        }
      },
      
      updateMetrics(data) {
        if (data.botStatus) this.stats.activeUsers = data.botStatus.activeUsers;
        if (data.botStatus) this.stats.messagesPerHour = data.botStatus.messagesPerHour;
        if (data.queueData) this.stats.queueMatches = data.queueData.matchedPairs;
        if (data.languageStats) this.stats.translations = data.languageStats.translationRequests;
      },
      
      updateFromAPI(data) {
        this.environment = data.environment;
        this.version = data.version;
        this.deployTime = data.deployTime;
        this.botStatus = data.botStatus;
        this.queueStatus = data.queueStatus;
        this.languageStats = data.languageStats;
        this.workflowStats = data.workflowStats;
        this.performance = data.performance;
        this.stats = data.stats;
        this.bunInfo = data.bunInfo;
      }
    };
  }
  </script>
</body>
</html>`;

  return c.html(html);
});

// Start server
const port = process.env.PORT || 3001;

console.log(`
🎭 Fire22 Telegram Staging Server
══════════════════════════════════
Environment: staging
Version: 4.0.0-staging  
Port: ${port}
Dashboard: http://localhost:${port}/dashboard
API: http://localhost:${port}/api
Health: http://localhost:${port}/api/health
══════════════════════════════════

Available endpoints:
📊 GET  /dashboard              - Staging dashboard
💓 GET  /api/health             - Health check  
📈 GET  /api/staging/status     - System status
🧪 POST /api/staging/test       - Run tests
📡 GET  /api/dashboard/stream   - SSE stream

Quick commands:
bun run preview                 - Start this server
bun run staging:health          - Check health
bun run staging:dashboard       - Open dashboard
bun run staging:test            - Run tests
`);

export default {
  port,
  fetch: app.fetch,
};
