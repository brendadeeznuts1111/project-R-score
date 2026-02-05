#!/usr/bin/env bun

// Advanced Bun Development Workflow Demonstration
// Showcasing --watch, --hot, and advanced development features

import { gc, serve } from "bun";

// Global state for hot reload demonstration
declare global {
  var reloadCount: number;
  var startTime: number;
  var lastChange: string;
}

// Initialize global state
globalThis.reloadCount ??= 0;
globalThis.startTime ??= Date.now();
globalThis.lastChange ??= "initial";

interface DevelopmentMetrics {
  reloadCount: number;
  uptime: number;
  lastChange: string;
  memoryUsage: NodeJS.MemoryUsage;
  hotReloadEnabled: boolean;
  watchModeEnabled: boolean;
}

class DevelopmentWorkflow {
  private port = 3000;
  private server: any;
  private metrics: DevelopmentMetrics;

  constructor() {
    this.metrics = {
      reloadCount: globalThis.reloadCount,
      uptime: 0,
      lastChange: globalThis.lastChange,
      memoryUsage: process.memoryUsage(),
      hotReloadEnabled:
        process.argv.includes("--hot") || process.env.BUN_HOT === "1",
      watchModeEnabled:
        process.argv.includes("--watch") || process.env.BUN_WATCH === "1",
    };

    console.log("🔥 Advanced Bun Development Workflow");
    console.log("=====================================");
    console.log(
      `📊 Hot Reload: ${this.metrics.hotReloadEnabled ? "✅ Enabled" : "❌ Disabled"}`
    );
    console.log(
      `👀 Watch Mode: ${this.metrics.watchModeEnabled ? "✅ Enabled" : "❌ Disabled"}`
    );
    console.log(`🔄 Reload Count: ${this.metrics.reloadCount}`);
    console.log(
      `⏰ Start Time: ${new Date(globalThis.startTime).toLocaleTimeString()}`
    );

    this.setupServer();
    this.setupDevelopmentFeatures();
  }

  private setupServer(): void {
    this.server = serve({
      port: this.port,
      fetch: this.createRequestHandler(),
      websocket: {
        message: this.handleWebSocketMessage.bind(this),
        open: this.handleWebSocketOpen.bind(this),
        close: this.handleWebSocketClose.bind(this),
      },
    });

    console.log(
      `🚀 Development server running at http://localhost:${this.port}`
    );
    console.log("🔧 Development Features:");
    console.log("  • Hot reload with --hot flag");
    console.log("  • File watching with --watch flag");
    console.log("  • WebSocket for live updates");
    console.log("  • Development metrics tracking");
    console.log("  • Memory usage monitoring");
  }

  private createRequestHandler() {
    // Update reload count for hot reload demonstration
    globalThis.reloadCount++;
    globalThis.lastChange = new Date().toISOString();

    this.updateMetrics();

    return async (req: Request) => {
      const url = new URL(req.url);

      try {
        switch (url.pathname) {
          case "/":
            return new Response(await this.getHomePage(), {
              headers: { "Content-Type": "text/html" },
            });

          case "/api/metrics":
            return new Response(JSON.stringify(this.metrics, null, 2), {
              headers: { "Content-Type": "application/json" },
            });

          case "/api/reload-info":
            return new Response(
              JSON.stringify({
                reloadCount: globalThis.reloadCount,
                lastChange: globalThis.lastChange,
                startTime: globalThis.startTime,
                uptime: Date.now() - globalThis.startTime,
                hotReloadEnabled: this.metrics.hotReloadEnabled,
                watchModeEnabled: this.metrics.watchModeEnabled,
              }),
              {
                headers: { "Content-Type": "application/json" },
              }
            );

          case "/api/force-reload":
            // Simulate a hot reload
            console.log("🔄 Simulating hot reload...");
            globalThis.reloadCount++;
            globalThis.lastChange = new Date().toISOString();
            this.updateMetrics();

            return new Response(
              JSON.stringify({
                message: "Hot reload simulated",
                reloadCount: globalThis.reloadCount,
                timestamp: new Date().toISOString(),
              }),
              {
                headers: { "Content-Type": "application/json" },
              }
            );

          case "/api/memory":
            const memBefore = process.memoryUsage();
            gc(true); // Force garbage collection
            const memAfter = process.memoryUsage();

            return new Response(
              JSON.stringify(
                {
                  before: memBefore,
                  after: memAfter,
                  freed: {
                    heapUsed: memBefore.heapUsed - memAfter.heapUsed,
                    heapTotal: memBefore.heapTotal - memAfter.heapTotal,
                    external: memBefore.external - memAfter.external,
                    rss: memBefore.rss - memAfter.rss,
                  },
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              ),
              {
                headers: { "Content-Type": "application/json" },
              }
            );

          case "/api/development-info":
            return new Response(
              JSON.stringify(
                {
                  bunVersion: Bun.version,
                  nodeVersion: process.version,
                  platform: process.platform,
                  arch: process.arch,
                  pid: process.pid,
                  argv: process.argv,
                  env: {
                    NODE_ENV: process.env.NODE_ENV || "development",
                    BUN_ENV: process.env.BUN_ENV || "development",
                  },
                  features: {
                    hotReload: this.metrics.hotReloadEnabled,
                    watchMode: this.metrics.watchModeEnabled,
                    websocket: true,
                    gc: typeof gc === "function",
                  },
                },
                null,
                2
              ),
              {
                headers: { "Content-Type": "application/json" },
              }
            );

          case "/health":
            return new Response(
              JSON.stringify({
                status: "healthy",
                timestamp: new Date().toISOString(),
                reloadCount: globalThis.reloadCount,
                uptime: Date.now() - globalThis.startTime,
              }),
              {
                headers: { "Content-Type": "application/json" },
              }
            );

          default:
            return new Response("Not Found", { status: 404 });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return new Response(`Error: ${errorMessage}`, { status: 500 });
      }
    };
  }

  private updateMetrics(): void {
    this.metrics = {
      reloadCount: globalThis.reloadCount,
      uptime: Date.now() - globalThis.startTime,
      lastChange: globalThis.lastChange,
      memoryUsage: process.memoryUsage(),
      hotReloadEnabled: this.metrics.hotReloadEnabled,
      watchModeEnabled: this.metrics.watchModeEnabled,
    };
  }

  private setupDevelopmentFeatures(): void {
    // Development-specific features
    if (this.metrics.hotReloadEnabled) {
      console.log("🔥 Hot reload is active - edit files to see changes");
    }

    if (this.metrics.watchModeEnabled) {
      console.log("👀 Watch mode is active - files are being monitored");
    }

    // Set up periodic development metrics
    setInterval(() => {
      this.updateMetrics();

      // Log development status every 30 seconds
      if (Date.now() % 30000 < 1000) {
        console.log(
          `📊 Development Status: ${this.metrics.reloadCount} reloads, ${(this.metrics.uptime / 1000).toFixed(1)}s uptime`
        );
      }
    }, 5000);

    // Memory management for development
    setInterval(() => {
      const memUsage = process.memoryUsage();
      if (memUsage.heapUsed > 100 * 1024 * 1024) {
        // 100MB
        console.log("🧹 High memory usage in development, running GC...");
        gc();
      }
    }, 15000);
  }

  private handleWebSocketMessage(ws: any, message: string | Buffer): void {
    console.log(`📨 WebSocket message: ${message}`);

    try {
      const data = JSON.parse(message.toString());

      switch (data.action) {
        case "reload":
          globalThis.reloadCount++;
          globalThis.lastChange = new Date().toISOString();
          this.updateMetrics();
          ws.send(
            JSON.stringify({
              type: "reloaded",
              reloadCount: globalThis.reloadCount,
              timestamp: new Date().toISOString(),
            })
          );
          break;

        case "metrics":
          ws.send(
            JSON.stringify({
              type: "metrics",
              data: this.metrics,
            })
          );
          break;

        case "gc":
          gc(true);
          ws.send(
            JSON.stringify({
              type: "gc-completed",
              timestamp: new Date().toISOString(),
            })
          );
          break;

        default:
          ws.send(
            JSON.stringify({
              type: "error",
              message: `Unknown action: ${data.action}`,
            })
          );
      }
    } catch (error) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Invalid JSON format",
        })
      );
    }
  }

  private handleWebSocketOpen(ws: any): void {
    console.log("🔌 WebSocket connection opened");
    ws.send(
      JSON.stringify({
        type: "connected",
        message: "Connected to Bun Development Workflow",
        reloadCount: globalThis.reloadCount,
        timestamp: new Date().toISOString(),
      })
    );
  }

  private handleWebSocketClose(ws: any): void {
    console.log("🔌 WebSocket connection closed");
  }

  private async getHomePage(): Promise<string> {
    const uptime = (Date.now() - globalThis.startTime) / 1000;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Advanced Bun Development Workflow</title>
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
    <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
    <style>
        body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .status { display: flex; gap: 20px; margin-bottom: 20px; }
        .status-card { flex: 1; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
        .status-value { font-size: 2em; font-weight: bold; color: #1e40af; }
        .status-label { color: #64748b; margin-top: 5px; }
        .controls { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; }
        button { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 5px; }
        button:hover { background: #2563eb; }
        .info { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
        .info-item { padding: 15px; background: #f1f5f9; border-radius: 4px; }
        .info-label { font-weight: bold; color: #374151; margin-bottom: 5px; }
        .info-value { color: #6b7280; font-family: monospace; }
        .hot { color: #dc2626; font-weight: bold; }
        .enabled { color: #16a34a; font-weight: bold; }
        .websocket-status { padding: 10px; border-radius: 4px; margin: 10px 0; }
        .connected { background: #dcfce7; color: #166534; }
        .disconnected { background: #fee2e2; color: #991b1b; }
    </style>
</head>
<body x-data="{
  reloadCount: ${globalThis.reloadCount},
  uptime: ${uptime.toFixed(1)},
  lastChange: '${globalThis.lastChange}',
  wsConnected: false,
  ws: null
}" x-init="initWebSocket()">
    <div class="container">
        <div class="header">
            <h1>🔥 Advanced Bun Development Workflow</h1>
            <p>Hot reload, watch mode, and development features demonstration</p>
            <div class="websocket-status" :class="wsConnected ? 'connected' : 'disconnected'" x-text="wsConnected ? '🟢 WebSocket Connected' : '🔴 WebSocket Disconnected'"></div>
        </div>

        <div class="status">
            <div class="status-card">
                <div class="status-value" x-text="reloadCount"></div>
                <div class="status-label">Hot Reloads</div>
            </div>
            <div class="status-card">
                <div class="status-value" x-text="uptime.toFixed(1) + 's'"></div>
                <div class="status-label">Uptime</div>
            </div>
            <div class="status-card">
                <div class="status-value hot">🔥</div>
                <div class="status-label">Hot Reload</div>
            </div>
            <div class="status-card">
                <div class="status-value enabled">👀</div>
                <div class="status-label">Watch Mode</div>
            </div>
        </div>

        <div class="controls">
            <h2>🎛️ Development Controls</h2>
            <button @click="forceReload()">🔄 Force Reload</button>
            <button @click="runGC()">🧹 Garbage Collection</button>
            <button @click="refreshMetrics()">📊 Refresh Metrics</button>
            <button @click="testWebSocket()">🔌 Test WebSocket</button>
        </div>

        <div class="info">
            <h2>📋 Development Information</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Last Change</div>
                    <div class="info-value" x-text="new Date(lastChange).toLocaleString()"></div>
                </div>
                <div class="info-item">
                    <div class="info-label">Process ID</div>
                    <div class="info-value" x-text="process.pid"></div>
                </div>
                <div class="info-item">
                    <div class="info-label">Platform</div>
                    <div class="info-value" x-text="navigator.platform"></div>
                </div>
                <div class="info-item">
                    <div class="info-label">Bun Version</div>
                    <div class="info-value" x-text="'${Bun.version}'"></div>
                </div>
            </div>
        </div>
    </div>

    <script>
        function initWebSocket() {
            const ws = new WebSocket('ws://localhost:3000');
            this.ws = ws;

            ws.onopen = () => {
                this.wsConnected = true;
                console.log('WebSocket connected');
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('WebSocket message:', data);

                if (data.type === 'reloaded') {
                    this.reloadCount = data.reloadCount;
                    this.lastChange = data.timestamp;
                }
            };

            ws.onclose = () => {
                this.wsConnected = false;
                console.log('WebSocket disconnected');
                // Try to reconnect after 2 seconds
                setTimeout(() => initWebSocket(), 2000);
            };
        }

        function forceReload() {
            fetch('/api/force-reload')
                .then(r => r.json())
                .then(data => {
                    console.log('Force reload:', data);
                    refreshMetrics();
                });
        }

        function runGC() {
            fetch('/api/memory')
                .then(r => r.json())
                .then(data => {
                    console.log('GC completed:', data);
                    alert('Garbage collection completed');
                });
        }

        function refreshMetrics() {
            fetch('/api/reload-info')
                .then(r => r.json())
                .then(data => {
                    this.reloadCount = data.reloadCount;
                    this.uptime = data.uptime / 1000;
                    this.lastChange = data.lastChange;
                });
        }

        function testWebSocket() {
            if (this.ws && this.wsConnected) {
                this.ws.send(JSON.stringify({ action: 'metrics' }));
            } else {
                alert('WebSocket not connected');
            }
        }

        // Auto-refresh metrics every 2 seconds
        setInterval(refreshMetrics, 2000);
    </script>
</body>
</html>`;
    return html;
  }
}

// Development workflow demonstration
console.log("🚀 Starting Advanced Bun Development Workflow...");
console.log("💡 Usage:");
console.log("  bun --hot run bun-dev-workflow.ts    # Hot reload enabled");
console.log("  bun --watch run bun-dev-workflow.ts  # Watch mode enabled");
console.log("  bun --hot --watch run bun-dev-workflow.ts  # Both enabled");
console.log("");

// Start the development workflow
const devWorkflow = new DevelopmentWorkflow();

// Keep the process running
setInterval(() => {
  // Prevent process from exiting
}, 1000000);

console.log("✅ Development workflow initialized successfully!");
console.log("🔥 Edit this file to see hot reload in action!");
console.log("👀 Watch mode monitors file changes automatically");
console.log("🔌 WebSocket connection available for real-time updates");
