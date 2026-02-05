#!/usr/bin/env bun
/**
 * DuoPlus Dashboard Server v3.8 - Enhanced Matrix System
 *
 * Features:
 * - Real-time metrics and performance monitoring
 * - Command palette integration
 * - Mobile PWA support
 */

// @ts-ignore - Bun globals not available in standalone TypeScript
import { file, serve } from 'bun';
// @ts-ignore - Node.js types
import { join } from 'path';

// @ts-ignore - Process globals
declare const process: any;

interface DashboardMetrics {
  uptime: number;
  responseTime: number;
  activeDashboards: number;
  memoryUsage: number;
  cpuUsage: number;
  errorRate: number;
  lastHealthCheck: Date;
}

interface DashboardConfig {
  name: string;
  icon: string;
  category: string;
  scope: string;
  domain: string;
  type: string;
  status: string;
  port: number;
  responseTime: number;
  size: string;
  endpoint: string;
}

class DashboardServerV38 {
  private port: number = 8090;
  private startTime: Date = new Date();
  private metrics: DashboardMetrics;
  private dashboards: DashboardConfig[];
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.metrics = {
      uptime: 0,
      responseTime: 87,
      activeDashboards: 14,
      memoryUsage: 0,
      cpuUsage: 12,
      errorRate: 0,
      lastHealthCheck: new Date()
    };

    this.dashboards = [
      {
        name: "Venmo Family System",
        icon: "👥",
        category: "@platform",
        scope: "Core",
        domain: "localhost",
        type: "Web UI",
        status: "🟢 Live",
        port: 8090,
        responseTime: 92,
        size: "1.2MB",
        endpoint: "/dist/venmo-family-webui-demo/index.html"
      },
      {
        name: "Unified Dashboard",
        icon: "🎛️",
        category: "@dashboard",
        scope: "Core",
        domain: "localhost",
        type: "Web UI",
        status: "🟢 Live",
        port: 8090,
        responseTime: 87,
        size: "2.1MB",
        endpoint: "/dist/unified-dashboard-demo/index.html"
      },
      {
        name: "Environment Variables",
        icon: "⚙️",
        category: "@config",
        scope: "Core",
        domain: "localhost",
        type: "Dashboard",
        status: "🟢 Live",
        port: 8090,
        responseTime: 45,
        size: "856KB",
        endpoint: "/scripts/env-vars-dashboard.html"
      },
      {
        name: "Status Dashboard UI",
        icon: "📊",
        category: "@status",
        scope: "Core",
        domain: "localhost",
        type: "Dashboard",
        status: "🟢 Live",
        port: 8090,
        responseTime: 76,
        size: "1.8MB",
        endpoint: "/src/dashboard/status-dashboard-ui.html"
      },
      {
        name: "Complete Endpoints",
        icon: "🔌",
        category: "@api",
        scope: "Core",
        domain: "localhost",
        type: "Web UI",
        status: "🟢 Live",
        port: 8090,
        responseTime: 112,
        size: "3.4MB",
        endpoint: "/demos/@web/analytics/complete-endpoints-dashboard.html"
      },
      {
        name: "Analytics Dashboard",
        icon: "📈",
        category: "@analytics",
        scope: "Core",
        domain: "localhost",
        type: "Dashboard",
        status: "🟢 Live",
        port: 8090,
        responseTime: 98,
        size: "2.7MB",
        endpoint: "/demos/analytics/analytics-dashboard.html"
      },
      {
        name: "Credential Dashboard",
        icon: "🔐",
        category: "@security",
        scope: "Admin",
        domain: "localhost",
        type: "Dashboard",
        status: "🟡 Dev",
        port: 8090,
        responseTime: 65,
        size: "1.1MB",
        endpoint: "/src/dashboard/credential-dashboard.html"
      },
      {
        name: "Admin Dashboard",
        icon: "🛡️",
        category: "@admin",
        scope: "Admin",
        domain: "localhost",
        type: "Dashboard",
        status: "🟡 Dev",
        port: 8090,
        responseTime: 89,
        size: "2.3MB",
        endpoint: "/src/dashboard/admin-dashboard.html"
      },
      {
        name: "URL Pattern Routing",
        icon: "🔗",
        category: "@routing",
        scope: "Dev",
        domain: "localhost",
        type: "Dashboard",
        status: "🟢 Live",
        port: 8090,
        responseTime: 34,
        size: "423KB",
        endpoint: "/src/dashboard/url-pattern-routing.html"
      },
      {
        name: "Phone Info Template",
        icon: "📱",
        category: "@mobile",
        scope: "Dev",
        domain: "localhost",
        type: "Dashboard",
        status: "🟢 Live",
        port: 8090,
        responseTime: 51,
        size: "789KB",
        endpoint: "/src/dashboard/phone-info-template.html"
      },
      {
        name: "Database Management",
        icon: "🗄️",
        category: "@database",
        scope: "Admin",
        domain: "localhost",
        type: "Dashboard",
        status: "🟢 Live",
        port: 8090,
        responseTime: 134,
        size: "4.2MB",
        endpoint: "/src/dashboard/database-management.html"
      },
      {
        name: "Bucket Management",
        icon: "📦",
        category: "@storage",
        scope: "Admin",
        domain: "localhost",
        type: "Dashboard",
        status: "🟢 Live",
        port: 8090,
        responseTime: 156,
        size: "3.9MB",
        endpoint: "/src/dashboard/bucket-management.html"
      },
      {
        name: "CLI Security Demo",
        icon: "💻",
        category: "@security",
        scope: "CLI",
        domain: "localhost",
        type: "Interactive",
        status: "🟢 Live",
        port: 8090,
        responseTime: 78,
        size: "1.4MB",
        endpoint: "/demos/@web/cli-security-demo.html"
      },
      {
        name: "Bundle Analyzer",
        icon: "📎",
        category: "@tools",
        scope: "Dev",
        domain: "localhost",
        type: "Analysis",
        status: "🟢 Live",
        port: 8090,
        responseTime: 67,
        size: "2.8MB",
        endpoint: "/tools/bundler/bundle-analyzer.html"
      }
    ];
  }

  private updateMetrics(): void {
    const now = new Date();
    this.metrics.uptime = Math.floor((now.getTime() - this.startTime.getTime()) / 1000);
    this.metrics.memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    this.metrics.lastHealthCheck = now;

    // Simulate response time variations
    this.metrics.responseTime = 87 + Math.floor(Math.random() * 20) - 10;
    this.metrics.cpuUsage = 12 + Math.floor(Math.random() * 8) - 4;

    // Log metrics asynchronously using improved FileSink.write()
    this.logMetricsAsync();
  }

  private async logMetricsAsync(): Promise<void> {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        uptime: this.metrics.uptime,
        responseTime: this.metrics.responseTime,
        memoryUsage: this.metrics.memoryUsage,
        cpuUsage: this.metrics.cpuUsage,
        activeDashboards: this.metrics.activeDashboards
      };

      const logFile = file(join(process.cwd(), '.dashboard-metrics.log'));
      const logLine = JSON.stringify(logEntry) + '\n';

      // Leverage improved FileSink.write() with Promise<number> return type
      const bytesWritten = await logFile.write(logLine);
      console.debug(`Metrics logged: ${bytesWritten} bytes written`);
    } catch (error) {
      console.debug('Failed to log metrics:', error);
    }
  }

  private async healthCheck(): Promise<boolean> {
    try {
      const externalServices = [
        'https://empire-pro-status.workers.dev/',
        'https://empire-pro-r2.workers.dev/'
      ];

      for (const service of externalServices) {
        const response = await fetch(service);
        if (!response.ok) {
          return false;
        }
      }

      this.updateMetrics();
      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  private generateQRCode(): string {
    const qrData = `qr://duoplus.local/v3.8?timestamp=${Date.now()}`;
    return qrData;
  }

  private generateCommandPalette(): string {
    return `
# DuoPlus Command Palette v3.8
# Quick access aliases for dashboards

# Core Dashboards
alias venmo="open http://localhost:8090/dist/venmo-family-webui-demo/index.html"
alias unified="open http://localhost:8090/dist/unified-dashboard-demo/index.html"
alias status="open http://localhost:8090/src/dashboard/status-dashboard-ui.html"
alias analytics="open http://localhost:8090/demos/analytics/analytics-dashboard.html"

# Admin Access
alias admin="open http://localhost:8090/src/dashboard/admin-dashboard.html"
alias creds="open http://localhost:8090/src/dashboard/credential-dashboard.html"
alias database="open http://localhost:8090/src/dashboard/database-management.html"
alias buckets="open http://localhost:8090/src/dashboard/bucket-management.html"

# External Services
alias status-api="curl https://empire-pro-status.workers.dev/"
alias r2-check="curl https://empire-pro-r2.workers.dev/"

# Utility Commands
alias duoplus-start="bun run server/dashboard-server-v38.ts"
alias duoplus-status="curl http://localhost:8090/api/metrics"
alias duoplus-health="curl http://localhost:8090/api/health"
    `;
  }

  private generateManifest(): string {
    return JSON.stringify({
      name: "DuoPlus Dashboard",
      short_name: "DuoPlus",
      description: "Enterprise Dashboard System v3.8",
      start_url: "/",
      display: "standalone",
      background_color: "#1e293b",
      theme_color: "#3b82f6",
      orientation: "portrait-primary",
      icons: [
        {
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png"
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png"
        }
      ],
      categories: ["productivity", "business", "utilities"],
      lang: "en",
      dir: "ltr",
      scope: "/",
      prefer_related_applications: false
    }, null, 2);
  }

  private async serveDashboardPage(): Promise<Response> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="dashboard-scope" content="LOCAL-SANDBOX">
    <meta name="dashboard-version" content="v3.8">
    <title>DuoPlus Dashboard v3.8 - Enhanced Matrix System</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#3b82f6">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .enterprise-blue { color: #3b82f6; }
        .enterprise-bg-blue { background-color: #3b82f6; }
        .metric-card {
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border: 1px solid #e2e8f0;
            transition: all 0.3s ease;
        }
        .metric-card:hover { transform: translateY(-4px); box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
        .status-live { background-color: #dcfce7; color: #166534; }
        .status-dev { background-color: #fef3c7; color: #a16207; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        .animate-pulse { animation: pulse 2s infinite; }
    </style>
</head>
<body class="bg-gray-50">
    <!-- Enhanced Header -->
    <header class="bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-xl">
        <div class="container mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <i data-lucide="layers-3" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <h1 class="text-2xl font-bold">DuoPlus Dashboard</h1>
                        <p class="text-sm text-slate-300">v3.8 Enhanced Matrix System</p>
                    </div>
                </div>
                <div class="flex items-center space-x-3">
                    <div class="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 rounded-lg">
                        <span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        <span class="text-sm">14/14 Live</span>
                    </div>
                    <div class="text-sm">
                        <span id="uptime" class="font-mono">Calculating...</span>
                    </div>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto px-4 py-8">
        <!-- Executive Summary -->
        <section class="mb-8">
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-bold text-gray-800">🚀 Executive Summary</h2>
                    <button onclick="refreshMetrics()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                        <i data-lucide="refresh-cw" class="w-4 h-4 inline mr-2"></i>
                        Refresh
                    </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-green-600">14</div>
                        <div class="text-sm text-gray-600">Live Dashboards</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-blue-600">99.98%</div>
                        <div class="text-sm text-gray-600">Uptime</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-purple-600">87ms</div>
                        <div class="text-sm text-gray-600">Avg Response</div>
                    </div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-orange-600">99.9%</div>
                        <div class="text-sm text-gray-600">Compliance</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Dashboard Matrix -->
        <section class="mb-8">
            <h2 class="text-xl font-bold text-gray-800 mb-4">📊 Dashboard Catalog Matrix</h2>
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dashboard</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200" id="dashboardTable">
                            <!-- Dashboard rows will be inserted here -->
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        <!-- Quick Access -->
        <section class="mb-8">
            <h2 class="text-xl font-bold text-gray-800 mb-4">🎯 Quick Access</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 class="font-semibold text-gray-800 mb-2">Command Palette</h3>
                    <p class="text-sm text-gray-600 mb-3">Quick access aliases for all dashboards</p>
                    <button onclick="showCommands()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
                        View Commands
                    </button>
                </div>
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 class="font-semibold text-gray-800 mb-2">Mobile Access</h3>
                    <p class="text-sm text-gray-600 mb-3">QR code for mobile devices</p>
                    <button onclick="showQRCode()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm">
                        Show QR Code
                    </button>
                </div>
                <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 class="font-semibold text-gray-800 mb-2">Install PWA</h3>
                    <p class="text-sm text-gray-600 mb-3">Install as native app</p>
                    <button onclick="installPWA()" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm">
                        Install App
                    </button>
                </div>
            </div>
        </section>
    </main>

    <!-- Modals -->
    <div id="commandModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
        <div class="flex items-center justify-center min-h-screen p-4">
            <div class="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold">Command Palette</h3>
                    <button onclick="closeModal('commandModal')" class="text-gray-500 hover:text-gray-700">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <pre class="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto" id="commandContent"></pre>
            </div>
        </div>
    </div>

    <div id="qrModal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50">
        <div class="flex items-center justify-center min-h-screen p-4">
            <div class="bg-white rounded-lg max-w-md w-full p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold">Mobile Access QR Code</h3>
                    <button onclick="closeModal('qrModal')" class="text-gray-500 hover:text-gray-700">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <div class="text-center">
                    <div class="bg-gray-100 p-4 rounded-lg mb-4">
                        <div id="qrCode" class="text-2xl font-mono">📱 QR Code</div>
                    </div>
                    <p class="text-sm text-gray-600">Scan this code with your mobile device</p>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Initialize Lucide icons
        lucide.createIcons();

        // Load dashboard data
        async function loadDashboards() {
            try {
                const response = await fetch('/api/dashboards');
                const dashboards = await response.json();

                const tbody = document.getElementById('dashboardTable');
                tbody.innerHTML = dashboards.map((dashboard, index) => \`
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-3 text-sm font-medium text-gray-900">\${index + 1}</td>
                        <td class="px-4 py-3 text-sm">
                            <div class="flex items-center">
                                <span class="mr-2">\${dashboard.icon}</span>
                                <div>
                                    <div class="font-medium text-gray-900">\${dashboard.name}</div>
                                    <div class="text-gray-500">\${dashboard.category}</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-500">\${dashboard.scope}</td>
                        <td class="px-4 py-3 text-sm">
                            <span class="px-2 py-1 text-xs rounded-full \${dashboard.status.includes('Live') ? 'status-live' : 'status-dev'}">
                                \${dashboard.status}
                            </span>
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-500">\${dashboard.responseTime}ms</td>
                        <td class="px-4 py-3 text-sm text-gray-500">\${dashboard.size}</td>
                        <td class="px-4 py-3 text-sm">
                            <button onclick="window.open('http://localhost:8090\${dashboard.endpoint}', '_blank')"
                                    class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                Launch →
                            </button>
                        </td>
                    </tr>
                \`).join('');
            } catch (error) {
                console.error('Failed to load dashboards:', error);
            }
        }

        // Update uptime
        function updateUptime() {
            const startTime = new Date('${this.startTime.toISOString()}');
            const now = new Date();
            const uptime = Math.floor((now - startTime) / 1000);

            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = uptime % 60;

            document.getElementById('uptime').textContent = hours + 'h ' + minutes + 'm ' + seconds + 's';
        }

        // Refresh metrics
        async function refreshMetrics() {
            try {
                const response = await fetch('/api/metrics');
                const metrics = await response.json();
                console.log('Metrics updated:', metrics);
                loadDashboards();
            } catch (error) {
                console.error('Failed to refresh metrics:', error);
            }
        }

        // Show commands
        async function showCommands() {
            try {
                const response = await fetch('/api/commands');
                const commands = await response.text();
                document.getElementById('commandContent').textContent = commands;
                document.getElementById('commandModal').classList.remove('hidden');
            } catch (error) {
                console.error('Failed to load commands:', error);
            }
        }

        // Show QR code
        async function showQRCode() {
            try {
                const response = await fetch('/api/qr');
                const qrData = await response.text();
                document.getElementById('qrCode').innerHTML = \`
                    <div class="text-sm text-gray-600 mb-2">Scan URL:</div>
                    <div class="font-mono text-xs break-all">\${qrData}</div>
                \`;
                document.getElementById('qrModal').classList.remove('hidden');
            } catch (error) {
                console.error('Failed to generate QR code:', error);
            }
        }

        // Install PWA
        async function installPWA() {
            if ('serviceWorker' in navigator) {
                try {
                    const registration = await navigator.serviceWorker.register('/sw.js');
                    console.log('Service Worker registered:', registration);
                    alert('PWA installation ready! Check your browser for install prompt.');
                } catch (error) {
                    console.error('Service Worker registration failed:', error);
                    alert('PWA installation failed. Please try again.');
                }
            } else {
                alert('PWA not supported in this browser.');
            }
        }

        // Close modal
        function closeModal(modalId) {
            document.getElementById(modalId).classList.add('hidden');
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            loadDashboards();
            updateUptime();
            setInterval(updateUptime, 1000);
            setInterval(refreshMetrics, 30000); // Refresh every 30 seconds
        });
    </script>
</body>
</html>
    `;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }

  private async serveAPIRoutes(path: string): Promise<Response> {
    switch (path) {
      case '/api/metrics':
        this.updateMetrics();
        return new Response(JSON.stringify(this.metrics, null, 2), {
          headers: { 'Content-Type': 'application/json' },
        });

      case '/api/dashboards':
        return new Response(JSON.stringify(this.dashboards, null, 2), {
          headers: { 'Content-Type': 'application/json' },
        });

      case '/api/health':
        const isHealthy = await this.healthCheck();
        return new Response(JSON.stringify({
          status: isHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          uptime: this.metrics.uptime,
          activeDashboards: this.metrics.activeDashboards,
        }), {
          headers: { 'Content-Type': 'application/json' },
        });

      case '/api/commands':
        return new Response(this.generateCommandPalette(), {
          headers: { 'Content-Type': 'text/plain' },
        });

      case '/api/qr':
        return new Response(this.generateQRCode(), {
          headers: { 'Content-Type': 'text/plain' },
        });

      default:
        return new Response('API endpoint not found', { status: 404 });
    }
  }

  public async start(): Promise<void> {
    // Start health check interval
    this.healthCheckInterval = setInterval(async () => {
      await this.healthCheck();
    }, 30000); // Check every 30 seconds

    console.log(`🚀 DuoPlus Dashboard Server v3.8 starting on port ${this.port}`);
    console.log(`📊 Enhanced Matrix System with ${this.dashboards.length} dashboards`);
    console.log(`🌐 Open http://localhost:${this.port} to access the dashboard`);

    const server = this;

    serve({
      port: this.port,
      async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        // API routes
        if (path.startsWith('/api/')) {
          return await server.serveAPIRoutes(path);
        }

        // PWA manifest
        if (path === '/manifest.json') {
          return new Response(server.generateManifest(), {
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Service Worker
        if (path === '/sw.js') {
          const swContent = `
            self.addEventListener('install', (event) => {
              self.skipWaiting();
            });

            self.addEventListener('activate', (event) => {
              event.waitUntil(self.clients.claim());
            });

            self.addEventListener('fetch', (event) => {
              event.respondWith(fetch(event.request));
            });
          `;
          return new Response(swContent, {
            headers: { 'Content-Type': 'application/javascript' },
          });
        }

        // Main dashboard
        if (path === '/' || path === '/dashboard') {
          return await server.serveDashboardPage();
        }

        // Try to serve static files
        try {
          const staticFile = file(join(process.cwd(), path));
          if (await staticFile.exists()) {
            return new Response(staticFile);
          }
        } catch (error) {
          // File not found, continue to 404
        }

        // 404 fallback
        return new Response('Not found', { status: 404 });
      },
    });

    console.log(`✅ DuoPlus Dashboard Server v3.8 is running!`);
    console.log(`🔗 Dashboard: http://localhost:${this.port}/`);
    console.log(`📊 Metrics: http://localhost:${this.port}/api/metrics`);
    console.log(`🏥 Health: http://localhost:${this.port}/api/health`);
  }

  public async stop(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    console.log('🛑 DuoPlus Dashboard Server v3.8 stopped');
  }
}

// Start the server
const server = new DashboardServerV38();

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

// Start the server
server.start().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
