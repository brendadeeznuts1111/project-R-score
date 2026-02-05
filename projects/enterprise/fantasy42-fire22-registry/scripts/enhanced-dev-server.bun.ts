#!/usr/bin/env bun

/**
 * 🔥 Enhanced Development Server for Fantasy42-Fire22
 * 
 * Optimized local development with hot reload, API proxying, and performance monitoring
 */

import { existsSync, readFileSync, writeFileSync, watch } from 'fs';
import { join, extname, dirname } from 'path';
import { serve, file, Response } from 'bun';

interface DevConfig {
  port: number;
  host: string;
  watchPaths: string[];
  apiProxy: {
    enabled: boolean;
    target: string;
    routes: string[];
  };
  hotReload: {
    enabled: boolean;
    extensions: string[];
  };
  performance: {
    enabled: boolean;
    metrics: boolean;
  };
}

class EnhancedDevServer {
  private config: DevConfig;
  private server: any;
  private watchers: any[] = [];
  private connections: Set<WebSocket> = new Set();
  private startTime: number = Date.now();
  private requestCount: number = 0;

  constructor(config: Partial<DevConfig> = {}) {
    this.config = {
      port: 3000,
      host: 'localhost',
      watchPaths: [
        'src/**/*',
        'enterprise/packages/**/*',
        'dashboard-worker/**/*',
        'public/**/*',
        'config/**/*'
      ],
      apiProxy: {
        enabled: true,
        target: 'https://api.apexodds.net',
        routes: ['/api', '/health', '/status']
      },
      hotReload: {
        enabled: true,
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.html', '.css']
      },
      performance: {
        enabled: true,
        metrics: true
      },
      ...config
    };
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'info' ? '🔥' : level === 'warn' ? '⚠️' : '❌';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  private async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    this.requestCount++;

    // Database integration uses Bun's native SQLite - zero external dependencies!

    // Performance tracking
    const requestStart = Date.now();

    try {
      // API proxying for external APIs
      if (this.config.apiProxy.enabled && this.config.apiProxy.routes.some(route => pathname.startsWith(route))) {
        return await this.handleApiProxy(request);
      }

      // Static file serving with optimization
      if (pathname === '/' || pathname.endsWith('.html')) {
        return await this.serveIndexPage(pathname);
      }

      // Asset serving with caching
      if (pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
        return await this.serveAsset(pathname);
      }

      // Health endpoint
      if (pathname === '/health') {
        return this.handleHealthCheck();
      }

      // Development API endpoints
      if (pathname.startsWith('/dev/')) {
        return this.handleDevApi(pathname, request);
      }

      // Default 404
      return new Response('Not Found', { status: 404 });

    } catch (error) {
      this.log(`Request error: ${error}`, 'error');
      return new Response('Internal Server Error', { status: 500 });
    } finally {
      if (this.config.performance.enabled) {
        const duration = Date.now() - requestStart;
        this.log(`Request ${pathname} - ${duration}ms`);
      }
    }
  }

  private async handleApiProxy(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const targetUrl = `${this.config.apiProxy.target}${url.pathname}${url.search}`;

    this.log(`Proxying API request to: ${targetUrl}`);

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: {
          ...Object.fromEntries(request.headers.entries()),
          'X-Proxy-Source': 'local-dev-server'
        },
        body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : undefined
      });

      // Add CORS headers for local development
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });

    } catch (error) {
      this.log(`API proxy error: ${error}`, 'error');
      return new Response('API Proxy Error', { status: 502 });
    }
  }

  private async serveIndexPage(pathname: string): Promise<Response> {
    const indexPath = join(process.cwd(), 'index.html');

    if (existsSync(indexPath)) {
      let content = readFileSync(indexPath, 'utf-8');

      // Inject development scripts
      if (this.config.hotReload.enabled) {
        content = content.replace(
          '</body>',
          `
          <!-- Development Hot Reload -->
          <script>
            const ws = new WebSocket('ws://localhost:${this.config.port + 1}');
            ws.onmessage = (event) => {
              if (event.data === 'reload') {
                window.location.reload();
              }
            };
          </script>
          </body>`
        );
      }

      return new Response(content, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Fallback development page
    return new Response(this.generateDevPage(), {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  private async serveAsset(pathname: string): Promise<Response> {
    const assetPath = join(process.cwd(), pathname);

    if (existsSync(assetPath)) {
      const content = readFileSync(assetPath);
      const ext = extname(pathname);
      const contentType = this.getContentType(ext);

      return new Response(content, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000' // 1 year for assets
        }
      });
    }

    return new Response('Asset not found', { status: 404 });
  }

  private handleHealthCheck(): Response {
    const uptime = Date.now() - this.startTime;
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime / 1000),
      requests: this.requestCount,
      environment: 'development',
      version: '2.0.0'
    };

    return new Response(JSON.stringify(health, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private handleDevApi(pathname: string, request: Request): Response {
    switch (pathname) {
      case '/dev/status':
        return new Response(JSON.stringify({
          server: 'enhanced-dev-server',
          config: this.config,
          uptime: Math.floor((Date.now() - this.startTime) / 1000),
          connections: this.connections.size
        }, null, 2), {
          headers: { 'Content-Type': 'application/json' }
        });

      case '/dev/metrics':
        return new Response(JSON.stringify({
          requestsPerSecond: this.requestCount / ((Date.now() - this.startTime) / 1000),
          uptime: Math.floor((Date.now() - this.startTime) / 1000),
          memory: process.memoryUsage()
        }, null, 2), {
          headers: { 'Content-Type': 'application/json' }
        });

      default:
        return new Response('Dev API endpoint not found', { status: 404 });
    }
  }

  private generateDevPage(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔥 Fantasy42-Fire22 Development Server</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .status-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 10px;
            padding: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .status-card h3 {
            margin-top: 0;
            color: #ffd700;
        }
        .metric {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
        }
        .reload-btn {
            background: #ff6b6b;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }
        .reload-btn:hover {
            background: #ff5252;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔥 Fantasy42-Fire22 Development Server</h1>
            <p>Enhanced local development environment is running!</p>
            <button class="reload-btn" onclick="window.location.reload()">�� Force Reload</button>
        </div>

        <div class="status-grid">
            <div class="status-card">
                <h3>🚀 Server Status</h3>
                <div class="metric">
                    <span>Status:</span>
                    <span style="color: #4CAF50;">Running</span>
                </div>
                <div class="metric">
                    <span>Port:</span>
                    <span>${this.config.port}</span>
                </div>
                <div class="metric">
                    <span>Hot Reload:</span>
                    <span style="color: ${this.config.hotReload.enabled ? '#4CAF50' : '#f44336'};">${this.config.hotReload.enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
            </div>

            <div class="status-card">
                <h3>📊 Performance</h3>
                <div class="metric">
                    <span>Requests:</span>
                    <span id="requests">${this.requestCount}</span>
                </div>
                <div class="metric">
                    <span>Uptime:</span>
                    <span id="uptime">0s</span>
                </div>
                <div class="metric">
                    <span>Memory:</span>
                    <span id="memory">Loading...</span>
                </div>
            </div>

            <div class="status-card">
                <h3>🔗 API Proxy</h3>
                <div class="metric">
                    <span>Status:</span>
                    <span style="color: ${this.config.apiProxy.enabled ? '#4CAF50' : '#f44336'};">${this.config.apiProxy.enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div class="metric">
                    <span>Target:</span>
                    <span>${this.config.apiProxy.target}</span>
                </div>
                <div class="metric">
                    <span>Routes:</span>
                    <span>${this.config.apiProxy.routes.join(', ')}</span>
                </div>
            </div>
        </div>

        <div class="status-grid">
            <div class="status-card">
                <h3>📁 Development Links</h3>
                <p><a href="/health" style="color: #ffd700;">Health Check</a></p>
                <p><a href="/dev/status" style="color: #ffd700;">Server Status</a></p>
                <p><a href="/dev/metrics" style="color: #ffd700;">Performance Metrics</a></p>
            </div>

            <div class="status-card">
                <h3>🔧 Quick Actions</h3>
                <button class="reload-btn" onclick="clearCache()">🧹 Clear Cache</button>
                <button class="reload-btn" onclick="forceRebuild()">🔨 Force Rebuild</button>
            </div>
        </div>
    </div>

    <script>
        // Update metrics every second
        setInterval(async () => {
            try {
                const response = await fetch('/dev/metrics');
                const data = await response.json();
                
                document.getElementById('requests').textContent = data.requestsPerSecond.toFixed(1) + '/s';
                document.getElementById('uptime').textContent = Math.floor(data.uptime / 60) + 'm ' + (data.uptime % 60) + 's';
                document.getElementById('memory').textContent = (data.memory.heapUsed / 1024 / 1024).toFixed(1) + ' MB';
            } catch (e) {
                console.log('Metrics update failed:', e);
            }
        }, 1000);

        function clearCache() {
            if (confirm('Clear browser cache and reload?')) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
            }
        }

        function forceRebuild() {
            if (confirm('Force rebuild and reload?')) {
                fetch('/dev/rebuild', { method: 'POST' })
                    .then(() => window.location.reload())
                    .catch(() => window.location.reload());
            }
        }

        // Hot reload connection
        ${this.config.hotReload.enabled ? `
        const ws = new WebSocket('ws://localhost:${this.config.port + 1}');
        ws.onmessage = (event) => {
            if (event.data === 'reload') {
                console.log('🔥 Hot reload triggered');
                window.location.reload();
            }
        };
        ws.onopen = () => console.log('🔥 Hot reload connected');
        ws.onclose = () => console.log('🔥 Hot reload disconnected');
        ` : ''}
    </script>
</body>
</html>`;
  }

  private getContentType(ext: string): string {
    const types: Record<string, string> = {
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2'
    };
    return types[ext] || 'application/octet-stream';
  }

  private setupFileWatchers(): void {
    if (!this.config.hotReload.enabled) return;

    for (const watchPath of this.config.watchPaths) {
      const watcher = watch(watchPath, { recursive: true }, (eventType, filename) => {
        if (filename && this.config.hotReload.extensions.some(ext => filename.endsWith(ext))) {
          this.log(`File changed: ${filename}, triggering reload`);
          this.triggerHotReload();
        }
      });

      this.watchers.push(watcher);
    }

    this.log(`File watchers set up for: ${this.config.watchPaths.join(', ')}`);
  }

  private triggerHotReload(): void {
    // Send reload signal to all connected clients
    for (const ws of this.connections) {
      try {
        ws.send('reload');
      } catch (error) {
        this.connections.delete(ws);
      }
    }
  }

  private setupWebSocketServer(): void {
    if (!this.config.hotReload.enabled) return;

    // 🚀 BUN 1.1.X OPTIMIZATION: WebSocket server with compression enabled
    const wsServer = serve({
      port: this.config.port + 1,
      hostname: this.config.host,
      websocket: {
        // Enable WebSocket compression (permessage-deflate)
        perMessageDeflate: true,
        maxPayloadLength: 1024 * 1024, // 1MB max payload
        idleTimeout: 300, // 5 minutes
        backpressureLimit: 512 * 1024, // 512KB backpressure limit
        closeOnBackpressureLimit: false,
        message: (ws, message) => this.handleWebSocketMessage(ws, message),
        open: (ws) => this.handleWebSocketOpen(ws),
        close: (ws, code, reason) => this.handleWebSocketClose(ws, code, reason),
        drain: (ws) => this.handleWebSocketDrain(ws),
      },
      fetch: (request) => {
        const upgradeHeader = request.headers.get('upgrade');
        if (upgradeHeader === 'websocket') {
          // Let Bun handle WebSocket upgrade with compression
          return undefined;
        }
        return new Response('WebSocket upgrade required', { status: 400 });
      }
    });

    this.log(`🚀 WebSocket server with compression started on port ${this.config.port + 1}`);
    this.log(`🔧 WebSocket Compression: permessage-deflate ENABLED`);
  }

  async start(): Promise<void> {
    this.log(`Starting Enhanced Development Server on ${this.config.host}:${this.config.port}`);

    // Setup file watchers and WebSocket for hot reload
    this.setupFileWatchers();
    this.setupWebSocketServer();

    // Start main server
    this.server = serve({
      port: this.config.port,
      hostname: this.config.host,
      fetch: (request) => this.handleRequest(request),
      error: (error) => {
        this.log(`Server error: ${error}`, 'error');
        return new Response('Internal Server Error', { status: 500 });
      }
    });

    this.log(`🚀 Server running at http://${this.config.host}:${this.config.port}`);
    this.log(`🔥 Hot reload: ${this.config.hotReload.enabled ? 'Enabled' : 'Disabled'}`);
    this.log(`🌐 API proxy: ${this.config.apiProxy.enabled ? `Enabled (${this.config.apiProxy.target})` : 'Disabled'}`);
    this.log(`📊 Performance monitoring: ${this.config.performance.enabled ? 'Enabled' : 'Disabled'}`);

    // Keep server running
    await new Promise(() => {});
  }

  async stop(): Promise<void> {
    this.log('Stopping Enhanced Development Server...');

    // Close watchers
    for (const watcher of this.watchers) {
      watcher.close();
    }

    // Close WebSocket connections
    for (const ws of this.connections) {
      try {
        ws.close();
      } catch (error) {
        // Ignore errors when closing
      }
    }

    // Close server
    if (this.server) {
      this.server.stop();
    }

    this.log('✅ Server stopped');
  }

  // 🚀 BUN 1.1.X OPTIMIZATION: WebSocket event handlers with compression support
  private handleWebSocketOpen(ws: WebSocket): void {
    this.connections.add(ws);
    this.log(`🔗 WebSocket client connected (with compression)`);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString(),
      compressionEnabled: true,
      features: ['hot-reload', 'file-watching', 'compression']
    }));
  }

  private handleWebSocketMessage(ws: WebSocket, message: string | Buffer): void {
    try {
      const data = JSON.parse(message.toString());
      this.log(`📨 WebSocket message: ${data.type}`);

      // Handle different message types
      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;
        case 'subscribe':
          // Handle subscription requests
          break;
        default:
          this.log(`Unknown WebSocket message type: ${data.type}`);
      }
    } catch (error) {
      this.log(`❌ Error parsing WebSocket message: ${error.message}`);
    }
  }

  private handleWebSocketClose(ws: WebSocket, code: number, reason: string): void {
    this.connections.delete(ws);
    this.log(`🔌 WebSocket client disconnected (${code})`);
  }

  private handleWebSocketDrain(ws: WebSocket): void {
    this.log(`💧 WebSocket backpressure relieved`);
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const port = args.includes('--port') ? parseInt(args[args.indexOf('--port') + 1]) : 3000;
  const host = args.includes('--host') ? args[args.indexOf('--host') + 1] : 'localhost';
  const noHotReload = args.includes('--no-hot-reload');
  const noApiProxy = args.includes('--no-api-proxy');

  const server = new EnhancedDevServer({
    port,
    host,
    hotReload: {
      enabled: !noHotReload,
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.html', '.css']
    },
    apiProxy: {
      enabled: !noApiProxy,
      target: process.env.API_PROXY_TARGET || 'https://api.apexodds.net',
      routes: ['/api', '/health', '/status']
    },
    performance: {
      enabled: true,
      metrics: true
    }
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  await server.start();
}

export { EnhancedDevServer };
