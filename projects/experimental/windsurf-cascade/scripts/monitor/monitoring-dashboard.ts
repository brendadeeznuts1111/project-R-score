#!/usr/bin/env bun

import { serve } from "bun";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import { EventEmitter } from "events";

interface MetricData {
  timestamp: number;
  value: number;
  tags?: Record<string, string>;
}

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  score: number;
  lastCheck: string;
  issues: string[];
}

interface TestMetrics {
  total: number;
  passed: number;
  failed: number;
  coverage: number;
  duration: number;
  lastRun: string;
}

interface PerformanceMetrics {
  memoryUsed: number;
  cpuTime: number;
  buildTime: number;
  requestLatency: number;
  throughput: number;
}

class MonitoringDashboard extends EventEmitter {
  private port: number;
  private metrics: Map<string, MetricData[]> = new Map();
  private healthStatus: HealthStatus | null = null;
  private testMetrics: TestMetrics | null = null;
  private performanceMetrics: PerformanceMetrics | null = null;
  private server: any;

  constructor(port: number = 3005) {
    super();
    this.port = port;
    this.loadStoredMetrics();
  }

  async start(): Promise<void> {
    console.log(`🚀 Starting monitoring dashboard on port ${this.port}...`);

    this.server = serve({
      port: this.port,
      fetch: this.handleRequest.bind(this),
      websocket: {
        message: (ws, message) => this.handleWebSocketMessage(ws, message),
        open: (ws) => this.handleWebSocket(ws),
        close: (ws) => {
          console.log("📡 WebSocket client disconnected");
        },
      },
    });

    console.log(`✅ Monitoring dashboard started at http://localhost:${this.port}`);
    console.log(`📊 Available endpoints:`);
    console.log(`   - GET /  (dashboard)`);
    console.log(`   - GET /api/health (health status)`);
    console.log(`   - GET /api/metrics (all metrics)`);
    console.log(`   - GET /api/tests (test metrics)`);
    console.log(`   - GET /api/performance (performance metrics)`);
    console.log(`   - WS /ws (real-time updates)`);

    this.emit("started");
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.stop();
      console.log("✅ Monitoring dashboard stopped");
      this.emit("stopped");
    }
  }

  private async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    try {
      switch (path) {
        case "/":
          return this.serveDashboard();
        case "/api/health":
          return this.serveHealthStatus();
        case "/api/metrics":
          return this.serveMetrics();
        case "/api/tests":
          return this.serveTestMetrics();
        case "/api/performance":
          return this.servePerformanceMetrics();
        case "/api/events":
          return this.serveEvents();
        default:
          if (path.startsWith("/static/")) {
            return this.serveStaticAsset(path);
          }
          return new Response("Not Found", { status: 404 });
      }
    } catch (error) {
      console.error("Request handling error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  private handleWebSocket(ws: WebSocket): void {
    console.log("📡 WebSocket client connected");

    // Send initial data
    ws.send(JSON.stringify({
      type: "initial",
      data: {
        health: this.healthStatus,
        tests: this.testMetrics,
        performance: this.performanceMetrics,
        metrics: Object.fromEntries(
          Array.from(this.metrics.entries()).map(([key, values]) => [
            key,
            values.slice(-100) // Last 100 data points
          ])
        ),
      },
    }));

    // Subscribe to updates
    this.on("update", (data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "update",
          data,
          timestamp: Date.now(),
        }));
      }
    });
  }

  private handleWebSocketMessage(ws: WebSocket, message: string | Buffer): void {
    try {
      const data = JSON.parse(message as string);
      
      switch (data.type) {
        case "subscribe":
          console.log(`Client subscribed to: ${data.channel}`);
          break;
        case "get-metrics":
          ws.send(JSON.stringify({
            type: "metrics-response",
            data: this.getMetricHistory(data.metric),
          }));
          break;
      }
    } catch (error: any) {
      console.error("WebSocket message error:", error);
    }
  }

  private serveDashboard(): Response {
    const html = this.generateDashboardHTML();
    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  }

  private serveHealthStatus(): Response {
    return new Response(JSON.stringify(this.healthStatus || {}), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private serveMetrics(): Response {
    const metricsData = Object.fromEntries(
      Array.from(this.metrics.entries()).map(([key, values]) => [
        key,
        values.slice(-1000) // Last 1000 data points
      ])
    );
    
    return new Response(JSON.stringify(metricsData), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private serveTestMetrics(): Response {
    return new Response(JSON.stringify(this.testMetrics || {}), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private servePerformanceMetrics(): Response {
    return new Response(JSON.stringify(this.performanceMetrics || {}), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private serveEvents(): Response {
    // Return recent events/updates
    const events = [
      { type: "test-completed", timestamp: Date.now(), status: "passed" },
      { type: "health-check", timestamp: Date.now() - 60000, status: "healthy" },
      { type: "deployment", timestamp: Date.now() - 300000, status: "success" },
    ];

    return new Response(JSON.stringify(events), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private serveStaticAsset(path: string): Response {
    // Serve CSS, JS, images
    const content = this.getStaticContent(path);
    if (content) {
      const contentType = this.getContentType(path);
      return new Response(content, {
        headers: { "Content-Type": contentType },
      });
    }
    return new Response("Not Found", { status: 404 });
  }

  private generateDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Odds Protocol Monitoring Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a;
            color: #ffffff;
            line-height: 1.6;
        }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { 
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 1.1rem; }
        .status-bar { 
            display: flex; 
            gap: 20px; 
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        .status-card { 
            flex: 1;
            min-width: 200px;
            background: #1a1a1a;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #333;
            transition: transform 0.2s;
        }
        .status-card:hover { transform: translateY(-2px); }
        .status-card.healthy { border-left: 4px solid #10b981; }
        .status-card.degraded { border-left: 4px solid #f59e0b; }
        .status-card.unhealthy { border-left: 4px solid #ef4444; }
        .status-card h3 { font-size: 0.9rem; text-transform: uppercase; opacity: 0.7; margin-bottom: 8px; }
        .status-card .value { font-size: 2rem; font-weight: bold; }
        .status-card .unit { font-size: 0.9rem; opacity: 0.7; }
        .metrics-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 30px;
            margin-bottom: 30px;
        }
        .metric-card { 
            background: #1a1a1a;
            padding: 25px;
            border-radius: 12px;
            border: 1px solid #333;
        }
        .metric-card h2 { margin-bottom: 20px; color: #3b82f6; }
        .metric-item { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #333;
        }
        .metric-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .metric-label { opacity: 0.8; }
        .metric-value { font-weight: bold; }
        .chart-container { 
            background: #1a1a1a;
            padding: 25px;
            border-radius: 12px;
            border: 1px solid #333;
            margin-bottom: 30px;
        }
        .chart-placeholder { 
            height: 300px; 
            background: #0a0a0a;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
            font-style: italic;
        }
        .events-log { 
            background: #1a1a1a;
            padding: 25px;
            border-radius: 12px;
            border: 1px solid #333;
            max-height: 400px;
            overflow-y: auto;
        }
        .event-item { 
            padding: 10px 0;
            border-bottom: 1px solid #333;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .event-item:last-child { border-bottom: none; }
        .event-icon { 
            width: 8px;
            height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        .event-icon.success { background: #10b981; }
        .event-icon.warning { background: #f59e0b; }
        .event-icon.error { background: #ef4444; }
        .event-content { flex: 1; }
        .event-time { opacity: 0.6; font-size: 0.9rem; }
        .refresh-btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
            transition: background 0.2s;
        }
        .refresh-btn:hover { background: #2563eb; }
        .loading { opacity: 0.6; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .pulse { animation: pulse 2s infinite; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Odds Protocol Monitoring</h1>
            <p>Real-time system health and performance metrics</p>
            <button class="refresh-btn" onclick="refreshData()">🔄 Refresh</button>
        </div>

        <div class="status-bar">
            <div class="status-card" id="health-card">
                <h3>System Health</h3>
                <div class="value" id="health-status">--</div>
                <div class="unit" id="health-score">Score: --</div>
            </div>
            <div class="status-card">
                <h3>Test Status</h3>
                <div class="value" id="test-status">--</div>
                <div class="unit" id="test-coverage">Coverage: --</div>
            </div>
            <div class="status-card">
                <h3>Performance</h3>
                <div class="value" id="perf-memory">--</div>
                <div class="unit">Memory Usage</div>
            </div>
            <div class="status-card">
                <h3>Uptime</h3>
                <div class="value" id="uptime">--</div>
                <div class="unit">Since start</div>
            </div>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <h2>🧪 Test Metrics</h2>
                <div id="test-metrics">
                    <div class="metric-item">
                        <span class="metric-label">Total Tests</span>
                        <span class="metric-value" id="total-tests">--</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Passed</span>
                        <span class="metric-value" id="passed-tests" style="color: #10b981;">--</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Failed</span>
                        <span class="metric-value" id="failed-tests" style="color: #ef4444;">--</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Duration</span>
                        <span class="metric-value" id="test-duration">--</span>
                    </div>
                </div>
            </div>

            <div class="metric-card">
                <h2>⚡ Performance Metrics</h2>
                <div id="performance-metrics">
                    <div class="metric-item">
                        <span class="metric-label">Memory Used</span>
                        <span class="metric-value" id="memory-used">--</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">CPU Time</span>
                        <span class="metric-value" id="cpu-time">--</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Build Time</span>
                        <span class="metric-value" id="build-time">--</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Request Latency</span>
                        <span class="metric-value" id="req-latency">--</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="chart-container">
            <h2>📊 System Metrics Over Time</h2>
            <div class="chart-placeholder">
                📈 Real-time charts will be displayed here
            </div>
        </div>

        <div class="events-log">
            <h2>📋 Recent Events</h2>
            <div id="events-list">
                <div class="event-item">
                    <div class="event-icon success"></div>
                    <div class="event-content">
                        <div>Dashboard started successfully</div>
                        <div class="event-time">Just now</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let ws = null;
        let startTime = Date.now();

        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(\`\${protocol}//\${window.location.host}/ws\`);
            
            ws.onopen = () => {
                console.log('WebSocket connected');
                addEvent('WebSocket connected', 'success');
            };
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                handleWebSocketUpdate(data);
            };
            
            ws.onclose = () => {
                console.log('WebSocket disconnected');
                addEvent('WebSocket disconnected', 'warning');
                // Reconnect after 5 seconds
                setTimeout(connectWebSocket, 5000);
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                addEvent('WebSocket error', 'error');
            };
        }

        function handleWebSocketUpdate(data) {
            if (data.type === 'initial' || data.type === 'update') {
                updateDashboard(data.data);
            }
        }

        function updateDashboard(data) {
            // Update health status
            if (data.health) {
                updateHealthStatus(data.health);
            }
            
            // Update test metrics
            if (data.tests) {
                updateTestMetrics(data.tests);
            }
            
            // Update performance metrics
            if (data.performance) {
                updatePerformanceMetrics(data.performance);
            }
        }

        function updateHealthStatus(health) {
            const card = document.getElementById('health-card');
            const status = document.getElementById('health-status');
            const score = document.getElementById('health-score');
            
            status.textContent = health.status.toUpperCase();
            score.textContent = \`Score: \${health.score}\`;
            
            card.className = \`status-card \${health.status}\`;
        }

        function updateTestMetrics(tests) {
            document.getElementById('total-tests').textContent = tests.total || '--';
            document.getElementById('passed-tests').textContent = tests.passed || '--';
            document.getElementById('failed-tests').textContent = tests.failed || '--';
            document.getElementById('test-duration').textContent = tests.duration ? \`\${tests.duration}ms\` : '--';
            document.getElementById('test-coverage').textContent = tests.coverage ? \`\${tests.coverage}%\` : '--';
            
            const testStatus = document.getElementById('test-status');
            testStatus.textContent = tests.failed === 0 ? 'PASSING' : 'FAILING';
            testStatus.style.color = tests.failed === 0 ? '#10b981' : '#ef4444';
        }

        function updatePerformanceMetrics(perf) {
            document.getElementById('memory-used').textContent = perf.memoryUsed ? \`\${perf.memoryUsed}MB\` : '--';
            document.getElementById('cpu-time').textContent = perf.cpuTime ? \`\${perf.cpuTime}μs\` : '--';
            document.getElementById('build-time').textContent = perf.buildTime ? \`\${perf.buildTime}ms\` : '--';
            document.getElementById('req-latency').textContent = perf.requestLatency ? \`\${perf.requestLatency}ms\` : '--';
            document.getElementById('perf-memory').textContent = perf.memoryUsed ? \`\${perf.memoryUsed}MB\` : '--';
        }

        function addEvent(message, type = 'info') {
            const eventsList = document.getElementById('events-list');
            const eventItem = document.createElement('div');
            eventItem.className = 'event-item';
            
            const iconClass = type === 'success' ? 'success' : type === 'error' ? 'error' : 'warning';
            
            eventItem.innerHTML = \`
                <div class="event-icon \${iconClass}"></div>
                <div class="event-content">
                    <div>\${message}</div>
                    <div class="event-time">Just now</div>
                </div>
            \`;
            
            eventsList.insertBefore(eventItem, eventsList.firstChild);
            
            // Keep only last 20 events
            while (eventsList.children.length > 20) {
                eventsList.removeChild(eventsList.lastChild);
            }
        }

        function updateUptime() {
            const uptime = Date.now() - startTime;
            const seconds = Math.floor(uptime / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            
            let display = '';
            if (hours > 0) {
                display = \`\${hours}h \${minutes % 60}m\`;
            } else if (minutes > 0) {
                display = \`\${minutes}m \${seconds % 60}s\`;
            } else {
                display = \`\${seconds}s\`;
            }
            
            document.getElementById('uptime').textContent = display;
        }

        async function refreshData() {
            const btn = document.querySelector('.refresh-btn');
            btn.classList.add('loading');
            btn.textContent = '🔄 Refreshing...';
            
            try {
                const [health, tests, performance] = await Promise.all([
                    fetch('/api/health').then(r => r.json()),
                    fetch('/api/tests').then(r => r.json()),
                    fetch('/api/performance').then(r => r.json())
                ]);
                
                updateDashboard({ health, tests, performance });
                addEvent('Data refreshed manually', 'success');
            } catch (error) {
                console.error('Failed to refresh data:', error);
                addEvent('Failed to refresh data', 'error');
            } finally {
                btn.classList.remove('loading');
                btn.textContent = '🔄 Refresh';
            }
        }

        // Initialize
        connectWebSocket();
        setInterval(updateUptime, 1000);
        
        // Initial data load
        refreshData();
    </script>
</body>
</html>
    `;
  }

  private getStaticContent(path: string): string | null {
    // In a real implementation, serve actual static files
    // For now, return embedded CSS/JS
    if (path === "/static/dashboard.css") {
      return this.getDashboardCSS();
    }
    if (path === "/static/dashboard.js") {
      return this.getDashboardJS();
    }
    return null;
  }

  private getContentType(path: string): string {
    if (path.endsWith(".css")) return "text/css";
    if (path.endsWith(".js")) return "application/javascript";
    if (path.endsWith(".png")) return "image/png";
    if (path.endsWith(".jpg")) return "image/jpeg";
    return "text/plain";
  }

  private getDashboardCSS(): string {
    return `
/* Dashboard CSS */
.dashboard { font-family: Arial, sans-serif; }
.metric { background: #f5f5f5; padding: 10px; margin: 5px; }
    `;
  }

  private getDashboardJS(): string {
    return `
// Dashboard JavaScript
console.log("Dashboard loaded");
    `;
  }

  // Public methods for updating metrics
  updateHealthStatus(status: HealthStatus): void {
    this.healthStatus = status;
    this.emit("update", { health: status });
    this.storeMetric("health_score", status.score);
  }

  updateTestMetrics(metrics: TestMetrics): void {
    this.testMetrics = metrics;
    this.emit("update", { tests: metrics });
    this.storeMetric("test_coverage", metrics.coverage);
    this.storeMetric("test_duration", metrics.duration);
  }

  updatePerformanceMetrics(metrics: PerformanceMetrics): void {
    this.performanceMetrics = metrics;
    this.emit("update", { performance: metrics });
    this.storeMetric("memory_used", metrics.memoryUsed);
    this.storeMetric("cpu_time", metrics.cpuTime);
  }

  private storeMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const data = this.metrics.get(name)!;
    data.push({
      timestamp: Date.now(),
      value,
    });
    
    // Keep only last 1000 data points
    if (data.length > 1000) {
      data.splice(0, data.length - 1000);
    }
  }

  private getMetricHistory(name: string): MetricData[] {
    return this.metrics.get(name) || [];
  }

  private loadStoredMetrics(): void {
    // Load metrics from storage if available
    try {
      const stored = readFileSync(join(process.cwd(), "monitoring-metrics.json"), "utf-8");
      const data = JSON.parse(stored);
      
      for (const [key, values] of Object.entries(data)) {
        this.metrics.set(key, values as MetricData[]);
      }
    } catch (error: any) {
      console.log("No stored metrics found, starting fresh");
    }
  }

  private saveMetrics(): void {
    try {
      const data = Object.fromEntries(this.metrics);
      writeFileSync(
        join(process.cwd() as string, "monitoring-metrics.json"),
        JSON.stringify(data, null, 2)
      );
    } catch (error: any) {
      console.error("Failed to save metrics:", error);
    }
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  let port = 3005;

  for (const arg of args) {
    if (arg.startsWith("--port=")) {
      port = parseInt(arg.split("=")[1]);
    }
    if (arg === "--help") {
      console.log(`
Usage: bun run monitoring-dashboard.ts [options]

Options:
  --port=<number>   Set dashboard port (default: 3005)
  --help           Show this help

Examples:
  bun run monitoring-dashboard.ts
  bun run monitoring-dashboard.ts --port=8080
      `);
      process.exit(0);
    }
  }

  const dashboard = new MonitoringDashboard(port);

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\\n🛑 Received SIGINT, stopping dashboard...");
    await dashboard.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\\n🛑 Received SIGTERM, stopping dashboard...");
    await dashboard.stop();
    process.exit(0);
  });

  // Start dashboard
  dashboard.start().catch((error: any) => {
    console.error("❌ Failed to start dashboard:", error);
    process.exit(1);
  });
}

export { MonitoringDashboard, HealthStatus, TestMetrics, PerformanceMetrics };
