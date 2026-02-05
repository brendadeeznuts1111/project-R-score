/**
 * Development Server
 * Unified modular development server with HMR, file watching, and live reload
 */

import { ServerCore } from './core/server-core';
import { HMRManager } from './hmr/hmr-manager';

export * from '../../core/types/dev-server';

export class DevelopmentServer {
  private serverCore: ServerCore;
  private hmrManager: HMRManager;
  private initialized = false;

  constructor(
    config: {
      server?: Partial<any>;
      hmr?: Partial<any>;
      watch?: Partial<any>;
    } = {}
  ) {
    this.serverCore = new ServerCore(config.server);
    this.hmrManager = new HMRManager(config.hmr, config.watch);
  }

  /**
   * Initialize the development server
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing Development Server...');

      // Initialize HMR system
      await this.hmrManager.initialize();

      // Register HMR routes
      this.registerHMRRoutes();

      this.initialized = true;
      console.log('✅ Development Server initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Development Server:', error);
      throw error;
    }
  }

  /**
   * Start the development server
   */
  async start(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log('🔥 Starting Development Server...');

    try {
      await this.serverCore.start();
      console.log('🎉 Development Server started successfully!');
      console.log('📡 Server ready at:', `http://localhost:${this.serverCore.getConfig().port}`);

      if (this.serverCore.getConfig().hmrEnabled) {
        console.log('🔥 HMR enabled - watching for file changes...');
      }
    } catch (error) {
      console.error('❌ Failed to start Development Server:', error);
      throw error;
    }
  }

  /**
   * Stop the development server
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping Development Server...');

    try {
      await this.serverCore.stop();
      this.hmrManager.cleanup();
      console.log('✅ Development Server stopped successfully');
    } catch (error) {
      console.error('❌ Failed to stop Development Server:', error);
      throw error;
    }
  }

  /**
   * Get server statistics
   */
  getStats(): any {
    return {
      server: this.serverCore.getStats(),
      hmr: this.hmrManager.getStats(),
      timestamp: new Date(),
    };
  }

  /**
   * Get server configuration
   */
  getConfig(): any {
    return {
      server: this.serverCore.getConfig(),
      hmr: this.hmrManager.getStats().config,
    };
  }

  /**
   * Force a reload of all connected clients
   */
  forceReload(reason: string = 'manual_trigger'): void {
    this.hmrManager.forceReload(reason);
  }

  // Private methods

  private registerHMRRoutes(): void {
    // WebSocket upgrade route for HMR
    this.serverCore.registerRoute({
      method: 'GET',
      path: '/hmr',
      handler: this.handleHMRUpgrade.bind(this),
    });

    // HMR status route
    this.serverCore.registerRoute({
      method: 'GET',
      path: '/hmr/status',
      handler: async () => {
        const stats = this.hmrManager.getStats();
        return new Response(JSON.stringify(stats), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    });

    // Development dashboard route
    this.serverCore.registerRoute({
      method: 'GET',
      path: '/',
      handler: this.serveDevDashboard.bind(this),
    });

    // Static file serving
    this.serverCore.registerRoute({
      method: 'GET',
      path: '/static/:path*',
      handler: this.serveStaticFile.bind(this),
    });
  }

  private async handleHMRUpgrade(request: any): Promise<Response> {
    // In a real implementation, this would handle WebSocket upgrade
    // For now, return a placeholder response
    return new Response('HMR WebSocket endpoint', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  private async serveDevDashboard(request: any): Promise<Response> {
    const html = this.generateDevDashboardHTML();
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  private async serveStaticFile(request: any): Promise<Response> {
    // In a real implementation, this would serve static files
    // For now, return a placeholder response
    return new Response('Static file serving not implemented', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  private generateDevDashboardHTML(): string {
    const config = this.serverCore.getConfig();
    const stats = this.getStats();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Water Dashboard - Development Server</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: white;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            margin-bottom: 40px;
        }

        .header h1 {
            font-size: 3rem;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .status-card {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 15px;
            padding: 25px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .status-card h3 {
            margin-bottom: 15px;
            font-size: 1.3rem;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            display: inline-block;
        }

        .status-online { background: #28a745; }
        .status-offline { background: #dc3545; }

        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .metric:last-child {
            border-bottom: none;
        }

        .metric-label {
            font-weight: 500;
        }

        .metric-value {
            font-weight: bold;
            font-size: 1.1rem;
        }

        .actions {
            text-align: center;
            margin-top: 30px;
        }

        .btn {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            display: inline-block;
            margin: 0 10px;
            transition: all 0.3s ease;
        }

        .btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px);
        }

        .logs {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 10px;
            padding: 20px;
            margin-top: 30px;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            max-height: 300px;
            overflow-y: auto;
        }

        .log-entry {
            margin-bottom: 5px;
            padding: 5px;
            border-radius: 4px;
        }

        .log-info { background: rgba(0, 123, 255, 0.1); }
        .log-warn { background: rgba(255, 193, 7, 0.1); }
        .log-error { background: rgba(220, 53, 69, 0.1); }

        @media (max-width: 768px) {
            .status-grid {
                grid-template-columns: 1fr;
            }

            .header h1 {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Water Dashboard Development Server</h1>
            <p>Hot Module Replacement & Live Reload Active</p>
        </div>

        <div class="status-grid">
            <div class="status-card">
                <h3>
                    <span class="status-indicator status-online"></span>
                    Server Status
                </h3>
                <div class="metric">
                    <span class="metric-label">Status</span>
                    <span class="metric-value">Online</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Port</span>
                    <span class="metric-value">${config.port}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Mode</span>
                    <span class="metric-value">${config.mode}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Uptime</span>
                    <span class="metric-value">${Math.floor(stats.server.uptime / 1000 / 60)}m</span>
                </div>
            </div>

            <div class="status-card">
                <h3>
                    <span class="status-indicator ${config.hmrEnabled ? 'status-online' : 'status-offline'}"></span>
                    HMR Status
                </h3>
                <div class="metric">
                    <span class="metric-label">HMR Enabled</span>
                    <span class="metric-value">${config.hmrEnabled ? 'Yes' : 'No'}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Clients</span>
                    <span class="metric-value">${stats.hmr.clients}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Watchers</span>
                    <span class="metric-value">${stats.hmr.watchers}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">File Changes</span>
                    <span class="metric-value">${stats.server.fileChanges || 0}</span>
                </div>
            </div>

            <div class="status-card">
                <h3>📊 Performance</h3>
                <div class="metric">
                    <span class="metric-label">Requests</span>
                    <span class="metric-value">${stats.server.totalRequests}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Avg Response</span>
                    <span class="metric-value">${stats.server.averageResponseTime}ms</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Errors</span>
                    <span class="metric-value">${stats.server.errors}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Memory</span>
                    <span class="metric-value">${Math.round(stats.server.memoryUsage.percentage)}%</span>
                </div>
            </div>
        </div>

        <div class="actions">
            <button class="btn" onclick="forceReload()">🔄 Force Reload</button>
            <a href="/hmr/status" class="btn" target="_blank">📊 HMR Status</a>
            <a href="/health" class="btn" target="_blank">💚 Health Check</a>
        </div>

        <div class="logs">
            <h3>📋 Recent Logs</h3>
            <div id="logContainer">
                <div class="log-entry log-info">[${new Date().toISOString()}] Server started successfully</div>
                <div class="log-entry log-info">[${new Date().toISOString()}] HMR system initialized</div>
                <div class="log-entry log-info">[${new Date().toISOString()}] Watching for file changes...</div>
            </div>
        </div>
    </div>

    <script>
        function forceReload() {
            fetch('/hmr/reload', { method: 'POST' })
                .then(() => {
                    addLog('Manual reload triggered', 'info');
                })
                .catch(err => {
                    addLog('Failed to trigger reload: ' + err.message, 'error');
                });
        }

        function addLog(message, level = 'info') {
            const logContainer = document.getElementById('logContainer');
            const logEntry = document.createElement('div');
            logEntry.className = \`log-entry log-\${level}\`;
            logEntry.textContent = \`[\${new Date().toISOString()}] \${message}\`;
            logContainer.appendChild(logEntry);
            logContainer.scrollTop = logContainer.scrollHeight;
        }

        // Auto-refresh stats every 5 seconds
        setInterval(() => {
            fetch('/status')
                .then(res => res.json())
                .then(stats => {
                    // Update stats in UI
                    updateStats(stats);
                })
                .catch(err => {
                    addLog('Failed to fetch stats: ' + err.message, 'error');
                });
        }, 5000);

        function updateStats(stats) {
            // Update metrics in the UI
            const uptimeEl = document.querySelector('[data-metric="uptime"]');
            if (uptimeEl) {
                uptimeEl.textContent = Math.floor(stats.server.uptime / 1000 / 60) + 'm';
            }
        }
    </script>
</body>
</html>`;
  }

  // Getters for external access

  getServerCore(): ServerCore {
    return this.serverCore;
  }

  getHMRManager(): HMRManager {
    return this.hmrManager;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isRunning(): boolean {
    return this.serverCore.isRunning();
  }
}

// Export individual modules for advanced usage
export { ServerCore } from './core/server-core';
export { HMRManager } from './hmr/hmr-manager';

// Export default instance factory
export function createDevelopmentServer(config?: any): DevelopmentServer {
  return new DevelopmentServer(config);
}

// Legacy CLI runner for backward compatibility
export async function runDevServer(options: any = {}): Promise<void> {
  const server = createDevelopmentServer(options);

  try {
    await server.start();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n📡 Received SIGINT, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n📡 Received SIGTERM, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Failed to run development server:', error);
    process.exit(1);
  }
}
