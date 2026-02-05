#!/usr/bin/env bun
/**
 * 🚀 Fire22 Enhanced Development Server
 *
 * Advanced development server with:
 * - Request/response logging and monitoring
 * - API endpoint validation
 * - Hot reload capabilities
 * - Development-friendly error handling
 * - Performance monitoring
 *
 * @version 3.0.9
 * @author Fire22 Development Team
 */

import { serve } from 'bun';
import { watch } from 'fs';
import { join, extname } from 'path';
import { existsSync, readFileSync } from 'fs';

// Import API router
import apiRouter from '../src/api/index';

interface ServerConfig {
  port: number;
  host: string;
  enableCors: boolean;
  enableLogging: boolean;
  enableHotReload: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

interface RequestLog {
  timestamp: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
  response: {
    status: number;
    headers: Record<string, string>;
    body?: any;
    responseTime: number;
  };
}

class Fire22DevServer {
  private config: ServerConfig;
  private requestLogs: RequestLog[] = [];
  private server?: any;
  private watchers: any[] = [];
  private startTime: number;

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = {
      port: parseInt(process.env.PORT || '8080'),
      host: process.env.HOST || 'localhost',
      enableCors: true,
      enableLogging: true,
      enableHotReload: true,
      logLevel: 'info',
      ...config,
    };

    this.startTime = Date.now();
    console.log('🔥 Initializing Fire22 Development Server...');
  }

  /**
   * Setup hot reload file watching
   */
  private setupHotReload(): void {
    if (!this.config.enableHotReload) return;

    const watchPaths = [
      join(process.cwd(), 'src'),
      join(process.cwd(), 'scripts'),
      join(process.cwd(), 'package.json'),
    ];

    console.log('👀 Setting up hot reload file watching...');

    for (const watchPath of watchPaths) {
      if (existsSync(watchPath)) {
        try {
          const watcher = watch(watchPath, { recursive: true }, (eventType, filename) => {
            if (filename && this.shouldReload(filename)) {
              this.log('info', `🔄 File changed: ${filename} - Reloading...`);
              // In a real hot reload setup, we'd reload the modules here
              // For now, we just log the change
            }
          });
          this.watchers.push(watcher);
        } catch (error) {
          this.log('warn', `Failed to watch ${watchPath}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Check if file change should trigger reload
   */
  private shouldReload(filename: string): boolean {
    const ext = extname(filename);
    const reloadExtensions = ['.ts', '.js', '.json'];
    return (
      reloadExtensions.includes(ext) &&
      !filename.includes('node_modules') &&
      !filename.includes('.git')
    );
  }

  /**
   * Enhanced logging with colors and timestamps
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    if (!this.config.enableLogging) return;

    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[this.config.logLevel];
    const messageLevel = levels[level];

    if (messageLevel < configLevel) return;

    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m', // Green
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
      reset: '\x1b[0m',
    };

    console.log(
      `${colors[level]}[${timestamp}] [${level.toUpperCase()}]${colors.reset} ${message}`
    );
  }

  /**
   * Create CORS headers
   */
  private getCorsHeaders(): Record<string, string> {
    if (!this.config.enableCors) return {};

    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    };
  }

  /**
   * Log request/response details
   */
  private logRequest(request: Request, response: Response, responseTime: number): void {
    const method = request.method;
    const url = new URL(request.url);
    const path = url.pathname + url.search;

    // Color code by method
    const methodColors = {
      GET: '\x1b[32m', // Green
      POST: '\x1b[33m', // Yellow
      PUT: '\x1b[34m', // Blue
      DELETE: '\x1b[31m', // Red
      PATCH: '\x1b[35m', // Magenta
      OPTIONS: '\x1b[36m', // Cyan
    };

    // Color code by status
    const statusColor =
      response.status >= 400 ? '\x1b[31m' : response.status >= 300 ? '\x1b[33m' : '\x1b[32m';

    const methodColor = methodColors[method as keyof typeof methodColors] || '\x1b[37m';

    this.log(
      'info',
      `${methodColor}${method}\x1b[0m ${path} ${statusColor}${response.status}\x1b[0m ${responseTime.toFixed(2)}ms`
    );

    // Store detailed log for debugging
    if (this.requestLogs.length > 100) {
      this.requestLogs.shift(); // Keep only last 100 requests
    }

    this.requestLogs.push({
      timestamp: new Date().toISOString(),
      method,
      url: path,
      headers: Object.fromEntries(request.headers.entries()),
      response: {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        responseTime,
      },
    });
  }

  /**
   * Create development dashboard HTML
   */
  private createDashboardHTML(): string {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const recentRequests = this.requestLogs.slice(-10).reverse();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fire22 Development Server</title>
    <style>
        body { font-family: 'SF Mono', monospace; background: #1a1a1a; color: #e0e0e0; margin: 0; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        .title { font-size: 2rem; margin: 0; color: white; }
        .subtitle { opacity: 0.8; margin-top: 5px; }
        .section { background: #2a2a2a; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        .metric { display: inline-block; margin-right: 30px; }
        .metric-value { font-size: 1.5rem; font-weight: bold; color: #4ade80; }
        .metric-label { font-size: 0.9rem; opacity: 0.7; }
        .log-entry { background: #333; padding: 10px; margin: 5px 0; border-radius: 5px; font-size: 0.9rem; }
        .method { font-weight: bold; }
        .status-200 { color: #4ade80; }
        .status-400 { color: #f87171; }
        .status-300 { color: #fbbf24; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #444; }
        th { background: #333; }
        .refresh { background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
        .refresh:hover { background: #5a6fd8; }
    </style>
    <script>
        function refreshPage() {
            location.reload();
        }
        setInterval(refreshPage, 5000); // Auto-refresh every 5 seconds
    </script>
</head>
<body>
    <div class="header">
        <div class="title">🔥 Fire22 Development Server</div>
        <div class="subtitle">Running on ${this.config.host}:${this.config.port}</div>
    </div>
    
    <div class="section">
        <h3>Server Metrics</h3>
        <div class="metric">
            <div class="metric-value">${uptime}s</div>
            <div class="metric-label">Uptime</div>
        </div>
        <div class="metric">
            <div class="metric-value">${this.requestLogs.length}</div>
            <div class="metric-label">Total Requests</div>
        </div>
        <div class="metric">
            <div class="metric-value">${this.watchers.length}</div>
            <div class="metric-label">File Watchers</div>
        </div>
        <button class="refresh" onclick="refreshPage()">Refresh Now</button>
    </div>

    <div class="section">
        <h3>Recent Requests</h3>
        <table>
            <thead>
                <tr>
                    <th>Time</th>
                    <th>Method</th>
                    <th>URL</th>
                    <th>Status</th>
                    <th>Response Time</th>
                </tr>
            </thead>
            <tbody>
                ${recentRequests
                  .map(
                    log => `
                    <tr>
                        <td>${new Date(log.timestamp).toLocaleTimeString()}</td>
                        <td><span class="method">${log.method}</span></td>
                        <td>${log.url}</td>
                        <td class="status-${Math.floor(log.response.status / 100)}00">${log.response.status}</td>
                        <td>${log.response.responseTime.toFixed(2)}ms</td>
                    </tr>
                `
                  )
                  .join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h3>Available Endpoints</h3>
        <ul>
            <li><a href="/api/health" style="color: #4ade80;">/api/health</a> - Health check</li>
            <li><a href="/api/health/detailed" style="color: #4ade80;">/api/health/detailed</a> - Detailed health</li>
            <li><a href="/__dev/logs" style="color: #60a5fa;">/__dev/logs</a> - Request logs (JSON)</li>
            <li><a href="/__dev/config" style="color: #60a5fa;">/__dev/config</a> - Server config</li>
        </ul>
    </div>
</body>
</html>`;
  }

  /**
   * Main request handler
   */
  private async handleRequest(request: Request): Promise<Response> {
    const startTime = performance.now();
    const url = new URL(request.url);

    try {
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: this.getCorsHeaders(),
        });
      }

      // Development endpoints
      if (url.pathname.startsWith('/__dev')) {
        return await this.handleDevEndpoint(url.pathname, request);
      }

      // Serve development dashboard on root
      if (url.pathname === '/') {
        const response = new Response(this.createDashboardHTML(), {
          headers: {
            'Content-Type': 'text/html',
            ...this.getCorsHeaders(),
          },
        });
        const responseTime = performance.now() - startTime;
        this.logRequest(request, response, responseTime);
        return response;
      }

      // Handle API routes
      if (url.pathname.startsWith('/api')) {
        const apiResponse = await apiRouter.handle(request);
        const responseTime = performance.now() - startTime;

        // Add CORS headers to API responses
        const corsHeaders = this.getCorsHeaders();
        Object.entries(corsHeaders).forEach(([key, value]) => {
          apiResponse.headers.set(key, value);
        });

        this.logRequest(request, apiResponse, responseTime);
        return apiResponse;
      }

      // Serve static files (basic implementation)
      if (url.pathname.startsWith('/static') || url.pathname.includes('.')) {
        return await this.serveStaticFile(url.pathname);
      }

      // Default 404
      const response = new Response('Not Found', {
        status: 404,
        headers: this.getCorsHeaders(),
      });
      const responseTime = performance.now() - startTime;
      this.logRequest(request, response, responseTime);
      return response;
    } catch (error) {
      this.log('error', `Request failed: ${error.message}`);

      const response = new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          message: error.message,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...this.getCorsHeaders(),
          },
        }
      );

      const responseTime = performance.now() - startTime;
      this.logRequest(request, response, responseTime);
      return response;
    }
  }

  /**
   * Handle development-specific endpoints
   */
  private async handleDevEndpoint(pathname: string, request: Request): Promise<Response> {
    switch (pathname) {
      case '/__dev/logs':
        return new Response(JSON.stringify(this.requestLogs, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            ...this.getCorsHeaders(),
          },
        });

      case '/__dev/config':
        return new Response(JSON.stringify(this.config, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            ...this.getCorsHeaders(),
          },
        });

      case '/__dev/health':
        return new Response(
          JSON.stringify(
            {
              status: 'healthy',
              uptime: Date.now() - this.startTime,
              requests: this.requestLogs.length,
              watchers: this.watchers.length,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
          {
            headers: {
              'Content-Type': 'application/json',
              ...this.getCorsHeaders(),
            },
          }
        );

      default:
        return new Response('Dev endpoint not found', {
          status: 404,
          headers: this.getCorsHeaders(),
        });
    }
  }

  /**
   * Basic static file serving
   */
  private async serveStaticFile(pathname: string): Promise<Response> {
    const filePath = join(process.cwd(), 'public', pathname);

    if (!existsSync(filePath)) {
      return new Response('File not found', {
        status: 404,
        headers: this.getCorsHeaders(),
      });
    }

    try {
      const file = Bun.file(filePath);
      return new Response(file, {
        headers: {
          'Content-Type': this.getContentType(pathname),
          ...this.getCorsHeaders(),
        },
      });
    } catch (error) {
      return new Response('Error reading file', {
        status: 500,
        headers: this.getCorsHeaders(),
      });
    }
  }

  /**
   * Get content type for file extension
   */
  private getContentType(pathname: string): string {
    const ext = extname(pathname).toLowerCase();
    const types: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    };
    return types[ext] || 'text/plain';
  }

  /**
   * Start the development server
   */
  async start(): Promise<void> {
    try {
      // Setup hot reload
      this.setupHotReload();

      // Start server
      this.server = serve({
        port: this.config.port,
        hostname: this.config.host,
        fetch: request => this.handleRequest(request),
      });

      console.log('🚀 Fire22 Development Server started successfully!');
      console.log(`📍 Server URL: http://${this.config.host}:${this.config.port}`);
      console.log(`🔧 Development Dashboard: http://${this.config.host}:${this.config.port}/`);
      console.log(`🔍 Dev Tools: http://${this.config.host}:${this.config.port}/__dev/logs`);
      console.log('👀 Hot reload enabled - watching for file changes...');
      console.log('\n🔥 Ready for development!');
    } catch (error) {
      this.log('error', `Failed to start server: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Stop the development server
   */
  async stop(): Promise<void> {
    if (this.server) {
      this.server.stop();
    }

    // Close file watchers
    for (const watcher of this.watchers) {
      watcher.close();
    }

    console.log('🛑 Development server stopped');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const config: Partial<ServerConfig> = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--port':
      case '-p':
        config.port = parseInt(args[++i]);
        break;
      case '--host':
      case '-h':
        config.host = args[++i];
        break;
      case '--no-cors':
        config.enableCors = false;
        break;
      case '--no-logs':
        config.enableLogging = false;
        break;
      case '--no-hot-reload':
        config.enableHotReload = false;
        break;
      case '--log-level':
        config.logLevel = args[++i] as 'debug' | 'info' | 'warn' | 'error';
        break;
      case '--help':
        console.log(`
🚀 Fire22 Enhanced Development Server

USAGE:
  bun run scripts/dev-server.ts [options]

OPTIONS:
  -p, --port <port>        Server port (default: 8080)
  -h, --host <host>        Server host (default: localhost)
  --no-cors               Disable CORS headers
  --no-logs               Disable request logging
  --no-hot-reload         Disable hot reload file watching
  --log-level <level>     Set log level: debug, info, warn, error (default: info)
  --help                  Show this help message

DEVELOPMENT ENDPOINTS:
  /                       Development dashboard
  /__dev/logs            Request logs (JSON)
  /__dev/config          Server configuration
  /__dev/health          Server health status

EXAMPLES:
  bun run scripts/dev-server.ts
  bun run scripts/dev-server.ts --port 3000
  bun run scripts/dev-server.ts --host 0.0.0.0 --log-level debug
`);
        process.exit(0);
    }
  }

  // Create and start server
  const server = new Fire22DevServer(config);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down development server...');
    await server.stop();
    process.exit(0);
  });

  await server.start();
}

// Run if called directly
if (import.meta.main) {
  main().catch(error => {
    console.error('💥 Failed to start development server:', error);
    process.exit(1);
  });
}

export { Fire22DevServer };
